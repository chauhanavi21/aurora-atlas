import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp, configuration } from '../server/app.mjs';
import { passwordHash } from '../server/store.mjs';

const adminPassword='Meadow sunrise trail!52', customerPassword='Wandering river path!73';
const encodedAdmin=passwordHash(adminPassword);
const delivery={name:'Sample Customer',email:'sample@example.com',address1:'123 Sample Street',address2:'',city:'Austin',state:'TX',postalCode:'78701',country:'US'};
const option={id:'core',color:'obsidian',size:'M',quantity:1};
async function fixture(t,overrides={}) {
  const app=createApp({...configuration({}),databasePath:':memory:',...overrides});
  app.store.db.prepare('INSERT OR IGNORE INTO admins VALUES(?,?,?)').run('test-owner','owner@example.com',encodedAdmin);
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const origin=`http://127.0.0.1:${app.server.address().port}`;app.config.publicUrl=origin;
  t.after(async()=>{if(app.server.listening){const closed=once(app.server,'close');app.server.close();app.server.closeAllConnections();await closed;}});
  function client(){
    let cookie='',csrf='';
    async function request(path,{method='GET',body,headers={}}={}){
      const response=await fetch(origin+path,{method,headers:{Cookie:cookie,Origin:origin,...(method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];
      const bytes=await response.arrayBuffer();let data;try{data=JSON.parse(Buffer.from(bytes).toString());}catch{data=Buffer.from(bytes);}
      if(data.csrfToken)csrf=data.csrfToken;return{status:response.status,data,headers:response.headers,cookie};
    }
    return{request,init:()=>request('/api/session'),login:()=>request('/api/admin/login',{method:'POST',body:{email:'owner@example.com',password:adminPassword}}),async cart(items=[option]){const c=await request('/api/cart');return request('/api/cart',{method:'PUT',body:{items,version:c.data.version}});},async order(extra={}){const c=await request('/api/cart');return request('/api/orders',{method:'POST',body:{customer:delivery,requestKey:randomUUID(),paymentMethod:'cod',cartVersion:c.data.version,expectedTotalCents:c.data.totalCents,...extra}});}};
  }
  const admin=client();await admin.init();await admin.login();return{...app,origin,client,admin};
}
function sampleProduct(id='new-sample'){
  return{id,priceCents:4567,initialStock:7,active:false,product:{name:'Weekend Sample Shirt',type:'Everyday layering',category:'essentials',badge:'NEW',description:'A sample shirt for everyday plans.',details:'A simple sample shirt with a clean shape.',fit:'Choose your usual size.',care:'Follow the garment care label.',features:['Everyday styling','Easy layering'],gallery:['Full view','Upper detail','Fabric detail'],colors:['pictured'],sizes:['S','M'],images:{pictured:['assets/photos/core-obsidian-front.jpg']}}};
}
test('every management endpoint requires an administrator and valid CSRF tokens',async(t)=>{
  const app=await fixture(t),guest=app.client();await guest.init();
  for(const path of ['/api/admin/overview','/api/admin/customers','/api/admin/orders','/api/admin/subscribers','/api/admin/audit'])assert.equal((await guest.request(path)).status,401,path);
  for(const [path,method,body] of [['/api/admin/products','POST',sampleProduct()],['/api/admin/products/core','PATCH',{active:false}],['/api/admin/settings','PATCH',{settings:{allowCod:false},version:0}],['/api/admin/media','POST',{data:'not an image'}],['/api/admin/password','POST',{}]]){
    assert.equal((await guest.request(path,{method,body})).status,401,path);
    assert.equal((await app.admin.request(path,{method,body,headers:{'X-CSRF-Token':'invalid'}})).status,403,path);
  }
  await guest.request('/api/auth/register',{method:'POST',body:{name:'Sample Customer',email:'sample@example.com',password:customerPassword,confirmPassword:customerPassword}});
  assert.equal((await guest.request('/api/admin/products',{method:'POST',body:sampleProduct()})).status,401);
});

test('administrators create drafts, publish products, update all fields and options, and archive without deleting orders',async(t)=>{
  const app=await fixture(t),a=app.admin;
  const created=await a.request('/api/admin/products',{method:'POST',body:sampleProduct()});assert.equal(created.status,201);assert.equal(created.data.product.active,false);
  assert.equal((await a.request('/api/products/new-sample')).status,404);
  assert.equal((await a.request('/api/admin/products',{method:'POST',body:sampleProduct()})).status,409);
  const update=await a.request('/api/admin/products/new-sample',{method:'PATCH',body:{version:0,active:true,priceCents:4999,product:{name:'Updated Shirt & Layer',sizes:['M','L']},variants:[{color:'pictured',size:'M',stock:4},{color:'pictured',size:'L',stock:6}]}});
  assert.equal(update.status,200);assert.equal(update.data.product.version,1);assert.equal(update.data.product.price,49.99);assert.deepEqual(update.data.product.variants.map((v)=>v.size).sort(),['L','M']);
  const visible=(await a.request('/api/products/new-sample')).data.product;assert.equal(visible.name,'Updated Shirt & Layer');assert.equal(visible.images.pictured[0],'assets/photos/core-obsidian-front.jpg');
  assert.equal((await a.request('/api/admin/products/new-sample',{method:'PATCH',body:{version:0,priceCents:1}})).status,409);
  await a.cart([{id:'new-sample',color:'pictured',size:'M',quantity:1}]);const order=(await a.order()).data.order;
  assert.equal((await a.request('/api/admin/products/new-sample',{method:'DELETE',body:{version:1}})).status,200);
  assert.equal((await a.request('/api/products/new-sample')).status,404);assert.equal((await a.request('/api/orders/'+order.id)).data.order.items[0].name,'Updated Shirt & Layer');
  const overview=(await a.request('/api/admin/overview')).data;assert.equal(overview.counts.products,71);assert(overview.products.some((p)=>p.id==='new-sample'&&!p.active));
});

test('product validation rejects missing photos, traversal, unknown colors, invalid prices and duplicate inventory options atomically',async(t)=>{
  const app=await fixture(t),a=app.admin;
  for(const change of [{priceCents:1.5},{id:'../../private'},{product:{...sampleProduct().product,colors:['unknown']}},{product:{...sampleProduct().product,images:{pictured:['.data/aurora.sqlite']}}},{product:{...sampleProduct().product,images:{pictured:['assets/photos/missing.jpg']}}},{product:{...sampleProduct().product,sizes:['M','M']}}]){
    assert.equal((await a.request('/api/admin/products',{method:'POST',body:{...sampleProduct(),...change}})).status,400);
  }
  const before=(await a.request('/api/products/core')).data.product;
  assert.equal((await a.request('/api/admin/products/core',{method:'PATCH',body:{priceCents:1,variants:[{color:'obsidian',size:'M',stock:2},{color:'obsidian',size:'M',stock:4}]}})).status,400);
  const after=(await a.request('/api/products/core')).data.product;assert.equal(after.price,before.price);assert.deepEqual(after.variants,before.variants);
});

test('retired product options remain available for restoring old orders but cannot be bought again',async(t)=>{
  const app=await fixture(t),a=app.admin;await a.cart();const order=(await a.order()).data.order;
  const changed=await a.request('/api/admin/products/core',{method:'PATCH',body:{product:{sizes:['S']}}});assert.equal(changed.status,200);assert(changed.data.product.variants.every((v)=>v.size==='S'));
  assert.equal((await a.cart()).status,400);
  assert.equal((await a.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'cancelled'}})).status,200);
  assert.equal(app.store.db.prepare('SELECT stock,active FROM variants WHERE product_id=? AND color=? AND size=?').get('core','obsidian','M').stock,20);
  assert.equal((await a.request('/api/products/core')).data.product.variants.some((v)=>v.size==='M'),false);
  assert.equal((await a.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'cancelled'}})).status,409);
});

