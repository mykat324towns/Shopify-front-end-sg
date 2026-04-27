// Scent Gallery — Product Page JS

(function () {
  'use strict';

  var variants = window.SG_VARIANTS || [];

  // Keyed lookups
  var variantById      = {};
  var variantByOption1 = {};

  variants.forEach(function (v) {
    variantById[v.id] = v;
    var key = v.option1.toLowerCase();
    if (!variantByOption1[key]) variantByOption1[key] = [];
    variantByOption1[key].push(v);
  });

  function formatCents(cents) {
    return '$' + (parseInt(cents, 10) / 100).toFixed(2);
  }

  // DOM refs
  var priceEl      = document.getElementById('product-price');
  var variantInput = document.getElementById('selected-variant-id');
  var addBtn       = document.getElementById('btn-add-to-cart');
  var pressToggle  = document.getElementById('pressurized-toggle');
  var pressBtn     = document.getElementById('pressurized-btn');
  var pressPrice   = document.getElementById('pressurized-price');
  var pressSprays  = document.getElementById('pressurized-sprays');
  var sizeGrid     = document.querySelector('.size-selector-grid');
  var scentEl      = document.getElementById('scent-toggle');
  var productForm  = document.getElementById('product-form');
  var galleryViewer = document.getElementById('product-gallery-viewer');
  var variantImg    = document.getElementById('product-gallery-variant-img');

  // State
  var selectedBaseId       = null;
  var selectedBaseSize     = null;  // e.g. '10ml' — used to pick pressurized bottle
  var currentBaseBottle    = null;  // base bottle URL for active size; revert target on pressurized OFF
  var pressurizedVariantId = null;
  var isPressurized        = false;

  // Fade-swap the small variant bottle (mirrors WooCommerce setVariantImage pattern)
  function setVariantImage(src, animate) {
    if (!variantImg || !src) return;
    if (animate && variantImg.src && variantImg.style.display !== 'none') {
      variantImg.classList.add('main-image--swap');
      setTimeout(function () {
        variantImg.src = src;
        variantImg.style.display = 'block';
        variantImg.classList.remove('main-image--swap');
      }, 110);
    } else {
      variantImg.src = src;
      variantImg.style.display = 'block';
    }
  }

  // ── Bundle override ──────────────────────────────────────────────────────────
  // For bundle products: effective parent_ml = MIN of all component remainders.
  // Treats null component as 0 so an unconfigured component disables every size.
  (function applyBundleOverride() {
    var components = window.SG_BUNDLE_COMPONENT_REMAINING;
    if (!Array.isArray(components) || components.length === 0) return;
    var min = Infinity;
    for (var i = 0; i < components.length; i++) {
      var v = components[i] === null || components[i] === undefined ? 0 : components[i];
      if (v < min) min = v;
    }
    window.SG_PARENT_ML = min;
  }());

  // ── Initial parent-ML card state ─────────────────────────────────────────────
  // Runs once on load: marks cards whose ml_size exceeds remaining parent stock.
  (function initParentMlCards() {
    var parentMl = window.SG_PARENT_ML;
    if (parentMl === null || parentMl === undefined || !sizeGrid) return;
    sizeGrid.querySelectorAll('.size-card').forEach(function (card) {
      var cardMl = parseFloat(card.dataset.ml) || 0;
      if (cardMl > 0 && cardMl > parentMl) {
        card.classList.add('size-card--unavailable');
        card.setAttribute('aria-disabled', 'true');
      }
    });
  }());

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function setActiveCard(btn) {
    if (!sizeGrid) return;
    sizeGrid.querySelectorAll('.size-card').forEach(function (c) {
      c.classList.remove('size-card--active');
      c.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('size-card--active');
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('size-card--pulse');
    btn.addEventListener('animationend', function () {
      btn.classList.remove('size-card--pulse');
    }, { once: true });
  }

  // SG_PARENT_ML: null = metafield not set (fall back to Shopify availability);
  // 0 = entire bottle sold out; >0 = ml remaining for size comparison.
  function applyVariant(variantId, activeMlSize) {
    var v = variantById[variantId];
    if (!v) return;
    if (priceEl)      priceEl.textContent  = formatCents(v.price);
    if (variantInput) variantInput.value   = variantId;

    var parentMl    = window.SG_PARENT_ML;
    var hasParentMl = parentMl !== null && parentMl !== undefined;
    var mlSize      = (activeMlSize !== undefined && activeMlSize !== null) ? activeMlSize : 0;

    // Determine sold-out state: parent=0 overrides everything; then size check; then Shopify flag.
    var soldOut;
    if (!hasParentMl) {
      soldOut = !v.available;
    } else if (parentMl === 0) {
      soldOut = true;
    } else {
      soldOut = (mlSize > 0 && mlSize > parentMl) || !v.available;
    }

    if (addBtn) {
      if (!soldOut) {
        addBtn.disabled     = false;
        addBtn.textContent  = 'Add to Rotation';
        addBtn.classList.add('btn-add-to-cart--just-enabled');
        addBtn.addEventListener('animationend', function () {
          addBtn.classList.remove('btn-add-to-cart--just-enabled');
        }, { once: true });
      } else {
        addBtn.disabled    = true;
        addBtn.textContent = (hasParentMl && mlSize > 0 && mlSize > parentMl) ? 'Out of Stock for This Size' : 'Sold Out';
      }
    }
  }

  function updatePressurizedToggle(baseSizeLower) {
    // Pressurized counterpart has option1 of e.g. "10ml+"
    var pressKey = baseSizeLower + '+';
    var pvList   = variantByOption1[pressKey];

    // Hardcoded spray counts for pressurized sizes
    var pressSprayCounts = { '10ml+': '135', '30ml+': '400' };

    if (pvList && pvList.length > 0) {
      var pv           = pvList[0];
      pressurizedVariantId = pv.id;
      if (pressPrice)  pressPrice.textContent  = formatCents(pv.price);
      if (pressSprays) pressSprays.textContent = pressSprayCounts[pressKey] || '';
      if (pressToggle) {
        pressToggle.classList.add('is-visible');
        pressToggle.setAttribute('aria-hidden', 'false');
      }
    } else {
      pressurizedVariantId = null;
      if (pressToggle) {
        pressToggle.classList.remove('is-visible');
        pressToggle.setAttribute('aria-hidden', 'true');
      }
      // Reset toggle state when switching to non-pressurizable size
      isPressurized = false;
      if (pressBtn) {
        pressBtn.classList.remove('pressurized-toggle__btn--on');
        pressBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  // ── Size card clicks ─────────────────────────────────────────────────────────

  if (sizeGrid) {
    sizeGrid.addEventListener('click', function (e) {
      var card = e.target.closest('.size-card');
      if (!card) return;

      // Block unavailable sizes when parent ML is set
      var cardMl    = parseFloat(card.dataset.ml) || 0;
      var parentMl  = window.SG_PARENT_ML;
      var hasParent = parentMl !== null && parentMl !== undefined;
      if (hasParent && cardMl > 0 && cardMl > parentMl) return;

      var variantId = parseInt(card.dataset.variantId, 10);
      var sizeLower = card.dataset.size; // already lowercased via Liquid filter

      // Reset pressurized state when base size changes
      isPressurized = false;
      if (pressBtn) {
        pressBtn.classList.remove('pressurized-toggle__btn--on');
        pressBtn.setAttribute('aria-pressed', 'false');
      }

      selectedBaseId   = variantId;
      selectedBaseSize = sizeLower;
      setActiveCard(card);
      applyVariant(variantId, cardMl);
      updatePressurizedToggle(sizeLower);

      // Swap the small variant bottle (main image stays stagnant)
      var bottleSrc = card.dataset.bottle;
      if (bottleSrc) {
        currentBaseBottle = bottleSrc;
        if (galleryViewer && galleryViewer.classList.contains('product-gallery__viewer--solo')) {
          galleryViewer.classList.remove('product-gallery__viewer--solo');
        }
        setVariantImage(bottleSrc, true);
      }
    });
  }

  // ── Pressurized toggle ────────────────────────────────────────────────────────

  if (pressBtn) {
    pressBtn.addEventListener('click', function () {
      if (!pressurizedVariantId) return;

      isPressurized = !isPressurized;
      pressBtn.classList.toggle('pressurized-toggle__btn--on', isPressurized);
      pressBtn.setAttribute('aria-pressed', String(isPressurized));

      var targetId = isPressurized ? pressurizedVariantId : selectedBaseId;
      var v        = variantById[targetId];
      if (v) {
        if (variantInput) variantInput.value    = targetId;
        if (priceEl)      priceEl.textContent   = formatCents(v.price);
        if (addBtn)       addBtn.disabled       = !v.available;
      }

      // Swap the small variant bottle: pressurized version on, base bottle off
      if (isPressurized && pressToggle) {
        var pressSrc = (selectedBaseSize === '10ml')
          ? pressToggle.dataset.bottle10ml
          : (selectedBaseSize === '30ml' ? pressToggle.dataset.bottle30ml : null);
        if (pressSrc) setVariantImage(pressSrc, true);
      } else if (currentBaseBottle) {
        setVariantImage(currentBaseBottle, true);
      }
    });
  }

  // ── Scent notes toggle ────────────────────────────────────────────────────────

  if (scentEl) {
    var scentTrigger = scentEl.querySelector('.scent-toggle__trigger');
    if (scentTrigger) {
      scentTrigger.addEventListener('click', function () {
        var isOpen = scentEl.classList.toggle('is-open');
        scentTrigger.setAttribute('aria-expanded', String(isOpen));
      });
    }
  }

  // ── Add-to-cart ────────────────────────────────────────────────────────────────

  if (productForm) {
    productForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = variantInput ? variantInput.value : null;
      if (!id || addBtn.disabled) return;

      var origText    = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = 'Adding…';

      fetch('/cart/add.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ id: parseInt(id, 10), quantity: 1 }),
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        addBtn.textContent = 'Added!';
        addBtn.classList.add('btn-add-to-cart--success');

        document.querySelectorAll('.nav__cart').forEach(function (el) {
          el.classList.add('cart-bump');
          setTimeout(function () { el.classList.remove('cart-bump'); }, 600);
        });

        if (window.SG_Cart) window.SG_Cart.open();

        setTimeout(function () {
          addBtn.textContent = origText;
          addBtn.classList.remove('btn-add-to-cart--success');
          addBtn.disabled = false;
        }, 2000);
      })
      .catch(function () {
        addBtn.textContent = origText;
        addBtn.disabled    = false;
      });
    });
  }

  // ── Social Proof Swiper ───────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var spEl = document.getElementById('social-proof-swiper');
    if (!spEl || typeof Swiper === 'undefined') return;
    new Swiper(spEl, {
      slidesPerView: 2.4,
      spaceBetween:  12,
      grabCursor:    true,
      pagination: {
        el:        '.social-proof__pagination',
        clickable: true,
      },
      breakpoints: {
        640:  { slidesPerView: 3.2 },
        1024: { slidesPerView: 4   },
      },
    });
  });

}());
