/* Shared storefront behavior. Real photos are used everywhere customers shop. */
(async () => {
  'use strict';
  await window.AuroraAPI?.ready;
  const api = window.AuroraAPI;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const { products, catalog, colors, photo, productUrl } = window.AuroraCatalog;
  const page = document.body.dataset.page || 'home';
  const params = new URLSearchParams(location.search);
  const categories = { all: 'All equipment', outerwear: 'Outerwear', essentials: 'Essentials', bottoms: 'Bottoms', accessories: 'Accessories' };
  const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  let activeFilter = Object.hasOwn(categories, params.get('category')) ? params.get('category') : 'all';
  let selectedProduct = null, selectedColor = null, selectedSize = null, galleryIndex = 0, toastTimer;

  function readSaved(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  let bag = readSaved('aurora-atlas-bag-v1', []);
  if (api) bag = api.cart.items;
  let bagBusy = false;
  bag = Array.isArray(bag) ? bag.filter((item) => item && Object.hasOwn(catalog, item.id) && catalog[item.id].colors.includes(item.color) && catalog[item.id].sizes.includes(item.size) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99) : [];

  function mountSharedLayout() {
    if ($('[data-site-header]')) $('[data-site-header]').innerHTML = `
      <div class="announcement"><span>LESS FORECAST. MORE POSSIBILITY.</span><span>Complimentary shipping on orders $150+ <span aria-hidden="true">↗</span></span><span>DESIGNED TO GO FURTHER.</span></div>
      <header class="site-header"><a class="brand" href="index.html" aria-label="Aurora Atlas home"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 30 17 8h6l12 22H22l-2-5-3 5Zm10-7h10L20 13Z" fill="currentColor"/></svg><span>AURORA<span class="brand-second">ATLAS<span class="brand-dot">®</span></span></span></a><nav class="desktop-nav" aria-label="Main navigation"><a href="shop.html" data-nav-filter="all">Shop all <span>↗</span></a><a href="shop.html?category=outerwear" data-nav-filter="outerwear">Outerwear</a><a href="shop.html?category=essentials" data-nav-filter="essentials">Essentials</a><a href="shop.html?category=bottoms" data-nav-filter="bottoms">Bottoms</a><a href="index.html#our-world">Our world</a></nav><div class="header-actions"><span class="location">EARTH, EST. 2024</span><button class="icon-button search-trigger" aria-label="Search collection"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button><button class="bag-trigger" aria-label="Open shopping bag">Bag <span class="bag-count">0</span></button><button class="icon-button mobile-menu-trigger" aria-label="Open menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button></div></header><nav class="mobile-nav" aria-label="Mobile navigation" hidden><a href="shop.html">Shop all ↗</a><a href="shop.html?category=outerwear">Outerwear</a><a href="shop.html?category=essentials">Essentials</a><a href="shop.html?category=bottoms">Bottoms</a><a href="shop.html?category=accessories">Accessories</a><a href="index.html#our-world">Our world</a></nav>`;
    if ($('[data-site-footer]')) $('[data-site-footer]').innerHTML = `
      <footer class="site-footer section-wrap"><div class="footer-top"><a class="brand footer-brand" href="index.html">AURORA ATLAS<span>®</span></a><span>EQUIPMENT FOR THE EVERYDAY EXPLORER.</span><a href="#">BACK TO TOP ↑</a></div><div class="footer-bottom"><span>© 2026 Aurora Atlas</span><div><button data-info="shipping">Shipping & returns</button><button data-info="care">Product care</button><button data-info="contact">Get in touch</button></div><span>DESIGNED WITH INTENTION. WORN WITH CURIOSITY.</span></div></footer>`;
    if (!$('#bag-dialog')) document.body.insertAdjacentHTML('beforeend', `
      <dialog id="bag-dialog" class="bag-dialog" aria-labelledby="bag-heading"><div class="bag-heading"><h2 id="bag-heading">Your bag <span id="bag-total-count">(0)</span></h2><button class="icon-button" data-close aria-label="Close shopping bag">×</button></div><div id="bag-items"></div><div id="bag-summary" hidden><p class="shipping-progress" id="shipping-progress"></p><div class="subtotal"><span>Subtotal</span><span id="bag-subtotal"></span></div><p class="checkout-note">Shipping calculated at checkout.</p><button class="button button-lime" id="checkout-trigger">Continue to checkout <span>↗</span></button></div></dialog>`);
    if (!$('#info-dialog')) document.body.insertAdjacentHTML('beforeend', '<dialog id="info-dialog" class="info-dialog" aria-labelledby="info-title"><button class="dialog-close icon-button" data-close aria-label="Close information">×</button><p class="eyebrow">AURORA ATLAS / GOOD TO KNOW</p><h2 id="info-title"></h2><div id="info-body"></div></dialog>');
    if (!$('#toast')) document.body.insertAdjacentHTML('beforeend', '<div id="toast" class="toast" role="status" aria-live="polite"></div>');
  }
  mountSharedLayout();
  $('.header-actions .bag-trigger').insertAdjacentHTML('beforebegin', '<a class="account-link" href="login.html"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></svg><span class="account-label">Sign in</span></a>');
  $('.mobile-nav').insertAdjacentHTML('beforeend', '<a class="account-nav-link" href="login.html">Sign in ↗</a>');
  function updateAccountLinks() {
    $$('.account-link,.account-nav-link').forEach((link) => {
      link.href = api?.user ? 'account.html' : 'login.html';
      link.setAttribute('aria-label', api?.user ? `Your account, ${api.user.name}` : 'Sign in to your account');
      if (link.classList.contains('account-link')) link.querySelector('.account-label').textContent = api?.user ? 'Account' : 'Sign in';
      else link.textContent = api?.user ? 'Your account ↗' : 'Sign in ↗';
    });
  }
  updateAccountLinks();
  window.addEventListener('aurora:auth', updateAccountLinks);
  $$('[data-category-count]').forEach((element) => {
    const category = element.dataset.categoryCount;
    const count = category === 'all' ? products.length : products.filter((product) => product.category === category).length;
    element.textContent = String(count).padStart(2, '0');
  });
  $$('[data-catalog-total]').forEach((element) => { element.textContent = String(products.length); });

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
  }
  function showInfo(title, body) {
    $('#info-title').textContent = title;
    $('#info-body').innerHTML = body;
    $('#info-dialog').showModal();
  }
  function card(product) {
    return `<article class="product-card"><a class="product-art photo-art" href="${productUrl(product)}" data-product="${product.id}" aria-label="View ${product.name}">${product.badge ? `<span class="product-badge ${product.id === 'drift' ? 'new' : ''}">${product.badge}</span>` : ''}<img src="${photo(product)}" alt="${product.name} in ${colors[product.colors[0]].name}, reference product photograph" width="1200" height="1600" loading="lazy"><span class="product-index">AA / ${String(products.indexOf(product) + 1).padStart(3, '0')}</span><span class="card-plus" aria-hidden="true">↗</span></a><div class="product-meta"><h3><a href="${productUrl(product)}">${product.name}</a></h3><span>${money(product.price)}</span></div><p class="product-type">${product.type}</p><div class="card-colors">${product.colors.map((color) => `<a href="${productUrl(product, color)}" style="--swatch:${colors[color].hex}" aria-label="${product.name} in ${colors[color].name}" title="${colors[color].name}"></a>`).join('')}<small>${product.colors.length} color${product.colors.length === 1 ? '' : 's'}</small></div></article>`;
  }
  function syncShopUrl() {
    if (page !== 'shop') return;
    const query = new URLSearchParams();
    if (activeFilter !== 'all') query.set('category', activeFilter);
    const search = $('#product-search').value.trim();
    if (search) query.set('q', search);
    if ($('#product-sort').value !== 'featured') query.set('sort', $('#product-sort').value);
    const url = new URL(location.href); url.search = query.toString();
    history.replaceState(null, '', url);
  }
  function renderCollection() {
    if (!$('#product-grid')) return;
    const query = $('#product-search').value.trim().toLowerCase();
    const visible = products.filter((product) => (activeFilter === 'all' || product.category === activeFilter) && `${product.name} ${product.type} ${product.category}`.toLowerCase().includes(query));
    const sort = $('#product-sort')?.value;
    if (sort === 'price-low') visible.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') visible.sort((a, b) => b.price - a.price);
    if (sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name));
    const homeEdit = ['boreal', 'cloud', 'horizon', 'transit'];
    const shown = page === 'home'
      ? (activeFilter === 'all' && !query ? homeEdit.map((id) => catalog[id]) : visible.slice(0, 4))
      : visible;
    $('#product-grid').innerHTML = shown.map(card).join('');
    $('#no-results').hidden = visible.length > 0;
    const preview = shown.length < visible.length ? `${shown.length} of ` : '';
    $('.collection-count').textContent = `${preview}${visible.length} considered essential${visible.length === 1 ? '' : 's'}`;
    if ($('#results-title')) $('#results-title').textContent = categories[activeFilter];
    if ($('#view-all')) {
      const queryParams = new URLSearchParams();
      if (activeFilter !== 'all') queryParams.set('category', activeFilter);
      if (query) queryParams.set('q', query);
      $('#view-all').href = 'shop.html' + (queryParams.size ? '?' + queryParams : '');
    }
    $$('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
    });
    $$('.desktop-nav [data-nav-filter]').forEach((link) => {
      const active = (page === 'shop' || page === 'home') && link.dataset.navFilter === activeFilter;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    syncShopUrl();
  }
  if ($('#product-search')) {
    $('#product-search').value = params.get('q') || '';
    $('#product-search').addEventListener('input', renderCollection);
  }
  if ($('#product-sort')) {
    const requestedSort = params.get('sort');
    if (['featured', 'price-low', 'price-high', 'name'].includes(requestedSort)) $('#product-sort').value = requestedSort;
    $('#product-sort').addEventListener('change', renderCollection);
  }

  function relatedProducts(product) {
    const similar = products.filter((item) => item.id !== product.id && item.category === product.category);
    const complementary = products.filter((item) => item.category !== product.category);
    return [...similar.slice(0, 2), ...complementary, ...similar.slice(2)].slice(0, 3);
  }

  function renderProduct() {
    const id = params.get('id') || 'boreal';
    if (!Object.hasOwn(catalog, id)) {
      document.title = 'Equipment not found — Aurora Atlas';
      $('#product-content').innerHTML = '<section class="product-not-found"><p class="eyebrow">A SMALL DETOUR / 404</p><h1>This trail ends here<span class="accent">.</span></h1><p>That piece is not in the current collection. Your next essential is still out there.</p><a href="shop.html" class="button button-lime">Explore the collection <span>↗</span></a></section>';
      return;
    }
    selectedProduct = catalog[id];
    selectedColor = selectedProduct.colors.includes(params.get('color')) ? params.get('color') : selectedProduct.colors[0];
    selectedSize = selectedProduct.sizes.length === 1 ? 'ONE SIZE' : null;
    document.title = `${selectedProduct.name} — Aurora Atlas`;
    $('meta[name="description"]').content = selectedProduct.description;
    const p = selectedProduct;
    $('#product-content').innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="shop.html">All equipment</a><span aria-hidden="true">/</span><a href="shop.html?category=${p.category}">${categories[p.category]}</a><span aria-hidden="true">/</span><span>${p.name}</span></nav>
      <section class="product-layout" aria-labelledby="detail-title"><div class="product-gallery"><div class="gallery-photo"><span class="gallery-badge">${p.badge || 'THE EVERYDAY EDIT'}</span><button id="gallery-zoom" aria-label="Enlarge product photo"><img id="detail-image" src="${photo(p, selectedColor)}" alt="${p.name} in ${colors[selectedColor].name}, full view" width="1200" height="1600" fetchpriority="high"></button><span class="gallery-photo-index" id="gallery-count">01 / 03</span><span class="zoom-hint" aria-hidden="true">+ CLICK TO GET CLOSER</span></div><div class="gallery-controls"><div id="gallery-thumbnails" class="gallery-thumbnails" role="group" aria-label="Product photo gallery">${p.gallery.map((label, index) => `<button data-gallery-index="${index}" class="${index === 0 ? 'selected' : ''}" aria-label="${label}" aria-pressed="${index === 0}"><img src="${photo(p, selectedColor)}" alt="" data-view="${index}" width="90" height="120"><span>${label}</span></button>`).join('')}</div><div class="gallery-arrows"><button class="icon-button" data-gallery-step="-1" aria-label="Previous product photo">←</button><button class="icon-button" data-gallery-step="1" aria-label="Next product photo">→</button></div></div><p class="photo-reference">Concept collection · Reference product photography. Detail views are close-up crops.</p></div>
      <div class="product-purchase"><p class="eyebrow">AA / ${p.category.toUpperCase()} / ${String(products.indexOf(p) + 1).padStart(3, '0')}</p><h1 id="detail-title">${p.name}</h1><p class="product-subtitle">${p.type}</p><p id="detail-price" class="product-page-price">${money(p.price)} <span>USD</span></p><p class="product-page-description">${p.description}</p><div class="feature-tags">${p.features.map((feature) => `<span>${feature}</span>`).join('')}</div><form id="product-form"><fieldset><legend>Color — <span id="detail-color-name">${colors[selectedColor].name}</span></legend><div id="detail-colors" class="detail-colors"></div></fieldset><fieldset id="size-fieldset" ${p.sizes.length === 1 ? 'hidden' : ''}><legend><span>Choose your size</span><button type="button" id="size-guide-trigger">Size guide ↗</button></legend><div id="detail-sizes" class="size-options">${p.sizes.map((size) => `<button type="button" data-size="${size}" aria-pressed="false">${size}</button>`).join('')}</div><p class="size-note">${p.fit}</p><p id="size-error" class="form-error" role="alert" hidden>Choose a size before adding this piece to your bag.</p></fieldset><p id="stock-message" class="stock-note" role="status"></p><div class="purchase-row"><div class="purchase-quantity"><button type="button" data-purchase-step="-1" aria-label="Decrease quantity">−</button><label class="sr-only" for="product-quantity">Quantity</label><input id="product-quantity" type="number" min="1" max="99" step="1" value="1" required><button type="button" data-purchase-step="1" aria-label="Increase quantity">+</button></div><button type="submit" class="button button-lime add-to-bag">Add to bag <span>↗</span></button></div></form><div class="product-delivery"><span>↗ <span>Complimentary shipping<br><small>On orders $150 and over</small></span></span><span>↺ <span>Take your time<br><small>30 days to find your fit</small></span></span></div><div class="product-accordions"><details open><summary>The details <span>+</span></summary><p>${p.details}</p></details><details><summary>Fit & sizing <span>+</span></summary><p>${p.fit}</p></details><details><summary>Care for your equipment <span>+</span></summary><p>${p.care}</p></details><details><summary>Shipping & returns <span>+</span></summary><p>Standard delivery is available within the United States. Review the shipping charge and delivery address at checkout. Keep your order reference for help with your delivery or a return.</p></details></div></div></section>
      <section class="product-detail-story"><div><p class="eyebrow">PURPOSE IN EVERY PIECE</p><h2>All the detail.<br>None of the excess.</h2></div><div>${p.features.map((feature, index) => `<div><span>0${index + 1}</span><h3>${feature}</h3></div>`).join('')}</div></section><section class="related-products" aria-labelledby="related-heading"><div class="section-heading"><div><p class="eyebrow">GOOD COMPANY FOR YOUR NEXT CHAPTER</p><h2 id="related-heading">Better together.</h2></div><a href="shop.html" class="text-link">Explore all equipment <span>↗</span></a></div><div class="product-grid">${relatedProducts(p).map(card).join('')}</div></section>`;
    updateProductColor(false);
    $('#product-form').addEventListener('submit', addToBag);
    $('#gallery-zoom').addEventListener('click', () => { updateGallery(); $('#image-dialog').showModal(); });
    $('.product-gallery').addEventListener('keydown', galleryKeys);
    $('#image-dialog').addEventListener('keydown', galleryKeys);
    $$('.desktop-nav [data-nav-filter]').forEach((link) => { if (link.dataset.navFilter === p.category) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); } });
  }
  function updateAvailability() {
    if (!selectedProduct?.variants) return;
    const variant = selectedProduct.variants.find((item) => item.color === selectedColor && item.size === selectedSize);
    $('#stock-message').textContent = !selectedSize ? 'Choose a size to check availability.' : variant?.stock > 0 ? `${variant.stock} available in this option.` : 'This option is currently sold out.';
    $('.add-to-bag').disabled = Boolean((api && !api.available) || (selectedSize && !variant?.stock));
  }
  function galleryKeys(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); galleryIndex = (galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1) + 3) % 3; updateGallery();
    }
  }
  function updateGallery() {
    if (!selectedProduct) return;
    const label = selectedProduct.gallery[galleryIndex];
    $('#detail-image').dataset.view = galleryIndex;
    $('#detail-image').alt = `${selectedProduct.name} in ${colors[selectedColor].name}, ${label.toLowerCase()}`;
    $('#gallery-count').textContent = `0${galleryIndex + 1} / 03`;
    $$('[data-gallery-index]').forEach((button) => { const active = Number(button.dataset.galleryIndex) === galleryIndex; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
    $('#zoom-image').src = photo(selectedProduct, selectedColor);
    $('#zoom-image').alt = $('#detail-image').alt;
    $('#zoom-image').dataset.view = galleryIndex;
    $('#zoom-caption').textContent = `${selectedProduct.name} / ${colors[selectedColor].name} / ${label}`;
  }
  function updateProductColor(updateUrl = true) {
    $('#detail-color-name').textContent = colors[selectedColor].name;
    $('#detail-image').src = photo(selectedProduct, selectedColor);
    $$('#gallery-thumbnails img').forEach((image) => { image.src = photo(selectedProduct, selectedColor); });
    $('#detail-colors').innerHTML = selectedProduct.colors.map((color) => `<button type="button" class="product-color-option ${color === selectedColor ? 'selected' : ''}" data-detail-color="${color}" aria-label="${colors[color].name}" aria-pressed="${color === selectedColor}"><span style="--swatch:${colors[color].hex}"></span><span>${colors[color].name}</span></button>`).join('');
    galleryIndex = 0; updateGallery(); updateAvailability();
    if (updateUrl) { const url = new URL(location.href); url.searchParams.set('color', selectedColor); history.replaceState(null, '', url); }
  }
  async function persistBag(next) {
    if (bagBusy) { toast('Your bag is updating. Please wait a moment.'); return false; }
    if (api && !api.available) { toast('The store is unavailable. Refresh before updating your bag.'); return false; }
    bagBusy = true;
    try {
      if (api) { const result = await api.setCart(next); bag = result.items; }
      else bag = next;
      updateBag(); return true;
    } catch (error) {
      try { bag = (await api.refreshCart()).items; updateBag(); } catch {}
      toast(error.message); return false;
    } finally { bagBusy = false; }
  }
  async function addToBag(event) {
    event.preventDefault();
    if (!selectedSize) { $('#size-error').hidden = false; $('#detail-sizes button').focus(); return; }
    const quantity = Number($('#product-quantity').value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
    const next = bag.map((item) => ({ ...item }));
    const item = next.find((entry) => entry.id === selectedProduct.id && entry.color === selectedColor && entry.size === selectedSize);
    if (item && item.quantity + quantity > 99) { toast('The limit is 99 of each piece. Adjust your bag quantity to add more.'); return; }
    if (item) item.quantity += quantity;
    else next.push({ id: selectedProduct.id, color: selectedColor, size: selectedSize, quantity });
    if (await persistBag(next)) { $('#bag-dialog').showModal(); toast(`${selectedProduct.name} added to your bag.`); }
  }
  function updateBag() {
    const count = bag.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = bag.reduce((sum, item) => sum + catalog[item.id].price * item.quantity, 0);
    $('.bag-count').textContent = String(count);
    $('.bag-trigger').setAttribute('aria-label', `Open shopping bag, ${count} item${count === 1 ? '' : 's'}`);
    $('#bag-total-count').textContent = `(${count})`;
    $('#bag-summary').hidden = !bag.length;
    $('#bag-subtotal').textContent = money(subtotal);
    const threshold = (api?.settings.freeShippingCents ?? 15000) / 100;
    $('#shipping-progress').textContent = subtotal >= threshold ? 'Your equipment ships on us. Complimentary shipping unlocked.' : `${money(threshold - subtotal)} away from complimentary shipping.`;
    $('#bag-items').innerHTML = bag.length ? bag.map((item, index) => {
      const product = catalog[item.id];
      return `<div class="bag-item"><a href="${productUrl(product, item.color)}"><img src="${photo(product, item.color)}" alt="${product.name} in ${colors[item.color].name}"></a><div class="bag-item-info"><h3><a href="${productUrl(product, item.color)}">${product.name}</a></h3><p>${colors[item.color].name} / ${item.size}</p><span class="bag-item-price">${money(product.price * item.quantity)}</span><button class="bag-item-remove" data-remove="${index}" aria-label="Remove ${product.name}">×</button><div class="quantity-control"><button data-quantity="${index}" data-change="-1" aria-label="Decrease ${product.name} quantity">−</button><span aria-label="Quantity">${item.quantity}</span><button data-quantity="${index}" data-change="1" aria-label="Increase ${product.name} quantity" ${item.quantity >= 99 ? 'disabled' : ''}>+</button></div></div></div>`;
    }).join('') : '<div class="bag-empty"><span aria-hidden="true">↗</span><h3>A little room for possibility.</h3><p>Your next everyday essential is out there.</p><a class="button button-lime" href="shop.html">Explore the collection <span>↗</span></a></div>';
    save('aurora-atlas-bag-v1', bag);
  }
  const information = {
    shipping: ['A little peace of mind.', `<p>Standard delivery is available within the United States. Shipping is ${money((api?.settings.shippingCents ?? 995) / 100)}, with complimentary delivery from ${money((api?.settings.freeShippingCents ?? 15000) / 100)}. Your full total is shown before placing your order.</p><p>Keep your order reference for help with your delivery or a return.</p>`],
    care: ['Keep your equipment going.', '<p>Wash cold and follow the care label supplied with your garment. Air dry fleece and spot clean carry goods. The product pages include more specific care information for each piece.</p>'],
    contact: ['Good conversations start here.', '<p>This is a concept collection, so a customer support inbox is not connected yet. Our product pages, size guide, and care notes can help you get to know the equipment.</p>'],
    size: ['Find your fit.', '<p>Use your body measurements, in centimeters, to find your size. Measure around the fullest part of your chest and your natural waist. This is a concept sizing guide; follow the supplier’s measurements for production garments.</p><table><thead><tr><th>Size</th><th>Chest</th><th>Waist</th></tr></thead><tbody><tr><td>XS</td><td>80–87</td><td>64–71</td></tr><tr><td>S</td><td>88–95</td><td>72–79</td></tr><tr><td>M</td><td>96–103</td><td>80–87</td></tr><tr><td>L</td><td>104–111</td><td>88–95</td></tr><tr><td>XL</td><td>112–119</td><td>96–103</td></tr></tbody></table>'],
    checkout: ['Ready for your next chapter.', '<p>Review your bag, then continue to checkout to choose delivery and payment.</p>']
  };
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button,a'); if (!target) return;
    if (target.hasAttribute('data-close')) target.closest('dialog').close();
    if (target.hasAttribute('data-filter')) { activeFilter = target.dataset.filter; renderCollection(); }
    if (target.hasAttribute('data-detail-color')) { selectedColor = target.dataset.detailColor; updateProductColor(); }
    if (target.hasAttribute('data-size')) {
      selectedSize = target.dataset.size; $('#size-error').hidden = true; updateAvailability();
      $$('[data-size]').forEach((button) => { button.classList.toggle('selected', button === target); button.setAttribute('aria-pressed', String(button === target)); });
    }
    if (target.hasAttribute('data-gallery-index')) { galleryIndex = Number(target.dataset.galleryIndex); updateGallery(); }
    if (target.hasAttribute('data-gallery-step')) { galleryIndex = (galleryIndex + Number(target.dataset.galleryStep) + 3) % 3; updateGallery(); }
    if (target.hasAttribute('data-purchase-step')) {
      const input = $('#product-quantity'); input.value = Math.max(1, Math.min(99, (Number(input.value) || 1) + Number(target.dataset.purchaseStep)));
    }
    if (target.hasAttribute('data-remove')) { persistBag(bag.filter((_, index) => index !== Number(target.dataset.remove))); }
    if (target.hasAttribute('data-quantity')) {
      const index = Number(target.dataset.quantity);
      const next = bag.map((item) => ({ ...item }));
      next[index].quantity = Math.min(99, next[index].quantity + Number(target.dataset.change));
      persistBag(next.filter((item) => item.quantity > 0));
    }
    if (target.hasAttribute('data-info')) showInfo(...information[target.dataset.info]);
    if (target.id === 'size-guide-trigger') showInfo(...information.size);
    if (target.id === 'checkout-trigger') {
      if (bagBusy) toast('Your bag is updating. Please wait a moment.');
      else if (api && !api.available) toast('The store is unavailable. Refresh before checking out.');
      else location.href = 'checkout.html';
    }
    if (target.id === 'reset-collection') { activeFilter = 'all'; $('#product-search').value = ''; $('#product-sort').value = 'featured'; renderCollection(); }
    if (target.id === 'story-trigger') location.href = 'shop.html';
    if (target.closest('.mobile-nav')) {
      $('.mobile-nav').hidden = true;
      $('.mobile-menu-trigger').setAttribute('aria-expanded', 'false');
      $('.mobile-menu-trigger').setAttribute('aria-label', 'Open menu');
    }
  });
  $('.bag-trigger').addEventListener('click', () => { updateBag(); $('#bag-dialog').showModal(); });
  $('.mobile-menu-trigger').addEventListener('click', () => {
    const open = $('.mobile-nav').hidden; $('.mobile-nav').hidden = !open;
    $('.mobile-menu-trigger').setAttribute('aria-expanded', String(open));
    $('.mobile-menu-trigger').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $('.search-trigger').addEventListener('click', () => {
    if (page === 'shop') { $('#product-search').scrollIntoView({ block: 'center', behavior: 'smooth' }); $('#product-search').focus({ preventScroll: true }); }
    else location.href = 'shop.html?search=1';
  });
  $('#close-search')?.addEventListener('click', () => { $('.search-bar').hidden = true; $('#product-search').value = ''; renderCollection(); });
  $('#newsletter-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!$('#newsletter-form').reportValidity()) return;
    const button = $('#newsletter-form button'); button.disabled = true;
    try {
      if (!api?.available) throw new Error('The store is unavailable. Please try again shortly.');
      const result = await api.request('/api/newsletter', { method: 'POST', body: { email: $('#newsletter-email').value.trim(), consent: $('#newsletter-consent').checked } });
      $('#newsletter-message').textContent = result.message;
      $('#newsletter-email').value = ''; $('#newsletter-consent').checked = false;
    } catch (error) { $('#newsletter-message').textContent = error.message; }
    finally { button.disabled = false; }
  });
  renderCollection();
  if (page === 'product') renderProduct();
  updateBag();
  $$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
  window.addEventListener('aurora:cart', (event) => { bag = event.detail.items; updateBag(); });
  window.addEventListener('pageshow', async (event) => {
    if (api) {
      if (event.persisted) try { await api.refreshSession(); bag = (await api.refreshCart()).items; updateBag(); } catch (error) { toast(error.message); }
      return;
    }
    const saved = readSaved('aurora-atlas-bag-v1', bag);
    if (Array.isArray(saved)) bag = saved.filter((item) => item && Object.hasOwn(catalog, item.id) && catalog[item.id].colors.includes(item.color) && catalog[item.id].sizes.includes(item.size) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99);
    updateBag();
  });
  if (page === 'shop' && params.has('search')) $('#product-search').focus();
  window.addEventListener('focus', async () => {
    if (!api?.available || bagBusy) return;
    try { await api.refreshSession(); await api.refreshCart(); } catch {}
  });
})();
