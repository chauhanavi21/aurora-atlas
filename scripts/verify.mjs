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
  assert(target, 'Chrome remote debugging did not start');
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
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
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
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await waitFor(`document.querySelectorAll('.product-card').length === 4 && document.querySelector('#product-grid img')?.complete`);
  await evaluate('document.fonts.ready');
  await delay(700);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Desktop overflow');
  await screenshot('desktop.png');
  await screenshot('desktop-full.png', true);
  const gpu = await evaluate(`!document.querySelector('#product-scene').hidden`);
  console.log(`3D renderer: ${gpu ? 'active' : 'fallback'}`);

  await click('[data-hero-color="moss"]');
  assert.equal(await evaluate(`document.querySelector('[data-hero-color="moss"]').getAttribute('aria-pressed')`), 'true');
  await click('[data-product="boreal"]');
  assert.equal(await evaluate(`document.querySelector('#detail-color-name').textContent`), 'Moss');
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate(`document.querySelector('#product-dialog').open`), true, 'Size is required');
  await click('[data-size="M"]');
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate(`document.querySelector('#bag-dialog').open`), true);
  assert.equal(await evaluate(`document.querySelector('.bag-count').textContent`), '1');
  assert.equal(await evaluate(`document.querySelector('#bag-subtotal').textContent`), '$245');
  await click('[data-change="1"]');
  assert.equal(await evaluate(`document.querySelector('#bag-subtotal').textContent`), '$490');
  await screenshot('bag.png');
  await click('#checkout-trigger');
  assert.match(await evaluate(`document.querySelector('#info-body').textContent`), /payments are not connected/);
  await click('#info-dialog [data-close]');
  await click('#bag-dialog [data-close]');
  await command('Page.reload');
  await waitFor(`document.querySelector('.bag-count')?.textContent === '2'`);
  console.log('Product variants, required sizes, bag totals, quantity, checkout disclosure, and persistence passed.');

  await click('[data-filter="accessories"]');
  assert.equal(await evaluate(`document.querySelectorAll('.product-card').length`), 1);
  await click('#product-grid [data-product="transit"]');
  assert.equal(await evaluate(`document.querySelector('#size-fieldset').hidden`), true);
  await click('#product-form button[type="submit"]');
  assert.equal(await evaluate(`document.querySelector('.bag-count').textContent`), '3');
  await click('[data-remove="1"]');
  await click('#bag-dialog [data-close]');
  await click('[data-filter="all"]');
  await click('.search-trigger');
  await evaluate(`document.querySelector('#product-search').value='fleece'; document.querySelector('#product-search').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`document.querySelectorAll('.product-card').length`), 1);
  await evaluate(`document.querySelector('#product-search').value='nonexistent'; document.querySelector('#product-search').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`document.querySelector('#no-results').hidden`), false);
  await click('#close-search');
  console.log('Collection filters, search, empty results, one-size products, and removal passed.');

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  await evaluate(`document.querySelector('#toast').classList.remove('visible')`);
  await delay(400);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Mobile overflow');
  await screenshot('mobile.png');
  await click('.mobile-menu-trigger');
  assert.equal(await evaluate(`document.querySelector('.mobile-nav').hidden`), false);
  await click('.mobile-nav [data-nav-filter="outerwear"]');
  assert.equal(await evaluate(`document.querySelector('.mobile-nav').hidden`), true);
  assert.equal(await evaluate(`document.querySelectorAll('.product-card').length`), 2);
  await click('#product-grid [data-product="boreal"]');
  await screenshot('mobile-product.png');
  await click('[data-detail-color="obsidian"]');
  assert.equal(await evaluate(`document.querySelector('#detail-color-name').textContent`), 'Obsidian');
  await click('[data-size="L"]');
  await click('#product-form button[type="submit"]');
  await click('#bag-dialog [data-close]');
  await evaluate(`document.querySelector('#newsletter-email').value='explorer@example.com'; document.querySelector('#newsletter-form').requestSubmit()`);
  assert.match(await evaluate(`document.querySelector('#newsletter-message').textContent`), /saved in this browser/);
  console.log('Mobile menu, mobile variants, mobile bag, layout, and newsletter passed.');

  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Narrow mobile overflow');
  assert.equal(await evaluate(`document.querySelector('#hero-heading').scrollWidth <= document.querySelector('#hero-heading').clientWidth`), true, 'Narrow mobile heading clipping');
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `const originalContext = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.includes('webgl') ? null : originalContext.call(this, type, ...args); };` });
  await command('Page.reload');
  await waitFor(`document.querySelector('#product-scene')?.hidden && document.querySelectorAll('.product-card').length === 4`);
  await click('[data-hero-color="moss"]');
  assert.equal(await evaluate(`document.querySelector('[data-hero-color="moss"]').getAttribute('aria-pressed')`), 'true');
  await click('#product-grid [data-product="boreal"]');
  assert.equal(await evaluate(`document.querySelector('#detail-color-name').textContent`), 'Moss');
  assert.equal(await evaluate(`document.querySelector('#detail-image').src.startsWith('data:image/svg+xml')`), true);
  console.log('320px layout and functional WebGL fallback passed.');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('All browser checks passed. Screenshots saved in screenshots/.');
} finally {
  socket?.close();
  chrome.kill();
}
