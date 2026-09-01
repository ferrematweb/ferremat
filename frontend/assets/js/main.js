/**
 * FERREMAT — script principal del sitio
 * Navbar al hacer scroll, menú móvil, acordeón FAQ,
 * animaciones al hacer scroll (reveal) y scroll suave.
 */
(function () {
  'use strict';

  // ========================================
  // NAVBAR SCROLL BEHAVIOR
  // ========================================
  const header = document.getElementById('header');
  const headerLogo = document.getElementById('headerLogo');

  function handleNavScroll() {
    if (window.scrollY > 60) {
      header.classList.add('header--scrolled');
      if (headerLogo) headerLogo.src = 'assets/images/logo/logo-h128.png';
    } else {
      header.classList.remove('header--scrolled');
      if (headerLogo) headerLogo.src = 'assets/images/logo/logo-h128-blanco.png';
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // ========================================
  // MOBILE MENU (con manejo de foco y Escape)
  // ========================================
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu.querySelectorAll('.mobile-menu__link, .mobile-menu__cta .btn');
  const focusableSelector = 'a[href], button:not([disabled])';

  function openMenu() {
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    menuClose.focus();
    document.addEventListener('keydown', handleMenuKeydown);
  }

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuToggle.focus();
    document.removeEventListener('keydown', handleMenuKeydown);
  }

  function handleMenuKeydown(e) {
    if (e.key === 'Escape') {
      closeMenu();
      return;
    }
    // Trampa de foco simple: mantiene el Tab dentro del menú móvil abierto
    if (e.key === 'Tab') {
      const focusable = Array.from(mobileMenu.querySelectorAll(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  menuToggle.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // ========================================
  // FAQ ACCORDION
  // ========================================
  const faqItems = document.querySelectorAll('.faq__item');

  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');
    const answerInner = item.querySelector('.faq__answer-inner');

    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('is-open');

      // Cierra todos los demás
      faqItems.forEach(function (otherItem) {
        otherItem.classList.remove('is-open');
        otherItem.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
        otherItem.querySelector('.faq__answer').style.maxHeight = '0';
      });

      // Abre el actual si estaba cerrado
      if (!isOpen) {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answerInner.scrollHeight + 24 + 'px';
      }
    });
  });

  // ========================================
  // SCROLL REVEAL (IntersectionObserver)
  // ========================================
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // ========================================
  // SMOOTH SCROLL PARA ENLACES ANCLA
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = header.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========================================
  // AÑO DINÁMICO EN EL FOOTER
  // ========================================
  const yearEl = document.getElementById('footerYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ========================================
  // TELÉFONO/WHATSAPP DE LA TIENDA (desde config.js)
  // Si aún no se configuró un número real, se muestra el placeholder
  // editable y el botón flotante de WhatsApp lleva a la sección de contacto.
  // ========================================
  const CONFIG = window.FERREMAT_CONFIG;
  if (CONFIG) {
    const info = CONFIG.STORE_INFO;
    const phoneEls = document.querySelectorAll('.js-store-phone');
    phoneEls.forEach(function (el) {
      el.textContent = info.whatsappDisplay;
    });

    const whatsappFloat = document.getElementById('whatsappFloat');
    if (whatsappFloat && info.whatsapp) {
      whatsappFloat.href = 'https://wa.me/' + info.whatsapp.replace(/[^0-9]/g, '');
    }

    // Botón "CONTACTAR" del CTA final -> abre WhatsApp directamente.
    const ctaContactar = document.getElementById('ctaContactar');
    if (ctaContactar && info.whatsapp) {
      ctaContactar.href = 'https://wa.me/' + info.whatsapp.replace(/[^0-9]/g, '');
      ctaContactar.target = '_blank';
      ctaContactar.rel = 'noopener noreferrer';
    }
  }
})();
