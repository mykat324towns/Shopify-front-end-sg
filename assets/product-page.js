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

  // State
  var selectedBaseId       = null;
  var pressurizedVariantId = null;
  var isPressurized        = false;

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

  function applyVariant(variantId) {
    var v = variantById[variantId];
    if (!v) return;
    if (priceEl)      priceEl.textContent  = formatCents(v.price);
    if (variantInput) variantInput.value   = variantId;
    if (addBtn) {
      if (v.available) {
        addBtn.disabled     = false;
        addBtn.textContent  = 'Add to Rotation';
        addBtn.classList.add('btn-add-to-cart--just-enabled');
        addBtn.addEventListener('animationend', function () {
          addBtn.classList.remove('btn-add-to-cart--just-enabled');
        }, { once: true });
      } else {
        addBtn.disabled    = true;
        addBtn.textContent = 'Sold Out';
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

      var variantId = parseInt(card.dataset.variantId, 10);
      var sizeLower = card.dataset.size; // already lowercased via Liquid filter

      // Reset pressurized state when base size changes
      isPressurized = false;
      if (pressBtn) {
        pressBtn.classList.remove('pressurized-toggle__btn--on');
        pressBtn.setAttribute('aria-pressed', 'false');
      }

      selectedBaseId = variantId;
      setActiveCard(card);
      applyVariant(variantId);
      updatePressurizedToggle(sizeLower);

      var mainImg = document.getElementById('product-gallery-main-img');
      if (mainImg) {
        var sv = variantById[variantId];
        var newSrc = (sv && sv.featured_image && sv.featured_image.src)
          ? sv.featured_image.src
          : card.dataset.bottle;
        if (newSrc) mainImg.src = newSrc;
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
