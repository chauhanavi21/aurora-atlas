/* Aurora Atlas — independent, dependency-free storefront with procedural Three.js equipment. */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  const colors = {
    glacier: { name: 'Glacier', hex: '#c4c9bd' },
    obsidian: { name: 'Obsidian', hex: '#353c38' },
    moss: { name: 'Moss', hex: '#63704d' },
    chalk: { name: 'Chalk', hex: '#bdb5a2' },
    shale: { name: 'Shale', hex: '#7a8174' }
  };
  const products = [
    { id: 'boreal', name: 'Boreal Puffer', type: 'Insulated everyday outerwear', category: 'outerwear', price: 245, badge: 'THE SIGNATURE', colors: ['glacier', 'obsidian', 'moss'], sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'Your warmest layer. Your lightest decision. A sculpted, water-repellent shell with recycled insulation, a stand collar, and fleece-lined pockets. Built for cold starts and unplanned adventures.' },
    { id: 'drift', name: 'Drift Fleece', type: 'Your go-everywhere midlayer', category: 'essentials', price: 115, badge: 'NEW TERRITORY', colors: ['moss', 'chalk', 'obsidian'], sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'Soft on the inside. Ready for the outside. A substantial recycled fleece with a relaxed fit, a high zip collar, and a utility chest pocket. Wear it as a midlayer or make it your everyday uniform.' },
    { id: 'terrain', name: 'Terrain Vest', type: 'Lightweight. Limitless.', category: 'outerwear', price: 165, badge: '', colors: ['obsidian', 'moss', 'glacier'], sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'A little warmth goes a long way. Our insulated vest brings a quilted recycled shell, a protective stand collar, and zip pockets to the art of layering. Made to move with you, wherever the day goes.' },
    { id: 'transit', name: 'Transit Crossbody', type: 'Carry less. Go further.', category: 'accessories', price: 65, badge: 'EVERYDAY ESSENTIAL', colors: ['moss', 'obsidian', 'shale'], sizes: ['ONE SIZE'], description: 'Everything you need. Nothing in your way. A compact, weather-resistant crossbody with an adjustable woven strap, a secure zip compartment, and just enough room for your daily essentials. Capacity: 3 liters.' }
  ];
  const catalog = Object.fromEntries(products.map((product) => [product.id, product]));
  const assets = new Map();
  let activeFilter = 'all';
  let selectedProduct = null;
  let selectedColor = 'glacier';
  let selectedSize = null;
  let heroColor = 'glacier';
  let toastTimer;
  let renderProductImage = null;
  let updateHeroModel = () => {};

  function readSaved(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  let bag = readSaved('aurora-atlas-bag-v1', []);
  bag = Array.isArray(bag) ? bag.filter((item) => item && catalog[item.id] && catalog[item.id].colors.includes(item.color) && catalog[item.id].sizes.includes(item.size) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99) : [];

  // Code-native vector fallbacks keep the collection usable without a GPU.
  function fallbackImage(product, color) {
    const c = colors[color].hex;
    const jacket = `<path d="m150 115 29-28h62l29 28 38 18 53 169-48 20-38-105v177H145V217l-38 105-48-20 53-169Z" fill="url(#fabric)" stroke="#10180e" stroke-width="3"/><path d="M210 88v307M150 166h120M145 211h130M145 256h130M145 301h130M145 346h130M175 89v46h70V89" fill="none" stroke="#11180f" stroke-opacity=".5" stroke-width="4"/>`;
    const vest = `<path d="m155 110 28-22h54l28 22-14 60 25 34v189H144V204l25-34Z" fill="url(#fabric)" stroke="#10180e" stroke-width="4"/><path d="M210 90v303M146 215h128M146 260h128M146 305h128M146 350h128M180 91v43h60V91" fill="none" stroke="#11180f" stroke-opacity=".65" stroke-width="5"/>`;
    const fleece = `<path d="m151 117 32-26h54l32 26 36 17 48 178-43 15-38-110v177H148V217l-38 110-43-15 48-178Z" fill="url(#fabric)" stroke="#10180e" stroke-width="3"/><path d="M210 94v302M179 93v50h62V93M229 177h29v46h-29Z" fill="none" stroke="#263020" stroke-width="5"/>`;
    const carry = `<path d="M132 200c-2-109 142-121 155-11" fill="none" stroke="#303a25" stroke-width="24"/><rect x="92" y="200" width="238" height="146" rx="37" fill="url(#fabric)" stroke="#10180e" stroke-width="5"/><rect x="112" y="242" width="196" height="78" rx="16" fill="none" stroke="#27351d" stroke-width="5"/><path d="M120 252h181" stroke="#121a0e" stroke-width="5"/>`;
    const shape = product.id === 'transit' ? carry : product.id === 'terrain' ? vest : product.id === 'drift' ? fleece : jacket;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="460" viewBox="0 0 420 460"><defs><linearGradient id="fabric" x1="0" x2="1" y2=".7"><stop stop-color="${c}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="#222d1e"/></linearGradient></defs><g transform="rotate(-6 210 230)">${shape}<rect x="228" y="174" width="22" height="12" rx="1" fill="#bde177"/><path d="m234 183 5-7 5 7" fill="none" stroke="#26321d" stroke-width="2"/></g></svg>`);
  }
  function productImage(product, color) {
    const key = `${product.id}-${color}`;
    if (!assets.has(key)) assets.set(key, renderProductImage ? renderProductImage(product, color) : fallbackImage(product, color));
    return assets.get(key);
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
  }
  function renderCollection() {
    const query = $('#product-search').value.trim().toLowerCase();
    const visible = products.filter((product) => (activeFilter === 'all' || product.category === activeFilter) && `${product.name} ${product.type} ${product.category}`.toLowerCase().includes(query));
    $('#product-grid').innerHTML = visible.map((product) => `<article class="product-card"><button class="product-art" data-product="${product.id}" aria-label="Shop ${product.name}">${product.badge ? `<span class="product-badge ${product.id === 'drift' ? 'new' : ''}">${product.badge}</span>` : ''}<img src="${productImage(product, product.colors[0])}" alt="${product.name} in ${colors[product.colors[0]].name}" width="420" height="460"><span class="product-index">AA / ${String(products.indexOf(product) + 1).padStart(3, '0')}</span><span class="card-plus" aria-hidden="true">+</span></button><div class="product-meta"><h3><button data-product="${product.id}">${product.name}</button></h3><span>${money(product.price)}</span></div><p class="product-type">${product.type}</p><div class="card-colors" aria-label="${product.colors.length} colors available">${product.colors.map((color) => `<span style="--swatch:${colors[color].hex}"></span>`).join('')}<small>${product.colors.length} colors</small></div></article>`).join('');
    $('#no-results').hidden = visible.length > 0;
    $('.collection-count').textContent = `${visible.length} considered essential${visible.length === 1 ? '' : 's'}`;
    $$('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function filterCollection(filter) {
    activeFilter = filter;
    renderCollection();
    $$('.desktop-nav a').forEach((link) => link.classList.toggle('active', link.dataset.navFilter === filter));
  }
  function showProduct(id) {
    selectedProduct = catalog[id];
    if (!selectedProduct) return;
    selectedColor = id === 'boreal' ? heroColor : selectedProduct.colors[0];
    selectedSize = selectedProduct.sizes.length === 1 ? 'ONE SIZE' : null;
    $('#detail-title').textContent = selectedProduct.name;
    $('#detail-category').textContent = `AA / ${selectedProduct.category.toUpperCase()}`;
    $('#detail-price').textContent = money(selectedProduct.price);
    $('#detail-description').textContent = selectedProduct.description;
    $('#size-fieldset').hidden = selectedProduct.sizes.length === 1;
    $('#detail-sizes').innerHTML = selectedProduct.sizes.map((size) => `<button type="button" data-size="${size}" aria-pressed="false">${size}</button>`).join('');
    updateDetailColor();
    $('#product-dialog').showModal();
  }
  function updateDetailColor() {
    $('#detail-color-name').textContent = colors[selectedColor].name;
    $('#detail-image').src = productImage(selectedProduct, selectedColor);
    $('#detail-image').alt = `${selectedProduct.name} in ${colors[selectedColor].name}`;
    $('#detail-colors').innerHTML = selectedProduct.colors.map((color) => `<button type="button" class="color-button ${color === selectedColor ? 'selected' : ''}" style="--swatch:${colors[color].hex}" data-detail-color="${color}" aria-label="${colors[color].name}" aria-pressed="${color === selectedColor}"></button>`).join('');
  }
  function updateBag() {
    const count = bag.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = bag.reduce((sum, item) => sum + catalog[item.id].price * item.quantity, 0);
    $('.bag-count').textContent = count;
    $('.bag-trigger').setAttribute('aria-label', `Open shopping bag, ${count} item${count === 1 ? '' : 's'}`);
    $('#bag-total-count').textContent = `(${count})`;
    $('#bag-summary').hidden = !bag.length;
    $('#bag-subtotal').textContent = money(subtotal);
    $('#shipping-progress').textContent = subtotal >= 150 ? 'Your equipment ships on us. Complimentary shipping unlocked.' : `${money(150 - subtotal)} away from complimentary shipping.`;
    $('#bag-items').innerHTML = bag.length ? bag.map((item, index) => {
      const product = catalog[item.id];
      return `<div class="bag-item"><img src="${productImage(product, item.color)}" alt="${product.name} in ${colors[item.color].name}"><div class="bag-item-info"><h3>${product.name}</h3><p>${colors[item.color].name} / ${item.size}</p><span class="bag-item-price">${money(product.price * item.quantity)}</span><button class="bag-item-remove" data-remove="${index}" aria-label="Remove ${product.name}">×</button><div class="quantity-control"><button data-quantity="${index}" data-change="-1" aria-label="Decrease ${product.name} quantity">−</button><span aria-label="Quantity">${item.quantity}</span><button data-quantity="${index}" data-change="1" aria-label="Increase ${product.name} quantity" ${item.quantity >= 99 ? 'disabled' : ''}>+</button></div></div></div>`;
    }).join('') : '<div class="bag-empty"><span aria-hidden="true">↗</span><h3>A little room for possibility.</h3><p>Your next everyday essential is out there.</p><button class="button button-lime" id="empty-bag-shop">Explore the collection <span>↗</span></button></div>';
    save('aurora-atlas-bag-v1', bag);
  }
  function showInfo(title, body) {
    $('#info-title').textContent = title;
    $('#info-body').innerHTML = body;
    $('#info-dialog').showModal();
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button,a');
    if (!target) return;
    if (target.hasAttribute('data-product')) showProduct(target.dataset.product);
    if (target.hasAttribute('data-filter')) filterCollection(target.dataset.filter);
    if (target.hasAttribute('data-nav-filter')) {
      $('#product-search').value = '';
      filterCollection(target.dataset.navFilter);
      $('.mobile-nav').hidden = true;
      $('.mobile-menu-trigger').setAttribute('aria-expanded', 'false');
    }
    if (target.hasAttribute('data-close')) target.closest('dialog').close();
    if (target.hasAttribute('data-detail-color')) { selectedColor = target.dataset.detailColor; updateDetailColor(); }
    if (target.hasAttribute('data-size')) {
      selectedSize = target.dataset.size;
      $$('[data-size]').forEach((button) => { button.classList.toggle('selected', button === target); button.setAttribute('aria-pressed', String(button === target)); });
    }
    if (target.hasAttribute('data-remove')) { bag.splice(Number(target.dataset.remove), 1); updateBag(); }
    if (target.hasAttribute('data-quantity')) {
      const index = Number(target.dataset.quantity);
      bag[index].quantity = Math.min(99, bag[index].quantity + Number(target.dataset.change));
      if (bag[index].quantity <= 0) bag.splice(index, 1);
      updateBag();
    }
    if (target.id === 'empty-bag-shop') { $('#bag-dialog').close(); $('#collection').scrollIntoView({ behavior: 'smooth' }); }
  });
  $$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
  $('.bag-trigger').addEventListener('click', () => { updateBag(); $('#bag-dialog').showModal(); });
  $('.mobile-menu-trigger').addEventListener('click', () => {
    $('.mobile-nav').hidden = !$('.mobile-nav').hidden;
    $('.mobile-menu-trigger').setAttribute('aria-expanded', String(!$('.mobile-nav').hidden));
    $('.mobile-menu-trigger').setAttribute('aria-label', $('.mobile-nav').hidden ? 'Open menu' : 'Close menu');
  });
  $('.mobile-nav a[href="#our-world"]').addEventListener('click', () => { $('.mobile-nav').hidden = true; $('.mobile-menu-trigger').setAttribute('aria-expanded', 'false'); });
  $('.search-trigger').addEventListener('click', () => {
    $('.search-bar').hidden = false;
    $('#collection').scrollIntoView({ behavior: 'smooth' });
    $('#product-search').focus({ preventScroll: true });
  });
  $('#close-search').addEventListener('click', () => { $('.search-bar').hidden = true; $('#product-search').value = ''; renderCollection(); });
  $('#product-search').addEventListener('input', renderCollection);
  $('#view-all').addEventListener('click', () => { $('#product-search').value = ''; filterCollection('all'); });
  $('#product-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!selectedSize) { toast('Choose your size to add this piece to your bag.'); $('#detail-sizes button').focus(); return; }
    const item = bag.find((entry) => entry.id === selectedProduct.id && entry.color === selectedColor && entry.size === selectedSize);
    if (item && item.quantity >= 99) { toast('You have reached the quantity limit for this piece.'); return; }
    if (item) item.quantity += 1;
    else bag.push({ id: selectedProduct.id, color: selectedColor, size: selectedSize, quantity: 1 });
    updateBag();
    $('#product-dialog').close();
    $('#bag-dialog').showModal();
    toast(`${selectedProduct.name} added. A little more possibility.`);
  });
  $('#size-guide-trigger').addEventListener('click', () => showInfo('Find your fit.', '<p>All layers use a relaxed, unisex fit. Measurements below are body measurements in centimeters. Choose a larger size for extra room to layer.</p><table><thead><tr><th>Size</th><th>Chest</th><th>Waist</th></tr></thead><tbody><tr><td>XS</td><td>80–87</td><td>64–71</td></tr><tr><td>S</td><td>88–95</td><td>72–79</td></tr><tr><td>M</td><td>96–103</td><td>80–87</td></tr><tr><td>L</td><td>104–111</td><td>88–95</td></tr><tr><td>XL</td><td>112–119</td><td>96–103</td></tr></tbody></table>'));
  $('#checkout-trigger').addEventListener('click', () => showInfo('Your next step.', '<p>This is a concept storefront. Your bag is saved in this browser, but online checkout and payments are not connected yet.</p><p>You can keep exploring and editing your bag. No order has been placed and no payment has been taken.</p>'));
  $('#story-trigger').addEventListener('click', () => { filterCollection('all'); $('#collection').scrollIntoView({ behavior: 'smooth' }); });
  const information = {
    shipping: ['A little peace of mind.', '<p>Our planned shipping policy includes complimentary standard shipping on orders of $150 or more, and 30-day returns on unworn equipment with original tags.</p><p>Aurora Atlas is currently a concept store. Shipping and order fulfillment will be available when the store launches.</p>'],
    care: ['Keep your equipment going.', '<p>Puffer & vest: wash cold on a gentle cycle with a mild detergent. Tumble dry low with dryer balls to restore loft. Do not bleach or iron.</p><p>Fleece: wash inside out at 30°C and air dry. Avoid fabric softener.</p><p>Crossbody: spot clean with a damp cloth. Air dry away from direct heat.</p><p>Always follow the care label supplied with your piece.</p>'],
    contact: ['Good conversations start here.', '<p>Questions about a piece, your fit, or the world of Aurora Atlas?</p><p>This is a concept storefront, so a customer support inbox is not connected yet. For now, our size guide and product care notes can help you get to know the collection.</p>']
  };
  $$('[data-info]').forEach((button) => button.addEventListener('click', () => showInfo(...information[button.dataset.info])));
  $('#newsletter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!$('#newsletter-form').reportValidity()) return;
    const email = $('#newsletter-email').value.trim();
    const saved = save('aurora-atlas-field-notes-v1', { email, savedAt: new Date().toISOString() });
    $('#newsletter-message').textContent = saved ? 'Interest saved in this browser. Field notes will launch with the store.' : 'Field notes are coming soon. Subscriptions open when the store launches.';
    $('#newsletter-email').value = '';
  });
  $('#current-year').textContent = '2026';
  $$('[data-hero-color]').forEach((button) => button.addEventListener('click', () => {
    heroColor = button.dataset.heroColor;
    updateHeroModel(heroColor);
    $('.scene-fallback svg path').setAttribute('fill', colors[heroColor].hex);
    $('#product-scene').setAttribute('aria-label', `Interactive three-dimensional Boreal puffer jacket in ${colors[heroColor].name}`);
    $('.hero-feature p').textContent = `${colors[heroColor].name} / Recycled insulation`;
    $$('[data-hero-color]').forEach((swatch) => { swatch.classList.toggle('selected', swatch === button); swatch.setAttribute('aria-pressed', String(swatch === button)); });
  }));
  renderCollection();
  updateBag();

  // A single WebGL renderer creates the interactive hero and all product images.
  // Catalog still works with native vector illustrations if WebGL is unavailable.
  try {
    if (!window.THREE) throw new Error('Three.js unavailable');
    initializeEquipmentScene();
  } catch (error) {
    console.warn('Using the accessible equipment illustration fallback.', error);
    $('#product-scene').hidden = true;
    $('.scene-fallback').hidden = false;
    $('.visual-bottom>span').innerHTML = '<span class="live-dot"></span> DESIGNED FOR THE EVERYDAY';
    renderCollection();
  }

  function initializeEquipmentScene() {
    const T = window.THREE;
    const canvas = $('#product-scene');
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xf5f5df, 0x273326, .65));
    const key = new T.DirectionalLight(0xf6f8ea, 1.8); key.position.set(-4, 7, 6); scene.add(key);
    const fill = new T.DirectionalLight(0xb6cca4, .55); fill.position.set(5, 2, 3); scene.add(fill);
    const rim = new T.DirectionalLight(0xb9ec80, 1.6); rim.position.set(3, 4, -5); scene.add(rim);
    const camera = new T.PerspectiveCamera(36, 1, .1, 60);
    camera.position.set(0, .1, 8.8);
    camera.lookAt(0, 0, 0);
    const imageCamera = new T.PerspectiveCamera(35, 1, .1, 50);
    imageCamera.position.set(0, .2, 8.4);
    imageCamera.lookAt(0, 0, 0);

    // Fine woven texture adds surface grain without external image dependencies.
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = 128;
    const ctx = textureCanvas.getContext('2d');
    const texturePixels = ctx.createImageData(128, 128);
    let seed = 1743;
    for (let i = 0; i < texturePixels.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const value = 125 + (seed % 35);
      texturePixels.data[i] = texturePixels.data[i + 1] = texturePixels.data[i + 2] = value;
      texturePixels.data[i + 3] = 255;
    }
    ctx.putImageData(texturePixels, 0, 0);
    const texture = new T.CanvasTexture(textureCanvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(8, 8);
    const trim = new T.MeshStandardMaterial({ color: '#20271f', roughness: .8 });
    const metal = new T.MeshStandardMaterial({ color: '#8d9880', metalness: .6, roughness: .35 });
    const label = new T.MeshStandardMaterial({ color: '#c4f36a', roughness: .8 });
    const inner = new T.MeshStandardMaterial({ color: '#1b221a', roughness: 1, side: T.DoubleSide });
    [trim, metal, label, inner].forEach((material) => material.color.convertSRGBToLinear());

    function fabric(color, fleece = false) {
      const material = new T.MeshStandardMaterial({ color, roughness: fleece ? .98 : .58, metalness: fleece ? 0 : .09, bumpMap: texture, bumpScale: fleece ? .032 : .008, side: T.DoubleSide });
      material.color.convertSRGBToLinear();
      return material;
    }
    function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
      const object = new T.Mesh(geometry, material);
      object.position.set(x, y, z); parent.add(object); return object;
    }
    function box(parent, width, height, depth, material, x, y, z, rotation = 0) {
      const object = mesh(new T.BoxGeometry(width, height, depth), material, parent, x, y, z);
      object.rotation.z = rotation; return object;
    }
    function rounded(parent, width, height, depth, radius, material, x, y, z) {
      const shape = new T.Shape(); const w = width / 2, h = height / 2, r = radius;
      shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
      shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h); shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
      shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
      const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 3, steps: 1, curveSegments: 8 });
      return mesh(geometry, material, parent, x, y, z - depth / 2);
    }
    function ring(parent, rx, rz, y, radius = .012, material = trim) {
      const curve = new T.EllipseCurve(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(80).map((point) => new T.Vector3(point.x, y, point.y));
      return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points, true), 80, radius, 5, true), material, parent);
    }
    function tube(parent, material, { bottom, top, rx, rz, puff = .1, segments = 1, taper = 0, cap = true }) {
      const vertices = [], uvs = [], indices = [];
      const radial = 72, vertical = Math.max(18, segments * 12);
      for (let j = 0; j <= vertical; j++) {
        const t = j / vertical;
        const wave = Math.pow(Math.max(0, Math.sin((t * segments % 1) * Math.PI)), .65) * puff;
        const width = rx * (1 + taper * (t - .5)) + wave;
        const depth = rz + wave * .65;
        for (let i = 0; i <= radial; i++) {
          const angle = i / radial * Math.PI * 2;
          // A soft superellipse gives the front a tailored, flatter surface.
          const sin = Math.sin(angle), cos = Math.cos(angle);
          const x = Math.sign(cos) * Math.pow(Math.abs(cos), .83) * width;
          const z = Math.sign(sin) * Math.pow(Math.abs(sin), .83) * depth;
          const wrinkle = Math.sin(angle * 17 + t * 29) * Math.sin(t * Math.PI) * .004;
          vertices.push(x + wrinkle, bottom + (top - bottom) * t, z + wrinkle);
          uvs.push(i / radial, t);
          if (j < vertical && i < radial) {
            const a = j * (radial + 1) + i, b = a + radial + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
      const object = mesh(geo, material, parent);
      if (cap) {
        for (const [y, width] of [[bottom, rx * (1 - taper / 2)], [top, rx * (1 + taper / 2)]]) {
          const end = mesh(new T.CircleGeometry(1, 64), material, parent, 0, y, 0);
          end.rotation.x = Math.PI / 2; end.scale.set(width, rz, 1);
        }
      }
      return object;
    }
    function brandPatch(parent, x, y, z) {
      box(parent, .26, .105, .016, label, x, y, z);
      const shape = new T.Shape(); shape.moveTo(-.04, -.027); shape.lineTo(0, .031); shape.lineTo(.04, -.027); shape.lineTo(.023, -.027); shape.lineTo(0, .007); shape.lineTo(-.023, -.027); shape.closePath();
      mesh(new T.ShapeGeometry(shape), trim, parent, x, y, z + .012);
    }
    function zipper(parent, top, bottom, z) {
      box(parent, .055, top - bottom, .022, trim, 0, (top + bottom) / 2, z);
      for (let y = bottom + .02; y < top; y += .05) box(parent, .025, .018, .01, metal, 0, y, z + .016);
      box(parent, .047, .12, .025, metal, .015, top - .16, z + .035, -.16);
    }
    function createJacket(product, color) {
      const group = new T.Group(), cloth = fabric(colors[color].hex, product.id === 'drift');
      group.userData.cloth = cloth;
      const fleece = product.id === 'drift', vest = product.id === 'terrain';
      const width = vest ? .9 : 1.0, bottom = -1.22, top = .9;
      tube(group, cloth, { bottom, top, rx: width, rz: .37, puff: fleece ? .025 : .11, segments: fleece ? 1 : 6, taper: .09 });
      // Sloping shoulder panels close the torso around the neck.
      const shoulder = mesh(new T.SphereGeometry(1, 48, 24), cloth, group, 0, .87, 0);
      shoulder.scale.set(width * 1.03, .22, .39);
      if (!fleece) for (let i = 0; i <= 6; i++) ring(group, width * (1 + .09 * (i / 6 - .5)), .375, bottom + (top - bottom) * i / 6, .009, cloth);
      ring(group, width * .96, .38, bottom, .045, trim);
      // Open stand collar, with a dark lining visible from the camera.
      tube(group, cloth, { bottom: .91, top: 1.35, rx: .46, rz: .31, puff: .055, segments: 1, taper: .1, cap: false });
      tube(group, inner, { bottom: 1.05, top: 1.34, rx: .412, rz: .266, puff: 0, cap: false });
      ring(group, .484, .328, 1.35, .022, cloth);
      const neckBottom = mesh(new T.CircleGeometry(.42, 48), inner, group, 0, 1.06, 0); neckBottom.rotation.x = -Math.PI / 2; neckBottom.scale.y = .65;
      if (!vest) {
        for (const side of [-1, 1]) {
          const sleeve = new T.Group(); group.add(sleeve);
          sleeve.position.set(side * 1.01, .7, -.015); sleeve.rotation.z = side * .29;
          tube(sleeve, cloth, { bottom: -1.94, top: .13, rx: .30, rz: .32, puff: fleece ? .018 : .07, segments: fleece ? 1 : 6, taper: .4 });
          const sleeveCap = mesh(new T.SphereGeometry(1, 32, 20), cloth, sleeve, 0, .08, 0); sleeveCap.scale.set(.36, .25, .36);
          tube(sleeve, trim, { bottom: -2.04, top: -1.91, rx: .258, rz: .28, puff: .008, cap: true });
        }
      } else {
        // Dark armhole trim emphasizes the vest silhouette.
        for (const side of [-1, 1]) {
          const armhole = ring(group, .21, .33, 0, .04, trim);
          armhole.rotation.z = Math.PI / 2; armhole.position.set(side * .92, .57, 0);
        }
      }
      zipper(group, 1.31, -1.22, .457);
      for (const side of [-1, 1]) {
        const pocket = box(group, .025, .49, .025, trim, side * .64, -.64, .455, side * -.18);
        box(group, .034, .09, .025, metal, side * .66, -.46, .48, side * -.18);
        pocket.userData.detail = true;
      }
      if (fleece) {
        rounded(group, .38, .45, .035, .035, trim, .58, .35, .405);
        box(group, .29, .02, .025, metal, .58, .51, .447);
      }
      brandPatch(group, .58, fleece ? .32 : .47, fleece ? .452 : .46);
      group.rotation.set(-.04, -.28, -.10);
      return group;
    }
    function createBag(color) {
      const group = new T.Group(), cloth = fabric(colors[color].hex);
      group.userData.cloth = cloth;
      const strapCurve = new T.CatmullRomCurve3([new T.Vector3(-.94, -.1, -.05), new T.Vector3(-.95, 1, -.1), new T.Vector3(-.15, 1.65, -.15), new T.Vector3(.76, .95, -.1), new T.Vector3(.99, -.1, -.05)]);
      const strap = mesh(new T.TubeGeometry(strapCurve, 80, .105, 8, false), trim, group); strap.scale.z = .35;
      rounded(group, 2.3, 1.25, .55, .24, cloth, 0, -.35, 0);
      rounded(group, 1.9, .70, .09, .14, cloth, 0, -.49, .34);
      box(group, 1.65, .032, .04, trim, 0, -.25, .42);
      box(group, .05, .17, .05, metal, .66, -.31, .46, -.1);
      box(group, 1.9, .035, .04, trim, 0, .28, .2);
      brandPatch(group, -.58, -.59, .45);
      for (const side of [-1, 1]) rounded(group, .16, .3, .1, .02, trim, side * 1.17, .03, 0);
      rounded(group, .29, .24, .12, .035, metal, -.97, .51, -.05);
      group.scale.setScalar(1.18); group.rotation.set(.02, -.25, -.12); group.position.y = -.15;
      return group;
    }
    const models = new Map();
    function getModel(product, color) {
      const key = `${product.id}-${color}`;
      if (!models.has(key)) models.set(key, product.id === 'transit' ? createBag(color) : createJacket(product, color));
      return models.get(key);
    }
    let hero = getModel(catalog.boreal, 'glacier');
    scene.add(hero);
    updateHeroModel = (color) => hero.userData.cloth.color.set(colors[color].hex).convertSRGBToLinear();
    renderProductImage = (product, color) => {
      const width = canvas.width, height = canvas.height;
      const currentVisible = hero.visible;
      hero.visible = false;
      const model = getModel(product, color);
      const wasParent = model.parent;
      const oldVisible = model.visible;
      model.visible = true; scene.add(model);
      renderer.setSize(520, 560, false);
      imageCamera.aspect = 520 / 560; imageCamera.updateProjectionMatrix();
      renderer.render(scene, imageCamera);
      const image = canvas.toDataURL('image/png');
      scene.remove(model);
      if (wasParent) wasParent.add(model);
      model.visible = oldVisible;
      hero.visible = currentVisible;
      // Restore CSS-sized hero; renderer's pixel ratio is accounted for here.
      renderer.setSize(width / renderer.getPixelRatio(), height / renderer.getPixelRatio(), false);
      return image;
    };
    assets.clear();
    renderCollection(); updateBag();
    function resize() {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.position.z = camera.aspect < .92 ? 10.4 : 8.7;
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
    let dragging = false, lastX = 0, lastY = 0, dragRotation = 0, dragTilt = 0;
    canvas.addEventListener('pointerdown', (event) => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      dragRotation += (event.clientX - lastX) * .009;
      dragTilt = Math.max(-.3, Math.min(.3, dragTilt + (event.clientY - lastY) * .003));
      lastX = event.clientX; lastY = event.clientY;
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }).observe(canvas);
    function animate(time) {
      requestAnimationFrame(animate);
      if (document.hidden || !inView) return;
      const motion = reducedMotion.matches ? 0 : 1;
      hero.rotation.y = -.28 + dragRotation + Math.sin(time * .00033) * .13 * motion;
      hero.rotation.x = -.04 + dragTilt;
      hero.rotation.z = -.1 + Math.sin(time * .00045) * .018 * motion;
      hero.position.y = .05 + Math.sin(time * .0008) * .045 * motion;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }
})();
