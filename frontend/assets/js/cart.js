/**
 * FERREMAT — LISTA DE CONSULTA (no es un carrito de compra / no hay pagos)
 * ============================================================
 * Guarda los productos seleccionados en localStorage para que persistan
 * mientras el usuario navega por la web. Al finalizar, genera un mensaje
 * de WhatsApp dirigido al vendedor elegido. No procesa pagos ni checkout.
 * ============================================================
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ferremat_lista_consulta';
  var CONFIG = window.FERREMAT_CONFIG;

  var state = {
    items: loadList(),      // { id, nombre, cantidad }
    vendedorId: null
  };

  // ------------------------------------------------------------
  // PERSISTENCIA (localStorage)
  // ------------------------------------------------------------
  function loadList() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveList() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (e) {
      /* localStorage no disponible: la lista seguirá funcionando solo en memoria */
    }
  }

  // ------------------------------------------------------------
  // API PÚBLICA DE LA LISTA
  // ------------------------------------------------------------
  function getQuantity(id) {
    var item = state.items.filter(function (i) { return i.id === id; })[0];
    return item ? item.cantidad : 0;
  }

  function getTotalCount() {
    return state.items.reduce(function (sum, i) { return sum + i.cantidad; }, 0);
  }

  function addItem(id, nombre) {
    var item = state.items.filter(function (i) { return i.id === id; })[0];
    if (item) {
      item.cantidad += 1;
    } else {
      state.items.push({ id: id, nombre: nombre, cantidad: 1 });
    }
    saveList();
    renderAll();
    showToast(nombre + ' agregado a tu lista');
  }

  function increment(id) {
    var item = state.items.filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    item.cantidad += 1;
    saveList();
    renderAll();
  }

  function decrement(id) {
    var item = state.items.filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    item.cantidad -= 1;
    if (item.cantidad <= 0) {
      removeItem(id);
      return;
    }
    saveList();
    renderAll();
  }

  function removeItem(id) {
    state.items = state.items.filter(function (i) { return i.id !== id; });
    saveList();
    renderAll();
  }

  function clearList() {
    state.items = [];
    saveList();
    renderAll();
  }

  // ------------------------------------------------------------
  // UI: BADGE, DRAWER, ITEMS
  // ------------------------------------------------------------
  var badgeEls, drawerItemsEl, drawerEmptyEl, drawerCountEl, vendorListEl,
    whatsappBtn, vendorWarningEl, catalogSyncCallback;

  function renderBadge() {
    var count = getTotalCount();
    badgeEls.forEach(function (el) {
      el.textContent = String(count);
      el.hidden = count === 0;
    });
  }

  function renderDrawerItems() {
    if (!drawerItemsEl) return;
    drawerItemsEl.innerHTML = '';

    if (state.items.length === 0) {
      drawerEmptyEl.hidden = false;
      drawerItemsEl.hidden = true;
      whatsappBtn.disabled = true;
      drawerCountEl.textContent = '0 productos';
      return;
    }

    drawerEmptyEl.hidden = true;
    drawerItemsEl.hidden = false;

    state.items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'list-item';
      row.setAttribute('data-id', item.id);
      row.innerHTML =
        '<div class="list-item__info">' +
          '<div class="list-item__name">' + escapeHtml(item.nombre) + '</div>' +
        '</div>' +
        '<div class="list-item__qty">' +
          '<button type="button" class="qty-btn qty-btn--minus" aria-label="Disminuir cantidad de ' + escapeHtml(item.nombre) + '">−</button>' +
          '<span class="qty-value">' + item.cantidad + '</span>' +
          '<button type="button" class="qty-btn qty-btn--plus" aria-label="Aumentar cantidad de ' + escapeHtml(item.nombre) + '">+</button>' +
        '</div>' +
        '<button type="button" class="list-item__remove" aria-label="Quitar ' + escapeHtml(item.nombre) + ' de la lista">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>';

      row.querySelector('.qty-btn--minus').addEventListener('click', function () { decrement(item.id); });
      row.querySelector('.qty-btn--plus').addEventListener('click', function () { increment(item.id); });
      row.querySelector('.list-item__remove').addEventListener('click', function () { removeItem(item.id); });

      drawerItemsEl.appendChild(row);
    });

    var totalProductos = getTotalCount();
    drawerCountEl.textContent = totalProductos + (totalProductos === 1 ? ' producto' : ' productos');
    updateWhatsappButtonState();
  }

  function renderVendorList() {
    if (!vendorListEl) return;
    vendorListEl.innerHTML = '';
    CONFIG.VENDEDORES.forEach(function (v) {
      var label = document.createElement('label');
      label.className = 'vendor-option';
      var fotoHtml = v.foto ? '<img src="' + v.foto + '" alt="' + escapeHtml(v.nombre) + '" class="vendor-option__foto" loading="lazy" width="48" height="48">' : '<span class="vendor-option__foto vendor-option__foto--placeholder">' + escapeHtml(v.nombre.charAt(0)) + '</span>';
      label.innerHTML =
        '<input type="radio" name="vendedor" value="' + v.id + '">' +
        fotoHtml +
        '<span>' + escapeHtml(v.nombre) + '</span>';
      var input = label.querySelector('input');
      input.addEventListener('change', function () {
        state.vendedorId = v.id;
        updateWhatsappButtonState();
      });
      vendorListEl.appendChild(label);
    });
  }

  function updateWhatsappButtonState() {
    if (!whatsappBtn) return;
    var hayItems = state.items.length > 0;
    var hayVendedor = !!state.vendedorId;
    whatsappBtn.disabled = !(hayItems && hayVendedor);
  }

  function renderAll() {
    renderBadge();
    renderDrawerItems();
    if (typeof catalogSyncCallback === 'function') catalogSyncCallback();
  }

  // ------------------------------------------------------------
  // TOAST DE CONFIRMACIÓN
  // ------------------------------------------------------------
  var toastEl, toastTimer;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 2200);
  }

  // ------------------------------------------------------------
  // UTIL
  // ------------------------------------------------------------
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ------------------------------------------------------------
  // DRAWER OPEN/CLOSE
  // ------------------------------------------------------------
  var drawerEl, overlayEl, toggleEls, closeEl, lastFocused;

  function openDrawer() {
    lastFocused = document.activeElement;
    drawerEl.classList.add('is-open');
    overlayEl.classList.add('is-visible');
    drawerEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeEl.focus();
    document.addEventListener('keydown', handleDrawerKeydown);
  }

  function closeDrawer() {
    drawerEl.classList.remove('is-open');
    overlayEl.classList.remove('is-visible');
    drawerEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleDrawerKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function handleDrawerKeydown(e) {
    if (e.key === 'Escape') {
      closeDrawer();
    }
  }

  // ------------------------------------------------------------
  // ENVÍO POR WHATSAPP
  // ------------------------------------------------------------
  function handleWhatsappClick() {
    if (state.items.length === 0 || !state.vendedorId) return;

    var vendedor = CONFIG.VENDEDORES.filter(function (v) { return v.id === state.vendedorId; })[0];
    if (!vendedor) return;

    if (!vendedor.whatsapp) {
      vendorWarningEl.hidden = false;
      vendorWarningEl.textContent = 'Este vendedor aún no tiene un número de WhatsApp configurado. Edita assets/js/config.js para agregarlo.';
      return;
    }
    vendorWarningEl.hidden = true;

    var nombreCliente = document.getElementById('customerName') ? document.getElementById('customerName').value : '';
    var mensaje = CONFIG.buildWhatsappMessage(state.items, vendedor.nombre, nombreCliente);
    var url = CONFIG.buildWhatsappUrl(vendedor.whatsapp, mensaje);
    window.open(url, '_blank', 'noopener');
  }

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  function init() {
    badgeEls = Array.prototype.slice.call(document.querySelectorAll('.js-list-badge'));
    toggleEls = Array.prototype.slice.call(document.querySelectorAll('.js-list-toggle'));
    drawerEl = document.getElementById('listDrawer');
    overlayEl = document.getElementById('listOverlay');
    closeEl = document.getElementById('listClose');
    drawerItemsEl = document.getElementById('listItems');
    drawerEmptyEl = document.getElementById('listEmpty');
    drawerCountEl = document.getElementById('listCount');
    vendorListEl = document.getElementById('vendorList');
    whatsappBtn = document.getElementById('listWhatsapp');
    vendorWarningEl = document.getElementById('vendorWarning');
    toastEl = document.getElementById('listToast');

    if (!drawerEl) return; // markup no presente

    toggleEls.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer();
      });
    });
    closeEl.addEventListener('click', closeDrawer);
    overlayEl.addEventListener('click', closeDrawer);

    var clearBtn = document.getElementById('listClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (state.items.length === 0) return;
        clearList();
      });
    }

    whatsappBtn.addEventListener('click', handleWhatsappClick);

    renderVendorList();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);

  // ------------------------------------------------------------
  // EXPUESTO PARA catalog.js
  // ------------------------------------------------------------
  window.FERREMAT_CART = {
    addItem: addItem,
    increment: increment,
    decrement: decrement,
    removeItem: removeItem,
    getQuantity: getQuantity,
    getTotalCount: getTotalCount,
    onChange: function (cb) { catalogSyncCallback = cb; }
  };
})();