test('saved shipping, tax, checkout and newsletter settings govern real customer requests',async(t)=>{
  const app=await fixture(t),a=app.admin;await a.cart();const old=(await a.request('/api/cart')).data;
  const settings={shippingCents:500,freeShippingCents:50000,taxRateBps:1000,announcement:'A new everyday',heroTitle:'Explore\nsomething new.',featuredProductIds:['core'],supportEmail:'help@example.com'};
  assert.equal((await a.request('/api/admin/settings',{method:'PATCH',body:{version:0,settings}})).status,200);
  const session=(await a.request('/api/session')).data;assert.equal(session.settings.heroTitle,settings.heroTitle);assert.equal(session.settings.shippingCents,500);
  const cart=(await a.request('/api/cart')).data;assert.equal(cart.shippingCents,500);assert.equal(cart.taxCents,320);assert.equal(cart.totalCents,4020);
  assert.equal((await a.order({expectedTotalCents:old.totalCents})).status,409);
  assert.equal((await a.request('/api/admin/settings',{method:'PATCH',body:{version:0,settings:{allowCod:false}}})).status,409);
  assert.equal((await a.request('/api/admin/settings',{method:'PATCH',body:{version:1,settings:{stripeSecret:'secret'}}})).status,400);
  assert.equal((await a.request('/api/admin/settings',{method:'PATCH',body:{version:1,settings:{taxRateBps:10000}}})).status,400);
  const order=(await a.order()).data.order;
  await a.request('/api/admin/settings',{method:'PATCH',body:{version:1,settings:{checkoutEnabled:false,newsletterEnabled:false}}});await a.cart();
  assert.equal((await a.order()).status,503);assert.equal((await a.request('/api/newsletter',{method:'POST',body:{email:'new@example.com',consent:true}})).status,503);
  assert.equal((await a.request('/api/orders/'+order.id)).status,200,'Pausing checkout must preserve access to existing orders');
});

