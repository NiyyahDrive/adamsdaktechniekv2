/* ============================================================
   Adams Daktechniek — Cookie-consent + GA gated loading
   Vervangt het oude gtag-snippet op elke pagina.
   AVG/ePrivacy: GA wordt pas geladen NA expliciete toestemming.
   ============================================================ */
(function () {
  'use strict';

  var GA_ID = 'G-T6MES5SRBW';
  var COOKIE_NAME = 'adams_consent';
  var COOKIE_DAYS = 180;

  // gtag stub — altijd beschikbaar zodat inline gtag('event', ...) calls
  // op andere pagina's niet stuk gaan voordat (of zonder dat) GA wordt geladen.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) +
      ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function deleteCookie(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  }

  function loadGA() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function removeGACookies() {
    // GA4 cookies: _ga, _ga_<container_id>, _gid, _gat
    var host = location.hostname.replace(/^www\./, '');
    ['_ga', '_gid', '_gat', '_ga_' + GA_ID.replace('G-', '')].forEach(function (n) {
      ['', '.' + host, host].forEach(function (d) {
        document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/' +
          (d ? ';domain=' + d : '');
      });
    });
  }

  function renderBanner() {
    if (document.getElementById('adams-cookie-banner')) return;
    var b = document.createElement('div');
    b.id = 'adams-cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookietoestemming');
    b.innerHTML =
      '<style>' +
      '#adams-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;' +
      'background:#0d0d0d;color:#f6f6f6;border:1px solid #2a2a2a;border-radius:14px;' +
      'padding:18px 20px;font:14px/1.55 Inter,system-ui,sans-serif;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.5);max-width:520px;margin-left:auto}' +
      '#adams-cookie-banner h3{font:700 15px/1.3 Manrope,sans-serif;margin:0 0 6px;letter-spacing:-.01em}' +
      '#adams-cookie-banner p{margin:0 0 14px;color:#a8a8a8}' +
      '#adams-cookie-banner a{color:#5CC27A;text-decoration:underline}' +
      '#adams-cookie-banner .acb-row{display:flex;gap:8px;flex-wrap:wrap}' +
      '#adams-cookie-banner button{flex:1 1 auto;min-width:120px;padding:11px 14px;border-radius:10px;' +
      'border:1px solid #2a2a2a;background:transparent;color:#f6f6f6;font:600 14px Inter,sans-serif;' +
      'cursor:pointer;transition:all .2s ease}' +
      '#adams-cookie-banner button:hover{border-color:#5CC27A;color:#5CC27A}' +
      '#adams-cookie-banner button.acb-accept{background:#5CC27A;border-color:#5CC27A;color:#0a0a0a}' +
      '#adams-cookie-banner button.acb-accept:hover{background:#6dd28a;color:#0a0a0a}' +
      '@media (max-width:980px){#adams-cookie-banner{bottom:96px}}' +
      '@media (max-width:520px){#adams-cookie-banner{left:10px;right:10px;bottom:96px;padding:16px}}' +
      '</style>' +
      '<h3>Cookies op deze website</h3>' +
      '<p>Wij gebruiken functionele cookies (altijd) en optionele analytische cookies (Google Analytics) ' +
      'om de site te verbeteren. Lees onze <a href="privacy.html">privacyverklaring</a>.</p>' +
      '<div class="acb-row">' +
      '<button class="acb-decline" type="button">Alleen functioneel</button>' +
      '<button class="acb-accept" type="button">Accepteren</button>' +
      '</div>';
    document.body.appendChild(b);

    b.querySelector('.acb-accept').addEventListener('click', function () {
      setCookie(COOKIE_NAME, 'accepted', COOKIE_DAYS);
      b.remove();
      loadGA();
    });
    b.querySelector('.acb-decline').addEventListener('click', function () {
      setCookie(COOKIE_NAME, 'declined', COOKIE_DAYS);
      removeGACookies();
      b.remove();
    });
  }

  // Public API — gebruikt door "Cookievoorkeuren" link onderaan pagina's
  window.AdamsCookies = {
    reset: function () {
      deleteCookie(COOKIE_NAME);
      removeGACookies();
      renderBanner();
    },
    status: function () { return getCookie(COOKIE_NAME); }
  };

  function init() {
    var status = getCookie(COOKIE_NAME);
    if (status === 'accepted') {
      loadGA();
    } else if (status === 'declined') {
      // niets doen
    } else {
      renderBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
   Conversiemeting (GA4) — sitewide, via event delegation.
   Events komen in de dataLayer-stub; GA verwerkt ze pas na consent.
   Events: click_call, click_whatsapp, click_email, click_offerte_cta,
           wizard_step, generate_lead (form: snel|offerte|dakgids), file_download.
   ============================================================ */
(function () {
  'use strict';
  function track(name, params) {
    try { window.gtag('event', name, Object.assign({ page: location.pathname }, params || {})); } catch (e) {}
  }
  function placement(el) {
    var sec = el.closest('section, header, footer, nav, .mobile-cta, .mobile-menu, aside');
    if (!sec) return 'page';
    return sec.id || (sec.className && String(sec.className).split(' ')[0]) || sec.tagName.toLowerCase();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) track('click_call', { placement: placement(a) });
    else if (href.indexOf('wa.me') !== -1) track('click_whatsapp', { placement: placement(a) });
    else if (href.indexOf('mailto:') === 0) track('click_email', { placement: placement(a) });
    else if (/\/offerte(\?|#|$)/.test(href)) track('click_offerte_cta', { placement: placement(a), label: (a.textContent || '').trim().slice(0, 40) });
    else if (/\.pdf(\?|$)/.test(href)) track('file_download', { file: href.split('/').pop() });
    var step = e.target.closest('[data-next],[data-prev]');
    if (step) track('wizard_step', { to: step.getAttribute('data-next') || step.getAttribute('data-prev'), direction: step.hasAttribute('data-next') ? 'next' : 'back' });
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f || f.tagName !== 'FORM') return;
    var subject = f.querySelector('input[name="_subject"]');
    if (subject && /homepage|snelle/i.test(subject.value)) track('generate_lead', { form: 'snel' });
  }, true);
})();
