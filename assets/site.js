// Divine Light — gentle motion and small interactive pieces.
// Everything degrades gracefully: without JS (or with "reduce motion" on)
// all content still shows, fully static.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 2. Frosted header once the visitor scrolls ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 20); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 5. Calendly booking (turns on once a URL is set) ---------- */
  var booking = document.querySelector('[data-calendly-url]');
  var calUrl = booking && booking.getAttribute('data-calendly-url');
  if (booking && calUrl && /^https:\/\/calendly\.com\//.test(calUrl)) {
    var frame = document.createElement('div');
    frame.className = 'dl-booking-frame';
    var loader = document.createElement('div');
    loader.className = 'dl-loader';
    loader.setAttribute('role', 'status');
    loader.textContent = 'Loading available times…';
    var widget = document.createElement('div');
    widget.className = 'calendly-inline-widget';
    widget.setAttribute('data-url', calUrl + (calUrl.indexOf('?') > -1 ? '&' : '?') + 'hide_gdpr_banner=1&primary_color=6e5f92');
    frame.appendChild(loader);
    frame.appendChild(widget);
    var fallback = booking.querySelector('p');
    if (fallback) fallback.textContent = 'Choose a time that works for you. Prefer to talk first? Call, text, or email below.';
    booking.insertBefore(frame, booking.querySelector('div') || null);
    var s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.head.appendChild(s);
    var watch = new MutationObserver(function () {
      var iframe = widget.querySelector('iframe');
      if (iframe) { watch.disconnect(); iframe.addEventListener('load', function () { frame.classList.add('is-loaded'); }); }
    });
    watch.observe(widget, { childList: true, subtree: true });
  }

  if (reduce) return;

  /* ---------- Reveal content softly as it scrolls into view ---------- */
  if (!('IntersectionObserver' in window)) return;
  var groups = '.grid-cards, .about-grid, .book-grid, .dl-bento, .dl-plans';
  var selector = [
    '.container > *:not(.grid-cards):not(.about-grid):not(.book-grid):not(.dl-bento):not(.dl-plans)',
    '.grid-cards > *', '.about-grid > *', '.book-grid > *', '.dl-bento > *', '.dl-plans > *',
    '.footer-grid > *'
  ].join(',');
  var items = Array.prototype.filter.call(document.querySelectorAll(selector), function (el) {
    return !el.closest('.site-header') && !el.matches(groups);
  });
  if (!items.length) return;
  items.forEach(function (el) {
    var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) { return items.indexOf(c) !== -1; });
    el.style.setProperty('--dl-delay', Math.min(siblings.indexOf(el) * 80, 480) + 'ms');
    el.classList.add('dl-reveal');
  });
  root.classList.add('js-motion');

  // Rate table rows cascade in one after another
  Array.prototype.forEach.call(document.querySelectorAll('.dl-table tbody'), function (tb) {
    Array.prototype.forEach.call(tb.rows, function (row, i) { row.style.setProperty('--r', i); });
  });

  // Plan prices count up gently from zero, ending exactly on the real price
  function countUp(el) {
    var target = parseInt(String(el.getAttribute('data-to')).replace(/,/g, ''), 10);
    if (!target) return;
    var final = el.textContent, start = null, dur = 1300;
    el.style.minWidth = el.offsetWidth + 'px';
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = '$' + Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(frame); else el.textContent = final;
    }
    el.textContent = '$0';
    setTimeout(function () { requestAnimationFrame(frame); }, 250);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        var num = e.target.matches('.dl-plan') && e.target.querySelector('.dl-num');
        if (num) countUp(num);
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
})();
