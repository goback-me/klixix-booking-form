(function () {
  'use strict';

  // var FORM_URL = 'https://klixix-booking-form.vercel.app';
  var FORM_URL = 'http://localhost:5173';
  var overlay, iframe, isOpen = false;

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'carone-booking-overlay';

    var style = document.createElement('style');
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
    
    iframe = document.createElement('iframe');
    iframe.id = 'carone-booking-frame';
    iframe.src = FORM_URL;
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
      if (e.origin !== FORM_URL.replace(/\/$/, '')) return;
      if (e.data === 'carone-booking-close') closeBooking();
    });
  }

  function openBooking() {
    createOverlay();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    isOpen = true;
  }

  function closeBooking() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    isOpen = false;
  }

  // Expose globally
  window.openBooking = openBooking;
  window.closeBooking = closeBooking;

  // Auto-bind buttons with data-action="open-booking"
  function bindButtons() {
    document.querySelectorAll('[data-action="open-booking"]').forEach(function (btn) {
      if (btn._caronebound) return;
      btn._caronebound = true;
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
