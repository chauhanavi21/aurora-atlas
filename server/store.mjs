import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomUUID, createHash, scryptSync, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import seed from '../catalog.js';
import { defaultSettings } from './settings.mjs';

export class HttpError extends Error {
  constructor(status, message, details = {}) { super(message); this.status = status; this.details = details; }
}
export const token = () => randomBytes(32).toString('hex');
export const hash = (value) => createHash('sha256').update(value).digest('hex');
const derive = promisify(scrypt);
const passwordOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const encodedPassword = (salt, bytes) => `scrypt$32768$8$3$${salt}$${bytes.toString('hex')}`;
function passwordParts(stored) {
  if (typeof stored !== 'string') return null;
  const modern = /^scrypt\$32768\$8\$3\$([a-f0-9]{64})\$([a-f0-9]{128})$/.exec(stored);
  if (modern) return { salt: modern[1], bytes: Buffer.from(modern[2], 'hex'), options: passwordOptions };
  const legacy = /^([a-f0-9]{64}):([a-f0-9]{128})$/.exec(stored);
  return legacy ? { salt: legacy[1], bytes: Buffer.from(legacy[2], 'hex'), options: {} } : null;
}
export function passwordHash(password) {
  const salt = token();
  return encodedPassword(salt, scryptSync(password, salt, 64, passwordOptions));
}
export function passwordMatches(password, stored) {
  const parts = passwordParts(stored);
  if (!parts || typeof password !== 'string' || Buffer.byteLength(password) > 512) return false;
  return timingSafeEqual(scryptSync(password, parts.salt, 64, parts.options), parts.bytes);
}
export async function passwordHashAsync(password) {
  const salt = token();
  return encodedPassword(salt, await derive(password, salt, 64, passwordOptions));
}
export async function passwordMatchesAsync(password, stored) {
  const parts = passwordParts(stored);
  if (!parts || typeof password !== 'string' || Buffer.byteLength(password) > 512) return false;
  return timingSafeEqual(await derive(password, parts.salt, 64, parts.options), parts.bytes);
}
export function text(value, name, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\x00-\x1f\x7f]/.test(value)) throw new HttpError(400, `Enter a valid ${name}.`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'email address', 3, 254).toLowerCase();
  const [local, domain, extra] = result.split('@');
  const labels = domain?.split('.') || [];
  if (extra !== undefined || !local || local.length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || labels.length < 2 || !labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/^[a-z]{2,63}$|^xn--[a-z0-9-]+$/.test(labels.at(-1))) throw new HttpError(400, 'Enter a valid email address.');
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
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created INTEGER NOT NULL);`);
  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try { const value = work(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, cart_version INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS customer_cart_items (customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id TEXT NOT NULL, color TEXT NOT NULL, size TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(customer_id,product_id,color,size), FOREIGN KEY(product_id,color,size) REFERENCES variants(product_id,color,size));
      CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_failures (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);`);
    for (const table of ['sessions', 'orders']) {
      if (!db.prepare(`PRAGMA table_info(${table})`).all().some((column) => column.name === 'customer_id')) db.exec(`ALTER TABLE ${table} ADD COLUMN customer_id TEXT REFERENCES customers(id)`);
    }
    db.exec('CREATE INDEX IF NOT EXISTS orders_customer ON orders(customer_id,created DESC); CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_request ON orders(customer_id,request_key) WHERE customer_id IS NOT NULL;');
    const addColumn = (table, name, definition) => {
      if (!db.prepare(`PRAGMA table_info(${table})`).all().some((column)=>column.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    };
    addColumn('variants','active','INTEGER NOT NULL DEFAULT 1');
    addColumn('products','version','INTEGER NOT NULL DEFAULT 0');
    addColumn('customers','disabled','INTEGER NOT NULL DEFAULT 0');
    addColumn('orders','tracking','TEXT NOT NULL DEFAULT \'\'');
    addColumn('orders','admin_notes','TEXT NOT NULL DEFAULT \'\'');
    db.exec(`CREATE TABLE IF NOT EXISTS store_settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS guest_saved_products (session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id), created INTEGER NOT NULL, PRIMARY KEY(session_id,product_id));
      CREATE TABLE IF NOT EXISTS customer_saved_products (customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id), created INTEGER NOT NULL, PRIMARY KEY(customer_id,product_id));
      PRAGMA user_version=4;`);
    db.prepare('INSERT OR IGNORE INTO store_settings(id,data) VALUES(1,?)').run(JSON.stringify(defaultSettings(config)));
  });
  transaction(() => {
    for (const product of seed.products) {
      const inserted = db.prepare('INSERT OR IGNORE INTO products(id,data,price_cents) VALUES(?,?,?)').run(product.id, JSON.stringify(product), Math.round(product.price * 100));
      if (!inserted.changes) continue; // Admin changes, including removed options, survive restarts.
      for (const color of product.colors) for (const size of product.sizes) db.prepare('INSERT INTO variants(product_id,color,size,stock) VALUES(?,?,?,?)').run(product.id, color, size, 20);
    }
  });
  function settings() {
    const row = db.prepare('SELECT * FROM store_settings WHERE id=1').get();
    return { ...defaultSettings(config), ...JSON.parse(row.data), version:row.version };
  }
  function products(includeArchived = false) {
    return db.prepare(`SELECT * FROM products ${includeArchived ? '' : 'WHERE active=1'} ORDER BY rowid`).all().map((row) => ({
      ...JSON.parse(row.data), price: row.price_cents / 100, active:Boolean(row.active), version:row.version,
      variants: db.prepare('SELECT color,size,stock FROM variants WHERE product_id=? AND active=1').all(row.id)
    }));
  }
  function createSession(adminId = null, customerId = null, lifetime = 30 * 86400000) {
    const secret = token();
    const session = { id: hash(secret), csrf: token(), admin_id: adminId, customer_id: customerId, expires: Date.now() + lifetime, cart_version: 0 };
    db.prepare('INSERT INTO sessions(id,csrf,admin_id,customer_id,expires) VALUES(?,?,?,?,?)').run(session.id, session.csrf, adminId, customerId, session.expires);
    return { secret, session };
  }
  function savedOwner(current) {
    return current.customer_id ? { table:'customer_saved_products', key:'customer_id', id:current.customer_id } : { table:'guest_saved_products', key:'session_id', id:current.id };
  }
  function savedProducts(current) {
    const owner = savedOwner(current);
    return db.prepare(`SELECT s.product_id FROM ${owner.table} s JOIN products p ON p.id=s.product_id WHERE s.${owner.key}=? AND p.active=1 ORDER BY s.created DESC,s.product_id`).all(owner.id).map((row)=>row.product_id);
  }
  function setSavedProduct(current, id, saved) {
    text(id,'product ID',2,64);
    if (typeof saved !== 'boolean') throw new HttpError(400,'Choose whether to save this product.');
    return transaction(()=>{
      const owner = savedOwner(current);
      if (!saved) db.prepare(`DELETE FROM ${owner.table} WHERE ${owner.key}=? AND product_id=?`).run(owner.id,id);
      else {
        if (!db.prepare('SELECT id FROM products WHERE id=? AND active=1').get(id)) throw new HttpError(404,'Product not found.');
        const exists = db.prepare(`SELECT 1 FROM ${owner.table} WHERE ${owner.key}=? AND product_id=?`).get(owner.id,id);
        if (!exists && db.prepare(`SELECT COUNT(*) AS n FROM ${owner.table} WHERE ${owner.key}=?`).get(owner.id).n >= 100) throw new HttpError(409,'You can save up to 100 products. Remove a piece before saving another.');
        db.prepare(`INSERT OR IGNORE INTO ${owner.table} VALUES(?,?,?)`).run(owner.id,id,Date.now());
      }
      return savedProducts(current);
    });
  }
  // Called inside session rotation's transaction. Account saves stay private on logout.
  function moveSavedProducts(current, next, detach) {
    if (detach || current.customer_id) return;
    if (!next.customer_id) db.prepare('UPDATE guest_saved_products SET session_id=? WHERE session_id=?').run(next.id,current.id);
    else db.prepare(`INSERT OR IGNORE INTO customer_saved_products(customer_id,product_id,created)
      SELECT ?,g.product_id,g.created FROM guest_saved_products g WHERE g.session_id=?
      AND NOT EXISTS(SELECT 1 FROM customer_saved_products c WHERE c.customer_id=? AND c.product_id=g.product_id)
      ORDER BY g.created DESC,g.product_id LIMIT MAX(0,100-(SELECT COUNT(*) FROM customer_saved_products WHERE customer_id=?))`).run(next.customer_id,current.id,next.customer_id,next.customer_id);
  }
  function getSession(secret) {
    return secret ? db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(secret), Date.now()) : undefined;
  }
  function totals(items) {
    const current = settings();
    const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const shippingCents = !items.length || subtotalCents >= current.freeShippingCents ? 0 : current.shippingCents;
    const taxCents = Math.round(subtotalCents * current.taxRateBps / 10000);
    return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents, currency: 'usd' };
  }
  function cartOwner(sessionId, customerId = null) {
    customerId ||= db.prepare('SELECT customer_id FROM sessions WHERE id=?').get(sessionId)?.customer_id;
    return customerId ? { table: 'customer_cart_items', key: 'customer_id', id: customerId, versionTable: 'customers' } : { table: 'cart_items', key: 'session_id', id: sessionId, versionTable: 'sessions' };
  }
  function bumpCart(owner) { db.prepare(`UPDATE ${owner.versionTable} SET cart_version=cart_version+1 WHERE id=?`).run(owner.id); }
  function cart(sessionId) {
    const owner = cartOwner(sessionId);
    const items = db.prepare(`SELECT c.product_id AS id,c.color,c.size,c.quantity,p.data,p.price_cents AS unitPriceCents,v.stock
      FROM ${owner.table} c JOIN products p ON p.id=c.product_id JOIN variants v ON v.product_id=c.product_id AND v.color=c.color AND v.size=c.size WHERE c.${owner.key}=? AND p.active=1 AND v.active=1 ORDER BY c.rowid`).all(owner.id)
      .map(({ data, ...item }) => ({ ...item, name: JSON.parse(data).name }));
    const version = db.prepare(`SELECT cart_version FROM ${owner.versionTable} WHERE id=?`).get(owner.id)?.cart_version || 0;
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
        const variant = db.prepare('SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE v.product_id=? AND v.color=? AND v.size=? AND p.active=1 AND v.active=1').get(text(item.id, 'product ID'), text(item.color, 'color'), text(item.size, 'size'));
        if (!variant) throw new HttpError(400, 'That product option is unavailable.');
        if (quantity > variant.stock) throw new HttpError(409, `Only ${variant.stock} of that option remain.`, { code: 'stock' });
        const key = `${item.id}/${item.color}/${item.size}`;
        if (seen.has(key)) throw new HttpError(400, 'Duplicate product options.');
        seen.add(key);
      }
      const owner = cartOwner(sessionId);
      db.prepare(`DELETE FROM ${owner.table} WHERE ${owner.key}=?`).run(owner.id);
      for (const item of items) db.prepare(`INSERT INTO ${owner.table} VALUES(?,?,?,?,?)`).run(owner.id, item.id, item.color, item.size, item.quantity);
      bumpCart(owner);
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
    const result = { id: row.id, reference: row.reference, items: JSON.parse(row.items), subtotalCents: row.subtotal_cents, shippingCents: row.shipping_cents, taxCents: row.tax_cents, totalCents: row.total_cents, currency: 'usd', paymentMethod: row.payment_method, paymentStatus: row.payment_status, status: row.status, created: row.created, tracking:row.tracking || '' };
    if (full) result.customer = JSON.parse(row.customer);
    return result;
  }
  function placeOrder(sessionId, input) {
    const requestKey = text(input.requestKey, 'checkout request', 16, 100);
    const details = customer(input.customer);
    const method = input.paymentMethod;
    return transaction(() => {
      const customerId = db.prepare('SELECT customer_id FROM sessions WHERE id=?').get(sessionId)?.customer_id || null;
      const previous = db.prepare('SELECT * FROM orders WHERE request_key=? AND ((customer_id IS NULL AND session_id=?) OR customer_id=?)').get(requestKey, sessionId, customerId || '');
      if (previous) return { order: publicOrder(previous), row: previous, reused: true };
      const preferences = settings();
      if (!preferences.checkoutEnabled) throw new HttpError(503, 'Checkout is temporarily closed. Please check back shortly.');
      if (!['cod', 'stripe'].includes(method) || (method === 'cod' && !preferences.allowCod) || (method === 'stripe' && !config.stripeEnabled)) throw new HttpError(400, 'That payment method is not available.');
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
      db.prepare('UPDATE orders SET customer_id=? WHERE id=?').run(db.prepare('SELECT customer_id FROM sessions WHERE id=?').get(sessionId)?.customer_id || null, id);
      if (method === 'cod') clearCart(sessionId);
      const row = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
      return { order: publicOrder(row), row, reused: false };
    });
  }
  function clearCart(sessionId) {
    const owner = cartOwner(sessionId);
    db.prepare(`DELETE FROM ${owner.table} WHERE ${owner.key}=?`).run(owner.id);
    bumpCart(owner);
  }
  function releaseOrder(row) {
    for (const item of JSON.parse(row.items)) db.prepare('UPDATE variants SET stock=stock+? WHERE product_id=? AND color=? AND size=?').run(item.quantity, item.id, item.color, item.size);
    db.prepare("UPDATE orders SET status='cancelled',updated=?,expires=NULL WHERE id=?").run(Date.now(), row.id);
  }
  function expireOrders() {
    transaction(() => {
      for (const row of db.prepare("SELECT * FROM orders WHERE status='awaiting_payment' AND expires<?").all(Date.now())) releaseOrder(row);
      db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
      db.prepare('DELETE FROM password_resets WHERE expires<?').run(Date.now());
      db.prepare('DELETE FROM auth_failures WHERE expires<?').run(Date.now());
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
            const owner = cartOwner(row.session_id, row.customer_id);
            // Remove only purchased quantities, preserving anything added while paying.
            for (const item of JSON.parse(row.items)) {
              db.prepare(`DELETE FROM ${owner.table} WHERE ${owner.key}=? AND product_id=? AND color=? AND size=? AND quantity<=?`).run(owner.id, item.id, item.color, item.size, item.quantity);
              db.prepare(`UPDATE ${owner.table} SET quantity=quantity-? WHERE ${owner.key}=? AND product_id=? AND color=? AND size=?`).run(item.quantity, owner.id, item.id, item.color, item.size);
            }
            bumpCart(owner);
          }
        }
      }
      if (row && event.type === 'checkout.session.expired' && row.status === 'awaiting_payment') releaseOrder(row);
      db.prepare('INSERT INTO stripe_events VALUES(?,?)').run(event.id, Date.now());
    });
  }
  return { db, products, settings, createSession, getSession, savedProducts, setSavedProduct, moveSavedProducts, cart, setCart, cartOwner, bumpCart, totals, placeOrder, publicOrder, releaseOrder, expireOrders, receiveStripe, transaction, colors: seed.colors, close: () => db.close() };
}
