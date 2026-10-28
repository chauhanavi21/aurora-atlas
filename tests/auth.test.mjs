import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID, scryptSync } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { createApp, configuration } from '../server/app.mjs';
import { hash, passwordMatches, passwordHash } from '../server/store.mjs';

const password = 'Riverside morning!42';
const signup = (email = 'ava@example.com') => ({ name:'Ava Sample',email,password,confirmPassword:password });
const option = (quantity = 1) => ({ id:'core',color:'obsidian',size:'M',quantity });
const delivery = { name:'Ava Sample',email:'ava@example.com',address1:'123 Sample Street',address2:'',city:'Austin',state:'TX',postalCode:'78701',country:'US' };
async function fixture(t, overrides = {}, deliver = true) {
  const outbox = [];
  const app = createApp({ ...configuration({}),databasePath:':memory:',...overrides }, deliver ? { deliverReset:async(message) => { outbox.push(message); } } : {});
  app.server.listen(0,'127.0.0.1'); await once(app.server,'listening');
  t.after(async()=>{ if(!app.server.listening)return; const closed=once(app.server,'close'); app.server.close(); app.server.closeAllConnections(); await closed; });
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  function client(initial = {}) {
    let cookie = initial.cookie || '', csrf = initial.csrf || '';
    async function request(path,{method='GET',body,headers={}}={}) {
      const response=await fetch(origin+path,{method,headers:{Cookie:cookie,Origin:app.config.publicUrl,...(method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];
      const data=await response.json();if(data.csrfToken)csrf=data.csrfToken;
      return {status:response.status,data,cookie,csrf,headers:response.headers};
    }
    return { request, init:()=>request('/api/session'), register:(data=signup())=>request('/api/auth/register',{method:'POST',body:data}), login:(data={email:'ava@example.com',password})=>request('/api/auth/login',{method:'POST',body:data}), logout:()=>request('/api/auth/logout',{method:'POST',body:{}}), async cart(items){const current=await request('/api/cart');return request('/api/cart',{method:'PUT',body:{items,version:current.data.version}});}, async order(extra={}){const cart=await request('/api/cart');return request('/api/orders',{method:'POST',body:{customer:delivery,paymentMethod:'cod',cartVersion:cart.data.version,expectedTotalCents:cart.data.totalCents,requestKey:randomUUID(),...extra}});} };
  }
  return {...app,client,outbox};
}

test('signup validates names, email, password strength, confirmation and never grants admin access',async(t)=>{
  const app=await fixture(t),c=app.client();await c.init();
  for(const change of [{name:'A'},{name:'<script>alert(1)</script>'},{email:'bad..email@example.com'},{email:'name@-invalid.com'},{password:'short',confirmPassword:'short'},{password:'Password123!',confirmPassword:'Password123!'},{confirmPassword:'does not match'}]){
    const result=await c.register({...signup(),...change});assert.equal(result.status,400);assert(Object.keys(result.data.fields).length);
  }
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM customers').get().n,0);
  const result=await c.register({...signup(),role:'admin',admin_id:'owner'});assert.equal(result.status,201);assert.equal(result.data.admin,false);assert.equal(result.data.user.name,'Ava Sample');
  assert.equal(result.data.user.password_hash,undefined);assert.equal((await c.request('/api/admin/overview')).status,401);
});
test('normalized emails are unique and password hashes are salted with the configured scrypt work factor',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();await b.init();
  assert.equal((await a.register({...signup(),email:' AVA@EXAMPLE.COM '})).status,201);
  assert.equal((await b.register()).status,409);
  assert.equal((await b.register({...signup('ben@example.com'),name:'Ben Sample'})).status,201);
  const rows=app.store.db.prepare('SELECT * FROM customers').all();assert.equal(rows.length,2);assert.notEqual(rows[0].password_hash,rows[1].password_hash);assert.match(rows[0].password_hash,/^scrypt\$32768\$8\$3\$/);assert(passwordMatches(password,rows[0].password_hash));
  assert(rows.every((row)=>!JSON.stringify(row).includes(password)));
});
test('authentication rotates the guest cookie and CSRF token; logout revokes it and hides account data',async(t)=>{
  const app=await fixture(t),c=app.client();const guest=await c.init();await c.cart([option(2)]);
  const registered=await c.register();assert.notEqual(registered.cookie,guest.cookie);assert.notEqual(registered.csrf,guest.csrf);assert.match(registered.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  const age=Number(/Max-Age=(\d+)/.exec(registered.headers.get('set-cookie'))[1]);assert(age<=43200&&age>43000);
  assert.equal((await c.request('/api/cart',{headers:{Cookie:guest.cookie}})).status,401);assert.equal((await c.request('/api/cart')).data.items[0].quantity,2);
  const signedOut=await c.logout();assert.equal(signedOut.status,200);assert.equal(signedOut.data.user,null);assert.equal(signedOut.data.cart.items.length,0);
  assert.equal((await c.request('/api/account/orders')).status,401);assert.equal((await c.request('/api/cart',{headers:{Cookie:registered.cookie}})).status,401);
  const login=await c.login({email:'AVA@example.com',password,rememberMe:true});assert.equal(login.status,200);assert.equal(login.data.cart.items[0].quantity,2);assert(Number(/Max-Age=(\d+)/.exec(login.headers.get('set-cookie'))[1])>29*86400);
});

test('simultaneous signups for the same email return one account and a field error',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();await b.init();
  const results=await Promise.all([a.register(),b.register({...signup(),email:'AVA@example.com'})]);
  assert.deepEqual(results.map((result)=>result.status).sort(),[201,409]);
  assert.equal(results.find((result)=>result.status===409).data.fields.email,'This email is already registered.');
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM customers').get().n,1);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE customer_id IS NOT NULL').get().n,1);
});
test('sign-in uses generic failures and preserves password whitespace and Unicode',async(t)=>{
  const app=await fixture(t),c=app.client();await c.init();const raw='  Harbor sunlight 94!  ';
  await c.register({...signup(),password:raw,confirmPassword:raw});await c.logout();
  const missing=await c.login({email:'missing@example.com',password:raw});const wrong=await c.login({email:'ava@example.com',password:raw.trim()});assert.equal(missing.status,401);assert.equal(wrong.status,401);assert.equal(missing.data.error,wrong.data.error);
  assert.equal((await c.login({email:'ava@example.com',password:raw})).status,200);
  const unicode=Array.from({length:24},(_,i)=>String.fromCodePoint(0x1f600+i)).join('');
  const d=app.client();await d.init();await d.register({...signup('unicode@example.com'),password:unicode,confirmPassword:unicode});await d.logout();assert.equal((await d.login({email:'unicode@example.com',password:unicode})).status,200);
});
test('account bags persist across devices and combine with guest quantities without exceeding stock',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();await a.register();await a.cart([option(15)]);await b.init();await b.cart([option(10)]);
  const result=await b.login();assert.equal(result.status,200);assert.equal(result.data.bagAdjusted,true);assert.equal(result.data.cart.items[0].quantity,20);
  assert.equal((await a.request('/api/cart')).data.items[0].quantity,20);
  assert.equal((await a.cart([option(3)])).status,200);assert.equal((await b.request('/api/cart')).data.items[0].quantity,3);
});
test('only the current browser guest orders are attached, and account orders cannot be read by other customers',async(t)=>{
  const app=await fixture(t),a=app.client(),guest=app.client(),other=app.client(),secondDevice=app.client();
  await a.init();await guest.init();await a.cart([option()]);await guest.cart([option()]);
  const own=(await a.order()).data.order,unrelated=(await guest.order()).data.order;await a.register();
  const history=await a.request('/api/account/orders');assert.equal(history.data.total,1);assert.equal(history.data.orders[0].id,own.id);
  assert.equal((await a.request('/api/orders/'+unrelated.id)).status,404);
  await secondDevice.init();await secondDevice.login();assert.equal((await secondDevice.request('/api/orders/'+own.id)).status,200);
  await other.init();await other.register({...signup('ben@example.com'),name:'Ben Sample'});assert.equal((await other.request('/api/orders/'+own.id)).status,404);assert.equal((await other.request('/api/account/orders')).data.total,0);
  await a.logout();assert.equal((await a.request('/api/orders/'+own.id)).status,404);assert.equal((await guest.request('/api/orders/'+unrelated.id)).status,200);
});
test('account checkout remains idempotent across login rotations and records the account owner',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();const signedIn=await a.register();await a.cart([option()]);
  const key=randomUUID(),order=(await a.order({requestKey:key})).data.order;
  assert.equal(app.store.db.prepare('SELECT customer_id FROM orders WHERE id=?').get(order.id).customer_id,signedIn.data.user.id);
  await b.init();await b.login();const again=await b.order({requestKey:key});assert.equal(again.status,200);assert.equal(again.data.order.id,order.id);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});
