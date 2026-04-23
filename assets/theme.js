// Scent Gallery — Theme JS (Shopify)

(function () {
  'use strict';

  // ── Nav: sticky + scroll state ──────────────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile Drawer ───────────────────────────────────────────────
  const hamburger = document.querySelector('.nav__hamburger');
  const drawer    = document.querySelector('.nav__drawer');

  const openDrawer = () => {
    drawer.classList.add('is-open');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
    });

    const overlay = drawer.querySelector('.nav__drawer-overlay');
    const close   = drawer.querySelector('.nav__drawer-close');
    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (close)   close.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  // ── Announcement Bar dismiss ─────────────────────────────────────
  const bar     = document.getElementById('announcement-bar');
  const dismiss = document.querySelector('.announcement-bar__dismiss');
  if (bar && dismiss) {
    const storageKey = 'sg-bar-dismissed-' + (bar.dataset.sectionId || 'default');
    if (localStorage.getItem(storageKey)) bar.classList.add('is-hidden');
    dismiss.addEventListener('click', () => {
      bar.classList.add('is-hidden');
      localStorage.setItem(storageKey, '1');
    });
  }

  // ── Scroll reveal ───────────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 99999px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    document.querySelectorAll('.collection__grid .product-card').forEach((card, i) => {
      card.classList.add('reveal');
      card.style.transitionDelay = `${Math.min(i, 7) * 50}ms`;
      revealObs.observe(card);
    });

    document.querySelectorAll('.testimonial-card').forEach(card => revealObs.observe(card));
  }

  // ── Size Pill interaction (homepage cards) ───────────────────────
  // Prices stored as Shopify integers (cents). data-price attr is cents.
  const PILL_INFO = {
    '1ml':   { sprays: '~20 sprays',              label: 'Quick Test',               badge: false },
    '2ml':   { sprays: '~38 sprays',              label: 'Try It',                   badge: false },
    '5ml':   { sprays: '~90 sprays',              label: '~3 weeks daily wear',      badge: false },
    '10ml':  { sprays: '~180 sprays',             label: 'Most Popular',             badge: true  },
    '10ml+': { sprays: '~135 pressurized sprays', label: 'Most Popular — Upgraded', badge: true  },
    '30ml':  { sprays: '~550 sprays',             label: 'Best Value',               badge: false },
    '30ml+': { sprays: '~400 pressurized sprays', label: 'Best Value + Pressurized', badge: false },
  };

  function renderPillInfo(infoEl, sizeKey) {
    if (!infoEl) return;
    const info = PILL_INFO[sizeKey];
    if (!info) { infoEl.innerHTML = ''; return; }
    infoEl.innerHTML = info.badge
      ? `<span class="pill-sprays">${info.sprays}</span> · <span class="pill-badge">${info.label}</span>`
      : `<span class="pill-sprays">${info.sprays}</span> · <span class="pill-label-text">${info.label}</span>`;
  }

  function formatPriceCents(cents) {
    return '$' + (parseInt(cents, 10) / 100).toFixed(2);
  }

  document.querySelectorAll('.product-card__sizes').forEach(container => {
    const cardInfo = container.closest('.product-card__info');
    const infoEl   = cardInfo ? cardInfo.querySelector('.pill-info') : null;
    const priceEl  = cardInfo ? cardInfo.querySelector('.product-card__price') : null;

    container.querySelectorAll('.size-pill').forEach(pill => {
      if (pill.classList.contains('size-pill--active')) renderPillInfo(infoEl, pill.dataset.size);

      pill.addEventListener('click', () => {
        container.querySelectorAll('.size-pill').forEach(p => p.classList.remove('size-pill--active'));
        pill.classList.add('size-pill--active');

        pill.classList.remove('just-selected');
        void pill.offsetWidth;
        pill.classList.add('just-selected');
        pill.addEventListener('animationend', () => pill.classList.remove('just-selected'), { once: true });

        // data-price is in cents (Shopify format)
        if (priceEl && pill.dataset.price) {
          priceEl.textContent = formatPriceCents(pill.dataset.price);
        }
        renderPillInfo(infoEl, pill.dataset.size);
      });
    });
  });

  // ── Nav Search ──────────────────────────────────────────────────
  const navSearchBtn = document.querySelector('.nav__search');
  if (navSearchBtn) {
    navSearchBtn.addEventListener('click', () => {
      const pageSearch = document.getElementById('listing-search');
      if (pageSearch) {
        pageSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => pageSearch.focus(), 250);
        return;
      }
      openNavSearchOverlay();
    });
  }

  function openNavSearchOverlay() {
    let overlay = document.getElementById('nav-search-overlay');
    if (!overlay) {
      if (!document.getElementById('nav-search-overlay-style')) {
        const s = document.createElement('style');
        s.id = 'nav-search-overlay-style';
        s.textContent = [
          '#nav-search-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:200;',
          'background:rgba(20,20,20,0.6);display:flex;align-items:flex-start;',
          'animation:nso-in var(--duration-fast,150ms) var(--ease-enter,cubic-bezier(0,0,.2,1))}',
          '@keyframes nso-in{from{opacity:0}to{opacity:1}}',
          '#nav-search-overlay__bar{background:var(--color-bg);width:100%;padding:20px var(--space-4);',
          'box-shadow:0 4px 24px rgba(0,0,0,.1)}',
          '#nav-search-overlay__form{display:flex;gap:10px;max-width:640px;margin:0 auto;align-items:center}',
          '#nav-search-overlay__input{flex:1;font-family:var(--font-body);font-size:var(--text-body);',
          'color:var(--color-on-surface);background:var(--color-surface);border:1px solid var(--color-border);',
          'border-radius:var(--radius-pill);padding:12px 20px;height:52px;outline:none;',
          'transition:border-color 150ms,box-shadow 150ms}',
          '#nav-search-overlay__input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px rgba(28,64,50,.15)}',
          '#nav-search-overlay__input::placeholder{color:var(--color-on-surface-muted)}',
          '#nav-search-overlay__submit{font-family:var(--font-body);font-size:var(--text-body-sm);font-weight:600;',
          'color:#fff;background:var(--color-primary);border:none;border-radius:var(--radius-md);',
          'padding:0 20px;height:52px;cursor:pointer;white-space:nowrap;transition:background 150ms}',
          '#nav-search-overlay__submit:hover{background:var(--color-primary-hover)}',
          '#nav-search-overlay__close{background:none;border:none;cursor:pointer;padding:8px;',
          'color:var(--color-on-surface-muted);font-size:20px;line-height:1;flex-shrink:0}',
        ].join('');
        document.head.appendChild(s);
      }

      overlay = document.createElement('div');
      overlay.id = 'nav-search-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Search');
      overlay.innerHTML = [
        '<div id="nav-search-overlay__bar">',
        '<form id="nav-search-overlay__form" action="/search" method="get" role="search">',
        '<input id="nav-search-overlay__input" type="search" name="q" placeholder="Search fragrances…" autocomplete="off" spellcheck="false">',
        '<button type="submit" id="nav-search-overlay__submit">Search</button>',
        '<button type="button" id="nav-search-overlay__close" aria-label="Close search">✕</button>',
        '</form></div>',
      ].join('');
      document.body.appendChild(overlay);

      overlay.querySelector('#nav-search-overlay__close').addEventListener('click', closeNavSearchOverlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeNavSearchOverlay(); });
      document.addEventListener('keydown', onOverlayKeydown);
    }

    overlay.hidden = false;
    setTimeout(() => overlay.querySelector('#nav-search-overlay__input').focus(), 50);
  }

  function closeNavSearchOverlay() {
    const overlay = document.getElementById('nav-search-overlay');
    if (overlay) overlay.hidden = true;
    document.removeEventListener('keydown', onOverlayKeydown);
  }

  function onOverlayKeydown(e) {
    if (e.key === 'Escape') closeNavSearchOverlay();
  }

  // ── Swiper carousels (homepage, mobile only) ─────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof Swiper === 'undefined') return;

    const initCarousel = (swiperEl, scrollbarEl, thumbEl) => {
      if (!swiperEl || !scrollbarEl || !thumbEl) return;

      const swiper = new Swiper(swiperEl, {
        spaceBetween: 14,
        slidesPerView: 2.5,
        freeMode: true,
        grabCursor: true,
        simulateTouch: true,
        touchRatio: 1,
        touchAngle: 45,
        resistanceRatio: 0.85,
      });

      const sync = () => {
        const tw = Math.max(scrollbarEl.offsetWidth * Math.max(0.15, 1 / swiper.slides.length), 24);
        thumbEl.style.width = tw + 'px';
        thumbEl.style.left  = swiper.progress * (scrollbarEl.offsetWidth - tw) + 'px';
      };
      swiper.on('progress', sync);
      swiper.on('resize', sync);
      window.addEventListener('resize', sync, { passive: true });

      let dragging = false;
      const dragTo = (clientX) => {
        const rect = scrollbarEl.getBoundingClientRect();
        swiper.setProgress(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
      };
      thumbEl.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
      thumbEl.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
      document.addEventListener('mousemove', (e) => { if (dragging) dragTo(e.clientX); });
      document.addEventListener('touchmove', (e) => { if (dragging) dragTo(e.touches[0].clientX); }, { passive: true });
      document.addEventListener('mouseup',  () => { dragging = false; });
      document.addEventListener('touchend', () => { dragging = false; });
      scrollbarEl.addEventListener('click', (e) => dragTo(e.clientX));

      sync();
    };

    const initAll = () => {
      if (window.innerWidth > 768) return;
      // Find all carousel track wrappers and init each one dynamically
      document.querySelectorAll('.carousel-track').forEach(track => {
        const swiperEl  = track.querySelector('.swiper');
        const scrollbar = track.querySelector('.carousel-scroll-bar');
        const thumb     = track.querySelector('.carousel-scroll-bar__thumb');
        if (swiperEl && scrollbar && thumb && !swiperEl.dataset.swiperInitialized) {
          swiperEl.dataset.swiperInitialized = '1';
          initCarousel(swiperEl, scrollbar, thumb);
        }
      });
    };

    initAll();
    window.addEventListener('resize', initAll, { passive: true });
  });

  // ── Add-to-cart: intercept product card forms ─────────────────────
  document.addEventListener('submit', async function (e) {
    const form = e.target.closest('.product-card__form');
    if (!form) return;
    e.preventDefault();

    const activeVariantId = form.querySelector('.size-pill--active')?.dataset.variantId
      || form.querySelector('.product-card__variant-id')?.value;
    if (!activeVariantId) return;

    const btn = form.querySelector('.product-card__cta');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: activeVariantId, quantity: 1 }),
      });
      if (!res.ok) throw new Error('add ' + res.status);

      // Badge bump animation
      document.querySelectorAll('.nav__cart').forEach(el => el.classList.add('cart-bump'));
      setTimeout(() => document.querySelectorAll('.nav__cart').forEach(el => el.classList.remove('cart-bump')), 600);

      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Added!';
        btn.classList.add('is-added');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('is-added'); btn.disabled = false; }, 1800);
      }

      if (window.SG_Cart) window.SG_Cart.open();
    } catch (err) {
      if (btn) { btn.disabled = false; }
    }
  });

  // ── Update size pill → variant ID on product card forms ──────────
  document.addEventListener('click', function (e) {
    const pill = e.target.closest('.size-pill');
    if (!pill) return;
    const form = pill.closest('.product-card__form');
    if (!form) return;
    const idInput = form.querySelector('.product-card__variant-id');
    if (idInput && pill.dataset.variantId) idInput.value = pill.dataset.variantId;
  });

  // ── FAQ accordion ─────────────────────────────────────────────────
  document.querySelectorAll('.faq__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq__item');
      const isOpen = item.classList.contains('is-open');

      // Close all
      document.querySelectorAll('.faq__item.is-open').forEach(el => {
        el.classList.remove('is-open');
        el.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── Comparison receipt animation ──────────────────────────────────
  (function () {
    const lines    = document.querySelectorAll('.receipt__line');
    const totalEl  = document.getElementById('receipt-running-total');
    const sep      = document.querySelector('.receipt__sep');
    const totalRow = document.querySelector('.receipt__total');
    const vsRow    = document.querySelector('.receipt__vs-row');
    if (!lines.length || !totalEl) return;

    let runningTotal = 0;

    const revealLine = (index) => {
      if (index >= lines.length) {
        setTimeout(() => {
          if (sep)      { sep.classList.add('line-visible'); }
          if (totalRow) { totalRow.classList.add('line-visible'); }
          if (totalEl)  { totalEl.classList.add('is-complete'); }
          setTimeout(() => { if (vsRow) vsRow.classList.add('line-visible'); }, 300);
        }, 200);
        return;
      }
      const line  = lines[index];
      const price = parseInt(line.dataset.price, 10) || 0;
      runningTotal += price;

      setTimeout(() => {
        line.classList.add('line-visible');
        if (totalEl) {
          totalEl.classList.add('is-ticking');
          totalEl.textContent = '$' + runningTotal;
          setTimeout(() => totalEl.classList.remove('is-ticking'), 230);
        }
        revealLine(index + 1);
      }, index === 0 ? 300 : 500);
    };

    if ('IntersectionObserver' in window) {
      const receiptEl = document.querySelector('.comparison__receipt');
      if (receiptEl) {
        let fired = false;
        const obs = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !fired) {
            fired = true;
            obs.disconnect();
            revealLine(0);
          }
        }, { threshold: 0.3 });
        obs.observe(receiptEl);
      }
    }

    // Comparison row reveals
    const compCols = document.querySelectorAll('.comparison__col');
    if (compCols.length && 'IntersectionObserver' in window) {
      const rowsObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.comparison__list li').forEach((li, i) => {
              setTimeout(() => li.classList.add('row-visible'), i * 120);
            });
            rowsObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      compCols.forEach(col => rowsObs.observe(col));
    }

    // Tagline + CTA reveal
    const tagline = document.querySelector('.comparison__tagline');
    const cta     = document.querySelector('.comparison__cta');
    if ((tagline || cta) && 'IntersectionObserver' in window) {
      const tagsObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => tagline && tagline.classList.add('tag-visible'), 800);
            setTimeout(() => cta && cta.classList.add('cta-visible'), 1100);
            tagsObs.disconnect();
          }
        });
      }, { threshold: 0.3 });
      const compSection = document.querySelector('.comparison');
      if (compSection) tagsObs.observe(compSection);
    }
  }());

  // ── Kit builder bottle rise-in ────────────────────────────────────
  (function () {
    const section = document.querySelector('.kit-builder-cta');
    if (!section || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        section.classList.add('is-visible');
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    obs.observe(section);
  }());

}());

