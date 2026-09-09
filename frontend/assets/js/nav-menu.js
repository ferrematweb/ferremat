/**
 * FERREMAT — MENÚ DE NAVEGACIÓN (vía API)
 * ============================================================
 * Reemplaza los enlaces del <nav> del header y del menú móvil por
 * los ítems configurados en el panel admin (tabla ItemMenu), en vez
 * de tenerlos escritos a mano en index.html.
 *
 * Es "progresivo": si la API no responde (backend caído, sin
 * conexión), simplemente se deja el menú que ya viene escrito en el
 * HTML como respaldo, para que el sitio nunca se quede sin
 * navegación.
 * ============================================================
 */
(function () {
  'use strict';

  function apiUrl(path) {
    var base = (window.FERREMAT_CONFIG && window.FERREMAT_CONFIG.API_BASE_URL) || '';
    return base.replace(/\/$/, '') + path;
  }

  function esAncla(href) {
    return typeof href === 'string' && href.charAt(0) === '#';
  }

  function scrollSuaveHacia(targetId) {
    var target = document.querySelector(targetId);
    if (!target) return;
    var header = document.getElementById('header');
    var headerHeight = header ? header.offsetHeight : 0;
    var top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function cerrarMenuMovil() {
    var mobileMenu = document.getElementById('mobileMenu');
    var menuToggle = document.getElementById('menuToggle');
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function pintarNavDesktop(items) {
    var nav = document.querySelector('.header__nav');
    if (!nav) return;
    nav.innerHTML = '';
    items.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.enlace;
      a.textContent = item.nombre;
      nav.appendChild(a);
    });
  }

  function pintarNavMovil(items) {
    var nav = document.querySelector('.mobile-menu__nav');
    if (!nav) return;
    nav.innerHTML = '';
    items.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.enlace;
      a.className = 'mobile-menu__link';
      a.textContent = item.nombre;
      nav.appendChild(a);
    });
  }

  // Delegación de eventos: funciona sin importar que los enlaces se
  // hayan creado dinámicamente después de que main.js ya se ejecutó.
  function activarScrollYCierre() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('.header__nav a, .mobile-menu__nav a');
      if (!link) return;

      var href = link.getAttribute('href');
      var esMovil = link.classList.contains('mobile-menu__link');

      if (esAncla(href)) {
        e.preventDefault();
        if (esMovil) cerrarMenuMovil();
        scrollSuaveHacia(href);
      } else if (esMovil) {
        // Enlace externo dentro del menú móvil: solo cierra el menú,
        // deja que el navegador siga el enlace con normalidad.
        cerrarMenuMovil();
      }
    });
  }

  function cargarMenu() {
    if (window.FERREMAT_CATALOG && Array.isArray(window.FERREMAT_CATALOG.MENU) && window.FERREMAT_CATALOG.MENU.length) {
      var pre = window.FERREMAT_CATALOG.MENU;
      pintarNavDesktop(pre);
      pintarNavMovil(pre);
      return;
    }
    fetch(apiUrl('/api/menu'))
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar el menú.');
        return r.json();
      })
      .then(function (items) {
        if (!Array.isArray(items) || items.length === 0) return; // conserva el respaldo estático
        pintarNavDesktop(items);
        pintarNavMovil(items);
      })
      .catch(function (err) {
        console.warn('[FERREMAT] Usando el menú de respaldo (no se pudo cargar desde la API):', err.message);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    activarScrollYCierre();
    cargarMenu();
  });
  document.addEventListener('ferremat:catalog-ready', function () {
    if (window.FERREMAT_CATALOG && Array.isArray(window.FERREMAT_CATALOG.MENU) && window.FERREMAT_CATALOG.MENU.length) {
      pintarNavDesktop(window.FERREMAT_CATALOG.MENU);
      pintarNavMovil(window.FERREMAT_CATALOG.MENU);
    }
  });
})();
