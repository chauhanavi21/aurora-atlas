import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { openStore, HttpError, passwordMatchesAsync, passwordHash, email, text, integer } from './store.mjs';
import { createAuthentication, publicCustomer } from './auth.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function configuration(env = process.env) {
  const number = (name, fallback, max) => integer(Number(env[name] ?? fallback), name, 0, max);
  const publicUrl = new URL(env.PUBLIC_URL || `http://localhost:${env.PORT || 3000}`).origin;
  if (env.NODE_ENV === 'production' && !publicUrl.startsWith('https://')) throw new Error('Production requires an HTTPS PUBLIC_URL.');
  return {
    host: env.HOST || '127.0.0.1', port: number('PORT', 3000, 65535), publicUrl,
    databasePath: resolve(root, env.DATABASE_PATH || '.data/aurora.sqlite'), production: env.NODE_ENV === 'production',
    shippingCents: number('SHIPPING_CENTS', 995, 100000), freeShippingCents: number('FREE_SHIPPING_CENTS', 15000, 10000000),
    taxRateBps: number('TAX_RATE_BPS', 0, 3000), allowCod: env.ALLOW_COD !== 'false',
    stripeSecret: env.STRIPE_SECRET_KEY || '', stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripeEnabled: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), supportEmail: env.SUPPORT_EMAIL || '',
    localPasswordRecovery: env.NODE_ENV !== 'production' && env.AUTH_LOCAL_RECOVERY !== 'false',
    authOutboxPath: resolve(root, '.data/mail-outbox')
  };
}
export function createApp(config = configuration(), dependencies = {}) {
  const store = openStore(config.databasePath, config);
  const remoteFetch = dependencies.fetch || fetch;
  const rateLimits = new Map();
  const dummyHash = passwordHash('unavailable-account');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };
  const publicFiles = new Set(['index.html','shop.html','product.html','checkout.html','order.html','admin.html','login.html','signup.html','account.html','forgot-password.html','reset-password.html','auth.js','auth.css','auth-validation.js','catalog.js','api.js','main.js','scene.js','checkout.js','order.js','admin.js','style.css','pages.css','commerce.css','favicon.svg']);
  function send(res, status, value) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  }
  function limit(req, key, max, duration = 60000) {
    const id = `${req.socket.remoteAddress}:${key}`;
    const now = Date.now();
    if (rateLimits.size > 5000) for (const [key, value] of rateLimits) if (value.until < now) rateLimits.delete(key);
    let entry = rateLimits.get(id);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + duration }; rateLimits.set(id, entry); }
    if (++entry.count > max) throw new HttpError(429, 'Too many requests. Please wait before trying again.');
  }
  async function body(req, raw = false) {
    const chunks = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 65536) throw new HttpError(413, 'Request is too large.');
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (raw) return bytes;
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'Use application/json.');
    try { const value = JSON.parse(bytes.toString('utf8')); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
    catch { throw new HttpError(400, 'Invalid JSON request.'); }
  }
  function cookie(res, secret, expires = Date.now() + 30 * 86400000) {
    res.setHeader('Set-Cookie', `aurora_session=${secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor((expires - Date.now()) / 1000))}${config.production ? '; Secure' : ''}`);
  }
  function session(req, res, create = false) {
    const secret = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('aurora_session='))?.slice(15);
    let current = store.getSession(secret);
    if (!current && create) { const result = store.createSession(); cookie(res, result.secret); current = result.session; }
    if (!current) throw new HttpError(401, 'Your session expired. Refresh the page and try again.');
    return current;
  }
  function protect(req, current) {
    if (req.headers.origin && req.headers.origin !== config.publicUrl) throw new HttpError(403, 'Request origin is not allowed.');
    const csrf = req.headers['x-csrf-token'];
    if (typeof csrf !== 'string' || !/^[a-f0-9]{64}$/.test(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(current.csrf))) throw new HttpError(403, 'Refresh the page before submitting this request.');
  }
  function admin(current) {
    if (!current.admin_id) throw new HttpError(401, 'Sign in as the store administrator.');
    return current.admin_id;
  }
  function audit(adminId, action, target) { store.db.prepare('INSERT INTO audit_log(admin_id,action,target,created) VALUES(?,?,?,?)').run(adminId, action, target, Date.now()); }
  function settings() {
    return { currency: 'usd', shippingCents: config.shippingCents, freeShippingCents: config.freeShippingCents, taxRateBps: config.taxRateBps, allowCod: config.allowCod, stripeEnabled: config.stripeEnabled, supportEmail: config.supportEmail, localPasswordRecovery: config.localPasswordRecovery, countries: ['US'] };
  }
  const authentication = createAuthentication({ store, config, send, cookie, body, limit, dummyHash, dependencies });
  async function stripeCheckout(row) {
    if (row.status !== 'awaiting_payment') throw new HttpError(409, 'This checkout is no longer awaiting payment.');
    const data = new URLSearchParams({ mode: 'payment', success_url: `${config.publicUrl}/order.html?id=${row.id}`, cancel_url: `${config.publicUrl}/checkout.html?resume=${row.id}`, customer_email: JSON.parse(row.customer).email, client_reference_id: row.id, 'metadata[order_id]': row.id });
    data.set('payment_method_types[0]', 'card');
    let index = 0;
    for (const item of JSON.parse(row.items)) {
      data.set(`line_items[${index}][price_data][currency]`, 'usd');
      data.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitPriceCents));
      data.set(`line_items[${index}][price_data][product_data][name]`, `${item.name} / ${item.color} / ${item.size}`);
      data.set(`line_items[${index}][quantity]`, String(item.quantity)); index++;
    }
    if (row.tax_cents) {
      data.set(`line_items[${index}][price_data][currency]`, 'usd');
      data.set(`line_items[${index}][price_data][unit_amount]`, String(row.tax_cents));
      data.set(`line_items[${index}][price_data][product_data][name]`, 'Sales tax');
      data.set(`line_items[${index}][quantity]`, '1');
    }
    data.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    data.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(row.shipping_cents));
    data.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
    data.set('shipping_options[0][shipping_rate_data][display_name]', 'Standard US delivery');
    data.set('expires_at', String(Math.floor(row.created / 1000) + 32 * 60));
    let response;
    try {
      response = await remoteFetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${config.stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': row.id }, body: data, signal: AbortSignal.timeout(15000) });
    } catch { throw new HttpError(503, 'The payment service is unavailable. Your order is reserved; retry this checkout shortly.'); }
    const result = await response.json();
    if (!response.ok || !result.id || !result.url?.startsWith('https://checkout.stripe.com/')) throw new HttpError(503, 'Payment checkout could not start. Retry shortly or contact the store.');
    store.db.prepare('UPDATE orders SET stripe_id=?,updated=? WHERE id=?').run(result.id, Date.now(), row.id);
    return result.url;
  }
  function verifyWebhook(bytes, header = '') {
    if (!config.stripeWebhookSecret) throw new HttpError(503, 'Stripe webhooks are not configured.');
    const parts = header.split(',').map((part) => part.split('='));
    const timestamp = parts.find(([key]) => key === 't')?.[1];
    if (!/^\d+$/.test(timestamp || '') || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new HttpError(400, 'Invalid webhook timestamp.');
    const expected = createHmac('sha256', config.stripeWebhookSecret).update(`${timestamp}.`).update(bytes).digest();
    const valid = parts.filter(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/.test(value)).some(([, value]) => timingSafeEqual(expected, Buffer.from(value, 'hex')));
    if (!valid) throw new HttpError(400, 'Invalid webhook signature.');
    try { const event = JSON.parse(bytes); text(event.id, 'event ID', 3, 200); return event; } catch { throw new HttpError(400, 'Invalid webhook event.'); }
  }
  async function api(req, res, url) {
    const path = url.pathname;
    if (path === '/api/health' && req.method === 'GET') return send(res, 200, { status: 'ok' });
    if (path === '/api/products' && req.method === 'GET') return send(res, 200, { products: store.products(), colors: store.colors });
    if (path.startsWith('/api/products/') && req.method === 'GET') {
      const product = store.products().find((product) => product.id === path.slice(14));
      if (!product) throw new HttpError(404, 'Product not found.');
      return send(res, 200, { product });
    }
    if (path === '/api/webhooks/stripe' && req.method === 'POST') {
      limit(req, 'webhook', 180);
      store.receiveStripe(verifyWebhook(await body(req, true), req.headers['stripe-signature']));
      return send(res, 200, { received: true });
    }
    if (path === '/api/session') limit(req, 'session', 90);
    const current = session(req, res, path === '/api/session' && req.method === 'GET');
    if (path === '/api/session' && req.method === 'GET') return send(res, 200, { csrfToken: current.csrf, admin: Boolean(current.admin_id), user: publicCustomer(authentication.customer(current)), settings: settings() });
    if (!['GET','HEAD'].includes(req.method)) protect(req, current);
    if ((path.startsWith('/api/auth/') || path.startsWith('/api/account/')) && await authentication.handle(req, res, path, current)) return;
    if (path === '/api/cart' && req.method === 'GET') return send(res, 200, store.cart(current.id));
    if (path === '/api/cart' && req.method === 'PUT') {
      limit(req, 'cart', 120);
      const input = await body(req);
      return send(res, 200, store.setCart(current.id, input.items, input.version));
    }
    if (path === '/api/newsletter' && req.method === 'POST') {
      limit(req, 'newsletter', 5);
      const input = await body(req);
      if (input.consent !== true) throw new HttpError(400, 'Confirm that you want to receive field notes.');
      store.db.prepare('INSERT OR IGNORE INTO subscribers VALUES(?,?)').run(email(input.email), Date.now());
      return send(res, 200, { message: 'You’re on the list. Thank you for joining our field notes.' });
    }
    if (path === '/api/orders' && req.method === 'POST') {
      limit(req, 'checkout', 12);
      store.expireOrders();
      const result = store.placeOrder(current.id, await body(req));
      const checkoutUrl = result.row.payment_method === 'stripe' && result.row.status === 'awaiting_payment' ? await stripeCheckout(result.row) : undefined;
      return send(res, result.reused ? 200 : 201, { order: result.order, checkoutUrl });
    }
    const orderPath = /^\/api\/orders\/([a-f0-9-]{36})(\/(cancel|pay))?$/.exec(path);
    if (orderPath) {
      const row = store.db.prepare('SELECT * FROM orders WHERE id=? AND ((customer_id IS NULL AND session_id=?) OR customer_id=?)').get(orderPath[1], current.id, current.customer_id || '');
      if (!row) throw new HttpError(404, 'Order not found. Sign in to the account that placed this order, or open it in the original guest browser.');
      if (req.method === 'GET' && !orderPath[2]) return send(res, 200, { order: store.publicOrder(row) });
      if (req.method === 'POST' && orderPath[3] === 'pay') {
        limit(req, 'checkout', 12);
        await body(req);
        if (!config.stripeEnabled || row.payment_method !== 'stripe') throw new HttpError(400, 'Online payment is unavailable.');
        return send(res, 200, { checkoutUrl: await stripeCheckout(row) });
      }
      if (req.method === 'POST' && orderPath[3] === 'cancel') {
        await body(req);
        if (row.status !== 'awaiting_payment') throw new HttpError(409, 'Only an unpaid checkout can be cancelled here.');
        // A live Stripe session must expire before releasing inventory.
        if (row.stripe_id) {
          const response = await remoteFetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(row.stripe_id)}/expire`, { method: 'POST', headers: { Authorization: `Bearer ${config.stripeSecret}` }, signal: AbortSignal.timeout(15000) });
          await response.arrayBuffer();
          if (!response.ok) throw new HttpError(409, 'Payment may be processing. Check your order again shortly.');
        }
        store.transaction(() => {
          const latest = store.db.prepare('SELECT * FROM orders WHERE id=?').get(row.id);
          if (latest.status === 'awaiting_payment') store.releaseOrder(latest);
        });
        return send(res, 200, { order: store.publicOrder(store.db.prepare('SELECT * FROM orders WHERE id=?').get(row.id)) });
      }
    }
    if (path === '/api/admin/login' && req.method === 'POST') {
      limit(req, 'login', 5, 15 * 60000);
      const input = await body(req);
      const account = store.db.prepare('SELECT * FROM admins WHERE email=?').get(email(input.email));
      const password = text(input.password, 'password', 1, 128);
      if (!await passwordMatchesAsync(password, account?.password_hash || dummyHash) || !account) throw new HttpError(401, 'Email or password is incorrect.');
      const rotated = authentication.rotateSession(current, { adminId: account.id });
      cookie(res, rotated.secret, rotated.session.expires);
      return send(res, 200, { csrfToken: rotated.session.csrf, admin: true, user: publicCustomer(authentication.customer(rotated.session)), cart: store.cart(rotated.session.id) });
    }
    if (path.startsWith('/api/admin/')) {
      const adminId = admin(current);
      if (path === '/api/admin/logout' && req.method === 'POST') {
        await body(req);
        const rotated = authentication.rotateSession(current, { adminId: null });
        cookie(res, rotated.secret, rotated.session.expires);
        return send(res, 200, { admin: false, csrfToken: rotated.session.csrf });
      }
      if (path === '/api/admin/overview' && req.method === 'GET') {
        const orders = store.db.prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 100').all().map((row) => store.publicOrder(row));
        return send(res, 200, { orders, products: store.products(), subscribers: store.db.prepare('SELECT email,created FROM subscribers ORDER BY created DESC LIMIT 100').all(), counts: { orders: store.db.prepare('SELECT COUNT(*) AS count FROM orders').get().count, subscribers: store.db.prepare('SELECT COUNT(*) AS count FROM subscribers').get().count } });
      }
      const variantPath = /^\/api\/admin\/products\/([a-z0-9-]+)$/.exec(path);
      if (variantPath && req.method === 'PATCH') {
        const input = await body(req);
        store.transaction(() => {
          const product = store.db.prepare('SELECT * FROM products WHERE id=?').get(variantPath[1]);
          if (!product) throw new HttpError(404, 'Product not found.');
          if (input.priceCents !== undefined) store.db.prepare('UPDATE products SET price_cents=? WHERE id=?').run(integer(input.priceCents, 'price', 1, 10000000), product.id);
          if (input.stock !== undefined) {
            const stock = integer(input.stock, 'stock quantity', 0, 1000000);
            const change = store.db.prepare('UPDATE variants SET stock=? WHERE product_id=? AND color=? AND size=?').run(stock, product.id, text(input.color, 'color'), text(input.size, 'size'));
            if (!change.changes) throw new HttpError(404, 'Product option not found.');
          }
          audit(adminId, 'update_product', product.id);
        });
        return send(res, 200, { product: store.products().find((product) => product.id === variantPath[1]) });
      }
      const adminOrder = /^\/api\/admin\/orders\/([a-f0-9-]{36})$/.exec(path);
      if (adminOrder && req.method === 'PATCH') {
        const input = await body(req);
        const order = store.transaction(() => {
          const row = store.db.prepare('SELECT * FROM orders WHERE id=?').get(adminOrder[1]);
          if (!row) throw new HttpError(404, 'Order not found.');
          if (input.status === 'cancelled' && row.status === 'confirmed' && row.payment_method === 'cod') store.releaseOrder(row);
          else if (input.status === 'fulfilled' && row.status === 'confirmed' && (row.payment_status === 'paid' || (row.payment_method === 'cod' && input.collected === true))) store.db.prepare("UPDATE orders SET status='fulfilled',payment_status='paid',updated=? WHERE id=?").run(Date.now(), row.id);
          else throw new HttpError(409, 'That order status change is unavailable. Paid refunds must be handled through Stripe.');
          audit(adminId, `order_${input.status}`, row.id);
          return store.publicOrder(store.db.prepare('SELECT * FROM orders WHERE id=?').get(row.id));
        });
        return send(res, 200, { order });
      }
    }
    throw new HttpError(404, 'API endpoint not found.');
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (config.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const url = new URL(req.url, config.publicUrl);
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (!['GET','HEAD'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
      let path;
      try { path = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'; } catch { throw new HttpError(400, 'Invalid URL.'); }
      if (!publicFiles.has(path) && !/^(assets|vendor)\/[a-zA-Z0-9_./-]+$/.test(path)) throw new HttpError(404, 'Page not found.');
      const filename = resolve(root, path);
      if (!filename.startsWith(root.endsWith(sep) ? root : root + sep) || path.split('/').some((part) => part.startsWith('.'))) throw new HttpError(404, 'Page not found.');
      let bytes;
      try { if (!(await stat(filename)).isFile()) throw new Error(); bytes = await readFile(filename); } catch { throw new HttpError(404, 'Page not found.'); }
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': path.startsWith('assets/') ? 'public, max-age=3600' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (!error.status) console.error('Request failed:', error.message);
      if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete this request.', ...(error.details || {}) });
      else res.end();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  const cleanup = setInterval(() => store.expireOrders(), 60000);
  cleanup.unref();
  server.on('close', () => { clearInterval(cleanup); store.close(); });
  return { server, store, config };
}
