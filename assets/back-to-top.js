/* Back-to-top — show after one viewport scrolled, smooth-scroll to top on click. */

(function () {
  'use strict';

  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  // Reveal once the visitor has paid the cost of scrolling — surface the option then.
  btn.removeAttribute('hidden');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle('is-visible', window.scrollY > window.innerHeight);
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
})();
