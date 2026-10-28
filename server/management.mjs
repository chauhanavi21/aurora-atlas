import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { HttpError, text, email, integer, passwordMatchesAsync, passwordHashAsync } from './store.mjs';
import { nameValue, passwordError, publicCustomer } from './auth.mjs';
import { settingTextLimits } from './settings.mjs';

const categories = ['outerwear','essentials','bottoms','accessories','footwear'];
const plain = (value, name, max, optional = false) => {
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max || /[\x00-\x08\x0b-\x1f\x7f]/.test(value)) throw new HttpError(400, `Enter a valid ${name} (up to ${max} characters).`);
  return value.trim();
};
const boolean = (value, name) => { if (typeof value !== 'boolean') throw new HttpError(400, `Invalid ${name}.`); return value; };
const mediaName = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

export function createManagement({ store, config, root, send, body, cookie, limit, authentication }) {
  const db = store.db;
  function audit(adminId, action, target) { db.prepare('INSERT INTO audit_log(admin_id,action,target,created) VALUES(?,?,?,?)').run(adminId,action,target,Date.now()); }
  function pagination(url) {
    const offset = integer(Number(url.searchParams.get('offset') || 0),'page',0,10000000);
    const pageSize = integer(Number(url.searchParams.get('limit') || 20),'page size',1,100);
    const q = plain(url.searchParams.get('q') || '', 'search', 120, true);
    return { offset, limit:pageSize, q, pattern:`%${q}%` };
  }
  function imagePath(path) {
    if (typeof path !== 'string' || !/^(assets\/photos\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)|media\/[a-f0-9-]{36}\.(jpg|png|webp))$/.test(path)) throw new HttpError(400,'Choose a local product photo or upload one first.');
    const filename = path.startsWith('media/') ? resolve(config.uploadsPath,path.slice(6)) : resolve(root,path);
    try { if (!statSync(filename).isFile()) throw new Error(); } catch { throw new HttpError(400,'That photo is missing. Upload it before saving the product.'); }
    return path;
  }
  function productData(input, previous) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400,'Enter valid product details.');
    const value = { ...previous, ...input };
    const result = { id:previous.id };
    for (const [key,max] of Object.entries({ name:120,type:150,description:1500,details:3000,fit:1200,care:1200 })) result[key] = plain(value[key],key,max);
    result.badge = plain(value.badge || '', 'badge',60,true);
    result.photoCredit = plain(value.photoCredit || 'Product photography supplied by the store.', 'photo credit',240,true);
    if (!categories.includes(value.category)) throw new HttpError(400,'Choose a supported product category.');
    result.category = value.category;
    if (!Array.isArray(value.colors) || !value.colors.length || value.colors.length > 8 || new Set(value.colors).size !== value.colors.length || !value.colors.every((color)=>Object.hasOwn(store.colors,color))) throw new HttpError(400,'Choose 1–8 unique colors.');
    if (!Array.isArray(value.sizes) || !value.sizes.length || value.sizes.length > 12 || new Set(value.sizes).size !== value.sizes.length || !value.sizes.every((size)=>typeof size === 'string' && /^[A-Z0-9][A-Z0-9 .-]{0,11}$/.test(size))) throw new HttpError(400,'Enter 1–12 unique sizes using uppercase letters and numbers.');
    if (value.sizes.includes('ONE SIZE') && value.sizes.length !== 1) throw new HttpError(400,'ONE SIZE must be the only size.');
    result.colors = value.colors; result.sizes = value.sizes;
    if (!Array.isArray(value.features) || value.features.length < 1 || value.features.length > 6) throw new HttpError(400,'Enter 1–6 product features.');
    result.features = value.features.map((feature)=>plain(feature,'feature',100));
    if (!Array.isArray(value.gallery) || value.gallery.length !== 3) throw new HttpError(400,'Enter three gallery labels.');
    result.gallery = value.gallery.map((label)=>plain(label,'gallery label',60));
    result.images = {};
    for (const color of result.colors) {
      const paths = value.images?.[color] || [`assets/photos/${result.id}-${color}-front.jpg`];
      if (!Array.isArray(paths) || !paths.length || paths.length > 3) throw new HttpError(400,'Choose 1–3 photographs per color.');
      result.images[color] = paths.map(imagePath);
    }
    return result;
  }
  const allProducts = () => store.products(true);
  const adminOrder = (row) => ({ ...store.publicOrder(row), adminNotes:row.admin_notes || '' });
  async function handle(req,res,url,current) {
    const path = url.pathname, adminId = current.admin_id;
    if (path === '/api/admin/overview' && req.method === 'GET') {
      const count = (table, where='') => db.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`).get().n;
      send(res,200,{
        products:allProducts(), orders:db.prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 100').all().map(adminOrder),
        subscribers:db.prepare('SELECT email,created FROM subscribers ORDER BY created DESC LIMIT 100').all(),
        settings:store.settings(), categories, colors:store.colors,
        counts:{ products:count('products'),published:count('products','WHERE active=1'),orders:count('orders'),openOrders:count('orders',"WHERE status IN ('confirmed','shipped')"),customers:count('customers'),subscribers:count('subscribers'),lowStock:count('variants','WHERE active=1 AND stock<5'),revenueCents:db.prepare("SELECT COALESCE(SUM(total_cents),0) AS total FROM orders WHERE payment_status='paid' AND status IN ('confirmed','shipped','fulfilled')").get().total }
      }); return true;
    }
    if (path === '/api/admin/products' && req.method === 'POST') {
      limit(req,'manage-products',60);
      const input = await body(req);
      const id = text(input.id,'product ID',2,64);
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id)) throw new HttpError(400,'Use lowercase letters, numbers, and hyphens for the product ID.');
      const data = productData(input.product || {},{ id });
      const price = integer(input.priceCents,'price',1,10000000), stock = integer(input.initialStock ?? 0,'stock',0,1000000);
      const active = input.active === undefined ? false : boolean(input.active,'publication status');
      store.transaction(()=>{
        if (db.prepare('SELECT id FROM products WHERE id=?').get(id)) throw new HttpError(409,'That product ID is already in use.');
        db.prepare('INSERT INTO products(id,data,price_cents,active) VALUES(?,?,?,?)').run(id,JSON.stringify(data),price,Number(active));
        for (const color of data.colors) for (const size of data.sizes) db.prepare('INSERT INTO variants(product_id,color,size,stock) VALUES(?,?,?,?)').run(id,color,size,stock);
        audit(adminId,'create_product',id);
      });
      send(res,201,{product:allProducts().find((product)=>product.id === id)}); return true;
    }
    const productPath = /^\/api\/admin\/products\/([a-z0-9-]{2,64})$/.exec(path);
    if (productPath && ['PATCH','DELETE'].includes(req.method)) {
      const input = await body(req), id = productPath[1];
      store.transaction(()=>{
        const row = db.prepare('SELECT * FROM products WHERE id=?').get(id);
        if (!row) throw new HttpError(404,'Product not found.');
        if (input.version !== undefined && input.version !== row.version) throw new HttpError(409,'This product changed in another tab. Refresh before saving.');
        const data = input.product ? productData(input.product,JSON.parse(row.data)) : JSON.parse(row.data);
        if (input.product) {
          db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(data),id);
          db.prepare('UPDATE variants SET active=0 WHERE product_id=?').run(id);
          for (const color of data.colors) for (const size of data.sizes) db.prepare('INSERT INTO variants(product_id,color,size,stock,active) VALUES(?,?,?,0,1) ON CONFLICT(product_id,color,size) DO UPDATE SET active=1').run(id,color,size);
        }
        if (input.priceCents !== undefined) db.prepare('UPDATE products SET price_cents=? WHERE id=?').run(integer(input.priceCents,'price',1,10000000),id);
        const active = req.method === 'DELETE' ? false : input.active;
        if (active !== undefined) db.prepare('UPDATE products SET active=? WHERE id=?').run(Number(boolean(active,'publication status')),id);
        const changes = input.variants || (input.stock !== undefined ? [{ color:input.color,size:input.size,stock:input.stock }] : []);
        if (!Array.isArray(changes) || changes.length > 96) throw new HttpError(400,'Invalid inventory update.');
        const seen = new Set();
        for (const variant of changes) {
          const color = text(variant?.color,'color'), size = text(variant?.size,'size'), key = `${color}/${size}`;
          if (seen.has(key)) throw new HttpError(400,'Duplicate inventory options.'); seen.add(key);
          const updated = db.prepare('UPDATE variants SET stock=? WHERE product_id=? AND color=? AND size=? AND active=1').run(integer(variant.stock,'stock',0,1000000),id,color,size);
          if (!updated.changes) throw new HttpError(404,'Product option not found.');
        }
        db.prepare('UPDATE products SET version=version+1 WHERE id=?').run(id);
        audit(adminId,req.method === 'DELETE' ? 'archive_product' : 'update_product',id);
      });
      send(res,200,{product:allProducts().find((product)=>product.id === id)}); return true;
    }
    if (path === '/api/admin/media' && req.method === 'POST') {
      limit(req,'upload',30);
      const input = await body(req,false,3 * 1024 * 1024);
      if (typeof input.data !== 'string' || !/^[a-zA-Z0-9+/]+={0,2}$/.test(input.data)) throw new HttpError(400,'Upload a JPEG, PNG, or WebP photograph.');
      const bytes = Buffer.from(input.data,'base64');
      if (bytes.length < 100 || bytes.length > 2 * 1024 * 1024) throw new HttpError(400,'Photos must be between 100 bytes and 2 MB.');
      const ext = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9 ? 'jpg' : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'webp' : null;
      if (!ext) throw new HttpError(400,'Only JPEG, PNG, and WebP photos are supported.');
      const filename = `${randomUUID()}.${ext}`;
      await mkdir(config.uploadsPath,{recursive:true});
      await writeFile(resolve(config.uploadsPath,filename),bytes,{flag:'wx',mode:0o600});
      audit(adminId,'upload_photo',filename);
      send(res,201,{path:`media/${filename}`}); return true;
    }
    if (path === '/api/admin/settings' && req.method === 'PATCH') {
      const input = await body(req), changes = input.settings;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new HttpError(400,'Enter store settings.');
      const next = store.settings();
      for (const [key,value] of Object.entries(changes)) {
        if (Object.hasOwn(settingTextLimits,key)) next[key] = plain(value,key,settingTextLimits[key]);
        else if (['shippingCents','freeShippingCents'].includes(key)) next[key] = integer(value,key,0,10000000);
        else if (key === 'taxRateBps') next[key] = integer(value,key,0,3000);
        else if (key === 'returnDays') next[key] = integer(value,key,0,365);
        else if (['allowCod','checkoutEnabled','newsletterEnabled'].includes(key)) next[key] = boolean(value,key);
        else if (key === 'supportEmail') next[key] = value === '' ? '' : email(value);
        else if (key === 'featuredProductIds') {
          if (!Array.isArray(value) || value.length > 8 || new Set(value).size !== value.length || !value.every((id)=>db.prepare('SELECT id FROM products WHERE id=?').get(id))) throw new HttpError(400,'Choose up to eight different existing products for the homepage.');
          next[key] = value;
        } else throw new HttpError(400,`Unknown store setting: ${key}`);
      }
      store.transaction(()=>{
        if (input.version !== next.version) throw new HttpError(409,'Settings changed in another tab. Refresh before saving.');
        delete next.version;
        db.prepare('UPDATE store_settings SET data=?,version=version+1 WHERE id=1').run(JSON.stringify(next));
        audit(adminId,'update_settings','store');
      });
      send(res,200,{settings:store.settings()}); return true;
    }
    if (path === '/api/admin/orders' && req.method === 'GET') {
      const page = pagination(url), status = url.searchParams.get('status') || '';
      const where = "WHERE (reference LIKE ? OR customer LIKE ?) AND (?='' OR status=?)";
      const parameters = [page.pattern,page.pattern,status,status];
      send(res,200,{items:db.prepare(`SELECT * FROM orders ${where} ORDER BY created DESC,id LIMIT ? OFFSET ?`).all(...parameters,page.limit,page.offset).map(adminOrder),total:db.prepare(`SELECT COUNT(*) AS n FROM orders ${where}`).get(...parameters).n,...page}); return true;
    }
    const orderPath = /^\/api\/admin\/orders\/([a-f0-9-]{36})$/.exec(path);
    if (orderPath && req.method === 'PATCH') {
      const input = await body(req), id = orderPath[1];
      store.transaction(()=>{
        const row = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
        if (!row) throw new HttpError(404,'Order not found.');
        if (input.status !== undefined) {
          if (input.status === 'cancelled' && row.status === 'confirmed' && row.payment_method === 'cod') store.releaseOrder(row);
          else if (input.status === 'shipped' && row.status === 'confirmed' && (row.payment_method === 'cod' || row.payment_status === 'paid')) db.prepare("UPDATE orders SET status='shipped',updated=? WHERE id=?").run(Date.now(),id);
          else if (input.status === 'fulfilled' && ['confirmed','shipped'].includes(row.status) && (row.payment_status === 'paid' || (row.payment_method === 'cod' && input.collected === true))) db.prepare("UPDATE orders SET status='fulfilled',payment_status='paid',updated=? WHERE id=?").run(Date.now(),id);
          else if (input.status === 'confirmed' && row.status === 'payment_review' && row.payment_status === 'paid') {
            for (const item of JSON.parse(row.items)) {
              if (!db.prepare('UPDATE variants SET stock=stock-? WHERE product_id=? AND color=? AND size=? AND stock>=?').run(item.quantity,item.id,item.color,item.size,item.quantity).changes) throw new HttpError(409,'Not enough inventory to approve this payment. Arrange a refund through Stripe.');
            }
            db.prepare("UPDATE orders SET status='confirmed',updated=? WHERE id=?").run(Date.now(),id);
          } else throw new HttpError(409,'That order status change is unavailable. Paid refunds must be handled through Stripe.');
        }
        if (input.tracking !== undefined) db.prepare('UPDATE orders SET tracking=?,updated=? WHERE id=?').run(plain(input.tracking,'tracking information',300,true),Date.now(),id);
        if (input.adminNotes !== undefined) db.prepare('UPDATE orders SET admin_notes=?,updated=? WHERE id=?').run(plain(input.adminNotes,'internal notes',3000,true),Date.now(),id);
        audit(adminId,input.status ? `order_${input.status}` : 'update_order',id);
      });
      send(res,200,{order:adminOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(id))}); return true;
    }
    if (path === '/api/admin/customers' && req.method === 'GET') {
      const page = pagination(url), where = 'WHERE name LIKE ? OR email LIKE ?';
      const rows = db.prepare(`SELECT c.id,c.name,c.email,c.created,c.disabled,(SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id) AS orderCount FROM customers c ${where} ORDER BY created DESC,id LIMIT ? OFFSET ?`).all(page.pattern,page.pattern,page.limit,page.offset);
      send(res,200,{items:rows,total:db.prepare(`SELECT COUNT(*) AS n FROM customers ${where}`).get(page.pattern,page.pattern).n,...page}); return true;
    }
    const customerPath = /^\/api\/admin\/customers\/([a-f0-9-]{36})$/.exec(path);
    if (customerPath && req.method === 'PATCH') {
      const input = await body(req), id = customerPath[1];
      store.transaction(()=>{
        if (!db.prepare('SELECT id FROM customers WHERE id=?').get(id)) throw new HttpError(404,'Customer not found.');
        if (input.disabled === true && current.customer_id === id) throw new HttpError(400,'Sign out of this customer account before disabling it.');
        if (input.name !== undefined) db.prepare('UPDATE customers SET name=?,updated=? WHERE id=?').run(nameValue(input.name),Date.now(),id);
        if (input.disabled !== undefined) db.prepare('UPDATE customers SET disabled=?,updated=? WHERE id=?').run(Number(boolean(input.disabled,'account status')),Date.now(),id);
        if (input.revokeSessions !== undefined) boolean(input.revokeSessions,'session revocation');
        if (input.disabled === true || input.revokeSessions === true) {
          db.prepare('DELETE FROM sessions WHERE customer_id=?').run(id);
          db.prepare('DELETE FROM password_resets WHERE customer_id=?').run(id);
        }
        audit(adminId,'update_customer',id);
      });
      send(res,200,{message:'Customer account updated.'}); return true;
    }
    if (path === '/api/admin/subscribers' && req.method === 'GET') {
      const page = pagination(url);
      send(res,200,{items:db.prepare('SELECT email,created FROM subscribers WHERE email LIKE ? ORDER BY created DESC,email LIMIT ? OFFSET ?').all(page.pattern,page.limit,page.offset),total:db.prepare('SELECT COUNT(*) AS n FROM subscribers WHERE email LIKE ?').get(page.pattern).n,...page}); return true;
    }
    if (path.startsWith('/api/admin/subscribers/') && req.method === 'DELETE') {
      await body(req);
      let address; try { address = email(decodeURIComponent(path.slice('/api/admin/subscribers/'.length))); } catch { throw new HttpError(400,'Invalid subscriber email.'); }
      store.transaction(()=>{db.prepare('DELETE FROM subscribers WHERE email=?').run(address);audit(adminId,'remove_subscriber',address);});
      send(res,200,{message:'Subscriber removed.'}); return true;
    }
    if (path === '/api/admin/audit' && req.method === 'GET') {
      const page = pagination(url);
      send(res,200,{items:db.prepare('SELECT id,admin_id AS adminId,action,target,created FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?').all(page.limit,page.offset),total:db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n,...page}); return true;
    }
    if (path === '/api/admin/password' && req.method === 'POST') {
      limit(req,'admin-password',5,15*60000);
      const input = await body(req), account = db.prepare('SELECT * FROM admins WHERE id=?').get(adminId);
      const invalid = passwordError(input.newPassword,account.email);
      if (invalid || input.newPassword !== input.confirmPassword) throw new HttpError(400,invalid || 'The passwords do not match.');
      if (!await passwordMatchesAsync(input.currentPassword,account.password_hash)) throw new HttpError(400,'Your current password is incorrect.');
      if (input.currentPassword === input.newPassword) throw new HttpError(400,'Choose a different new password.');
      const password = await passwordHashAsync(input.newPassword);
      const rotated = store.transaction(()=>{
        if (!db.prepare('UPDATE admins SET password_hash=? WHERE id=? AND password_hash=?').run(password,adminId,account.password_hash).changes) throw new HttpError(409,'Your password changed. Sign in again.');
        const next = authentication.rotateSession(current,{inTransaction:true});
        db.prepare('DELETE FROM sessions WHERE admin_id=? AND id<>?').run(adminId,next.session.id);
        audit(adminId,'change_admin_password',adminId); return next;
      });
      cookie(res,rotated.secret,rotated.session.expires);
      send(res,200,{admin:true,user:publicCustomer(authentication.customer(rotated.session)),csrfToken:rotated.session.csrf,cart:store.cart(rotated.session.id)}); return true;
    }
    return false;
  }
  return { handle, mediaName };
}
