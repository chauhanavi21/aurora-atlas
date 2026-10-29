// DOM and local-asset checks. This complements, but does not replace, Chrome layout checks.
// Usage: node scripts/verify-pages.mjs [path/to/happy-dom/lib/index.js]
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, readdir, rm, rmdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp, configuration } from '../server/app.mjs';
import { passwordHash } from '../server/store.mjs';

const { Window } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'happy-dom');
const catalogCode = await readFile('catalog.js', 'utf8');
const mainCode = await readFile('main.js', 'utf8');
const apiCode = await readFile('api.js', 'utf8');
const state = new Map();
const recoveryMessages = [];
let requestClock = Date.now();
const uploadsPath = await mkdtemp(join(tmpdir(),'aurora-ui-photos-'));
const app = createApp({ ...configuration({}), databasePath: ':memory:', uploadsPath }, { now:()=>requestClock, deliverReset: async (message) => { recoveryMessages.push(message); } });
app.store.db.prepare('INSERT INTO admins VALUES(?,?,?)').run('test-owner', 'owner@example.com', passwordHash('Test-owner-password-42'));
app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
const origin = `http://127.0.0.1:${app.server.address().port}`;
app.config.publicUrl = origin;
let cookie = '', pending = 0;
let window, document;
const runtimeErrors = [];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function load(path) {
  requestClock += 2000; // Simulate normal browsing time while exercising all 70 items without weakening production limits.
  if (window) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i); state.set(key, window.localStorage.getItem(key));
    }
    await window.happyDOM.abort();
  }
  const url = new URL(path, origin + '/');
  // Only our known local scripts are evaluated; external scripts and CSS never load.
  window = new Window({ url: url.href, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true, disableComputedStyleRendering: true } });
  document = window.document;
  window.addEventListener('error', (event) => { runtimeErrors.push(event.error?.stack || event.message); event.preventDefault(); });
  for (const [key, value] of state) window.localStorage.setItem(key, value);
  document.write(await readFile(url.pathname.slice(1) || 'index.html', 'utf8'));
  window.fetch = async (path, options = {}) => {
    pending++;
    try {
      const response = await fetch(new URL(path, origin), { ...options, signal: AbortSignal.timeout(10000), headers: { ...options.headers, Cookie: cookie, Origin: origin } });
      const next = response.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
      // Consume the body before declaring the request settled.
      const bytes = await response.arrayBuffer();
      return new Response(bytes, { status: response.status, headers: response.headers });
    } finally { pending--; }
  };
  window.eval(catalogCode);
  window.eval(apiCode);
  await window.AuroraAPI.ready;
  await window.eval(mainCode);
}
async function idle() {
  await delay(1);
  for (let i = 0; i < 400 && pending; i++) await delay(5);
  assert.equal(pending, 0, 'API requests did not settle');
  await delay(1);
  assert.deepEqual(runtimeErrors, [], 'Unexpected storefront error');
}
async function click(selector) {
  assert($(selector), 'Missing element: ' + selector); $(selector).click();
  await idle();
}
function input(selector, value, event = 'input') {
  $(selector).value = value; $(selector).dispatchEvent(new window.Event(event, { bubbles: true }));
}
async function submit() {
  $('#product-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await idle();
}
function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'Not a JPEG');
  let index = 2;
  while (index < bytes.length - 10) {
    if (bytes[index++] !== 0xff) continue;
    const marker = bytes[index++];
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return { height: bytes.readUInt16BE(index + 3), width: bytes.readUInt16BE(index + 5) };
    if (marker === 0xd8 || marker === 0xd9) continue;
    index += bytes.readUInt16BE(index);
  }
  throw new Error('JPEG dimensions missing');
}

