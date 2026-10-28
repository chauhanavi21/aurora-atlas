import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpError, email, text, token, hash, passwordHashAsync, passwordMatchesAsync } from './store.mjs';
import rules from '../auth-validation.js';

export const { passwordHelp, passwordError } = rules;
export function nameValue(value) {
  const name = text(value, 'full name', 2, 80).normalize('NFC').replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{M} .’'-]+$/u.test(name) || !/\p{L}/u.test(name)) throw new HttpError(400, 'Use letters, spaces, apostrophes, periods, or hyphens in your name.');
  return name;
}
function fieldsOrThrow(fields) {
  if (Object.keys(fields).length) throw new HttpError(400, 'Check the highlighted fields and try again.', { fields });
}
export function registration(input) {
  const fields = {}; let name, address;
  try { name = nameValue(input.name); } catch (error) { fields.name = error.message; }
  try { address = email(input.email); } catch (error) { fields.email = error.message; }
  const invalid = passwordError(input.password, address);
  if (invalid) fields.password = invalid;
  if (typeof input.confirmPassword !== 'string' || input.password !== input.confirmPassword) fields.confirmPassword = 'The passwords do not match.';
  fieldsOrThrow(fields);
  return { name, email: address, password: input.password };
}
function newPassword(input, address) {
  const fields = {};
  const invalid = passwordError(input.newPassword, address);
  if (invalid) fields.newPassword = invalid;
  if (typeof input.confirmPassword !== 'string' || input.newPassword !== input.confirmPassword) fields.confirmPassword = 'The passwords do not match.';
  fieldsOrThrow(fields);
  return input.newPassword;
}
export function publicCustomer(row) {
  return row ? { id: row.id, name: row.name, email: row.email, created: row.created } : null;
}

