// Scent Gallery — Sticky Add-to-Cart bar (mobile only)
// Listens for size-card clicks on the PDP and reveals a fixed bottom bar.

(function () {
  'use strict';

  var bar      = document.getElementById('sticky-atc');
  var priceEl  = document.getElementById('sticky-atc-price');
  var thumbEl  = document.getElementById('sticky-atc-thumb');
  var btn      = document.getElementById('sticky-atc-btn');
  var sizeGrid = document.querySelector('.size-selector-grid');

  if (!bar || !sizeGrid) return;

  function formatCents(cents) {
    return '$' + (parseInt(cents, 10) / 100).toFixed(2);
  }

  // Show bar and sync price/thumbnail when a valid size is selected.
  sizeGrid.addEventListener('click', function (e) {
    var card = e.target.closest('.size-card');
    if (!card) return;
    // Ignore unavailable cards (product-page.js also blocks them, but guard here too).
    if (card.classList.contains('size-card--unavailable')) return;

    var price = card.dataset.price;
    if (priceEl && price) {
      priceEl.textContent = formatCents(price);
    }

    // Update thumbnail to the selected variant's bottle image when available.
    var bottleSrc = card.dataset.bottle;
    if (thumbEl && bottleSrc) {
      thumbEl.src = bottleSrc;
    }

    bar.classList.add('is-visible');
    bar.setAttribute('aria-hidden', 'false');
  });

  // Button click: programmatically submit the main ATC form.
  if (btn) {
    btn.addEventListener('click', function () {
      var form = document.getElementById('product-form');
      if (!form) return;
      // Reuse the main button's submit path (which handles fetch + cart drawer).
      var mainBtn = document.getElementById('btn-add-to-cart');
      if (mainBtn && !mainBtn.disabled) {
        mainBtn.click();
      }
    });
  }

}());
