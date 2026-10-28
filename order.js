(async () => {
  'use strict';
  const api = await window.AuroraAPI.ready;
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const id = new URLSearchParams(location.search).get('id');
  let retries = 0;
  async function load() {
    try {
      if (!api.available) throw new Error('The store is unavailable. Please try again shortly.');
      if (!/^[a-f0-9-]{36}$/.test(id || '')) throw new Error('Open your order from checkout or your account history.');
      const { order } = await api.request('/api/orders/' + id);
      $('#order-content').hidden = false;
      const paid = order.paymentStatus === 'paid', confirmed = ['confirmed','fulfilled'].includes(order.status);
      $('#order-heading').textContent = confirmed ? 'Good things are on the way.' : order.status === 'cancelled' ? 'Checkout cancelled.' : 'Your payment is being checked.';
      $('#order-intro').textContent = confirmed ? 'Thank you. Your order is saved, and the store can now prepare it.' : order.status === 'payment_review' ? 'The store needs to review this payment before confirming fulfillment. Please keep your order reference.' : order.status === 'cancelled' ? 'This order is cancelled. You can return to the collection.' : 'Payment is confirmed only after the payment provider verifies it.';
      $('#order-reference').textContent = order.reference;
      $('#order-status').textContent = `Order: ${order.status.replaceAll('_',' ')} · Payment: ${order.paymentStatus.replaceAll('_',' ')}`;
      $('#order-items').innerHTML = order.items.map((item) => `<div class="summary-item"><div><h3>${escape(item.name)}</h3><p>${escape(item.color)} / ${escape(item.size)} / Qty ${item.quantity}</p></div><strong>${money(item.unitPriceCents * item.quantity)}</strong></div>`).join('');
      $('#order-totals').innerHTML = `<div><dt>Subtotal</dt><dd>${money(order.subtotalCents)}</dd></div><div><dt>Shipping</dt><dd>${money(order.shippingCents)}</dd></div><div><dt>Sales tax</dt><dd>${money(order.taxCents)}</dd></div><div class="grand-total"><dt>Total</dt><dd>${money(order.totalCents)}</dd></div>`;
      const c = order.customer;
      $('#order-address').textContent = [c.name,c.address1,c.address2,`${c.city}, ${c.state} ${c.postalCode}`,'United States',c.email].filter(Boolean).join('\n');
      $('#order-payment').textContent = order.paymentMethod === 'cod' ? `Payment on delivery: ${money(order.totalCents)}${paid ? ' collected.' : ' is due when your order arrives. No online payment has been taken.'}` : paid ? 'Your online payment has been verified.' : 'Your online payment has not been verified yet.';
      $('#order-retry').hidden = order.status !== 'awaiting_payment';
      $('#order-retry').href = 'checkout.html?resume=' + order.id;
      if (confirmed) { try { sessionStorage.removeItem('aurora-checkout-request'); } catch {} await api.refreshCart(); }
      if (order.status === 'awaiting_payment' && retries++ < 10) setTimeout(load, 2000);
    } catch (error) { $('#order-intro').textContent = ''; $('#order-error').textContent = error.message; $('#order-error').hidden = false; }
  }
  await load();
})();
