import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import seed from '../catalog.js';

export class HttpError extends Error {
  constructor(status, message, details = {}) { super(message); this.status = status; this.details = details; }
}
export const token = () => randomBytes(32).toString('hex');
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export function passwordHash(password) {
  const salt = token();
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function passwordMatches(password, stored) {
  const [salt, expected] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function text(value, name, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\x00-\x1f\x7f]/.test(value)) throw new HttpError(400, `Enter a valid ${name}.`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'email address', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpError(400, 'Enter a valid email address.');
  return result;
}
export function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, `Invalid ${name}.`);
  return value;
}

export function openStore(filename, config) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents > 0), active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS variants (product_id TEXT NOT NULL REFERENCES products(id), color TEXT NOT NULL, size TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock >= 0), PRIMARY KEY(product_id,color,size));
    CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, csrf TEXT NOT NULL, admin_id TEXT REFERENCES admins(id), expires INTEGER NOT NULL, cart_version INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS cart_items (session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, product_id TEXT NOT NULL, color TEXT NOT NULL, size TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(session_id,product_id,color,size), FOREIGN KEY(product_id,color,size) REFERENCES variants(product_id,color,size));
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, session_id TEXT NOT NULL, request_key TEXT NOT NULL, customer TEXT NOT NULL, items TEXT NOT NULL, subtotal_cents INTEGER NOT NULL, shipping_cents INTEGER NOT NULL, tax_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL, payment_method TEXT NOT NULL, payment_status TEXT NOT NULL, status TEXT NOT NULL, stripe_id TEXT UNIQUE, created INTEGER NOT NULL, updated INTEGER NOT NULL, expires INTEGER, UNIQUE(session_id,request_key));
    CREATE INDEX IF NOT EXISTS orders_created ON orders(created DESC);
    CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS stripe_events (id TEXT PRIMARY KEY, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created INTEGER NOT NULL);
    PRAGMA user_version = 1;`);
  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try { const value = work(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  transaction(() => {
    for (const product of seed.products) {
      db.prepare('INSERT OR IGNORE INTO products(id,data,price_cents) VALUES(?,?,?)').run(product.id, JSON.stringify(product), Math.round(product.price * 100));
      for (const color of product.colors) for (const size of product.sizes) db.prepare('INSERT OR IGNORE INTO variants VALUES(?,?,?,?)').run(product.id, color, size, 20);
    }
  });
  function products() {
    return db.prepare('SELECT * FROM products WHERE active=1 ORDER BY rowid').all().map((row) => ({
      ...JSON.parse(row.data), price: row.price_cents / 100,
      variants: db.prepare('SELECT color,size,stock FROM variants WHERE product_id=?').all(row.id)
    }));
  }
  function createSession(adminId = null) {
    const secret = token();
    const session = { id: hash(secret), csrf: token(), admin_id: adminId, expires: Date.now() + 30 * 86400000, cart_version: 0 };
    db.prepare('INSERT INTO sessions(id,csrf,admin_id,expires) VALUES(?,?,?,?)').run(session.id, session.csrf, adminId, session.expires);
    return { secret, session };
  }
  function getSession(secret) {
    return secret ? db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(secret), Date.now()) : undefined;
  }
  function totals(items) {
    const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const shippingCents = !items.length || subtotalCents >= config.freeShippingCents ? 0 : config.shippingCents;
    const taxCents = Math.round(subtotalCents * config.taxRateBps / 10000);
    return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents, currency: 'usd' };
  }
  function cart(sessionId) {
    const items = db.prepare(`SELECT c.product_id AS id,c.color,c.size,c.quantity,p.data,p.price_cents AS unitPriceCents,v.stock
      FROM cart_items c JOIN products p ON p.id=c.product_id JOIN variants v ON v.product_id=c.product_id AND v.color=c.color AND v.size=c.size WHERE c.session_id=? AND p.active=1 ORDER BY c.rowid`).all(sessionId)
      .map(({ data, ...item }) => ({ ...item, name: JSON.parse(data).name }));
    const version = db.prepare('SELECT cart_version FROM sessions WHERE id=?').get(sessionId)?.cart_version || 0;
    return { items, version, ...totals(items) };
  }
  function setCart(sessionId, items, version) {
    if (!Array.isArray(items) || items.length > 40) throw new HttpError(400, 'Your bag can contain up to 40 different items.');
    integer(version, 'bag version', 0, Number.MAX_SAFE_INTEGER);
    return transaction(() => {
      if (cart(sessionId).version !== version) throw new HttpError(409, 'Your bag changed in another tab. Review it and try again.', { cart: cart(sessionId) });
      const seen = new Set();
      for (const item of items) {
        if (!item || typeof item !== 'object') throw new HttpError(400, 'Invalid bag item.');
        const quantity = integer(item.quantity, 'quantity', 1, 99);
        const variant = db.prepare('SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE v.product_id=? AND v.color=? AND v.size=? AND p.active=1').get(text(item.id, 'product ID'), text(item.color, 'color'), text(item.size, 'size'));
        if (!variant) throw new HttpError(400, 'That product option is unavailable.');
        if (quantity > variant.stock) throw new HttpError(409, `Only ${variant.stock} of that option remain.`, { code: 'stock' });
        const key = `${item.id}/${item.color}/${item.size}`;
        if (seen.has(key)) throw new HttpError(400, 'Duplicate product options.');
        seen.add(key);
      }
      db.prepare('DELETE FROM cart_items WHERE session_id=?').run(sessionId);
      for (const item of items) db.prepare('INSERT INTO cart_items VALUES(?,?,?,?,?)').run(sessionId, item.id, item.color, item.size, item.quantity);
      db.prepare('UPDATE sessions SET cart_version=cart_version+1 WHERE id=?').run(sessionId);
      return cart(sessionId);
    });
  }
  function customer(input) {
    if (!input || typeof input !== 'object') throw new HttpError(400, 'Enter your delivery details.');
    if (input.country !== 'US') throw new HttpError(400, 'Delivery is currently available within the United States.');
    const postalCode = text(input.postalCode, 'ZIP code', 5, 10);
    if (!/^\d{5}(-\d{4})?$/.test(postalCode)) throw new HttpError(400, 'Enter a valid US ZIP code.');
    const state = text(input.state, 'state', 2, 2).toUpperCase();
    if (!'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ').includes(state)) throw new HttpError(400, 'Choose a valid US state.');
    return { name: text(input.name, 'full name', 2, 100), email: email(input.email), address1: text(input.address1, 'street address', 3, 150), address2: input.address2 ? text(input.address2, 'apartment or suite', 1, 100) : '', city: text(input.city, 'city', 2, 100), state, postalCode, country: 'US' };
  }
  function publicOrder(row, full = true) {
    if (!row) throw new HttpError(404, 'Order not found. Open the confirmation in the browser used to place the order.');
    const result = { id: row.id, reference: row.reference, items: JSON.parse(row.items), subtotalCents: row.subtotal_cents, shippingCents: row.shipping_cents, taxCents: row.tax_cents, totalCents: row.total_cents, currency: 'usd', paymentMethod: row.payment_method, paymentStatus: row.payment_status, status: row.status, created: row.created };
    if (full) result.customer = JSON.parse(row.customer);
    return result;
  }
  function placeOrder(sessionId, input) {
    const requestKey = text(input.requestKey, 'checkout request', 16, 100);
    const details = customer(input.customer);
    const method = input.paymentMethod;
    if (!['cod', 'stripe'].includes(method) || (method === 'cod' && !config.allowCod) || (method === 'stripe' && !config.stripeEnabled)) throw new HttpError(400, 'That payment method is not available.');
    return transaction(() => {
      const previous = db.prepare('SELECT * FROM orders WHERE session_id=? AND request_key=?').get(sessionId, requestKey);
      if (previous) return { order: publicOrder(previous), row: previous, reused: true };
      const current = cart(sessionId);
      if (current.version !== input.cartVersion) throw new HttpError(409, 'Your bag has changed. Refresh checkout and review the total.');
      if (!current.items.length) throw new HttpError(400, 'Your bag is empty.');
      if (input.expectedTotalCents !== current.totalCents) throw new HttpError(409, 'The order total has changed. Review the updated total before placing your order.');
      for (const item of current.items) {
        const updated = db.prepare('UPDATE variants SET stock=stock-? WHERE product_id=? AND color=? AND size=? AND stock>=?').run(item.quantity, item.id, item.color, item.size, item.quantity);
        if (!updated.changes) throw new HttpError(409, `${item.name} no longer has the requested quantity. Please update your bag.`);
      }
      const id = randomUUID(), now = Date.now();
      const reference = 'AA-' + randomBytes(6).toString('hex').toUpperCase();
      const items = current.items.map(({ stock, ...item }) => item);
      db.prepare(`INSERT INTO orders(id,reference,session_id,request_key,customer,items,subtotal_cents,shipping_cents,tax_cents,total_cents,payment_method,payment_status,status,created,updated,expires) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, reference, sessionId, requestKey, JSON.stringify(details), JSON.stringify(items), current.subtotalCents, current.shippingCents, current.taxCents, current.totalCents, method, method === 'cod' ? 'due_on_delivery' : 'unpaid', method === 'cod' ? 'confirmed' : 'awaiting_payment', now, now, method === 'stripe' ? now + 35 * 60000 : null);
      if (method === 'cod') clearCart(sessionId);
      const row = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
      return { order: publicOrder(row), row, reused: false };
    });
  }
  function clearCart(sessionId) {
    db.prepare('DELETE FROM cart_items WHERE session_id=?').run(sessionId);
    db.prepare('UPDATE sessions SET cart_version=cart_version+1 WHERE id=?').run(sessionId);
  }
  function releaseOrder(row) {
    for (const item of JSON.parse(row.items)) db.prepare('UPDATE variants SET stock=stock+? WHERE product_id=? AND color=? AND size=?').run(item.quantity, item.id, item.color, item.size);
    db.prepare("UPDATE orders SET status='cancelled',updated=?,expires=NULL WHERE id=?").run(Date.now(), row.id);
  }
  function expireOrders() {
    transaction(() => {
      for (const row of db.prepare("SELECT * FROM orders WHERE status='awaiting_payment' AND expires<?").all(Date.now())) releaseOrder(row);
      db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    });
  }
  function receiveStripe(event) {
    return transaction(() => {
      if (db.prepare('SELECT id FROM stripe_events WHERE id=?').get(event.id)) return;
      const session = event.data?.object;
      const row = session?.id ? db.prepare('SELECT * FROM orders WHERE stripe_id=? OR (id=? AND stripe_id IS NULL AND payment_method=\'stripe\')').get(session.id, session.metadata?.order_id || '') : null;
      if (row && event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
        if (session.amount_total !== row.total_cents || session.currency !== 'usd' || session.metadata?.order_id !== row.id) throw new HttpError(400, 'Payment details do not match the order.');
        if (row.payment_status !== 'paid') {
          const status = row.status === 'awaiting_payment' ? 'confirmed' : 'payment_review';
          db.prepare("UPDATE orders SET payment_status='paid',status=?,stripe_id=?,updated=?,expires=NULL WHERE id=?").run(status, session.id, Date.now(), row.id);
          if (status === 'confirmed') {
            // Remove only purchased quantities, preserving anything added while paying.
            for (const item of JSON.parse(row.items)) {
              db.prepare('DELETE FROM cart_items WHERE session_id=? AND product_id=? AND color=? AND size=? AND quantity<=?').run(row.session_id, item.id, item.color, item.size, item.quantity);
              db.prepare('UPDATE cart_items SET quantity=quantity-? WHERE session_id=? AND product_id=? AND color=? AND size=?').run(item.quantity, row.session_id, item.id, item.color, item.size);
            }
            db.prepare('UPDATE sessions SET cart_version=cart_version+1 WHERE id=?').run(row.session_id);
          }
        }
      }
      if (row && event.type === 'checkout.session.expired' && row.status === 'awaiting_payment') releaseOrder(row);
      db.prepare('INSERT INTO stripe_events VALUES(?,?)').run(event.id, Date.now());
    });
  }
  return { db, products, createSession, getSession, cart, setCart, totals, placeOrder, publicOrder, releaseOrder, expireOrders, receiveStripe, transaction, colors: seed.colors, close: () => db.close() };
}