// ── Cart Drawer (Shopify Cart API) ───────────────────────────────────────────
window.SG_Cart = (function () {
  'use strict';

  function getDrawer() { return document.getElementById('cart-drawer'); }

  function formatPrice(cents) {
    return '$' + (parseInt(cents, 10) / 100).toFixed(2);
  }

  function updateBadge(count) {
    document.querySelectorAll('.nav__cart').forEach(btn => {
      let badge = btn.querySelector('.nav__cart-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav__cart-badge';
          btn.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.hidden = false;
      } else if (badge) {
        badge.hidden = true;
      }
      btn.setAttribute('aria-label', `Cart (${count} item${count !== 1 ? 's' : ''})`);
    });
  }

  function renderItems(bodyEl, cart) {
    const drawer = getDrawer();
    const footer = drawer && drawer.querySelector('.cart-drawer__footer');

    if (!cart.items || cart.items.length === 0) {
      bodyEl.innerHTML = '<p class="cart-drawer__empty">Your cart is empty.</p>';
      if (footer) footer.hidden = true;
      return;
    }

    const rows = cart.items.map(item => {
      const title    = item.product_title || item.title;
      const variant  = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
      const pressurized = item.properties && item.properties['Pressurized'] === 'Yes' ? ' · Pressurized' : '';
      const img      = item.image || '';

      return [
        '<div class="cart-drawer__item">',
        img ? `<img class="cart-drawer__item-img" src="${img}" alt="" loading="lazy">` : '',
        '<div class="cart-drawer__item-info">',
        `<p class="cart-drawer__item-name">${title}</p>`,
        (variant || pressurized) ? `<p class="cart-drawer__item-variant">${variant}${pressurized}</p>` : '',
        `<p class="cart-drawer__item-price">${formatPrice(item.price)}</p>`,
        `<span class="cart-drawer__item-qty">Qty: ${item.quantity}</span>`,
        '</div></div>',
      ].join('');
    });

    bodyEl.innerHTML = rows.join('');

    if (footer) {
      const totalEl = footer.querySelector('.cart-drawer__total');
      if (totalEl) totalEl.textContent = formatPrice(cart.total_price);
      footer.hidden = false;
    }
  }

  async function refresh() {
    const drawer = getDrawer();
    const bodyEl = drawer ? drawer.querySelector('.cart-drawer__body') : null;
    if (bodyEl) bodyEl.innerHTML = '<p class="cart-drawer__loading">Loading…</p>';

    try {
      const res  = await fetch('/cart.js');
      if (!res.ok) throw new Error('cart ' + res.status);
      const cart = await res.json();
      updateBadge(cart.item_count || 0);
      if (bodyEl) renderItems(bodyEl, cart);
    } catch (e) {
      if (bodyEl) bodyEl.innerHTML = '<p class="cart-drawer__error">Could not load cart.</p>';
    }
  }

  async function open() {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    await refresh();
  }

  function close() {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const drawer = getDrawer();
    if (drawer) {
      drawer.querySelector('.cart-drawer__overlay')?.addEventListener('click', close);
      drawer.querySelector('.cart-drawer__close')?.addEventListener('click', close);
    }

    document.querySelectorAll('.nav__cart').forEach(btn => btn.addEventListener('click', open));

    document.addEventListener('keydown', e => {
      const d = getDrawer();
      if (e.key === 'Escape' && d && d.classList.contains('is-open')) close();
    });

    // Sync badge on page load
    refresh();
  });

  return { open, close, refresh };
}());
