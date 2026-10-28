// Browser checks with the installed Chrome and Node.js; no npm dependencies.
// Start the static server on port 4173 before running: node scripts/verify.mjs
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'aurora-atlas-browser-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9224', `--user-data-dir=${profile}`, 'about:blank'
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let browserLog = '';
chrome.stderr.on('data', (data) => { browserLog += data.toString(); });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 80; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9224/json')).json()).find((page) => page.type === 'page'); if (target) break; } catch {}
    await delay(150);
  }
  assert(target, 'Chrome remote debugging did not start. ' + browserLog.slice(-1800));
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const requests = new Map();
  const errors = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = requests.get(message.id);
      if (request) { requests.delete(message.id); message.error ? request.reject(message.error) : request.resolve(message.result); }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}. ${browserLog.slice(-2500)}`)), 15000);
    requests.set(id, { resolve: (result) => { clearTimeout(timeout); resolve(result); }, reject: (error) => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 100; i++) { try { if (await evaluate(expression)) return; } catch {} await delay(100); }
    throw new Error(`Timed out waiting for: ${expression}`);
  };
  const click = async (selector) => {
    const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing click target'); el.scrollIntoView({block:'center',behavior:'instant'}); const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  };
  const screenshot = async (name, full = false) => {
    const options = { format: 'png', captureBeyondViewport: full };
    if (full) {
      const { cssContentSize } = await command('Page.getLayoutMetrics');
      options.clip = { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 };
    }
    const image = await command('Page.captureScreenshot', options);
    await writeFile(join('screenshots', name), Buffer.from(image.data, 'base64'));
  };
  await mkdir('screenshots', { recursive: true });
  await command('Runtime.enable');
  await command('Page.enable');
  const navigate = async (path, condition) => {
    const url = new URL(path || '/', 'http://127.0.0.1:4173/').href;
    await command('Page.navigate', { url });
    await waitFor('location.href === ' + JSON.stringify(url) + ' && document.readyState === "complete" && (' + condition + ')');
  };
  const loadPhotos = async () => evaluate('Promise.all([...document.images].map(async image => { image.loading = "eager"; if (image.src) await image.decode(); }))');
  const checkOverflow = async (label) => assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, label + ' overflow');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await navigate('', 'document.querySelectorAll("#product-grid .product-card").length === 4 && !!document.querySelector(".hero-feature a")');
  await evaluate('document.fonts.ready');
  await loadPhotos();
  await delay(500);
  await checkOverflow('Homepage desktop');
  assert.equal(await evaluate('[...document.querySelectorAll("#product-grid img")].every(image => image.naturalWidth > 0 && image.src.includes("/assets/photos/"))'), true);
  await screenshot('desktop.png');
  await screenshot('desktop-full.png', true);
  console.log('Homepage 3D: ' + await evaluate('document.querySelector("#product-scene").hidden ? "fallback" : "active"'));
  await click('[data-hero-color="teal"]');
  await click('.hero-feature [data-product="boreal"]');
  await waitFor('document.body.dataset.page === "product" && document.querySelector("#detail-title")?.textContent === "Boreal Puffer"');
  assert.equal(await evaluate('document.querySelector("#detail-color-name").textContent'), 'Deep teal');
  assert.equal(await evaluate('typeof window.THREE'), 'undefined', 'Product pages must not load the 3D renderer');
  assert.equal(await evaluate('location.search.includes("id=boreal")'), true);
  await loadPhotos();
  await checkOverflow('Product desktop');
  await screenshot('product-desktop.png');
  await screenshot('product-full.png', true);
  await click('[data-gallery-index="1"]');
  assert.equal(await evaluate('document.querySelector("#detail-image").dataset.view'), '1');
  await click('#gallery-zoom');
  assert.equal(await evaluate('document.querySelector("#image-dialog").open'), true);
  await click('#image-dialog [data-gallery-step="1"]');
  assert.equal(await evaluate('document.querySelector("#detail-image").dataset.view'), '2');
  await click('#image-dialog [data-close]');
  await click('[data-detail-color="obsidian"]');
  await waitFor('document.querySelector("#detail-image").complete && document.querySelector("#detail-image").naturalWidth > 0');
  assert.match(await evaluate('document.querySelector("#detail-image").src'), /boreal-obsidian-front/);
  assert.equal(await evaluate('new URLSearchParams(location.search).get("color")'), 'obsidian');
  assert.equal(await evaluate('document.querySelector("#detail-image").dataset.view'), '0');
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate('document.querySelector("#size-error").hidden'), false);
  assert.equal(await evaluate('document.querySelector("#bag-dialog").open'), false);
  await click('#size-guide-trigger');
  assert.equal(await evaluate('document.querySelector("#info-dialog").open'), true);
  await click('#info-dialog [data-close]');
  await click('[data-size="M"]');
  await click('[data-purchase-step="1"]');
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate('document.querySelector("#bag-dialog").open'), true);
  assert.equal(await evaluate('document.querySelector(".bag-count").textContent'), '2');
  assert.equal(await evaluate('document.querySelector("#bag-subtotal").textContent'), '$490');
  await click('[data-change="-1"]');
  assert.equal(await evaluate('document.querySelector("#bag-subtotal").textContent'), '$245');
  await screenshot('bag.png');
  await click('#checkout-trigger');
  assert.match(await evaluate('document.querySelector("#info-body").textContent'), /payments are not connected/);
  await click('#info-dialog [data-close]');
  await click('#bag-dialog [data-close]');
  await evaluate('window.__verificationBeforeReload = true');
  await command('Page.reload');
  await waitFor('!window.__verificationBeforeReload && document.querySelector(".bag-count")?.textContent === "1" && document.querySelector("#detail-title")?.textContent === "Boreal Puffer"');
  assert.equal(await evaluate('document.querySelector("#detail-color-name").textContent'), 'Obsidian');
  console.log('Product links, shareable color URLs, photo gallery, zoom, size validation, quantities, and saved bag passed.');

  await click('.desktop-nav [data-nav-filter="all"]');
  await waitFor('document.body.dataset.page === "shop" && document.querySelectorAll("#product-grid .product-card").length === window.AuroraCatalog.products.length');
  assert.equal(await evaluate('document.querySelector(".bag-count").textContent'), '1');
  await loadPhotos();
  await evaluate('document.fonts.ready');
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await checkOverflow('Shop desktop');
  await screenshot('shop-desktop.png');
  await screenshot('shop-full.png', true);
  await click('[data-filter="outerwear"]');
  assert.equal(await evaluate('document.querySelectorAll("#product-grid .product-card").length'), 2);
  assert.equal(await evaluate('new URLSearchParams(location.search).get("category")'), 'outerwear');
  await click('[data-filter="all"]');
  await evaluate('document.querySelector("#product-sort").value="price-low"; document.querySelector("#product-sort").dispatchEvent(new Event("change"))');
  assert.equal(await evaluate('document.querySelector("#product-grid h3").textContent'), await evaluate('[...window.AuroraCatalog.products].sort((a,b) => a.price-b.price)[0].name'));
  await evaluate('document.querySelector("#product-sort").value="price-high"; document.querySelector("#product-sort").dispatchEvent(new Event("change"))');
  assert.equal(await evaluate('document.querySelector("#product-grid h3").textContent'), 'Boreal Puffer');
  await evaluate('document.querySelector("#product-search").value="fleece"; document.querySelector("#product-search").dispatchEvent(new Event("input"))');
  assert.equal(await evaluate('document.querySelectorAll("#product-grid .product-card").length'), 1);
  await evaluate('window.__verificationBeforeReload = true');
  await command('Page.reload');
  await waitFor('!window.__verificationBeforeReload && document.querySelector("#product-search")?.value === "fleece" && document.querySelectorAll("#product-grid .product-card").length === 1');
  await evaluate('document.querySelector("#product-search").value="no-such-piece"; document.querySelector("#product-search").dispatchEvent(new Event("input"))');
  assert.equal(await evaluate('document.querySelector("#no-results").hidden'), false);
  await click('#reset-collection');
  assert.equal(await evaluate('document.querySelectorAll("#product-grid .product-card").length'), await evaluate('window.AuroraCatalog.products.length'));
  await click('[data-filter="accessories"]');
  await click('#product-grid [data-product="transit"]');
  await waitFor('document.querySelector("#detail-title")?.textContent === "Transit Crossbody"');
  assert.equal(await evaluate('document.querySelector("#size-fieldset").hidden'), true);
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate('document.querySelector(".bag-count").textContent'), '2');
  assert.equal(await evaluate('document.querySelector("#bag-subtotal").textContent'), '$310');
  await click('[data-remove="1"]');
  await click('#bag-dialog [data-close]');
  console.log('Shop page, navigation, search, sorting, filter URLs, reloads, one-size products, and cross-page bag passed.');

  const productIds = await evaluate('window.AuroraCatalog.products.map(product => product.id)');
  for (const id of productIds) {
    await navigate('product.html?id=' + id, '!!document.querySelector("#detail-title")');
    await loadPhotos();
    assert.equal(await evaluate('document.querySelector("#detail-image").naturalWidth > 0'), true, id + ' photo failed');
    const availableColors = await evaluate('[...document.querySelectorAll("[data-detail-color]")].map(button => button.dataset.detailColor)');
    for (const color of availableColors) {
      await click('[data-detail-color="' + color + '"]');
      await waitFor('document.querySelector("#detail-image").complete && document.querySelector("#detail-image").naturalWidth > 0');
      assert.equal(await evaluate('document.querySelector("#detail-image").src.includes("-' + color + '-front.jpg")'), true);
    }
  }
  console.log('All catalog colorway photos loaded successfully.');

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('shop.html', 'document.body.dataset.page === "shop" && document.querySelectorAll("#product-grid .product-card").length === window.AuroraCatalog.products.length');
  await loadPhotos();
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await checkOverflow('Shop mobile');
  await screenshot('shop-mobile.png');
  await click('.mobile-menu-trigger');
  assert.equal(await evaluate('document.querySelector(".mobile-nav").hidden'), false);
  await click('.mobile-nav a[href="shop.html?category=outerwear"]');
  await waitFor('new URLSearchParams(location.search).get("category") === "outerwear" && document.querySelectorAll("#product-grid .product-card").length === 2');
  await click('#product-grid [data-product="boreal"]');
  await waitFor('document.querySelector("#detail-title")?.textContent === "Boreal Puffer"');
  await loadPhotos();
  await checkOverflow('Product mobile');
  await screenshot('product-mobile.png', true);
  await click('[data-detail-color="teal"]');
  await click('[data-size="L"]');
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate('document.querySelector("#bag-dialog").open'), true);
  await click('#bag-dialog [data-close]');
  await navigate('index.html', 'document.body.dataset.page === "home" && document.querySelectorAll("#product-grid .product-card").length === 4');
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await checkOverflow('Homepage mobile');
  await screenshot('mobile.png');
  await evaluate('document.querySelector("#newsletter-email").value="explorer@example.com"; document.querySelector("#newsletter-form").requestSubmit()');
  assert.match(await evaluate('document.querySelector("#newsletter-message").textContent'), /saved in this browser/);
  console.log('Mobile shop, real navigation, product photos, variant selection, bag, and newsletter passed.');

  for (const width of [768, 900]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1024, deviceScaleFactor: 1, mobile: false });
    for (const path of ['index.html', 'shop.html', 'product.html?id=horizon']) {
      await navigate(path, '!!window.AuroraCatalog && !!document.querySelector(".bag-trigger")');
      await checkOverflow(`${path} at ${width}px`);
    }
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  for (const path of ['shop.html', 'product.html?id=boreal', 'index.html']) {
    await navigate(path, 'document.readyState === "complete" && !!document.querySelector(".bag-count")');
    await checkOverflow('320px ' + path);
  }
  await navigate('product.html?id=not-a-product', '!!document.querySelector(".product-not-found")');
  assert.equal(await evaluate('document.querySelector(".product-not-found a").getAttribute("href")'), 'shop.html');
  await navigate('shop.html?category=invalid', 'document.querySelectorAll("#product-grid .product-card").length === window.AuroraCatalog.products.length');
  await command('Page.addScriptToEvaluateOnNewDocument', { source: 'const originalContext = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.includes("webgl") ? null : originalContext.call(this, type, ...args); };' });
  await navigate('index.html', 'document.querySelector("#product-scene")?.hidden && document.querySelectorAll("#product-grid .product-card").length === 4');
  await loadPhotos();
  assert.equal(await evaluate('[...document.querySelectorAll("#product-grid img")].every(image => image.naturalWidth > 0)'), true);
  await click('.hero-feature [data-product="boreal"]');
  await waitFor('document.querySelector("#detail-title")?.textContent === "Boreal Puffer"');
  assert.equal(await evaluate('document.querySelector("#detail-image").src.includes("/assets/photos/")'), true);
  console.log('320px layouts, unknown products, invalid categories, and photo shopping without WebGL passed.');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('All multipage browser checks passed. Previews saved in screenshots/.');
} finally {
  socket?.close();
  chrome.kill();
}