export function createAuthentication({ store, config, send, cookie, body, limit, dummyHash, dependencies = {} }) {
  const db = store.db;
  const customer = (current) => current.customer_id ? db.prepare('SELECT * FROM customers WHERE id=?').get(current.customer_id) : null;
  function requireCustomer(current) {
    const row = customer(current);
    if (!row) throw new HttpError(401, 'Sign in to access your account.');
    return row;
  }
  function rotateSession(current, options = {}) {
    const work = () => {
      if (!db.prepare('SELECT id FROM sessions WHERE id=? AND expires>?').get(current.id, Date.now())) throw new HttpError(401, 'Your session expired. Refresh and sign in again.');
      const customerId = options.customerId === undefined ? current.customer_id : options.customerId;
      const adminId = options.adminId === undefined ? current.admin_id : options.adminId;
      const rotated = store.createSession(adminId, customerId, options.lifetime || Math.max(60000, current.expires - Date.now()));
      let bagAdjusted = false;
      if (!options.detach && !current.customer_id) {
        if (customerId) {
          const guest = store.cart(current.id).items;
          for (const item of guest) {
            const saved = db.prepare('SELECT quantity FROM customer_cart_items WHERE customer_id=? AND product_id=? AND color=? AND size=?').get(customerId, item.id, item.color, item.size);
            const lineCount = db.prepare('SELECT COUNT(*) AS count FROM customer_cart_items WHERE customer_id=?').get(customerId).count;
            const wanted = item.quantity + (saved?.quantity || 0);
            const quantity = Math.min(wanted, item.stock, 99);
            if ((!saved && lineCount >= 40) || !quantity) { bagAdjusted = true; continue; }
            if (quantity !== wanted) bagAdjusted = true;
            db.prepare('INSERT INTO customer_cart_items VALUES(?,?,?,?,?) ON CONFLICT(customer_id,product_id,color,size) DO UPDATE SET quantity=excluded.quantity').run(customerId, item.id, item.color, item.size, quantity);
          }
          store.bumpCart(store.cartOwner(rotated.session.id));
          // Only this browser's guest orders can be attached. Email matching never claims an order.
          db.prepare('UPDATE orders SET customer_id=? WHERE session_id=? AND customer_id IS NULL').run(customerId, current.id);
        } else db.prepare('UPDATE cart_items SET session_id=? WHERE session_id=?').run(rotated.session.id, current.id);
        db.prepare('UPDATE orders SET session_id=? WHERE session_id=? AND customer_id IS NULL').run(rotated.session.id, current.id);
      }
      db.prepare('DELETE FROM sessions WHERE id=?').run(current.id);
      return { ...rotated, bagAdjusted };
    };
    return options.inTransaction ? work() : store.transaction(work);
  }
  function authenticated(res, current, rotated, status = 200) {
    cookie(res, rotated.secret, rotated.session.expires);
    return send(res, status, { user: publicCustomer(customer(rotated.session)), csrfToken: rotated.session.csrf, admin: Boolean(rotated.session.admin_id), bagAdjusted: rotated.bagAdjusted || false, cart: store.cart(rotated.session.id) });
  }
  function failedKey(address) { return hash('customer-login:' + address); }
  function checkFailures(address) {
    const entry = db.prepare('SELECT * FROM auth_failures WHERE key=? AND expires>?').get(failedKey(address), Date.now());
    if (entry?.attempts >= 10) throw new HttpError(429, 'Too many sign-in attempts. Wait 15 minutes before trying again.');
  }
  function recordFailure(address) {
    const key = failedKey(address), expires = Date.now() + 15 * 60000;
    db.prepare('INSERT INTO auth_failures VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_failures.expires<? THEN 1 ELSE auth_failures.attempts+1 END, expires=CASE WHEN auth_failures.expires<? THEN excluded.expires ELSE auth_failures.expires END').run(key, expires, Date.now(), Date.now());
  }
  const duplicateEmail = () => new HttpError(409, 'An account with that email already exists. Sign in or recover your password.', { fields: { email: 'This email is already registered.' } });
  const deliverReset = dependencies.deliverReset || (async (message) => {
    await mkdir(config.authOutboxPath, { recursive: true });
    await writeFile(join(config.authOutboxPath, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(message, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  });
  async function handle(req, res, path, current) {
    if (path === '/api/auth/me' && req.method === 'GET') { send(res, 200, { user: publicCustomer(customer(current)) }); return true; }
    if (path === '/api/auth/register' && req.method === 'POST') {
      limit(req, 'register', 10, 60 * 60000);
      if (current.customer_id) throw new HttpError(409, 'Sign out before creating another account.');
      const input = registration(await body(req));
      if (db.prepare('SELECT id FROM customers WHERE email=?').get(input.email)) throw duplicateEmail();
      const password = await passwordHashAsync(input.password);
      const rotated = store.transaction(() => {
        const id = randomUUID(), now = Date.now();
        try { db.prepare('INSERT INTO customers(id,name,email,password_hash,created,updated) VALUES(?,?,?,?,?,?)').run(id, input.name, input.email, password, now, now); }
        // Another signup can finish while scrypt is running. Native SQLite uses
        // ERR_SQLITE_ERROR with extended code 2067 for a UNIQUE constraint.
        catch (error) { if (error.errcode === 2067) throw duplicateEmail(); throw error; }
        return rotateSession(current, { customerId: id, adminId: null, lifetime: 12 * 3600000, inTransaction: true });
      });
      authenticated(res, current, rotated, 201); return true;
    }
    if (path === '/api/auth/login' && req.method === 'POST') {
      limit(req, 'customer-login', 20, 15 * 60000);
      const input = await body(req), fields = {};
      let address;
      try { address = email(input.email); } catch (error) { fields.email = error.message; }
      if (typeof input.password !== 'string' || !input.password.length || [...input.password].length > 128 || Buffer.byteLength(input.password) > 512) fields.password = 'Enter your password.';
      if (input.rememberMe !== undefined && typeof input.rememberMe !== 'boolean') fields.rememberMe = 'Invalid sign-in preference.';
      fieldsOrThrow(fields);
      checkFailures(address);
      const account = db.prepare('SELECT * FROM customers WHERE email=?').get(address);
      const matches = await passwordMatchesAsync(input.password, account?.password_hash || dummyHash);
      if (!matches || !account) { recordFailure(address); throw new HttpError(401, 'Email or password is incorrect.'); }
      const rotated = store.transaction(() => {
        if (db.prepare('SELECT password_hash FROM customers WHERE id=?').get(account.id)?.password_hash !== account.password_hash) throw new HttpError(401, 'Email or password is incorrect.');
        db.prepare('DELETE FROM auth_failures WHERE key=?').run(failedKey(address));
        return rotateSession(current, { customerId: account.id, adminId: null, lifetime: (input.rememberMe ? 30 * 24 : 12) * 3600000, inTransaction: true });
      });
      authenticated(res, current, rotated); return true;
    }
    if (path === '/api/auth/logout' && req.method === 'POST') {
      await body(req);
      authenticated(res, current, rotateSession(current, { customerId: null, adminId: null, detach: true, lifetime: 30 * 86400000 })); return true;
    }
    if (path === '/api/account/profile' && req.method === 'PATCH') {
      const account = requireCustomer(current), input = await body(req);
      if (input.email !== undefined && input.email !== account.email) throw new HttpError(400, 'Email changes are not available. Your sign-in email stays the same.');
      let name;
      try { name = nameValue(input.name); } catch (error) { throw new HttpError(400, 'Check your name.', { fields: { name: error.message } }); }
      db.prepare('UPDATE customers SET name=?,updated=? WHERE id=?').run(name, Date.now(), account.id);
      send(res, 200, { user: publicCustomer(customer(current)) }); return true;
    }
    if (path === '/api/account/orders' && req.method === 'GET') {
      const account = requireCustomer(current);
      const offset = Number(new URL(req.url, config.publicUrl).searchParams.get('offset') || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 1000000) throw new HttpError(400, 'Invalid order page.');
      const orders = db.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY created DESC LIMIT 20 OFFSET ?').all(account.id, offset).map((row) => store.publicOrder(row));
      const total = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE customer_id=?').get(account.id).count;
      send(res, 200, { orders, total }); return true;
    }
    if (path === '/api/account/password' && req.method === 'POST') {
      limit(req, 'change-password', 5, 15 * 60000);
      const account = requireCustomer(current), input = await body(req);
      const password = newPassword(input, account.email);
      if (typeof input.currentPassword !== 'string' || !await passwordMatchesAsync(input.currentPassword, account.password_hash)) throw new HttpError(400, 'Your current password is incorrect.', { fields: { currentPassword: 'Your current password is incorrect.' } });
      if (input.currentPassword === password) throw new HttpError(400, 'Choose a different new password.', { fields: { newPassword: 'Use a different password.' } });
      const encoded = await passwordHashAsync(password);
      const rotated = store.transaction(() => {
        const changed = db.prepare('UPDATE customers SET password_hash=?,updated=? WHERE id=? AND password_hash=?').run(encoded, Date.now(), account.id, account.password_hash);
        if (!changed.changes) throw new HttpError(409, 'Your password has changed. Sign in again.');
        const next = rotateSession(current, { adminId: null, inTransaction: true });
        db.prepare('DELETE FROM sessions WHERE customer_id=? AND id<>?').run(account.id, next.session.id);
        db.prepare('DELETE FROM password_resets WHERE customer_id=?').run(account.id);
        return next;
      });
      authenticated(res, current, rotated); return true;
    }
    if (path === '/api/auth/forgot-password' && req.method === 'POST') {
      limit(req, 'password-recovery', 5, 15 * 60000);
      if (!config.localPasswordRecovery && !dependencies.deliverReset) throw new HttpError(503, 'Password recovery is unavailable. Please contact the store.');
      const input = await body(req);
      const address = email(input.email);
      const account = db.prepare('SELECT * FROM customers WHERE email=?').get(address);
      if (account) {
        const secret = token(), expires = Date.now() + 30 * 60000;
        // Do not invalidate an existing link just because somebody requested another one.
        db.prepare('INSERT INTO password_resets VALUES(?,?,?)').run(hash(secret), account.id, expires);
        try { await deliverReset({ to: account.email, subject: 'Reset your Aurora Atlas password', resetUrl: `${config.publicUrl}/reset-password.html#token=${secret}`, expires: new Date(expires).toISOString() }); }
        catch { db.prepare('DELETE FROM password_resets WHERE token_hash=?').run(hash(secret)); console.error('Password recovery delivery failed.'); }
      }
      send(res, 202, { message: 'If an account matches that email, a recovery message has been prepared for the store owner.' }); return true;
    }
    if (path === '/api/auth/reset-password' && req.method === 'POST') {
      limit(req, 'reset-password', 10, 15 * 60000);
      const input = await body(req);
      if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) throw new HttpError(400, 'This recovery link is invalid or has expired. Request a new one.');
      const reset = db.prepare('SELECT r.*,c.email FROM password_resets r JOIN customers c ON c.id=r.customer_id WHERE r.token_hash=? AND r.expires>?').get(hash(input.token), Date.now());
      if (!reset) throw new HttpError(400, 'This recovery link is invalid or has expired. Request a new one.');
      const password = newPassword(input, reset.email), encoded = await passwordHashAsync(password);
      const rotated = store.transaction(() => {
        if (!db.prepare('SELECT token_hash FROM password_resets WHERE token_hash=? AND expires>?').get(hash(input.token), Date.now())) throw new HttpError(400, 'This recovery link has already been used or expired.');
        db.prepare('UPDATE customers SET password_hash=?,updated=? WHERE id=?').run(encoded, Date.now(), reset.customer_id);
        const next = rotateSession(current, { customerId: null, adminId: null, detach: Boolean(current.customer_id), lifetime: 30 * 86400000, inTransaction: true });
        db.prepare('DELETE FROM sessions WHERE customer_id=?').run(reset.customer_id);
        db.prepare('DELETE FROM password_resets WHERE customer_id=?').run(reset.customer_id);
        db.prepare('DELETE FROM auth_failures WHERE key=?').run(failedKey(reset.email));
        return next;
      });
      authenticated(res, current, rotated); return true;
    }
    return false;
  }
  return { handle, customer, rotateSession };
}
