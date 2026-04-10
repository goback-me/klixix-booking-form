(function () {
  'use strict';

  var DEFAULT_FORM_URL = 'https://embed.car-one.com.au';
  var configuredUrl = String((/** @type {any} */ (window)).CARONE_BOOKING_URL || '').trim();
  var FORM_URL = (configuredUrl || DEFAULT_FORM_URL).replace(/\/$/, '');
  var FORM_ORIGIN = (function () {
    try {
      return new URL(FORM_URL).origin;
    } catch (error) {
      return '';
    }
  })();

  /** @type {HTMLDivElement | null} */
  var overlay = null;
  /** @type {HTMLIFrameElement | null} */
  var iframe = null;
  var isOpen = false;
  var previousBodyOverflow = '';

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'carone-booking-overlay';

    var styleId = 'carone-booking-overlay-style';
    var style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      style.textContent = [
      '#carone-booking-overlay {',
      '  display: none;',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483647;',
      '  background: rgba(0,0,0,0.5);',
      '  backdrop-filter: blur(2px);',
      '  -webkit-backdrop-filter: blur(2px);',
      '  justify-content: center;',
      '  align-items: center;',
      '  padding: 0;',
      '}',
      '#carone-booking-overlay.open {',
      '  display: flex;',
      '}',
      '#carone-booking-frame {',
      '  width: 100%;',
      '  height: 100%;',
      '  border: none;',
      '  border-radius: 0;',
      '  background: #fff;',
      '}',
      '@media (min-width: 640px) {',
      '  #carone-booking-overlay {',
      '    padding: 16px;',
      '  }',
      '  #carone-booking-frame {',
      '    max-width: 960px;',
      '    max-height: 96vh;',
      '    border-radius: 16px;',
      '    box-shadow: 0 24px 80px rgba(0,0,0,0.25);',
      '  }',
      '}',
      '@media (min-width: 1024px) {',
      '  #carone-booking-overlay {',
      '    padding: 24px;',
      '  }',
      '  #carone-booking-frame {',
      '    max-width: 1100px;',
      '    max-height: 95vh;',
      '  }',
      '}',
      ].join('\n');
      document.head.appendChild(style);
    }
    

    iframe = document.createElement('iframe');
    iframe.id = 'carone-booking-frame';
    // Pass parent page URL as query param
    var parentUrl = encodeURIComponent(window.location.href);
    var sep = FORM_URL.includes('?') ? '&' : '?';
    iframe.src = FORM_URL + sep + 'parent_url=' + parentUrl;
    iframe.title = 'Book a service';
    iframe.allow = 'payment';
    iframe.setAttribute('loading', 'lazy');

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Close when clicking the dark backdrop (not the iframe)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeBooking();
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeBooking();
    });

    // Listen for close message from iframe
    window.addEventListener('message', function (e) {
      if (!iframe || e.source !== iframe.contentWindow) return;
      if (FORM_ORIGIN && e.origin !== FORM_ORIGIN) return;

      if (e.data === 'carone-booking-close' || (e.data && e.data.type === 'carone-booking-close')) {
        closeBooking();
      }
    });
  }

  function openBooking() {
    createOverlay();
    if (!overlay) return;
    overlay.classList.add('open');
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    isOpen = true;
  }

  function closeBooking() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = previousBodyOverflow;
    isOpen = false;
  }

  // Expose globally
  var globalWindow = /** @type {any} */ (window);
  globalWindow.openBooking = openBooking;
  globalWindow.closeBooking = closeBooking;

  // Auto-bind buttons with data-action="open-booking"
  function bindButtons() {
    document.querySelectorAll('[data-action="open-booking"]').forEach(function (el) {
      var btn = /** @type {HTMLElement} */ (el);
      if (btn.dataset.caroneBound === '1') return;
      btn.dataset.caroneBound = '1';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openBooking();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }
})();
