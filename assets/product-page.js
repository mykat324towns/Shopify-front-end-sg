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

  // Cross-sell modal
  var csModal    = document.getElementById('cross-sell-modal');
  var csOverlay  = csModal ? csModal.querySelector('.cs-modal__overlay') : null;
  var csImgEl    = document.getElementById('cs-modal-img');
  var csNameEl   = document.getElementById('cs-modal-name');
  var csPriceEl  = document.getElementById('cs-modal-price');
  var csAddBtn   = document.getElementById('cs-modal-add');
  var csSkipBtn  = document.getElementById('cs-modal-skip');
  var csCloseBtn = csModal ? csModal.querySelector('.cs-modal__close') : null;

  // State
  var selectedBaseId    = null;
  var selectedBaseSize  = null;  // e.g. '10ml' — used to pick pressurized bottle
  var currentBaseBottle = null;  // base bottle URL for active size; revert target on pressurized OFF
  var isPressurized     = false;

  // Sizes eligible for the +$1 pressurized atomizer upgrade
  var SIZES_WITH_PRESSURIZED = ['10ml', '30ml'];

  // Hardcoded pressurized spray-count display (driven by base size, not variant)
  var PRESSURIZED_SPRAYS = { '10ml': '135', '30ml': '400' };

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
    // Pressurized is now a separate $1 upgrade product (handle: pressurized-atomizer-upgrade)
    // exposed via window.SG_PRESSURIZED_UPGRADE. Show the toggle when:
    //   (a) the selected base size is eligible (10ml or 30ml), AND
    //   (b) the upgrade product exists and is in stock
    var upgrade  = window.SG_PRESSURIZED_UPGRADE;
    var eligible = SIZES_WITH_PRESSURIZED.indexOf(baseSizeLower) !== -1;
    var canShow  = eligible && upgrade && upgrade.available;

    if (canShow) {
      if (pressPrice)  pressPrice.textContent  = '+' + formatCents(upgrade.price);
      if (pressSprays) pressSprays.textContent = PRESSURIZED_SPRAYS[baseSizeLower] || '';
      if (pressToggle) {
        pressToggle.classList.add('is-visible');
        pressToggle.setAttribute('aria-hidden', 'false');
      }
    } else {
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
      var variantSlot = document.getElementById('product-gallery-variant');
      if (variantSlot) {
        variantSlot.classList.remove('is-pressurized');
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
      var upgrade = window.SG_PRESSURIZED_UPGRADE;
      if (!upgrade || !upgrade.available || !selectedBaseId) return;

      isPressurized = !isPressurized;
      pressBtn.classList.toggle('pressurized-toggle__btn--on', isPressurized);
      pressBtn.setAttribute('aria-pressed', String(isPressurized));

      // Active variant ID stays as the BASE — pressurizer is a separate cart line item
      // added at submit. Update the displayed price to reflect base + upgrade.
      var baseV = variantById[selectedBaseId];
      if (baseV && priceEl) {
        var totalCents = parseInt(baseV.price, 10)
                       + (isPressurized ? parseInt(upgrade.price, 10) : 0);
        priceEl.textContent = formatCents(totalCents);
      }

      // Swap the small variant bottle: pressurized version on, base bottle off.
      // data-press-bottles holds a JSON map of size → pressurized asset URL.
      if (isPressurized && pressToggle) {
        var pressSrc = null;
        try {
          var map = JSON.parse(pressToggle.dataset.pressBottles || '{}');
          pressSrc = map[selectedBaseSize];
        } catch (err) { /* malformed JSON — leave bottle on base */ }
        if (pressSrc) setVariantImage(pressSrc, true);
      } else if (currentBaseBottle) {
        setVariantImage(currentBaseBottle, true);
      }

      // Toggle the Premium badge + subtle lift on the variant slot
      var variantSlot = document.getElementById('product-gallery-variant');
      if (variantSlot) {
        variantSlot.classList.toggle('is-pressurized', isPressurized);
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

  // ── Cross-sell modal ─────────────────────────────────────────────────────────

  function openCsModal() {
    var cs = window.SG_CROSS_SELL;
    if (!csModal || !cs) return;
    if (csImgEl)   { csImgEl.src = cs.image || ''; csImgEl.alt = cs.title || ''; }
    if (csNameEl)  csNameEl.textContent = cs.title || '';
    if (csPriceEl) csPriceEl.textContent = '$' + (parseInt(cs.price, 10) / 100).toFixed(2);
    csModal.classList.add('is-open');
    csModal.setAttribute('aria-hidden', 'false');
  }

  function closeCsModal() {
    if (!csModal) return;
    csModal.classList.remove('is-open');
    csModal.setAttribute('aria-hidden', 'true');
  }

  // ── Add-to-cart ────────────────────────────────────────────────────────────────

  function performCartAdd(items, origText) {
    fetch('/cart/add.js', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify({ items: items }),
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
  }

  if (productForm) {
    productForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = variantInput ? variantInput.value : null;
      if (!id || addBtn.disabled) return;

      var origText    = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = 'Adding…';

      // Build cart payload. When pressurized is on, send TWO line items:
      //   1. The base fragrance variant, tagged with a Bottle Type property so
      //      fulfillment fills it into a pressurizer (also keeps it from merging
      //      with any plain version of the same variant already in cart).
      //   2. The Pressurized Atomizer Upgrade product, tagged with the fragrance
      //      name so fulfillment knows which line it pairs with.
      var items = [{ id: parseInt(id, 10), quantity: 1 }];
      var upgrade = window.SG_PRESSURIZED_UPGRADE;
      if (isPressurized && upgrade && upgrade.variantId) {
        var nameEl = document.querySelector('.product-name');
        var productName = nameEl ? nameEl.textContent.trim() : '';
        items[0].properties = { 'Bottle Type': 'Pressurized' };
        items.push({
          id: parseInt(upgrade.variantId, 10),
          quantity: 1,
          properties: productName ? { 'Linked to': productName } : {}
        });
      }

      // Show cross-sell upsell modal when a cross-sell product is configured
      if (window.SG_CROSS_SELL && csModal) {
        openCsModal();

        function onAdd() {
          cleanup();
          var allItems = items.concat([{ id: parseInt(window.SG_CROSS_SELL.variantId, 10), quantity: 1 }]);
          performCartAdd(allItems, origText);
        }
        function onSkip() {
          cleanup();
          performCartAdd(items, origText);
        }
        function cleanup() {
          closeCsModal();
          if (csAddBtn)   csAddBtn.removeEventListener('click', onAdd);
          if (csSkipBtn)  csSkipBtn.removeEventListener('click', onSkip);
          if (csCloseBtn) csCloseBtn.removeEventListener('click', onSkip);
          if (csOverlay)  csOverlay.removeEventListener('click', onSkip);
        }
        if (csAddBtn)   csAddBtn.addEventListener('click', onAdd);
        if (csSkipBtn)  csSkipBtn.addEventListener('click', onSkip);
        if (csCloseBtn) csCloseBtn.addEventListener('click', onSkip);
        if (csOverlay)  csOverlay.addEventListener('click', onSkip);
        return;
      }

      performCartAdd(items, origText);
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
