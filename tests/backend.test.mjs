import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp, configuration } from '../server/app.mjs';
import { passwordHash } from '../server/store.mjs';

const customer = { name:'Sample Customer',email:'customer@example.com',address1:'123 Example Street',address2:'',city:'Austin',state:'TX',postalCode:'78701',country:'US' };
const option = (quantity = 1) => ({ id:'core',color:'obsidian',size:'M',quantity });
async function fixture(t, overrides = {}, dependencies = {}) {
  const app = createApp({ ...configuration({}), databasePath:':memory:', ...overrides }, dependencies);
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  t.after(async () => { if (!app.server.listening) return; const closed = once(app.server,'close'); app.server.close(); app.server.closeAllConnections(); await closed; });
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  function client() {
    let cookie = '', csrf = '';
    async function request(path, { method='GET', body, headers={} } = {}) {
      const response = await fetch(origin + path, { method, headers: { Cookie:cookie, Origin:app.config.publicUrl, ...(method !== 'GET' ? { 'Content-Type':'application/json','X-CSRF-Token':csrf } : {}), ...headers }, ...(body !== undefined ? { body:typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
      const next = response.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
      const bytes = await response.text();
      let data; try { data = JSON.parse(bytes); } catch { data = bytes; }
      if (data?.csrfToken) csrf = data.csrfToken;
      return { status:response.status,data,headers:response.headers,cookie };
    }
    return { request, init:() => request('/api/session'), async cart(items, version) {
      const current = await request('/api/cart');
      return request('/api/cart',{method:'PUT',body:{items,version:version ?? current.data.version}});
    }, async checkout(extra={}) {
      const current = await request('/api/cart');
      return request('/api/orders',{method:'POST',body:{customer,paymentMethod:'cod',requestKey:randomUUID(),cartVersion:current.data.version,expectedTotalCents:current.data.totalCents,...extra}});
    } };
  }
  return { ...app, origin, client };
}

test('public catalog and static files are served without exposing source, secrets, or the database', async (t) => {
  const app = await fixture(t); const c = app.client();
  const catalog = await c.request('/api/products');
  assert.equal(catalog.status,200); assert.equal(catalog.data.products.length,20);
  assert(catalog.data.products.every((p) => p.variants.length && p.variants.every((v) => Number.isInteger(v.stock))));
  assert.equal((await c.request('/api/products/core')).data.product.price,32);
  assert.equal((await c.request('/api/products/missing')).status,404);
  for (const path of ['/','.data/aurora.sqlite','/server/app.mjs','/.env','/.git/config','/assets/../server/app.mjs','/assets/%2e%2e%2f.env']) {
    const response = await c.request(path.startsWith('/') ? path : '/' + path);
    assert.equal(response.status,path === '/' ? 200 : 404,path);
  }
  for (const path of ['/checkout.html','/order.html','/admin.html','/api.js','/commerce.css','/assets/photos/core-obsidian-front.jpg']) assert.equal((await c.request(path)).status,200,path);
});
test('guest sessions, CSRF, origin checks and cart versions protect writes', async (t) => {
  const app = await fixture(t); const c=app.client();
  const session=await c.init();
  assert.match(session.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  assert.equal((await c.request('/api/cart',{method:'PUT',body:{items:[option()],version:0},headers:{'X-CSRF-Token':'bad'}})).status,403);
  assert.equal((await c.request('/api/cart',{method:'PUT',body:{items:[option()],version:0},headers:{Origin:'https://attacker.example'}})).status,403);
  assert.equal((await c.request('/api/cart',{method:'PUT',body:{items:[option()],version:0},headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await c.cart([option(2)])).status,200);
  const stale=await c.cart([option()],0); assert.equal(stale.status,409); assert.equal(stale.data.cart.items[0].quantity,2);
  assert.equal((await c.request('/api/admin/overview')).status,401);
});
test('invalid options, fractions, duplicate variants, and unavailable stock are rejected', async(t)=>{
  const app=await fixture(t); const c=app.client(); await c.init();
  for (const items of [[option(1.5)],[option(-1)],[{...option(),size:'XXXL'}],[{...option(),id:'__proto__'}],[option(),option()]]) assert.equal((await c.cart(items)).status,400);
  assert.equal((await c.cart([option(21)])).status,409);
  assert.equal((await c.request('/api/cart')).data.items.length,0);
});
test('checkout persists immutable server-priced orders, decrements stock, clears the bag and is idempotent', async(t)=>{
  const app=await fixture(t); const c=app.client(); await c.init(); await c.cart([{...option(2),price:0,unitPriceCents:1}]);
  const key=randomUUID(); const result=await c.checkout({requestKey:key,totalCents:1});
  assert.equal(result.status,201); const order=result.data.order;
  assert.equal(order.subtotalCents,6400); assert.equal(order.shippingCents,995); assert.equal(order.totalCents,7395);
  assert.equal(order.paymentStatus,'due_on_delivery'); assert.equal(order.status,'confirmed');
  assert.equal((await c.request('/api/cart')).data.items.length,0);
  const again=await c.checkout({requestKey:key}); assert.equal(again.status,200); assert.equal(again.data.order.id,order.id);
  assert.equal(app.store.db.prepare("SELECT stock FROM variants WHERE product_id='core' AND color='obsidian' AND size='M'").get().stock,18);
  assert.equal((await c.request('/api/orders/'+order.id)).data.order.customer.email,customer.email);
  const stranger=app.client(); await stranger.init(); assert.equal((await stranger.request('/api/orders/'+order.id)).status,404);
});
test('a changed price requires customer review before any order or stock deduction',async(t)=>{
  const app=await fixture(t); const c=app.client(); await c.init(); const saved=await c.cart([option()]);
  app.store.db.prepare("UPDATE products SET price_cents=3999 WHERE id='core'").run();
  const result=await c.checkout({expectedTotalCents:saved.data.totalCents});
  assert.equal(result.status,409); assert.match(result.data.error,/total has changed/);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
  assert.equal(app.store.db.prepare("SELECT stock FROM variants WHERE product_id='core' AND color='obsidian' AND size='M'").get().stock,20);
});
test('a stock race rolls back the entire second checkout without overselling',async(t)=>{
  const app=await fixture(t); const a=app.client(),b=app.client(); await a.init(); await b.init();
  await a.cart([option(15)]); await b.cart([option(15)]);
  const results=await Promise.all([a.checkout(),b.checkout()]); assert.deepEqual(results.map((r)=>r.status).sort(),[201,409]);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(app.store.db.prepare("SELECT stock FROM variants WHERE product_id='core' AND color='obsidian' AND size='M'").get().stock,5);
});
test('shipping thresholds, tax, validation and empty bags are checked on the server',async(t)=>{
  const app=await fixture(t,{taxRateBps:825}); const c=app.client(); await c.init();
  assert.equal((await c.checkout()).status,400);
  await c.cart([option(5)]);
  assert.equal((await c.checkout({customer:{...customer,country:'GB'}})).status,400);
  assert.equal((await c.checkout({customer:{...customer,email:'bad'}})).status,400);
  assert.equal((await c.checkout({customer:{...customer,state:'ZZ'}})).status,400);
  assert.equal((await c.checkout({customer:{...customer,postalCode:'bad'}})).status,400);
  const result=await c.checkout(); assert.equal(result.data.order.shippingCents,0); assert.equal(result.data.order.taxCents,1320); assert.equal(result.data.order.totalCents,17320);
});
test('admin authentication rotates the session; inventory and order changes require authorization and are audited',async(t)=>{
  const app=await fixture(t); const c=app.client();
  app.store.db.prepare('INSERT INTO admins VALUES(?,?,?)').run('owner','owner@example.com',passwordHash('Strong-password-42'));
  const before=await c.init(); await c.cart([option()]); const order=(await c.checkout()).data.order;
  assert.equal((await c.request('/api/admin/login',{method:'POST',body:{email:'owner@example.com',password:'incorrect'}})).status,401);
  const login=await c.request('/api/admin/login',{method:'POST',body:{email:'owner@example.com',password:'Strong-password-42'}});
  assert.equal(login.status,200); assert.notEqual(before.cookie,login.cookie);
  assert.equal((await c.request('/api/orders/'+order.id)).status,200);
  const update=await c.request('/api/admin/products/core',{method:'PATCH',body:{priceCents:3999,color:'obsidian',size:'M',stock:7}});
  assert.equal(update.data.product.price,39.99); assert.equal(update.data.product.variants.find((v)=>v.color==='obsidian'&&v.size==='M').stock,7);
  const cancelled=await c.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'cancelled'}}); assert.equal(cancelled.data.order.status,'cancelled');
  assert.equal((await c.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'cancelled'}})).status,409);
  assert.equal(app.store.db.prepare("SELECT stock FROM variants WHERE product_id='core' AND color='obsidian' AND size='M'").get().stock,8);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n,2);
  await c.request('/api/admin/logout',{method:'POST',body:{}}); assert.equal((await c.request('/api/admin/overview')).status,401);
});
test('newsletter consent is required, saved once, and cannot be read by guests',async(t)=>{
  const app=await fixture(t); const c=app.client(); await c.init();
  assert.equal((await c.request('/api/newsletter',{method:'POST',body:{email:'person@example.com'}})).status,400);
  for(let i=0;i<2;i++) assert.equal((await c.request('/api/newsletter',{method:'POST',body:{email:'PERSON@example.com',consent:true}})).status,200);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n,1);
  assert.equal((await c.request('/api/admin/overview')).status,401);
});
test('Stripe uses server totals, verifies signed webhooks, preserves extra bag items and handles duplicate events',async(t)=>{
  let stripeBody;
  const app=await fixture(t,{stripeSecret:'sk_test_fake',stripeWebhookSecret:'whsec_fake',stripeEnabled:true},{fetch:async(url,options)=>{
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions'); stripeBody=options.body;
    return new Response(JSON.stringify({id:'cs_test_example',url:'https://checkout.stripe.com/c/pay/cs_test_example'}),{status:200,headers:{'Content-Type':'application/json'}});
  }});
  const c=app.client(); await c.init(); await c.cart([option(3)]);
  const placed=await c.checkout({paymentMethod:'stripe'}); assert.equal(placed.status,201); assert.match(placed.data.checkoutUrl,/checkout.stripe.com/);
  const order=placed.data.order; assert.equal(order.status,'awaiting_payment'); assert.equal(stripeBody.get('line_items[0][price_data][unit_amount]'),'3200');
  await c.cart([option(5)]);
  const event={id:'evt_verified',type:'checkout.session.completed',data:{object:{id:'cs_test_example',payment_status:'paid',amount_total:order.totalCents,currency:'usd',metadata:{order_id:order.id}}}};
  const bytes=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256','whsec_fake').update(timestamp+'.'+bytes).digest('hex');
  assert.equal((await c.request('/api/webhooks/stripe',{method:'POST',body:bytes,headers:{'stripe-signature':`t=${timestamp},v1=${'0'.repeat(64)}`}})).status,400);
  for(let i=0;i<2;i++) assert.equal((await c.request('/api/webhooks/stripe',{method:'POST',body:bytes,headers:{'stripe-signature':`t=${timestamp},v1=${signature}`}})).status,200);
  const confirmed=(await c.request('/api/orders/'+order.id)).data.order; assert.equal(confirmed.status,'confirmed'); assert.equal(confirmed.paymentStatus,'paid');
  assert.equal((await c.request('/api/cart')).data.items[0].quantity,2);
  assert.equal(app.store.db.prepare("SELECT stock FROM variants WHERE product_id='core' AND color='obsidian' AND size='M'").get().stock,17);
});
test('expired unpaid reservations restore stock exactly once and never fabricate a successful payment',async(t)=>{
  const app=await fixture(t,{stripeSecret:'test',stripeWebhookSecret:'test',stripeEnabled:true},{fetch:async()=>new Response(JSON.stringify({id:'cs_expire',url:'https://checkout.stripe.com/c/pay/cs_expire'}))});
  const c=app.client(); await c.init(); await c.cart([option(2)]); const order=(await c.checkout({paymentMethod:'stripe'})).data.order;
  app.store.db.prepare('UPDATE orders SET expires=? WHERE id=?').run(Date.now()-1,order.id);
  app.store.expireOrders(); app.store.expireOrders();
  const result=(await c.request('/api/orders/'+order.id)).data.order; assert.equal(result.status,'cancelled'); assert.equal(result.paymentStatus,'unpaid');
  assert.equal(app.store.db.prepare("SELECT stock FROM variants WHERE product_id='core' AND color='obsidian' AND size='M'").get().stock,20);
});
test('orders, session bags and administrator prices survive an application restart',async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),'aurora-atlas-test-')); const databasePath=join(directory,'test.sqlite');
  const app=await fixture(t,{databasePath}); const c=app.client(); await c.init(); await c.cart([option()]); const order=(await c.checkout()).data.order; await c.cart([{...option(),color:'navy'}]);
  app.store.db.prepare("UPDATE products SET price_cents=4999 WHERE id='core'").run();
  const closed=once(app.server,'close'); app.server.close(); app.server.closeAllConnections(); await closed;
  const reopened=createApp({...configuration({}),databasePath});
  assert.equal(reopened.store.products().find((p)=>p.id==='core').price,49.99);
  assert.equal(reopened.store.db.prepare('SELECT id FROM orders WHERE id=?').get(order.id).id,order.id);
  assert.equal(reopened.store.db.prepare('SELECT COUNT(*) AS n FROM cart_items').get().n,1);
  reopened.store.close();
  for (const name of ['test.sqlite','test.sqlite-wal','test.sqlite-shm']) await rm(join(directory,name),{force:true});
  await rmdir(directory);
});
test('production requires HTTPS and sets Secure session cookies',async(t)=>{
  assert.throws(()=>configuration({NODE_ENV:'production'}),/HTTPS/);
  const app=await fixture(t,{production:true,publicUrl:'https://store.example.com'}); const c=app.client();
  const response=await c.init(); assert.match(response.headers.get('set-cookie'),/; Secure/); assert.match(response.headers.get('strict-transport-security'),/max-age/);
});
