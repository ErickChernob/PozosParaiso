/*
 * Pozos Paraíso - site behavior.
 * Vanilla JS, no dependencies. Replaces Webflow's navbar / slider / IX (interactions)
 * runtime modules. See MIGRATION_NOTES.md for what each piece used to be.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initSliders();
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

  /* ---------- Gallery slider ---------- */
  function initSliders() {
    var sliders = document.querySelectorAll('.w-slider');
    sliders.forEach(function (slider) {
      var mask = slider.querySelector('.w-slider-mask');
      var slides = Array.prototype.slice.call(slider.querySelectorAll('.w-slide'));
      if (!mask || slides.length < 2) return;

      var infinite = slider.getAttribute('data-infinite') !== 'false';
      var autoplay = slider.getAttribute('data-autoplay') === 'true';
      var delay = parseInt(slider.getAttribute('data-delay'), 10) || 4000;
      var duration = parseInt(slider.getAttribute('data-duration'), 10) || 500;
      var hideArrows = slider.getAttribute('data-hide-arrows') === 'true';
      var disableSwipe = slider.getAttribute('data-disable-swipe') === 'true';

      var leftArrow = slider.querySelector('.w-slider-arrow-left');
      var rightArrow = slider.querySelector('.w-slider-arrow-right');
      var navWrap = slider.querySelector('.w-slider-nav');

      mask.style.transitionDuration = duration + 'ms';
      if (hideArrows) {
        if (leftArrow) leftArrow.style.display = 'none';
        if (rightArrow) rightArrow.style.display = 'none';
      }

      var index = 0;
      var timer = null;

      // Build dot navigation.
      var dots = [];
      if (navWrap) {
        slides.forEach(function (_, i) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'w-slider-dot';
          dot.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
          dot.addEventListener('click', function () {
            goTo(i);
            restartAutoplay();
          });
          navWrap.appendChild(dot);
          dots.push(dot);
        });
      }

      function render() {
        mask.style.transform = 'translateX(-' + index * 100 + '%)';
        dots.forEach(function (dot, i) {
          dot.classList.toggle('w-active', i === index);
        });
      }

      function goTo(i) {
        if (infinite) {
          index = (i + slides.length) % slides.length;
        } else {
          index = Math.max(0, Math.min(slides.length - 1, i));
        }
        render();
      }

      function next() {
        goTo(index + 1);
      }
      function prev() {
        goTo(index - 1);
      }

      function startAutoplay() {
        if (!autoplay) return;
        timer = window.setInterval(next, delay);
      }
      function stopAutoplay() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }
      function restartAutoplay() {
        stopAutoplay();
        startAutoplay();
      }

      // Real <button> elements, so Enter/Space already trigger click natively.
      function bindArrow(el, action) {
        if (!el) return;
        el.addEventListener('click', function () { action(); restartAutoplay(); });
      }
      bindArrow(leftArrow, prev);
      bindArrow(rightArrow, next);

      slider.addEventListener('mouseenter', stopAutoplay);
      slider.addEventListener('mouseleave', startAutoplay);
      slider.addEventListener('focusin', stopAutoplay);
      // focusin/focusout fire on every focus change between the slider's own
      // children too (both arrows + every dot are real buttons), not just when
      // focus truly enters/leaves the component. Without checking relatedTarget,
      // tabbing between those controls tears the interval down and recreates it
      // on every single move, making autoplay's effective timing depend on
      // whenever that last happened instead of a steady delay - only resume
      // when focus is actually moving outside the slider.
      slider.addEventListener('focusout', function (e) {
        if (!slider.contains(e.relatedTarget)) {
          startAutoplay();
        }
      });

      if (!disableSwipe) {
        var startX = null;
        mask.addEventListener('pointerdown', function (e) {
          startX = e.clientX;
          stopAutoplay();
        });
        mask.addEventListener('pointerup', function (e) {
          if (startX === null) return;
          var delta = e.clientX - startX;
          startX = null;
          if (Math.abs(delta) > 40) {
            delta < 0 ? next() : prev();
          }
          startAutoplay();
        });
      }

      render();
      startAutoplay();
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