test('order tracking is public to the owner, internal notes stay private, and shipping never invents COD payment',async(t)=>{
  const app=await fixture(t),owner=app.client();await owner.init();await owner.cart();const order=(await owner.order()).data.order;
  const updated=await app.admin.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{tracking:'Example carrier: TRACK-123',adminNotes:'Private customer service note',status:'shipped'}});assert.equal(updated.status,200);assert.equal(updated.data.order.paymentStatus,'due_on_delivery');
  const visible=(await owner.request('/api/orders/'+order.id)).data.order;assert.equal(visible.status,'shipped');assert.equal(visible.tracking,'Example carrier: TRACK-123');assert.equal(visible.adminNotes,undefined);assert(!JSON.stringify(visible).includes('Private customer service note'));
  assert.equal((await app.admin.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'fulfilled'}})).status,409);
  assert.equal((await app.admin.request('/api/admin/orders/'+order.id,{method:'PATCH',body:{status:'fulfilled',collected:true}})).data.order.paymentStatus,'paid');
  const listed=await app.admin.request('/api/admin/orders?q='+order.reference+'&limit=1');assert.equal(listed.data.total,1);assert.equal(listed.data.items[0].adminNotes,'Private customer service note');
});

test('disabled customers lose their sessions and recovery links; names, account status and customer pagination are managed privately',async(t)=>{
  const app=await fixture(t),c=app.client();await c.init();const registered=await c.request('/api/auth/register',{method:'POST',body:{name:'Sample Customer',email:'sample@example.com',password:customerPassword,confirmPassword:customerPassword}});const id=registered.data.user.id;
  app.store.db.prepare('INSERT INTO password_resets VALUES(?,?,?)').run('a'.repeat(64),id,Date.now()+60000);
  const disabled=await app.admin.request('/api/admin/customers/'+id,{method:'PATCH',body:{disabled:true,name:'Sample Updated'}});assert.equal(disabled.status,200);assert.equal((await c.request('/api/account/orders')).status,401);await c.init();
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM password_resets WHERE customer_id=?').get(id).n,0);
  assert.equal((await c.request('/api/auth/login',{method:'POST',body:{email:'sample@example.com',password:customerPassword}})).status,401);
  const list=(await app.admin.request('/api/admin/customers?q=sample')).data;assert.equal(list.total,1);assert.equal(list.items[0].name,'Sample Updated');assert.equal(list.items[0].disabled,1);assert.equal(list.items[0].password_hash,undefined);
  await app.admin.request('/api/admin/customers/'+id,{method:'PATCH',body:{disabled:false}});assert.equal((await c.request('/api/auth/login',{method:'POST',body:{email:'sample@example.com',password:customerPassword}})).status,200);
  await app.admin.request('/api/admin/customers/'+id,{method:'PATCH',body:{revokeSessions:true}});assert.equal((await c.request('/api/account/orders')).status,401);
  assert.equal((await app.admin.request('/api/admin/customers?offset=-1')).status,400);
});

test('approving a late verified payment reserves inventory atomically and cannot reserve it twice',async(t)=>{
  const app=await fixture(t,{stripeEnabled:true}),a=app.admin;await a.cart();
  const session=app.store.db.prepare('SELECT id FROM sessions WHERE admin_id=?').get('test-owner'),cart=app.store.cart(session.id);
  const result=app.store.placeOrder(session.id,{customer:delivery,paymentMethod:'stripe',requestKey:randomUUID(),cartVersion:cart.version,expectedTotalCents:cart.totalCents});
  app.store.transaction(()=>app.store.releaseOrder(result.row));
  app.store.db.prepare("UPDATE orders SET status='payment_review',payment_status='paid' WHERE id=?").run(result.row.id);
  app.store.db.prepare('UPDATE variants SET stock=0 WHERE product_id=? AND color=? AND size=?').run('core','obsidian','M');
  assert.equal((await a.request('/api/admin/orders/'+result.row.id,{method:'PATCH',body:{status:'confirmed'}})).status,409);
  assert.equal(app.store.db.prepare('SELECT status FROM orders WHERE id=?').get(result.row.id).status,'payment_review');
  app.store.db.prepare('UPDATE variants SET stock=5 WHERE product_id=? AND color=? AND size=?').run('core','obsidian','M');
  assert.equal((await a.request('/api/admin/orders/'+result.row.id,{method:'PATCH',body:{status:'confirmed'}})).status,200);
  assert.equal((await a.request('/api/admin/orders/'+result.row.id,{method:'PATCH',body:{status:'confirmed'}})).status,409);
  assert.equal(app.store.db.prepare('SELECT stock FROM variants WHERE product_id=? AND color=? AND size=?').get('core','obsidian','M').stock,4);
});

