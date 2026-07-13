/*
 * Pozos Paraíso - site behavior.
 * Vanilla JS, no dependencies except Splide (js/vendor/splide.min.js, loaded
 * before this file) for the photo gallery. Replaces Webflow's navbar / IX
 * (interactions) runtime modules. See MIGRATION_NOTES.md for what each piece
 * used to be.
 */

// Gallery carousel autoplay speed, in milliseconds. The only place you need
// to change this to adjust how fast the "Galería" carousel advances.
var GALLERY_AUTOPLAY_INTERVAL_MS = 2000;

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initGallery();
    initScrollReveal();
    initContactForms();
  });

  /* ---------- Mobile navigation ---------- */
  function initMobileNav() {
    var navs = document.querySelectorAll('.w-nav');
    navs.forEach(function (nav) {
      var button = nav.querySelector('.w-nav-button');
      var menu = nav.querySelector('.nav-menu');
      if (!button || !menu) return;

      var duration = nav.getAttribute('data-duration') || '300';
      menu.style.setProperty('--nav-duration', duration + 'ms');
      button.setAttribute('aria-expanded', 'false');

      function closeMenu() {
        menu.classList.remove('nav-open');
        button.classList.remove('w--open');
        button.setAttribute('aria-expanded', 'false');
      }
      function openMenu() {
        menu.classList.add('nav-open');
        button.classList.add('w--open');
        button.setAttribute('aria-expanded', 'true');
      }
      function toggleMenu() {
        if (menu.classList.contains('nav-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      }

      // A real <button>, so Enter/Space already trigger this via the native click event.
      button.addEventListener('click', toggleMenu);

      // Close after choosing a link, and on outside click / Escape / resize past breakpoint.
      menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
      });
      document.addEventListener('click', function (e) {
        if (!nav.contains(e.target)) closeMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 991) closeMenu();
      });
    });
  }

  /* ---------- Gallery carousel (Splide) ---------- */
  // Replaces a hand-written carousel that had two rounds of subtle bugs
  // (native lazy-loading vs. transform-based reveal, then focus-event
  // bubbling resetting the autoplay timer). Splide is a well-maintained,
  // dependency-free library that already handles these edge cases; see
  // js/vendor/splide.min.js (never edit that file - it's the vendored
  // library, update it by replacing the whole file with a newer release).
  function initGallery() {
    if (typeof window.Splide !== 'function') return; // vendor script failed to load; images/heading still render fine without it
    document.querySelectorAll('.gallery-splide').forEach(function (el) {
      new window.Splide(el, {
        type: 'loop',
        perPage: 1,
        speed: 500,
        arrows: true,
        pagination: true,
        autoplay: true,
        interval: GALLERY_AUTOPLAY_INTERVAL_MS,
        pauseOnHover: true,
        pauseOnFocus: true,
        keyboard: true, // Left/Right arrow keys navigate while focus is inside the carousel
        i18n: {
          prev: 'Diapositiva anterior',
          next: 'Siguiente diapositiva',
          first: 'Ir a la primera diapositiva',
          last: 'Ir a la última diapositiva',
          slideX: 'Ir a la diapositiva %s',
          pageX: 'Ir a la página %s',
          play: 'Iniciar reproducción automática',
          pause: 'Pausar reproducción automática',
          carousel: 'carrusel',
          slide: 'diapositiva',
          select: 'Selecciona una diapositiva para mostrar',
          slideLabel: '%s de %s',
        },
      }).mount();
    });
  }

  /* ---------- Scroll-triggered reveal animations ---------- */
  function initScrollReveal() {
    var handled = [
      'title-slide-in-1',
      'title-slide-in-2',
      'services-slide-up-1',
      'services-slide-up-2',
      'services-slide-up-3',
      'services-slide-up-4',
    ];
    var selector = handled.map(function (slug) { return '[data-ix="' + slug + '"]'; }).join(',');
    var targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Contact form ---------- */
  function initContactForms() {
    // If the page reloaded after a non-JS fallback submit, show the matching message.
    var params = new URLSearchParams(window.location.search);
    if (params.has('form')) {
      var wrap = document.querySelector('.contact-form');
      if (wrap) {
        var status = params.get('form') === 'success' ? 'done' : 'fail';
        var el = wrap.querySelector(status === 'done' ? '.w-form-done' : '.w-form-fail');
        if (el) el.style.display = 'block';
      }
    }

    document.querySelectorAll('.contact-form form').forEach(function (form) {
      var doneEl = form.parentElement.querySelector('.w-form-done');
      var failEl = form.parentElement.querySelector('.w-form-fail');
      var submitBtn = form.querySelector('[type="submit"]');

      form.addEventListener('submit', function (e) {
        if (typeof window.fetch !== 'function') return; // let it fall back to a normal POST

        e.preventDefault();
        if (doneEl) doneEl.style.display = 'none';
        if (failEl) failEl.style.display = 'none';
        var waitText = submitBtn ? submitBtn.getAttribute('data-wait') : null;
        var originalValue = submitBtn ? submitBtn.value : null;
        if (submitBtn && waitText) submitBtn.value = waitText;

        fetch(form.getAttribute('action'), {
          method: 'POST',
          body: new FormData(form),
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
          .then(function (res) { return res.ok ? res : Promise.reject(res); })
          .then(function () {
            if (doneEl) doneEl.style.display = 'block';
            form.reset();
          })
          .catch(function () {
            if (failEl) failEl.style.display = 'block';
          })
          .finally(function () {
            if (submitBtn && originalValue !== null) submitBtn.value = originalValue;
          });
      });
    });
  }
})();