test('profile validation and password changes require authentication and revoke all other sessions',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();const original=await a.register();await a.cart([option(2)]);await b.init();await b.login();
  assert.equal((await a.request('/api/account/profile',{method:'PATCH',body:{name:'Updated Name',email:'somebody@example.com'}})).status,400);
  const profile=await a.request('/api/account/profile',{method:'PATCH',body:{name:'Ava Updated'}});assert.equal(profile.data.user.name,'Ava Updated');
  const body={currentPassword:password,newPassword:'Sunlit mountain walk!78',confirmPassword:'Sunlit mountain walk!78'};
  assert.equal((await a.request('/api/account/password',{method:'POST',body:{...body,currentPassword:'incorrect'}})).status,400);
  assert.equal((await a.request('/api/account/password',{method:'POST',body:{...body,confirmPassword:'wrong'}})).status,400);
  const changed=await a.request('/api/account/password',{method:'POST',body});assert.equal(changed.status,200);assert.notEqual(changed.cookie,original.cookie);assert.equal(changed.data.cart.items[0].quantity,2);
  assert.equal((await b.request('/api/account/orders')).status,401);assert.equal((await a.request('/api/auth/me')).data.user.name,'Ava Updated');
  await a.logout();assert.equal((await a.login()).status,401);assert.equal((await a.login({email:'ava@example.com',password:body.newPassword})).status,200);
});
test('local recovery never returns a secret, stores only its hash, and uses a single expiring link',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();await a.register();await b.init();await b.login();
  const known=await a.request('/api/auth/forgot-password',{method:'POST',body:{email:'ava@example.com'}}),unknown=await a.request('/api/auth/forgot-password',{method:'POST',body:{email:'missing@example.com'}});assert.equal(known.status,202);assert.deepEqual(known.data,unknown.data);assert.equal(app.outbox.length,1);
  const link=new URL(app.outbox[0].resetUrl);assert.equal(link.search,'');const secret=new URLSearchParams(link.hash.slice(1)).get('token');assert(!JSON.stringify(known.data).includes(secret));assert.equal(app.store.db.prepare('SELECT token_hash FROM password_resets').get().token_hash,hash(secret));
  const body={token:secret,newPassword:'Evening coast path!92',confirmPassword:'Evening coast path!92'};
  assert.equal((await a.request('/api/auth/reset-password',{method:'POST',body:{...body,token:'0'.repeat(64)}})).status,400);
  const reset=await a.request('/api/auth/reset-password',{method:'POST',body});assert.equal(reset.status,200);assert.equal(reset.data.user,null);assert.equal((await b.request('/api/account/orders')).status,401);
  assert.equal((await a.request('/api/auth/reset-password',{method:'POST',body})).status,400);assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n,0);
  assert.equal((await a.login()).status,401);assert.equal((await a.login({email:'ava@example.com',password:body.newPassword})).status,200);
});
test('expired reset links fail and recovery is disabled in production without a delivery adapter',async(t)=>{
  const app=await fixture(t),a=app.client();await a.init();await a.register();await a.request('/api/auth/forgot-password',{method:'POST',body:{email:'ava@example.com'}});
  const secret=new URLSearchParams(new URL(app.outbox[0].resetUrl).hash.slice(1)).get('token');app.store.db.prepare('UPDATE password_resets SET expires=?').run(Date.now()-1);
  assert.equal((await a.request('/api/auth/reset-password',{method:'POST',body:{token:secret,newPassword:'A different password!72',confirmPassword:'A different password!72'}})).status,400);
  const prod=await fixture(t,{production:true,publicUrl:'https://store.example.com',localPasswordRecovery:false},false),p=prod.client();await p.init();
  assert.equal((await p.request('/api/auth/forgot-password',{method:'POST',body:{email:'anyone@example.com'}})).status,503);
});
test('persistent per-account throttling limits password guessing without storing raw email identifiers',async(t)=>{
  const app=await fixture(t),c=app.client();await c.init();await c.register();await c.logout();
  for(let i=0;i<10;i++)assert.equal((await c.login({email:'ava@example.com',password:'Incorrect password!9'})).status,401);
  assert.equal((await c.login()).status,429);const row=app.store.db.prepare('SELECT * FROM auth_failures').get();assert.match(row.key,/^[a-f0-9]{64}$/);assert.equal(row.attempts,10);
  app.store.db.prepare('UPDATE auth_failures SET expires=?').run(Date.now()-1);assert.equal((await c.login()).status,200);
});
test('authentication endpoints require CSRF; names and customer IDs cannot bypass server authorization',async(t)=>{
  const app=await fixture(t),c=app.client();await c.init();
  assert.equal((await c.request('/api/auth/register',{method:'POST',body:signup(),headers:{'X-CSRF-Token':'bad'}})).status,403);
  assert.equal((await c.request('/api/auth/register',{method:'POST',body:signup(),headers:{Origin:'https://attacker.example'}})).status,403);
  assert.equal((await c.request('/api/account/profile',{method:'PATCH',body:{name:'Another Person',customer_id:'owner'}})).status,401);
  assert(passwordMatches('Legacy admin!42',(()=>{const salt='a'.repeat(64);return `${salt}:${scryptSync('Legacy admin!42',salt,64).toString('hex')}`;})()));assert(!passwordMatches(password,'not a hash'));
});
test('the version-one local database migrates without losing sessions or orders and accounts survive restart',async(t)=>{
  const directory=await mkdtemp(join(tmpdir(),'aurora-auth-test-')),databasePath=join(directory,'local.sqlite');
  const legacy=new DatabaseSync(databasePath);
  legacy.exec(`CREATE TABLE sessions(id TEXT PRIMARY KEY,csrf TEXT NOT NULL,admin_id TEXT,expires INTEGER NOT NULL,cart_version INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE orders(id TEXT PRIMARY KEY,reference TEXT NOT NULL UNIQUE,session_id TEXT NOT NULL,request_key TEXT NOT NULL,customer TEXT NOT NULL,items TEXT NOT NULL,subtotal_cents INTEGER NOT NULL,shipping_cents INTEGER NOT NULL,tax_cents INTEGER NOT NULL,total_cents INTEGER NOT NULL,payment_method TEXT NOT NULL,payment_status TEXT NOT NULL,status TEXT NOT NULL,stripe_id TEXT UNIQUE,created INTEGER NOT NULL,updated INTEGER NOT NULL,expires INTEGER,UNIQUE(session_id,request_key)); PRAGMA user_version=1;`);
  legacy.prepare('INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)').run('legacy-session','legacy-csrf',Date.now()+86400000);
  legacy.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('legacy-order','AA-LEGACY','legacy-session','legacy-request',JSON.stringify(delivery),'[]',3200,995,0,4195,'cod','due_on_delivery','confirmed',null,Date.now(),Date.now(),null);legacy.close();
  const app=await fixture(t,{databasePath}),c=app.client();await c.init();const registered=await c.register();await c.cart([option(2)]);
  assert.equal(app.store.db.prepare('PRAGMA user_version').get().user_version,2);assert.equal(app.store.db.prepare("SELECT reference FROM orders WHERE id='legacy-order'").get().reference,'AA-LEGACY');
  const closed=once(app.server,'close');app.server.close();app.server.closeAllConnections();await closed;
  const reopened=await fixture(t,{databasePath}),restored=reopened.client({cookie:registered.cookie,csrf:registered.csrf});assert.equal((await restored.request('/api/auth/me')).data.user.email,'ava@example.com');assert.equal((await restored.request('/api/cart')).data.items[0].quantity,2);
  t.after(async()=>{for(const file of ['local.sqlite','local.sqlite-wal','local.sqlite-shm'])await rm(join(directory,file),{force:true});await rmdir(directory);});
});