test('subscribers and audit history support pagination and removal without exposing them publicly',async(t)=>{
  const app=await fixture(t);for(let i=0;i<25;i++)app.store.db.prepare('INSERT INTO subscribers VALUES(?,?)').run(`sample${i}@example.com`,Date.now()+i);
  const first=(await app.admin.request('/api/admin/subscribers?limit=20')).data,second=(await app.admin.request('/api/admin/subscribers?limit=20&offset=20')).data;assert.equal(first.total,25);assert.equal(first.items.length,20);assert.equal(second.items.length,5);
  const address=first.items[0].email;assert.equal((await app.admin.request('/api/admin/subscribers/'+encodeURIComponent(address),{method:'DELETE',body:{}})).status,200);assert.equal((await app.admin.request('/api/admin/subscribers?q='+encodeURIComponent(address))).data.total,0);
  const audit=(await app.admin.request('/api/admin/audit?limit=1')).data;assert.equal(audit.items[0].action,'remove_subscriber');assert.equal(audit.items[0].target,address);
});

test('uploaded photos are served from a narrow public route and may be assigned to new products',async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),'aurora-media-test-'));
  const app=await fixture(t,{uploadsPath:directory});
  t.after(async()=>{for(const filename of await readdir(directory))await rm(join(directory,filename));await rmdir(directory);});
  const bytes=await readFile('assets/photos/core-obsidian-front.jpg');
  const uploaded=await app.admin.request('/api/admin/media',{method:'POST',body:{data:bytes.toString('base64')}});assert.equal(uploaded.status,201);assert.match(uploaded.data.path,/^media\/[a-f0-9-]{36}\.jpg$/);
  const served=await app.admin.request('/'+uploaded.data.path);assert.equal(served.status,200);assert(served.data.equals(bytes));assert.equal(served.headers.get('content-type'),'image/jpeg');
  const input=sampleProduct();input.product.images.pictured=[uploaded.data.path];assert.equal((await app.admin.request('/api/admin/products',{method:'POST',body:input})).status,201);
  assert.equal((await app.admin.request('/api/admin/media',{method:'POST',body:{data:Buffer.from('<svg onload="alert(1)">'+'.'.repeat(100)+'</svg>').toString('base64')}})).status,400);
  assert.equal((await app.admin.request('/media/../../.data/admin-credentials.txt')).status,404);assert.equal((await app.admin.request('/.data/uploads/'+uploaded.data.path.slice(6))).status,404);
});

test('administrator password changes rotate credentials, revoke other sessions, and preserve password spaces',async(t)=>{
  const app=await fixture(t),other=app.client();await other.init();await other.login();const next='  Forest evening walk!94  ';
  const changed=await app.admin.request('/api/admin/password',{method:'POST',body:{currentPassword:adminPassword,newPassword:next,confirmPassword:next}});assert.equal(changed.status,200);assert.equal((await app.admin.request('/api/admin/overview')).status,200);assert.equal((await other.request('/api/admin/overview')).status,401);
  await other.init();assert.equal((await other.login()).status,401);assert.equal((await other.request('/api/admin/login',{method:'POST',body:{email:'owner@example.com',password:next}})).status,200);
});

test('catalog edits, archived products, retired variants and store settings survive reopening the local database',async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),'aurora-management-test-')),databasePath=join(directory,'local.sqlite');
  const app=await fixture(t,{databasePath});
  await app.admin.request('/api/admin/products/core',{method:'PATCH',body:{product:{name:'Permanent Sample Name',sizes:['S']},priceCents:4999,active:false}});
  await app.admin.request('/api/admin/settings',{method:'PATCH',body:{version:0,settings:{announcement:'A saved announcement',shippingCents:321}}});
  const closed=once(app.server,'close');app.server.close();app.server.closeAllConnections();await closed;
  const reopened=await fixture(t,{databasePath});const saved=reopened.store.products(true).find((p)=>p.id==='core');assert.equal(saved.name,'Permanent Sample Name');assert.equal(saved.price,49.99);assert.equal(saved.active,false);assert(saved.variants.every((v)=>v.size==='S'));assert.equal(reopened.store.settings().shippingCents,321);assert.equal(reopened.store.settings().announcement,'A saved announcement');
  t.after(async()=>{for(const filename of await readdir(directory))await rm(join(directory,filename),{force:true});await rmdir(directory);});
});
