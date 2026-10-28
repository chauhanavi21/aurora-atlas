// DOM and local-asset checks. This complements, but does not replace, Chrome layout checks.
// Usage: node scripts/verify-pages.mjs [path/to/happy-dom/lib/index.js]
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { Window } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'happy-dom');
const catalogCode = await readFile('catalog.js', 'utf8');
const mainCode = await readFile('main.js', 'utf8');
const state = new Map();
let window, document;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function load(path) {
  if (window) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i); state.set(key, window.localStorage.getItem(key));
    }
    await window.happyDOM.abort();
  }
  const url = new URL(path, 'http://127.0.0.1:4173/');
  // Only our known local scripts are evaluated; external scripts and CSS never load.
  window = new Window({ url: url.href, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true, disableComputedStyleRendering: true } });
  document = window.document;
  for (const [key, value] of state) window.localStorage.setItem(key, value);
  document.write(await readFile(url.pathname.slice(1) || 'index.html', 'utf8'));
  window.eval(catalogCode);
  window.eval(mainCode);
}
function click(selector) {
  assert($(selector), 'Missing element: ' + selector); $(selector).click();
}
function input(selector, value, event = 'input') {
  $(selector).value = value; $(selector).dispatchEvent(new window.Event(event, { bubbles: true }));
}
function submit() {
  $('#product-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
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
  const totalPhotos = products.reduce((sum, product) => sum + product.colors.length, 0);
  assert.equal(new Set(products.map((product) => product.id)).size, products.length, 'Product IDs must be unique');
  assert.equal($('[data-category-count="all"]').textContent, String(products.length).padStart(2, '0'));
  assert.match($('.collection-count').textContent, new RegExp(`4 of ${products.length}`));
  assert($('#product-grid [data-product="cloud"]'), 'The homepage should introduce a new layer');
  assert($('#product-grid [data-product="horizon"]'), 'The homepage should introduce trousers');
  click('[data-filter="bottoms"]');
  assert.equal($$('#product-grid .product-card').length, products.filter((product) => product.category === 'bottoms').length);
  assert.equal($('#view-all').getAttribute('href'), 'shop.html?category=bottoms');
  click('[data-filter="all"]');
  const sources = JSON.parse(await readFile('assets/photos/sources.json', 'utf8'));
  assert.equal(sources.length, totalPhotos);
  assert.equal(new Set(sources.map((source) => source.file)).size, totalPhotos);
  for (const file of ['style.css', 'pages.css']) {
    const stylesheet = new window.CSSStyleSheet();
    stylesheet.replaceSync(await readFile(file, 'utf8'));
    assert(stylesheet.cssRules.length > 20, 'Stylesheet could not be parsed: ' + file);
  }
  for (const product of products) {
    for (const color of product.colors) {
      assert(colors[color], 'Every product color must have a label and swatch');
      const filename = product.id + '-' + color + '-front.jpg';
      assert(sources.some((source) => source.file === filename && source.url.startsWith('https://') && source.credit));
      const bytes = await readFile('assets/photos/' + filename);
      const size = jpegSize(bytes);
      assert(size.width >= 1200 && size.height >= 1600, 'Product photo is too small');
    }
  }
  console.log(`Homepage links, catalog integrity, source credits, and all ${totalPhotos} full-resolution photographs passed.`);

  await load('shop.html?category=outerwear');
  assert.equal($$('#product-grid .product-card').length, products.filter((product) => product.category === 'outerwear').length);
  assert.equal($('#results-title').textContent, 'Outerwear');
  click('[data-filter="all"]');
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
  click('#reset-collection');
  assert.equal($$('#product-grid .product-card').length, products.length);
  for (const category of new Set(products.map((product) => product.category))) {
    click(`[data-filter="${category}"]`);
    const expected = products.filter((product) => product.category === category).length;
    assert.equal($$('#product-grid .product-card').length, expected);
    assert.equal($(`[data-category-count="${category}"]`).textContent, String(expected).padStart(2, '0'));
    assert.equal(new URLSearchParams(window.location.search).get('category'), category);
  }
  click('[data-filter="all"]');
  input('#product-sort', 'name', 'change');
  assert.deepEqual($$('#product-grid h3').map((element) => element.textContent), Array.from(products, (product) => product.name).sort((a, b) => a.localeCompare(b)));
  click('.mobile-menu-trigger');
  assert.equal($('.mobile-nav').hidden, false);
  click('.mobile-menu-trigger');
  assert.equal($('.mobile-nav').hidden, true);
  for (const link of $$('a[href]')) {
    const url = new URL(link.getAttribute('href'), window.location.href);
    if (url.origin === window.location.origin) await access(url.pathname.slice(1) || 'index.html');
  }
  console.log('Shop categories, sorting, search, empty results, mobile menu, and local links passed.');

  await load('product.html?id=boreal&color=teal');
  assert.equal(document.title, 'Boreal Puffer — Aurora Atlas');
  assert.equal($('#detail-color-name').textContent, 'Deep teal');
  assert.match($('#detail-image').src, /boreal-teal-front.jpg/);
  assert.equal($('script[src="vendor/three.min.js"]'), null);
  click('[data-gallery-index="1"]');
  assert.equal($('#detail-image').dataset.view, '1');
  click('#gallery-zoom');
  assert.equal($('#image-dialog').open, true);
  click('#image-dialog [data-gallery-step="1"]');
  assert.equal($('#detail-image').dataset.view, '2');
  click('#image-dialog [data-close]');
  click('[data-detail-color="obsidian"]');
  assert.equal($('#detail-image').dataset.view, '0');
  assert.match($('#detail-image').src, /boreal-obsidian-front.jpg/);
  assert.equal(new URLSearchParams(window.location.search).get('color'), 'obsidian');
  submit();
  assert.equal($('#size-error').hidden, false);
  assert.equal($('#bag-dialog').open, false);
  click('#size-guide-trigger');
  assert.equal($('#info-dialog').open, true);
  click('#info-dialog [data-close]');
  click('[data-size="M"]');
  click('[data-purchase-step="1"]');
  submit();
  assert.equal($('#bag-dialog').open, true);
  assert.equal($('.bag-count').textContent, '2');
  assert.equal($('#bag-subtotal').textContent, '$490');
  click('[data-change="-1"]');
  assert.equal($('#bag-subtotal').textContent, '$245');
  click('#checkout-trigger');
  assert.match($('#info-body').textContent, /payments are not connected/);
  console.log('Product pages, gallery, zoom, variant URLs, required sizes, quantity, and bag totals passed.');

  await load('shop.html');
  assert.equal($('.bag-count').textContent, '1', 'Bag should survive page navigation');
  click('.bag-trigger');
  assert.match($('#bag-items img').src, /boreal-obsidian-front.jpg/);
  await load('product.html?id=transit');
  assert.equal($('#size-fieldset').hidden, true);
  submit();
  assert.equal($('.bag-count').textContent, '2');
  assert.equal($('#bag-subtotal').textContent, '$310');
  click('[data-remove="1"]');
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
      assert.match($('#detail-image').src, new RegExp(product.id + '-' + color + '-front.jpg'));
    }
    const previousCount = Number($('.bag-count').textContent);
    const previousTotal = Number($('#bag-subtotal').textContent.replace(/[^0-9]/g, ''));
    if (product.sizes.length > 1) click('[data-size="M"]');
    submit();
    assert.equal($('#bag-dialog').open, true);
    assert.equal(Number($('.bag-count').textContent), previousCount + 1);
    assert.equal(Number($('#bag-subtotal').textContent.replace(/[^0-9]/g, '')), previousTotal + product.price);
    assert($(`#bag-items a[href*="id=${product.id}"]`));
    assert($('.product-purchase > .eyebrow').textContent.endsWith(String(products.indexOf(product) + 1).padStart(3, '0')));  }
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
  state.set('aurora-atlas-bag-v1', '[null,{"id":"__proto__"},{"id":"missing"}]');
  await window.happyDOM.abort(); window = null;
  await load('index.html');
  assert.equal($('.bag-count').textContent, '0');
  const sceneCode = await readFile('scene.js', 'utf8');
  window.eval(sceneCode);
  assert.equal($('#product-scene').hidden, true);
  click('[data-hero-color="teal"]');
  assert.match($('.hero-feature [data-product]').href, /color=teal/);
  input('#newsletter-email', 'explorer@example.com');
  $('#newsletter-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.match($('#newsletter-message').textContent, /saved in this browser/);
  console.log('All product/color URLs, missing products, invalid categories, corrupted storage, no-WebGL navigation, and newsletter passed.');
  console.log('All DOM and local-asset checks passed. Browser visual checks are a separate step.');
} finally {
  await window?.happyDOM.abort();
}
