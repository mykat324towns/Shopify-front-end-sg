/* Scroll Indicator — drives the .carousel-scroll-bar track in two modes:
   - swiper: ports the original initCarousel logic (homepage carousels)
   - native: listens to scroll events on a plain overflow-x:auto container */

(function () {
  'use strict';

  const CONTAINER_SELECTOR = '[data-scroll-indicator]';

  // ── Swiper mode (carousel-track parent + Swiper instance) ────────────
  function initSwiperMode(barEl, thumbEl) {
    if (typeof Swiper === 'undefined') return;
    const track = barEl.closest('.carousel-track');
    if (!track) return;
    const swiperEl = track.querySelector('.swiper');
    if (!swiperEl || swiperEl.dataset.swiperInitialized === '1') return;

    const spv = parseFloat(swiperEl.dataset.slidesPerView) || 2.5;
    const swiper = new Swiper(swiperEl, {
      spaceBetween: spv < 2 ? 20 : 14,
      slidesPerView: spv,
      freeMode: true,
      grabCursor: true,
      simulateTouch: true,
      touchRatio: 1,
      touchAngle: 45,
      resistanceRatio: 0.85,
    });
    swiperEl.dataset.swiperInitialized = '1';

    const sync = () => {
      const tw = Math.max(barEl.offsetWidth * Math.max(0.15, 1 / swiper.slides.length), 24);
      thumbEl.style.width = tw + 'px';
      thumbEl.style.left = swiper.progress * (barEl.offsetWidth - tw) + 'px';
    };
    swiper.on('progress', sync);
    swiper.on('resize', sync);
    window.addEventListener('resize', sync, { passive: true });

    let dragging = false;
    const seek = (clientX) => {
      const rect = barEl.getBoundingClientRect();
      swiper.setProgress(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
    };
    thumbEl.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
    thumbEl.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
    document.addEventListener('mousemove', (e) => { if (dragging) seek(e.clientX); });
    document.addEventListener('touchmove', (e) => { if (dragging) seek(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
    barEl.addEventListener('click', (e) => seek(e.clientX));

    sync();
  }

  // ── Native mode (overflow-x:auto on the target element) ──────────────
  function initNativeMode(barEl, thumbEl) {
    const targetSel = barEl.dataset.target;
    if (!targetSel) return;
    const container = barEl.closest('section, .container, body').querySelector(targetSel)
                   || document.querySelector(targetSel);
    if (!container) return;
    if (container.dataset.scrollIndicatorBound === '1') return;
    container.dataset.scrollIndicatorBound = '1';

    const sync = () => {
      const max = container.scrollWidth - container.clientWidth;
      if (max <= 0) {
        // Not actually scrollable — hide the track to avoid dead UI.
        barEl.style.display = 'none';
        return;
      }
      barEl.style.display = '';
      const progress = container.scrollLeft / max;
      const thumbW = Math.max(barEl.offsetWidth * Math.max(0.15, container.clientWidth / container.scrollWidth), 24);
      thumbEl.style.width = thumbW + 'px';
      thumbEl.style.left = progress * (barEl.offsetWidth - thumbW) + 'px';
    };

    container.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    let dragging = false;
    const seek = (clientX, smooth) => {
      const max = container.scrollWidth - container.clientWidth;
      if (max <= 0) return;
      const rect = barEl.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const left = ratio * max;
      if (smooth && typeof container.scrollTo === 'function') {
        container.scrollTo({ left: left, behavior: 'smooth' });
      } else {
        container.scrollLeft = left;
      }
    };
    thumbEl.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
    thumbEl.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
    document.addEventListener('mousemove', (e) => { if (dragging) seek(e.clientX, false); });
    document.addEventListener('touchmove', (e) => { if (dragging) seek(e.touches[0].clientX, false); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
    barEl.addEventListener('click', (e) => {
      if (e.target === thumbEl) return;
      seek(e.clientX, true);
    });

    // Wheel-to-horizontal: vertical mousewheel scrolls the carousel sideways.
    // Releases to the page when the carousel hits an end so users are never trapped.
    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      const dy = e.deltaY;
      const dx = e.deltaX;
      if (Math.abs(dy) <= Math.abs(dx)) return;
      const max = container.scrollWidth - container.clientWidth;
      if (max <= 0) return;
      const atStart = container.scrollLeft <= 0 && dy < 0;
      const atEnd = container.scrollLeft >= max && dy > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      container.scrollLeft += dy;
    }, { passive: false });

    sync();
  }

  function initAll() {
    const isMobile = window.innerWidth <= 768;
    document.querySelectorAll(CONTAINER_SELECTOR).forEach((bar) => {
      if (bar.dataset.indicatorInitialized === '1') return;
      const thumb = bar.querySelector('.carousel-scroll-bar__thumb');
      if (!thumb) return;
      if (bar.dataset.mode === 'native') {
        // Native mode runs at all viewports — initNativeMode hides the bar
        // automatically when the target container has no horizontal overflow.
        bar.dataset.indicatorInitialized = '1';
        initNativeMode(bar, thumb);
      } else {
        // Swiper-mode carousels are mobile-only on this site (desktop renders
        // a static grid instead).
        if (!isMobile) return;
        bar.dataset.indicatorInitialized = '1';
        initSwiperMode(bar, thumb);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  window.addEventListener('resize', initAll, { passive: true });
})();
