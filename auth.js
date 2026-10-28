(async () => {
  'use strict';
  const api = await window.AuroraAPI.ready;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const page = document.body.dataset.page, mode = document.body.dataset.authMode;
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const money = (cents) => new Intl.NumberFormat('en-US', { style:'currency',currency:'USD' }).format(cents / 100);
  const message = (text, success = false) => {
    const element = $(success ? '#auth-success' : '#auth-message');
    element.textContent = text; element.hidden = !text;
    $(success ? '#auth-message' : '#auth-success').hidden = true;
  };
  function safeNext(value) {
    try {
      const url = new URL(value || 'account.html', location.origin + '/');
      if (url.origin === location.origin && ['/account.html','/checkout.html','/shop.html','/product.html','/order.html','/index.html'].includes(url.pathname)) return url.pathname.slice(1) + url.search;
    } catch {}
    return 'account.html';
  }
  const next = safeNext(new URLSearchParams(location.search).get('next'));
  $$('[data-auth-link]').forEach((link) => { link.href = link.getAttribute('href') + '?next=' + encodeURIComponent(next); });
  if (!api.available) { message('The store is unavailable. Please refresh and try again shortly.'); $$('form button[type=submit]').forEach((button) => { button.disabled = true; }); return; }

  function values(form) { return Object.fromEntries(new FormData(form)); }
  function validation(form, kind) {
    const data = values(form), errors = {};
    if (['register','profile'].includes(kind)) {
      const name = (data.name || '').trim();
      if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{M} .’'-]+$/u.test(name) || !/\p{L}/u.test(name)) errors.name = 'Enter your name using 2–80 letters, spaces, apostrophes, periods, or hyphens.';
    }
    if (form.elements.namedItem('email')) {
      const input = form.elements.namedItem('email');
      if (!data.email?.trim() || input.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
    }
    if (kind === 'login' && (!data.password || [...data.password].length > 128)) errors.password = 'Enter your password.';
    if (kind === 'register' || ['reset-password','password'].includes(kind)) {
      const field = kind === 'register' ? 'password' : 'newPassword';
      const invalid = window.AuroraAuthValidation.passwordError(data[field], data.email || api.user?.email || '');
      if (invalid) errors[field] = invalid;
      if (!data.confirmPassword || data.confirmPassword !== data[field]) errors.confirmPassword = 'The passwords do not match.';
    }
    if (kind === 'password') {
      if (!data.currentPassword || [...data.currentPassword].length > 128) errors.currentPassword = 'Enter your current password.';
      else if (data.currentPassword === data.newPassword) errors.newPassword = 'Choose a different new password.';
    }
    return errors;
  }
  function fieldErrors(form, errors, focus = true) {
    form.querySelectorAll('[data-error-for]').forEach((element) => {
      const name = element.dataset.errorFor, input = form.elements.namedItem(name);
      element.textContent = errors[name] || '';
      input?.setAttribute('aria-invalid', String(Boolean(errors[name])));
    });
    if (focus) form.elements.namedItem(Object.keys(errors)[0])?.focus();
  }
  function pending(form, value) {
    form.setAttribute('aria-busy', String(value));
    form.querySelector('button[type=submit]').disabled = value;
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toggle-password]'); if (!button) return;
    const input = document.getElementById(button.dataset.togglePassword), visible = input.type === 'password';
    input.type = visible ? 'text' : 'password'; button.textContent = visible ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${input.labels?.[0]?.childNodes[0]?.textContent.trim() || 'password'}`);
  });
  document.addEventListener('input', (event) => {
    const form = event.target.closest('form'); if (!form) return;
    const kind = page === 'account' ? form.id === 'profile-form' ? 'profile' : 'password' : mode;
    if (event.target.getAttribute('aria-invalid') === 'true' || event.target.name === 'confirmPassword') fieldErrors(form, validation(form, kind), false);
    if (['password','newPassword','email'].includes(event.target.name) && kind !== 'login') {
      const data = values(form), password = data.newPassword || data.password || '', note = form.querySelector('[data-password-feedback]');
      if (note) note.textContent = password ? window.AuroraAuthValidation.passwordError(password, data.email || api.user?.email || '') || 'Your password meets the requirements.' : '';
    }
  });

  if (page === 'auth') {
    if (api.user && ['login','register'].includes(mode)) { location.replace(next); return; }
    const form = $('#auth-form');
    let recoveryToken = '';
    if (mode === 'reset-password') {
      recoveryToken = new URLSearchParams(location.hash.slice(1)).get('token') || '';
      // Recovery secrets remain in memory, never storage, query strings, or referrers.
      history.replaceState(null, '', location.pathname);
      if (!/^[a-f0-9]{64}$/.test(recoveryToken)) { message('This recovery link is invalid. Request a new one.'); $('#auth-submit').disabled = true; }
    }
    if (mode === 'forgot-password') {
      if (api.settings.localPasswordRecovery) $('#recovery-note').textContent = 'This local store saves recovery messages privately for the store owner. No email is sent. Links expire after 30 minutes.';
      else { message('Password recovery is unavailable. Please contact the store.'); $('#auth-submit').disabled = true; }
    }
    if (mode === 'login' && new URLSearchParams(location.search).get('reset') === 'success') message('Your password has been updated. Sign in with your new password.', true);
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if ($('#auth-submit').disabled) return;
      const errors = validation(form, mode); fieldErrors(form, errors);
      if (Object.keys(errors).length) { message('Check the highlighted fields and try again.'); return; }
      const data = values(form);
      if (mode === 'login') data.rememberMe = form.elements.namedItem('rememberMe').checked;
      if (mode === 'reset-password') data.token = recoveryToken;
      pending(form, true); message('');
      try {
        const result = await api.request('/api/auth/' + mode, { method:'POST',body:data });
        if (mode === 'forgot-password') { form.reset(); message(result.message, true); }
        else if (mode === 'reset-password') { api.applyAuth(result); form.reset(); location.replace('login.html?reset=success'); }
        else {
          api.applyAuth(result); form.reset();
          if (result.bagAdjusted) try { sessionStorage.setItem('aurora-account-notice','Your bags were combined. Some quantities were adjusted to the available stock.'); } catch {}
          location.replace(next);
        }
      } catch (error) { message(error.message); fieldErrors(form, error.data?.fields || {}); }
      finally { pending(form, false); }
    });
    return;
  }

  if (!api.user) { location.replace('login.html?next=account.html'); return; }
  const initialCustomer = api.user.id;
  let offset = 0, ordersBusy = false, leaving = false;
  function showProfile() {
    $('#account-heading').textContent = `Welcome, ${api.user.name.split(' ')[0]}.`;
    $('#account-intro').textContent = 'Your bag, your orders, and all the everyday details.';
    $('#profile-form [name=name]').value = api.user.name;
    $('#account-email').value = api.user.email;
    $('#account-content').hidden = false; $('#account-logout').hidden = false;
  }
  showProfile();
  try { const note = sessionStorage.getItem('aurora-account-notice'); if (note) { message(note, true); sessionStorage.removeItem('aurora-account-notice'); } } catch {}
  window.addEventListener('aurora:auth', () => {
    if (leaving) return;
    if (!api.user) { $('#account-content').hidden = true; location.replace('login.html?next=account.html'); }
    else if (api.user.id !== initialCustomer) { $('#account-content').hidden = true; location.reload(); }
    else $('#account-content').hidden = false;
  });
  window.addEventListener('pagehide', () => { $('#account-content').hidden = true; });
  async function loadOrders() {
    if (ordersBusy) return; ordersBusy = true; $('#load-more-orders').disabled = true;
    try {
      const result = await api.request('/api/account/orders?offset=' + offset);
      if (!result.total) $('#account-orders').innerHTML = '<p class="account-empty">Your next favorite is waiting. Orders placed while signed in will appear here.</p>';
      else $('#account-orders').insertAdjacentHTML('beforeend', result.orders.map((order) => `<article class="account-order"><div class="account-order-head"><a href="order.html?id=${order.id}">${escape(order.reference)} ↗</a><span class="order-badge">${escape(order.status.replaceAll('_',' '))}</span></div><p>${escape(new Date(order.created).toLocaleDateString())} · ${order.items.reduce((sum,item) => sum + item.quantity,0)} pieces · ${money(order.totalCents)}</p><p>${order.items.map((item) => escape(item.name)).join(' / ')}</p><a class="text-link" href="order.html?id=${order.id}">View order details ↗</a></article>`).join(''));
      offset += result.orders.length; $('#load-more-orders').hidden = offset >= result.total;
    } catch (error) { message(error.message); if (error.status === 401) { $('#account-content').hidden = true; location.replace('login.html?next=account.html'); } }
    finally { ordersBusy = false; $('#load-more-orders').disabled = false; }
  }
  $('#load-more-orders').addEventListener('click', loadOrders);
  $('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget, errors = validation(form, 'profile');
    fieldErrors(form, errors); if (Object.keys(errors).length) { message('Check your name and try again.'); return; }
    if (form.getAttribute('aria-busy') === 'true') return;
    pending(form, true);
    try {
      const result = await api.request('/api/account/profile', { method:'PATCH',body:values(form) });
      api.user = result.user; window.dispatchEvent(new CustomEvent('aurora:auth',{detail:api.user})); showProfile(); message('Your profile has been saved.', true);
    } catch (error) { message(error.message); fieldErrors(form,error.data?.fields || {}); }
    finally { pending(form, false); }
  });
  $('#password-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget, errors = validation(form, 'password');
    fieldErrors(form, errors); if (Object.keys(errors).length) { message('Check the highlighted fields and try again.'); return; }
    if (form.getAttribute('aria-busy') === 'true') return;
    pending(form, true);
    try {
      const result = await api.request('/api/account/password', { method:'POST',body:values(form) });
      api.applyAuth(result); form.reset(); form.querySelector('[data-password-feedback]').textContent = ''; message('Password updated. Your other devices have been signed out.',true);
    } catch (error) { message(error.message); fieldErrors(form,error.data?.fields || {}); }
    finally { pending(form, false); }
  });
  $('#account-logout').addEventListener('click', async () => {
    if (leaving) return; leaving = true; $('#account-logout').disabled = true;
    try { api.applyAuth(await api.request('/api/auth/logout',{method:'POST',body:{}})); location.replace('index.html'); }
    catch (error) { message(error.message); leaving = false; $('#account-logout').disabled = false; }
  });
  await loadOrders();
})();
