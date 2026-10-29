import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, configuration } from '../server/app.mjs';
import { openStore } from '../server/store.mjs';

const password = 'Quiet forest mornings!83';
async function fixture(t) {
  const app = createApp({...configuration({}),databasePath:':memory:'});
  app.server.listen(0,'127.0.0.1'); await once(app.server,'listening');
  const origin = `http://127.0.0.1:${app.server.address().port}`; app.config.publicUrl = origin;
  t.after(async()=>{const closed=once(app.server,'close');app.server.close();app.server.closeAllConnections();await closed;});
  function client() {
    let cookie='',csrf='';
    async function request(path,method='GET',body,headers={}) {
      const res=await fetch(origin+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
      const data=await res.json();if(data.csrfToken)csrf=data.csrfToken;return {status:res.status,data};
    }
    return {request,init:()=>request('/api/session'),save:(id,saved=true)=>request('/api/saved-products/'+id,'PUT',{saved}),register:(address)=>request('/api/auth/register','POST',{name:'Sample Shopper',email:address,password,confirmPassword:password}),login:(address)=>request('/api/auth/login','POST',{email:address,password}),logout:()=>request('/api/auth/logout','POST',{})};
  }
  return {...app,client};
}

test('saved products are private, idempotent, validated, and protected against CSRF',async(t)=>{
  const app=await fixture(t),a=app.client(),b=app.client();await a.init();await b.init();
  assert.equal((await a.request('/api/saved-products/core','PUT',{saved:true},{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await a.request('/api/saved-products/core','PUT',{saved:true},{Origin:'https://example.com'})).status,403);
  assert.equal((await a.save('missing-product')).status,404);
  assert.equal((await a.save('core','true')).status,400);
  assert.deepEqual((await a.save('core')).data.savedProducts,['core']);
  assert.deepEqual((await a.save('core')).data.savedProducts,['core']);
  assert.deepEqual((await b.request('/api/saved-products')).data.savedProducts,[]);
  app.store.db.prepare('UPDATE products SET active=0 WHERE id=?').run('core');
  assert.deepEqual((await a.request('/api/saved-products')).data.savedProducts,[]);
  assert.equal((await a.save('core')).status,404);
  assert.equal((await a.save('core',false)).status,200,'Archived saves can still be removed');
});

test('guest saves merge into accounts, survive devices and session rotation, and stay private on logout',async(t)=>{
  const app=await fixture(t),first=app.client(),second=app.client();await first.init();await second.init();
  await first.save('core');const account=await first.register('shopper@example.com');assert.deepEqual(account.data.savedProducts,['core']);
  await second.save('boreal');await second.save('core');
  const merged=await second.login('shopper@example.com');assert.deepEqual(new Set(merged.data.savedProducts),new Set(['core','boreal']));
  assert.deepEqual(new Set((await first.init()).data.savedProducts),new Set(['core','boreal']));
  assert.deepEqual((await second.logout()).data.savedProducts,[]);
  await second.save('cloud');await second.register('different@example.com');
  assert.deepEqual((await second.init()).data.savedProducts,['cloud']);
  assert.deepEqual(new Set((await first.init()).data.savedProducts),new Set(['core','boreal']));
  await first.request('/api/account/password','POST',{currentPassword:password,newPassword:'Bright mountain daylight!94',confirmPassword:'Bright mountain daylight!94'});
  assert.deepEqual(new Set((await first.init()).data.savedProducts),new Set(['core','boreal']));
});

test('saved products persist across database restarts and bounded merges never exceed 100',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'aurora-saved-')),path=join(directory,'store.sqlite');let store;
  try {
    store=openStore(path,configuration({}));
    const guest=store.createSession().session;store.setSavedProduct(guest,'core',true);
    store.close();store=openStore(path,configuration({}));assert.deepEqual(store.savedProducts(guest),['core']);
    store.db.prepare('INSERT INTO customers(id,name,email,password_hash,created,updated) VALUES(?,?,?,?,?,?)').run('owner','Sample Shopper','owner@example.com','test-only',Date.now(),Date.now());
    const account=store.createSession(null,'owner').session;
    for(let i=0;i<100;i++){
      const id='test-product-'+i;store.db.prepare('INSERT INTO products(id,data,price_cents) VALUES(?,?,?)').run(id,'{}',100);
      store.setSavedProduct(account,id,true);
    }
    assert.throws(()=>store.setSavedProduct(account,'core',true),/up to 100/);
    assert.equal(store.setSavedProduct(account,'test-product-1',true).length,100);
    store.transaction(()=>store.moveSavedProducts(guest,account,false));assert.equal(store.savedProducts(account).length,100);
    store.setSavedProduct(account,'test-product-1',false);store.transaction(()=>store.moveSavedProducts(guest,account,false));
    assert(store.savedProducts(account).includes('core'));assert.equal(store.savedProducts(account).length,100);
  } finally {store?.close();for(const name of ['store.sqlite','store.sqlite-wal','store.sqlite-shm'])await rm(join(directory,name),{force:true});await rmdir(directory);}
});
