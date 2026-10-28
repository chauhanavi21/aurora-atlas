(async () => {
  'use strict';
  const api = await window.AuroraAPI.ready;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const error = (message) => { $('#admin-error').textContent = message; $('#admin-error').hidden = !message; };
  let overview;
  function signedIn(value) { $('#admin-login').hidden = value; $('#admin-dashboard').hidden = !value; }
  if (!api.available) { error('The store server is unavailable. Please refresh and try again.'); $('#admin-login button').disabled = true; return; }
  async function load() {
    try {
      overview = await api.request('/api/admin/overview');
      signedIn(true);
      const pending = overview.orders.filter((order) => order.status === 'confirmed').length;
      $('#admin-metrics').innerHTML = `<div><strong>${overview.counts.orders}</strong><span>Total orders</span></div><div><strong>${pending}</strong><span>To prepare in latest 100</span></div><div><strong>${overview.counts.subscribers}</strong><span>Field notes subscribers</span></div>`;
      $('#panel-orders').innerHTML = overview.orders.length ? overview.orders.map((order) => {
        const c = order.customer;
        return `<article class="commerce-panel admin-order"><div class="admin-order-head"><h2>${escape(order.reference)}</h2><span class="order-badge">${escape(order.status.replaceAll('_',' '))}</span></div><p class="commerce-note">${escape(new Date(order.created).toLocaleString())} · ${money(order.totalCents)} · ${escape(order.paymentStatus.replaceAll('_',' '))}</p><p class="admin-order-customer">${escape([c.name,c.email,c.address1,c.address2,`${c.city}, ${c.state} ${c.postalCode}`].filter(Boolean).join('\n'))}</p><div class="admin-order-lines">${order.items.map((item) => `<p>${item.quantity} × ${escape(item.name)} / ${escape(item.color)} / ${escape(item.size)}</p>`).join('')}</div>${order.status === 'confirmed' ? `<div class="commerce-actions"><button data-order="${order.id}" data-status="fulfilled" data-cod="${order.paymentMethod === 'cod'}">${order.paymentMethod === 'cod' ? 'Mark delivered & payment collected' : 'Mark fulfilled'}</button>${order.paymentMethod === 'cod' ? `<button data-order="${order.id}" data-status="cancelled">Cancel order & restore stock</button>` : ''}</div>` : ''}</article>`;
      }).join('') : '<div class="commerce-panel"><h2>Your next chapter starts here.</h2><p>Orders will appear here when customers check out.</p></div>';
      $('#panel-inventory').innerHTML = overview.products.map((product) => `<form class="commerce-panel inventory-form" data-product-id="${product.id}"><h2>${escape(product.name)}</h2><div class="inventory-fields"><label>Price (USD)<input name="price" type="number" step="0.01" min="0.01" max="100000" value="${product.price.toFixed(2)}" required></label><label>Product option<select name="variant">${product.variants.map((variant) => `<option value="${variant.color}|${variant.size}">${escape(window.AuroraCatalog.colors[variant.color].name)} / ${escape(variant.size)}</option>`).join('')}</select></label><label>Available stock<input name="stock" type="number" min="0" max="1000000" step="1" value="${product.variants[0].stock}" required></label></div><button type="submit" class="button button-lime">Save product <span>↗</span></button></form>`).join('');
      $('#panel-subscribers').innerHTML = `<h2>Your field notes community</h2><p>Latest 100 signups. Subscribers have opted in; email delivery is configured separately.</p><ul>${overview.subscribers.map((subscriber) => `<li>${escape(subscriber.email)} <span class="muted">/ ${escape(new Date(subscriber.created).toLocaleDateString())}</span></li>`).join('')}</ul>`;
    } catch (failure) { error(failure.message); if (failure.status === 401) signedIn(false); }
  }
  $('#admin-login').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return;
    const button = $('#admin-login button'); button.disabled = true; error('');
    try {
      const result = await api.request('/api/admin/login', { method: 'POST', body: Object.fromEntries(new FormData(event.currentTarget)) });
      api.csrfToken = result.csrfToken; api.admin = true; $('#admin-login').reset(); await load();
    } catch (failure) { error(failure.message); }
    finally { button.disabled = false; }
  });
  $('#admin-logout').addEventListener('click', async () => {
    try { await api.request('/api/admin/logout', { method: 'POST', body: {} }); location.reload(); } catch (failure) { error(failure.message); }
  });
  $('#admin-refresh').addEventListener('click', load);
  document.addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-admin-tab]');
    if (tab) {
      $$('[data-admin-tab]').forEach((button) => { const active = button === tab; button.setAttribute('aria-selected', String(active)); $('#panel-' + button.dataset.adminTab).hidden = !active; });
    }
    const action = event.target.closest('[data-order]');
    if (!action) return;
    if (!confirm(action.dataset.status === 'cancelled' ? 'Cancel this order and restore its stock?' : action.dataset.cod === 'true' ? 'Confirm that delivery is complete and payment has been collected?' : 'Mark this paid order as fulfilled?')) return;
    action.disabled = true; error('');
    try {
      await api.request('/api/admin/orders/' + action.dataset.order, { method: 'PATCH', body: { status: action.dataset.status, collected: action.dataset.cod === 'true' } });
      $('#admin-status').textContent = 'Order updated.'; await load();
    } catch (failure) { error(failure.message); action.disabled = false; }
  });
  document.addEventListener('change', (event) => {
    const form = event.target.closest('.inventory-form');
    if (!form || event.target.name !== 'variant') return;
    const [color,size] = event.target.value.split('|');
    const variant = overview.products.find((product) => product.id === form.dataset.productId).variants.find((variant) => variant.color === color && variant.size === size);
    form.elements.stock.value = variant.stock;
  });
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('.inventory-form');
    if (!form) return;
    event.preventDefault(); if (!form.reportValidity()) return;
    const button = form.querySelector('button'); button.disabled = true; error('');
    const [color,size] = form.elements.variant.value.split('|');
    try {
      const result = await api.request('/api/admin/products/' + form.dataset.productId, { method: 'PATCH', body: { priceCents: Math.round(Number(form.elements.price.value) * 100), color, size, stock: Number(form.elements.stock.value) } });
      const index = overview.products.findIndex((product) => product.id === result.product.id);
      overview.products[index] = result.product;
      $('#admin-status').textContent = `${result.product.name} saved. Customers will see the updated stock and price.`;
    } catch (failure) { error(failure.message); }
    finally { button.disabled = false; }
  });
  signedIn(api.admin);
  if (api.admin) await load();
})();
