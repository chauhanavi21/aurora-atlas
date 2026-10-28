(async () => {
  'use strict';
  const api = await window.AuroraAPI.ready;
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const fail = (message) => { $('#checkout-error').textContent = message; $('#checkout-error').hidden = false; };
  if (!api.available) { fail('The store is unavailable. Please refresh and try again shortly.'); return; }
  if (api.user) {
    $('#checkout-account').textContent = `Signed in as ${api.user.email}. This order will appear in your account.`;
    $('#checkout-form [name=name]').value = api.user.name;
    $('#checkout-form [name=email]').value = api.user.email;
  } else $('#checkout-account').innerHTML = '<a href="login.html?next=checkout.html">Sign in</a> or <a href="signup.html?next=checkout.html">create an account</a> to keep your orders together. You can also continue as a guest.';
  const states = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming' };
  for (const [value, label] of Object.entries(states)) {
    const option = document.createElement('option'); option.value = value; option.textContent = label;
    $('#checkout-state').append(option);
  }
  let cart = api.cart, requestKey = null, resumeId = new URLSearchParams(location.search).get('resume');
  try { requestKey = sessionStorage.getItem('aurora-checkout-request'); } catch {}
  requestKey ||= crypto.randomUUID();
  try { sessionStorage.setItem('aurora-checkout-request', requestKey); } catch {}
  const methods = [];
  if (api.settings.allowCod) methods.push(['cod','Pay on delivery','Place your order now. Pay the full total when your order is delivered.']);
  if (api.settings.stripeEnabled) methods.push(['stripe','Pay securely online','Continue to Stripe for card and supported wallet payments.']);
  $('#payment-options').innerHTML = methods.map(([value, label, note], index) => `<label class="payment-option"><input type="radio" name="paymentMethod" value="${value}" ${index === 0 ? 'checked' : ''} required><span><strong>${label}</strong><small>${note}</small></span></label>`).join('');
  if (!methods.length) { fail('Checkout is temporarily closed. Please check back shortly.'); $('#place-order').disabled = true; }
  function render() {
    $('#checkout-layout').hidden = !cart.items.length;
    $('#checkout-empty').hidden = cart.items.length > 0;
    const { catalog, colors, photo, productUrl } = window.AuroraCatalog;
    $('#checkout-items').innerHTML = cart.items.map((item) => `<div class="summary-item"><a href="${productUrl(catalog[item.id],item.color)}"><img src="${photo(catalog[item.id],item.color)}" alt="${escape(item.name)}" width="72" height="96"></a><div><h3>${escape(item.name)}</h3><p>${escape(colors[item.color].name)} / ${escape(item.size)} / Qty ${item.quantity}</p></div><strong>${money(item.unitPriceCents * item.quantity)}</strong></div>`).join('');
    $('#checkout-totals').innerHTML = `<div><dt>Subtotal</dt><dd>${money(cart.subtotalCents)}</dd></div><div><dt>Standard shipping</dt><dd>${cart.shippingCents ? money(cart.shippingCents) : 'Complimentary'}</dd></div><div><dt>Sales tax</dt><dd>${money(cart.taxCents)}</dd></div><div class="grand-total"><dt>Total <small>USD</small></dt><dd>${money(cart.totalCents)}</dd></div>`;
  }
  render();
  function clearRequest() { try { sessionStorage.removeItem('aurora-checkout-request'); } catch {} }
  if (resumeId) {
    try {
      const { order } = await api.request('/api/orders/' + encodeURIComponent(resumeId));
      if (order.status === 'awaiting_payment') { $('#pending-checkout').hidden = false; $('#checkout-layout').hidden = true; $('#checkout-empty').hidden = true; }
      else if (order.status === 'confirmed' || order.status === 'fulfilled') { location.href = 'order.html?id=' + order.id; return; }
      else { clearRequest(); requestKey = crypto.randomUUID(); }
    } catch (error) { fail(error.message); }
  }
  $('#resume-payment').addEventListener('click', async () => {
    const button = $('#resume-payment'); button.disabled = true;
    try { const result = await api.request('/api/orders/' + resumeId + '/pay', { method: 'POST', body: {} }); location.href = result.checkoutUrl; }
    catch (error) { fail(error.message); button.disabled = false; }
  });
  $('#cancel-payment').addEventListener('click', async () => {
    const button = $('#cancel-payment'); button.disabled = true;
    try {
      await api.request('/api/orders/' + resumeId + '/cancel', { method: 'POST', body: {} });
      clearRequest(); location.href = 'checkout.html';
    } catch (error) { fail(error.message); button.disabled = false; }
  });
  $('#checkout-form').addEventListener('change', (event) => {
    if (event.target.name === 'paymentMethod') $('#place-order').innerHTML = event.target.value === 'stripe' ? 'Continue to secure payment <span>↗</span>' : 'Place order <span>↗</span>';
  });
  if (methods[0]?.[0] === 'stripe') $('#place-order').innerHTML = 'Continue to secure payment <span>↗</span>';
  $('#checkout-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || $('#place-order').disabled) return;
    $('#checkout-error').hidden = true; $('#place-order').disabled = true;
    const fields = Object.fromEntries(new FormData(form));
    const { paymentMethod, ...customer } = fields;
    try {
      const result = await api.request('/api/orders', { method: 'POST', body: { customer, paymentMethod, requestKey, cartVersion: cart.version, expectedTotalCents: cart.totalCents } });
      if (result.checkoutUrl) location.href = result.checkoutUrl;
      else { clearRequest(); await api.refreshCart(); location.href = 'order.html?id=' + result.order.id; }
    } catch (error) {
      fail(error.message);
      if (error.status === 409) try { cart = await api.refreshCart(); render(); } catch {}
      $('#place-order').disabled = false;
    }
  });
})();
