/* Same-origin API client. Session cookies stay HttpOnly; prices come from the server. */
(() => {
  'use strict';
  const api = { available: false, csrfToken: '', cart: { items: [], version: 0 }, settings: {} };
  api.request = async (path, options = {}) => {
    const method = options.method || 'GET';
    const response = await fetch(path, {
      method, credentials: 'same-origin', signal: AbortSignal.timeout(20000),
      headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': api.csrfToken } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('The store server is unavailable. Please try again shortly.'); }
    if (!response.ok) {
      const error = new Error(data.error || 'The request could not be completed.');
      error.status = response.status; error.data = data; throw error;
    }
    return data;
  };
  function broadcast() { window.dispatchEvent(new CustomEvent('aurora:cart', { detail: api.cart })); }
  api.refreshCart = async () => { api.cart = await api.request('/api/cart'); broadcast(); return api.cart; };
  api.setCart = async (items) => {
    api.cart = await api.request('/api/cart', { method: 'PUT', body: { items: items.map(({ id, color, size, quantity }) => ({ id, color, size, quantity })), version: api.cart.version } });
    broadcast(); return api.cart;
  };
  api.ready = (async () => {
    try {
      const [session, data] = await Promise.all([api.request('/api/session'), api.request('/api/products')]);
      api.csrfToken = session.csrfToken; api.settings = session.settings; api.admin = session.admin;
      const previous = window.AuroraCatalog;
      window.AuroraCatalog = { ...previous, ...data, catalog: Object.fromEntries(data.products.map((product) => [product.id, product])) };
      api.cart = await api.request('/api/cart');
      api.available = true;
      // Import a pre-backend bag once. Every imported variant is checked against live stock.
      try {
        if (!localStorage.getItem('aurora-atlas-bag-imported-v1')) {
          const old = JSON.parse(localStorage.getItem('aurora-atlas-bag-v1') || '[]');
          if (!api.cart.items.length && Array.isArray(old) && old.length && old.length <= 40) {
            const items = old.filter((item) => item && Number.isInteger(item.quantity) && item.quantity > 0 && window.AuroraCatalog.catalog[item.id]?.variants.some((variant) => variant.color === item.color && variant.size === item.size && variant.stock >= item.quantity));
            if (items.length) await api.setCart(items);
          }
          localStorage.setItem('aurora-atlas-bag-imported-v1', '1');
        }
      } catch { /* Invalid or inaccessible legacy storage does not stop the store. */ }
    } catch (error) {
      api.error = error.message;
      const message = document.createElement('p');
      message.className = 'connection-notice'; message.setAttribute('role', 'status');
      message.textContent = 'The store is temporarily unavailable. You can browse; refresh before adding to your bag or checking out.';
      document.body.prepend(message);
    }
    return api;
  })();
  window.AuroraAPI = api;
})();