try {
  await load('index.html');
  assert.equal($$('#product-grid .product-card').length, 4);
  assert.equal($('.hero-copy .button').getAttribute('href'), 'shop.html');
  assert.equal($('.hero-feature [data-product]').tagName, 'A');
  assert.equal($('script[src="scene.js"]') !== null, true);
  assert.equal($('#product-dialog'), null, 'Product links should open pages, not a modal');
  const { products, colors } = window.AuroraCatalog;
  const totalPhotos = products.reduce((sum,product)=>sum+product.colors.reduce((count,color)=>count+(product.images?.[color]?.length || 1),0),0);
  assert.equal(products.length,70,'The collection should contain the original 20 and 50 additional samples');
  assert.equal(new Set(products.map((product) => product.id)).size, products.length, 'Product IDs must be unique');
  assert.equal($('[data-category-count="all"]').textContent, String(products.length).padStart(2, '0'));
  assert.match($('.collection-count').textContent, new RegExp(`4 of ${products.length}`));
  assert($('#product-grid [data-product="cloud"]'), 'The homepage should introduce a new layer');
  assert($('#product-grid [data-product="horizon"]'), 'The homepage should introduce trousers');
  await click('[data-filter="bottoms"]');
  assert.equal($$('#product-grid .product-card').length, products.filter((product) => product.category === 'bottoms').length);
  assert.equal($('#view-all').getAttribute('href'), 'shop.html?category=bottoms');
  await click('[data-filter="all"]');
  const sources = [...JSON.parse(await readFile('assets/photos/sources.json','utf8')),...JSON.parse(await readFile('assets/photos/sample-sources.json','utf8'))];
  assert.equal(sources.length, totalPhotos);
  assert.equal(new Set(sources.map((source) => source.file)).size, totalPhotos);
  for (const file of ['style.css', 'pages.css', 'commerce.css', 'auth.css', 'admin.css']) {
    const stylesheet = new window.CSSStyleSheet();
    stylesheet.replaceSync(await readFile(file, 'utf8'));
    assert(stylesheet.cssRules.length > 20, 'Stylesheet could not be parsed: ' + file);
  }
  for (const product of products) {
    for (const color of product.colors) {
      assert(colors[color], 'Every product color must have a label and swatch');
      const paths=product.images?.[color] || ['assets/photos/'+product.id+'-'+color+'-front.jpg'];
      for(const path of paths){
        const filename=path.split('/').at(-1);
        assert(sources.some((source)=>source.file===filename&&source.url.startsWith('https://')&&source.credit));
        const bytes=await readFile(path);
        if(path.endsWith('.jpg')){const size=jpegSize(bytes);assert(size.width>=1200&&size.height>=1600,'Product photo is too small');}
        else {assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes.length>1000);}
      }
    }
  }
  console.log(`Homepage links, catalog integrity, source credits, and all ${totalPhotos} locally stored photographs passed.`);

  await load('shop.html?category=outerwear');
  assert.equal($$('#product-grid .product-card').length, products.filter((product) => product.category === 'outerwear').length);
  assert.equal($('#results-title').textContent, 'Outerwear');
  await click('[data-filter="all"]');
  input('#product-sort', 'price-low', 'change');
  assert.equal($('#product-grid h3').textContent, [...products].sort((a, b) => a.price - b.price)[0].name);
  input('#product-sort', 'price-high', 'change');
  assert.equal($('#product-grid h3').textContent, [...products].sort((a, b) => b.price - a.price)[0].name);
  input('#product-search', 'fleece');
  assert.equal($$('#product-grid .product-card').length, 1);
  assert.equal(new URLSearchParams(window.location.search).get('q'), 'fleece');
  input('#product-search', '<script>unknown</script>');
  assert.equal($('#no-results').hidden, false);
  assert.equal($('#product-grid script'), null);
  await click('#reset-collection');
  assert.equal($$('#product-grid .product-card').length, products.length);
  for (const category of new Set(products.map((product) => product.category))) {
    await click(`[data-filter="${category}"]`);
    const expected = products.filter((product) => product.category === category).length;
    assert.equal($$('#product-grid .product-card').length, expected);
    assert.equal($(`[data-category-count="${category}"]`).textContent, String(expected).padStart(2, '0'));
    assert.equal(new URLSearchParams(window.location.search).get('category'), category);
  }
  await click('[data-filter="all"]');
  input('#product-sort', 'name', 'change');
  assert.deepEqual($$('#product-grid h3').map((element) => element.textContent), Array.from(products, (product) => product.name).sort((a, b) => a.localeCompare(b)));
  await click('.mobile-menu-trigger');
  assert.equal($('.mobile-nav').hidden, false);
  await click('.mobile-menu-trigger');
  assert.equal($('.mobile-nav').hidden, true);
  for (const link of $$('a[href]')) {
    const url = new URL(link.getAttribute('href'), window.location.href);
    if (url.origin === window.location.origin) await access(url.pathname.slice(1) || 'index.html');
  }
  console.log('Shop categories, sorting, search, empty results, mobile menu, and local links passed.');

  await load('product.html?id=boreal&color=teal');
  await click('[data-save-product="boreal"]');
  assert.equal($('[data-save-product="boreal"]').getAttribute('aria-pressed'),'true');
  assert.equal($('.saved-count').textContent,'1');
  await load('shop.html?saved=1');
  assert.equal($('#filter-saved').checked,true);
  assert.equal($('#results-title').textContent,'Saved products');
  assert.equal($$('#product-grid .product-card').length,1);
  assert.equal($('#product-grid [data-product]').dataset.product,'boreal');
  await click('[data-save-product="boreal"]');
  assert.equal($$('#product-grid .product-card').length,0);
  assert.equal($('#no-results').hidden,false);
  await click('#reset-collection');
  assert.equal($$('#product-grid .product-card').length,products.length);
  assert.equal(new URLSearchParams(window.location.search).has('saved'),false);
  input('#filter-min','30');input('#filter-max','80');
  let expectedFiltered=products.filter((p)=>p.price>=30 && p.price<=80);
  assert.equal($$('#product-grid .product-card').length,expectedFiltered.length);
  input('#filter-size','M','change');await click('#filter-stock');
  expectedFiltered=expectedFiltered.filter((p)=>p.variants.some((v)=>v.size==='M' && v.stock>0));
  assert.equal($$('#product-grid .product-card').length,expectedFiltered.length);
  const filterUrl=window.location.pathname+window.location.search;await load(filterUrl);
  assert.equal($('#filter-min').value,'30');assert.equal($('#filter-max').value,'80');assert.equal($('#filter-size').value,'M');assert.equal($('#filter-stock').checked,true);
  assert.equal($$('#product-grid .product-card').length,expectedFiltered.length);
  input('#filter-min','90');assert.equal($('#filter-error').hidden,false);assert.equal($$('#product-grid .product-card').length,0);
  await click('#clear-refinements');assert.equal($('#filter-error').hidden,true);assert.equal($$('#product-grid .product-card').length,products.length);
  const coreStock=app.store.db.prepare('SELECT stock FROM variants WHERE product_id=? AND size=?').all('core','M');
  app.store.db.prepare('UPDATE variants SET stock=0 WHERE product_id=? AND size=?').run('core','M');
  await load('shop.html?q=core&size=M&stock=1');
  assert.equal($$('#product-grid [data-product="core"]').length,0,'Availability must match the requested size');
  app.store.db.prepare('UPDATE variants SET stock=? WHERE product_id=? AND size=?').run(coreStock[0].stock,'core','M');
  await load('shop.html?size=invalid&min=-5');assert.equal($('#filter-size').value,'');assert.equal($('#filter-min').value,'');
  console.log('Saved products, combined price/size/stock filters, shared URLs, invalid ranges, and clearing filters passed.');
  await load('product.html?id=boreal&color=teal');
  assert.equal(document.title, 'Boreal Puffer — Aurora Atlas');
  assert.equal($('#detail-color-name').textContent, 'Deep teal');
  assert.match($('#detail-image').src, /boreal-teal-front.jpg/);
  assert.equal($('script[src="vendor/three.min.js"]'), null);
  await click('[data-gallery-index="1"]');
  assert.equal($('#detail-image').dataset.view, '1');
  await click('#gallery-zoom');
  assert.equal($('#image-dialog').open, true);
  await click('#image-dialog [data-gallery-step="1"]');
  assert.equal($('#detail-image').dataset.view, '2');
  await click('#image-dialog [data-close]');
  await click('[data-detail-color="obsidian"]');
  assert.equal($('#detail-image').dataset.view, '0');
  assert.match($('#detail-image').src, /boreal-obsidian-front.jpg/);
  assert.equal(new URLSearchParams(window.location.search).get('color'), 'obsidian');
  await submit();
  assert.equal($('#size-error').hidden, false);
  assert.equal($('#bag-dialog').open, false);
  await click('#size-guide-trigger');
  assert.equal($('#info-dialog').open, true);
  await click('#info-dialog [data-close]');
  await click('[data-size="M"]');
  await click('[data-purchase-step="1"]');
  await submit();
  assert.equal($('#bag-dialog').open, true);
  assert.equal($('.bag-count').textContent, '2');
  assert.equal($('#bag-subtotal').textContent, '$490');
  await click('[data-change="-1"]');
  assert.equal($('#bag-subtotal').textContent, '$245');
  await click('#checkout-trigger');
  assert.equal(window.location.pathname, '/checkout.html');
  console.log('Product pages, gallery, zoom, variant URLs, required sizes, quantity, and bag totals passed.');

  await load('shop.html');
  assert.equal($('.bag-count').textContent, '1', 'Bag should survive page navigation');
  await click('.bag-trigger');
  assert.match($('#bag-items img').src, /boreal-obsidian-front.jpg/);
  await load('product.html?id=transit');
  assert.equal($('#size-fieldset').hidden, true);
  await submit();
  assert.equal($('.bag-count').textContent, '2');
  assert.equal($('#bag-subtotal').textContent, '$310');
  await click('[data-remove="1"]');
  assert.equal($('.bag-count').textContent, '1');
  console.log('Cross-page bag persistence, original product photos in the bag, one-size purchases, and removal passed.');

  for (const product of products) {
    for (const color of product.colors) {
      await load('product.html?id=' + product.id + '&color=' + color);
      assert.equal($('#detail-title').textContent, product.name);
      assert.equal($('#detail-color-name').textContent, colors[color].name);
      assert.equal($$('[data-gallery-index]').length, 3);
      assert.equal($$('.related-products .product-card').length, 3);
      assert.equal($(`.related-products [data-product="${product.id}"]`), null);
      assert.equal($('.size-note').textContent, product.fit);
      assert.equal($('#detail-image').getAttribute('src'),window.AuroraCatalog.photo(product,color));
    }
    const previousCount = Number($('.bag-count').textContent);
    const previousTotal = Number($('#bag-subtotal').textContent.replace(/[^0-9.]/g, ''));
    if (product.sizes.length > 1) await click(`[data-size="${product.sizes.includes('M') ? 'M' : product.sizes[0]}"]`);
    await submit();
    assert.equal($('#bag-dialog').open, true,product.id+': '+$('#toast').textContent);
    assert.equal(Number($('.bag-count').textContent), previousCount + 1);
    assert.equal(Math.round(Number($('#bag-subtotal').textContent.replace(/[^0-9.]/g,''))*100),Math.round(previousTotal*100)+Math.round(product.price*100));
    assert($(`#bag-items a[href*="id=${product.id}"]`));
    assert($('.product-purchase > .eyebrow').textContent.endsWith(String(products.indexOf(product) + 1).padStart(3, '0')));
    await click(`[data-remove="${$$('#bag-items .bag-item').length-1}"]`); // Check each product without exceeding the real bag's 40-line limit.
  }
  await load('shop.html?category=bottoms&q=trousers&sort=price-low');
  assert.equal($('#product-search').value, 'trousers');
  assert.equal($('#product-sort').value, 'price-low');
  assert.equal($('#results-title').textContent, 'Bottoms');
  assert.equal($$('#product-grid .product-card').length, 2);
  assert.equal($('#product-grid h3').textContent, 'Traverse Easy Trousers');
  await load('product.html?id=polar&color=missing');
  assert.equal($('#detail-color-name').textContent, colors[products.find((product) => product.id === 'polar').colors[0]].name);
  console.log(`All ${products.length} products passed size selection, recommendations, and bag additions.`);
  await load('product.html?id=not-a-product');
  assert($('.product-not-found'));
  assert.equal($('.product-not-found a').getAttribute('href'), 'shop.html');
  await load('shop.html?category=not-a-category');
  assert.equal($$('#product-grid .product-card').length, products.length);
  const serverCount = $('.bag-count').textContent;
  state.set('aurora-atlas-bag-v1', '[null,{"id":"__proto__"},{"id":"missing"}]');
  await window.happyDOM.abort(); window = null;
  await load('index.html');
  assert.equal($('.bag-count').textContent, serverCount, 'The server bag should survive corrupt browser storage');
  const sceneCode = await readFile('scene.js', 'utf8');
  await window.eval(sceneCode);
  assert.equal($('#product-scene').hidden, true);
  await click('[data-hero-color="teal"]');
  assert.match($('.hero-feature [data-product]').href, /color=teal/);
  input('#newsletter-email', 'explorer@example.com');
  $('#newsletter-consent').checked = true;
  $('#newsletter-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await idle();
  assert.match($('#newsletter-message').textContent, /on the list/);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n, 1);
  console.log('All product/color URLs, missing products, invalid categories, corrupted storage, no-WebGL navigation, and newsletter passed.');
  await load('checkout.html');
  await window.eval(await readFile('checkout.js', 'utf8'));
  assert.equal($('#checkout-layout').hidden, false);
  assert.equal($$('#checkout-items .summary-item').length, window.AuroraAPI.cart.items.length);
  for (const [name, value] of Object.entries({ name:'Sample Customer', email:'checkout@example.com', address1:'123 Example Street', city:'Austin', state:'TX', postalCode:'78701' })) input(`[name="${name}"]`, value, 'change');
  $('#checkout-form').dispatchEvent(new window.Event('submit', { bubbles:true, cancelable:true }));
  await idle();
  assert.equal(window.location.pathname, '/order.html', $('#checkout-error').textContent);
  const placedUrl = window.location.href;
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 1);
  await load(placedUrl);
  await window.eval(await readFile('order.js', 'utf8'));
  assert.equal($('#order-content').hidden, false);
  assert.match($('#order-status').textContent, /confirmed.*due on delivery/);
  assert.match($('#order-reference').textContent, /^AA-/);
  assert.equal($('.bag-count').textContent, '0');
  await load('admin.html');
  await window.eval(await readFile('admin.js', 'utf8'));
  assert.equal($('#admin-login').hidden, false);
  assert.equal($('#admin-dashboard').hidden, true);
  input('#admin-login [name="email"]', 'owner@example.com');
  input('#admin-login [name="password"]', 'Test-owner-password-42');
  $('#admin-login').dispatchEvent(new window.Event('submit', { bubbles:true, cancelable:true }));
  await idle();
  assert.equal($('#admin-dashboard').hidden, false, $('#admin-error').textContent);
  assert.equal($$('.admin-order').length, 1);
  assert.match($('#panel-subscribers').textContent, /explorer@example.com/);
  await click('[data-admin-tab="reports"]');
  assert.equal($('#panel-reports').hidden,false);assert.equal($$('.report-metrics>div').length,4);
  assert.equal($$('.report-metrics strong')[0].textContent,'$0.00');
  assert.equal($$('.report-metrics strong')[2].textContent,'1');
  input('#report-days','7','change');await idle();assert.equal($$('.report-daily tbody tr').length,7);
  assert.match($('#report-chart-title').textContent,/7 days/);assert.equal($('.report-chart svg').getAttribute('role'),'img');
  await click('[data-admin-tab="orders"]');
  const exportedFiles=[],csvBlobs=[];
  window.URL.createObjectURL=(blob)=>{csvBlobs.push(blob);return 'blob:'+origin+'/test-export';};window.URL.revokeObjectURL=()=>{};
  const anchorClick=window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click=function(){if(this.download)exportedFiles.push(this.download);else anchorClick.call(this);};
  await click('#export-orders');
  assert.deepEqual(exportedFiles,['aurora-orders.csv']);assert.match(await csvBlobs[0].text(),/Reference/);
  assert.match($('#admin-status').textContent,/exported/);assert.equal($('#admin-error').hidden,true);
  console.log('Admin sales metrics, report periods, accessible trends, daily totals, and order downloads passed.');
  await click('[data-admin-tab="inventory"]');
  assert.equal($('#panel-inventory').hidden, false);
  input('[data-product-id="core"] [name="variant"]', 'obsidian|M', 'change');
  input('[data-product-id="core"] [name="price"]', '39.99');
  // Happy DOM compares fractional number steps without browser rounding tolerance.
  // Server integer-cent validation is tested separately; retain the real HTML step=0.01.
  $('[data-product-id="core"] [name="price"]').step = 'any';
  input('[data-product-id="core"] [name="stock"]', '0');
  assert($('[data-product-id="core"]').checkValidity(), JSON.stringify([...$('[data-product-id="core"]').elements].map((element) => ({ name:element.name, value:element.value, validationMessage:element.validationMessage, valid:element.validity?.valid, stepMismatch:element.validity?.stepMismatch }))));
  $('[data-product-id="core"]').dispatchEvent(new window.Event('submit', { bubbles:true, cancelable:true }));
  await idle();
  assert.match($('#admin-status').textContent, /saved/, $('#admin-error').textContent);
  async function submitAdmin(selector){$(selector).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await idle();}
  await click('[data-admin-tab="products"]');
  assert.equal($$('.admin-product-row').length,70);
  await click('[data-edit-product="core"]');assert.equal($('#product-editor').open,true);
  input('#product-editor-form [name=name]','Core & <Layer> Tee');
  $('#product-editor-form [name=price]').step='any';
  await submitAdmin('#product-editor-form');assert.equal($('#product-editor').open,false,$('#product-editor-error').textContent);
  assert.match($('#admin-product-list').textContent,/Core & <Layer> Tee/);assert.equal($('#admin-product-list layer'),null,'Product names must be escaped in HTML');
  await click('#new-product');
  for(const [key,value] of Object.entries({name:'Sample Weekend Bag',id:'weekend-test',type:'An everyday carry',category:'accessories',price:'49',description:'A sample carry bag for weekend plans.',details:'A compact sample bag with a zip closure.',fit:'One size.',care:'Spot clean gently.',features:'Zip closure\nEveryday carry',sizes:'ONE SIZE',initialStock:'3'}))input(`#product-editor-form [name="${key}"]`,value,key==='sizes'?'change':'input');
  const photoInput=$('[data-upload-color=pictured]');
  Object.defineProperty(photoInput,'files',{configurable:true,value:[new window.File([await readFile('assets/photos/transit-moss-front.jpg')],'bag.jpg',{type:'image/jpeg'})]});
  photoInput.dispatchEvent(new window.Event('change',{bubbles:true}));
  for(let attempt=0;attempt<200&&$('#save-product').disabled;attempt++)await delay(10);
  await idle();assert.match($('[data-photo-paths=pictured]').value,/^media\//,$('#product-editor-error').textContent);
  $('#product-editor-form [name=active]').checked=true;
  await submitAdmin('#product-editor-form');assert.equal($('#product-editor').open,false,$('#product-editor-error').textContent);
  assert.equal($$('.admin-product-row').length,71);assert.equal((await window.AuroraAPI.request('/api/products/weekend-test')).product.variants[0].stock,3);
  await click('[data-publish-product="weekend-test"]');assert.equal(app.store.products().some((p)=>p.id==='weekend-test'),false);
  await click('[data-admin-tab=settings]');input('#store-settings-form [name=heroTitle]','Clothes & <great> days.');input('#store-settings-form [name=shipping]','4.25');input('#store-settings-form [name=tax]','7.5');input('#store-settings-form [name=supportEmail]','help@example.com');
  for(const element of $$('#store-settings-form input[type=number]'))element.step='any';
  for(const option of $('#store-settings-form [name=featuredProductIds]').options)option.selected=['core','weekend-test'].includes(option.value);
  await submitAdmin('#store-settings-form');assert.match($('#admin-status').textContent,/settings saved/,$('#admin-error').textContent);
  const customerId='b2dc2f90-755c-4abc-a945-afc1160c43b9';
  app.store.db.prepare('INSERT INTO customers(id,name,email,password_hash,created,updated) VALUES(?,?,?,?,?,?)').run(customerId,'Test Customer','test.customer@example.com',passwordHash('A private customer phrase!42'),Date.now(),Date.now());
  await click('#admin-refresh');await click('[data-admin-tab=customers]');window.confirm=()=>true;
  input(`[data-customer-form="${customerId}"] [name=name]`,'Customer Updated');await submitAdmin(`[data-customer-form="${customerId}"]`);
  await click(`[data-customer="${customerId}"][data-disabled=true]`);assert.match($('#customers-list').textContent,/Disabled/);
  await click(`[data-customer="${customerId}"][data-disabled=false]`);assert.match($('#customers-list').textContent,/Active/);
  app.store.db.prepare('DELETE FROM customers WHERE id=?').run(customerId);
  await click('[data-admin-tab=orders]');input('.order-management-form [name=tracking]','Local carrier TRACK-42');input('.order-management-form [name=adminNotes]','An internal sample note');await submitAdmin('.order-management-form');
  await click('[data-order][data-status=shipped]');assert.match($('#orders-list').textContent,/shipped/);
  await load(placedUrl);await window.eval(await readFile('order.js','utf8'));assert.match($('#order-status').textContent,/shipped.*TRACK-42/);assert(!$('#order-content').textContent.includes('An internal sample note'));
  await load('index.html');assert.equal($('#hero-heading').textContent,'Clothes & <great> days.');assert.equal($('#hero-heading great'),null);assert.equal($$('#product-grid .product-card').length,1,'Archived featured products must stay hidden');assert.equal($('#product-grid h3').textContent,'Core & <Layer> Tee');
  await click('[data-info=contact]');assert.match($('#info-body').textContent,/help@example.com/);
  console.log('Admin product creation, real photo uploads, safe product editing, publishing, settings, customer controls, shipment tracking, and private notes passed.');
  await load('product.html?id=core&color=obsidian');
  assert.match($('#detail-price').textContent, /39\.99/);
  await click('[data-size="M"]');
  assert.equal($('.add-to-bag').disabled, true);
  assert.match($('#stock-message').textContent, /sold out/);
  console.log('Connected checkout, persisted confirmation, admin login, inventory pricing, newsletter management, and sold-out options passed.');
  const authCode = await readFile('auth.js','utf8');
  async function loadAuth(path) { await load(path); window.eval(await readFile('auth-validation.js','utf8')); await window.eval(authCode); }
  async function sendForm(selector) { $(selector).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})); await idle(); }
  await load('product.html?id=cloud'); await click('[data-size="M"]'); await submit();
  await loadAuth('signup.html?next=https://attacker.example/');
  input('#name','N'); input('#email','invalid'); input('#password','short'); input('#confirmPassword','different'); await sendForm('#auth-form');
  assert.match($('#name-error').textContent,/name/); assert.match($('#email-error').textContent,/email/); assert.match($('#password-error').textContent,/12/); assert.match($('#confirmPassword-error').textContent,/match/);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM customers').get().n,0);
  const initialPassword = 'Early morning trail!82', updatedPassword = 'Evening mountain air!94';
  input('#name','Nova Sample'); input('#email','nova@example.com'); input('#password',initialPassword); input('#confirmPassword',initialPassword);
  await click('[data-toggle-password="password"]'); assert.equal($('#password').type,'text'); await click('[data-toggle-password="password"]'); assert.equal($('#password').type,'password');
  await sendForm('#auth-form'); assert.equal(window.location.pathname,'/account.html',$('#auth-message').textContent);
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM customers').get().n,1);
  await loadAuth('account.html'); assert.equal($('#account-content').hidden,false); assert.match($('#account-heading').textContent,/Nova/); assert.equal($('.account-label').textContent,'Account');
  assert.equal($$('.account-order').length,1,'The current guest order should be claimed by the new account');
  assert.equal($('.bag-count').textContent,'1','Signing up preserves the guest bag');
  input('#name','Nova Updated'); await sendForm('#profile-form'); assert.match($('#auth-success').textContent,/saved/);
  input('#currentPassword',initialPassword); input('#newPassword','short'); input('#confirmPassword','different'); await sendForm('#password-form'); assert.match($('#newPassword-error').textContent,/12/);
  input('#newPassword',updatedPassword); input('#confirmPassword',updatedPassword); await sendForm('#password-form'); assert.match($('#auth-success').textContent,/other devices/); assert.equal($('#newPassword').value,'');
  await click('#account-logout'); assert.equal(window.location.pathname,'/index.html');
  await loadAuth('account.html'); assert.equal(window.location.pathname,'/login.html'); assert.equal($('#account-content').hidden,true);
  await loadAuth('login.html?next=checkout.html'); input('#email','nova@example.com'); input('#password','Wrong password!123'); await sendForm('#auth-form'); assert.match($('#auth-message').textContent,/incorrect/);
  input('#password',updatedPassword); await sendForm('#auth-form'); assert.equal(window.location.pathname,'/checkout.html');
  await load('checkout.html'); await window.eval(await readFile('checkout.js','utf8')); assert.equal($('#checkout-form [name=name]').value,'Nova Updated'); assert.equal($('#checkout-form [name=email]').value,'nova@example.com'); assert.match($('#checkout-account').textContent,/Signed in/);
  for (const [name,value] of Object.entries({address1:'123 Sample Street',city:'Austin',state:'TX',postalCode:'78701'})) input(`#checkout-form [name="${name}"]`,value,'change');
  await sendForm('#checkout-form'); assert.equal(window.location.pathname,'/order.html');
  await loadAuth('account.html'); assert.equal($$('.account-order').length,2); await click('#account-logout');
  await loadAuth('forgot-password.html'); input('#email','nova@example.com'); await sendForm('#auth-form'); assert.match($('#auth-success').textContent,/recovery message/); assert.equal(recoveryMessages.length,1);
  const resetUrl = recoveryMessages[0].resetUrl;
  await loadAuth(resetUrl); assert.equal(window.location.hash,'','The reset token must be removed from the visible URL');
  const resetPassword = 'Golden afternoon walk!56'; input('#newPassword',resetPassword); input('#confirmPassword',resetPassword); await sendForm('#auth-form'); assert.equal(window.location.pathname,'/login.html');
  await loadAuth('login.html?reset=success'); assert.match($('#auth-success').textContent,/updated/); input('#email','nova@example.com'); input('#password',resetPassword); await sendForm('#auth-form'); assert.equal(window.location.pathname,'/account.html');
  for (let i=0;i<window.localStorage.length;i++) assert(![initialPassword,updatedPassword,resetPassword].some((password)=>window.localStorage.getItem(window.localStorage.key(i)).includes(password)));
  console.log('Signup validation, password visibility, safe redirects, account orders, profile changes, password changes, logout, login, checkout identity, and local recovery passed.');
  console.log('All DOM and local-asset checks passed against an isolated real API. Browser visual checks are a separate step.');
} finally {
  await window?.happyDOM.abort();
  const closed = once(app.server, 'close'); app.server.close(); app.server.closeAllConnections(); await closed;
  for(const filename of await readdir(uploadsPath))await rm(join(uploadsPath,filename));
  await rmdir(uploadsPath);
}
