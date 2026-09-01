/**
 * FERREMAT — CATÁLOGO (búsqueda, filtros, orden y tarjetas de producto)
 * ============================================================
 */
(function () {
  'use strict';

  var CATALOG = window.FERREMAT_CATALOG;
  var PAGE_SIZE = 10; // 2 filas completas de 5 en desktop

  var filters = {
    search: '',
    categoria: 'all',
    orden: 'relevancia'
  };
  var visibleCount = PAGE_SIZE;

  var gridEl, emptyEl, loadMoreBtn, resultsCountEl, searchInput, chipButtons, sortSelect;

  function getFilteredProducts() {
    var list = CATALOG.PRODUCTS.slice();

    if (filters.categoria !== 'all') {
      list = list.filter(function (p) { return p.categoria === filters.categoria; });
    }

    if (filters.search.trim() !== '') {
      var q = filters.search.trim().toLowerCase();
      list = list.filter(function (p) {
        return p.nombre.toLowerCase().indexOf(q) !== -1 ||
          p.descripcion.toLowerCase().indexOf(q) !== -1 ||
          (p.sku && p.sku.toLowerCase().indexOf(q) !== -1);
      });
    }

    if (filters.orden === 'nombre-asc') {
      list.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    } else if (filters.orden === 'nombre-desc') {
      list.sort(function (a, b) { return b.nombre.localeCompare(a.nombre); });
    } else if (filters.orden === 'categoria') {
      list.sort(function (a, b) { return a.categoria.localeCompare(b.categoria); });
    } else {
      // relevancia: destacados primero
      list.sort(function (a, b) { return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0); });
    }

    return list;
  }

  function categoryName(slug) {
    var cat = CATALOG.CATEGORIES.filter(function (c) { return c.slug === slug; })[0];
    return cat ? cat.nombre : slug;
  }

  function formatPEN(n) {
    // Formatea como moneda peruana sin decimales cuando es entero.
    var hasDecimals = Math.round(n * 100) % 100 !== 0;
    return 'S/ ' + n.toLocaleString('es-PE', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    });
  }

  function buildPriceBlock(product) {
    var hasPrice = typeof product.precio === 'number';

    if (!hasPrice) {
      return {
        priceBlockHtml: '<div class="product-card__price-block">' +
          '<div class="product-card__price product-card__price--query">Consultar precio</div>' +
        '</div>',
        discountBadgeHtml: ''
      };
    }

    var oldPriceHtml = '';
    var discountBadgeHtml = '';
    var discountInlineHtml = '';

    if (typeof product.precioAnterior === 'number' && product.precioAnterior > product.precio) {
      var pct = Math.round((1 - (product.precio / product.precioAnterior)) * 100);
      oldPriceHtml = '<span class="product-card__price-old">' + formatPEN(product.precioAnterior) + '</span>';
      discountInlineHtml = '<span class="product-card__discount-inline">-' + pct + '%</span>';
      discountBadgeHtml = '<span class="product-card__discount-badge">-' + pct + '%</span>';
    }

    var wholesaleHtml = '';
    if (typeof product.precioMayorista === 'number' && product.cantidadMayorista) {
      wholesaleHtml = '<div class="product-card__wholesale">Desde ' + product.cantidadMayorista +
        ' und.: <strong>' + formatPEN(product.precioMayorista) + ' c/u</strong></div>';
    }

    var priceBlockHtml = '<div class="product-card__price-block">' +
      '<div class="product-card__price-row">' +
        '<span class="product-card__price">' + formatPEN(product.precio) + '</span>' +
        oldPriceHtml + discountInlineHtml +
      '</div>' +
      wholesaleHtml +
    '</div>';

    return { priceBlockHtml: priceBlockHtml, discountBadgeHtml: discountBadgeHtml };
  }

  function renderCard(product) {
    var cart = window.FERREMAT_CART;
    var qty = cart ? cart.getQuantity(product.id) : 0;

    var card = document.createElement('div');
    card.className = 'product-card reveal is-visible';
    card.setAttribute('data-id', product.id);

    var tagHtml = product.destacado ? '<span class="product-card__tag">Destacado</span>' : '';
    var soldOutHtml = !product.disponible ? '<span class="product-card__tag product-card__tag--out">Agotado</span>' : '';

    var priceParts = buildPriceBlock(product);
    var priceBlockHtml = priceParts.priceBlockHtml;
    var discountBadgeHtml = priceParts.discountBadgeHtml;

    var brandHtml = product.marca ? escapeHtml(product.marca) : '';

    // Galería: apila la imagen principal + las fotos adicionales para el
    // efecto hover (la tarjeta alterna de foto al pasar el cursor).
    var galeria = (product.imagenes && product.imagenes.length)
      ? product.imagenes.slice()
      : [product.imagen];
    if (galeria.indexOf(product.imagen) === -1) galeria.unshift(product.imagen);

    var imgHtml = '';
    galeria.forEach(function (url, i) {
      imgHtml += '<img src="' + url + '" alt="' + escapeHtml(product.nombre) + '" loading="lazy"' +
        (i === 0 ? ' class="is-default"' : '') + '>';
    });

    card.innerHTML =
      '<div class="product-card__img">' +
        imgHtml +
        tagHtml + soldOutHtml + discountBadgeHtml +
      '</div>' +
      '<div class="product-card__body">' +
        '<div class="product-card__brand">' + brandHtml + '</div>' +
        '<h3 class="product-card__name" title="' + escapeHtml(product.nombre) + '">' + escapeHtml(product.nombre) + '</h3>' +
        priceBlockHtml +
        '<div class="product-card__actions"></div>' +
      '</div>';

    var actions = card.querySelector('.product-card__actions');
    renderCardActions(actions, product, qty);

    // Efecto hover: al mantener el cursor sobre la tarjeta, va alternando
    // entre las fotos de la galería; al salir, vuelve a la portada.
    var imgs = [].slice.call(card.querySelectorAll('.product-card__img img'));
    if (imgs.length > 1) {
      var idx = 0;
      var hoverTimer = null;
      card.addEventListener('mouseenter', function () {
        idx = 0;
        hoverTimer = setInterval(function () {
          idx = (idx + 1) % imgs.length;
          imgs.forEach(function (im, i) { im.classList.toggle('is-active', i === idx); });
        }, 650);
      });
      card.addEventListener('mouseleave', function () {
        if (hoverTimer) clearInterval(hoverTimer);
        hoverTimer = null;
        imgs.forEach(function (im, i) { im.classList.toggle('is-active', i === 0); });
      });
    }

    return card;
  }

  function renderCardActions(actions, product, qty) {
    actions.innerHTML = '';
    if (!product.disponible) {
      var span = document.createElement('span');
      span.className = 'product-card__unavailable';
      span.textContent = 'No disponible por el momento';
      actions.appendChild(span);
      return;
    }

    if (qty > 0) {
      var stepper = document.createElement('div');
      stepper.className = 'product-card__stepper';
      stepper.innerHTML =
        '<button type="button" class="qty-btn qty-btn--minus" aria-label="Disminuir cantidad">−</button>' +
        '<span class="qty-value">' + qty + '</span>' +
        '<button type="button" class="qty-btn qty-btn--plus" aria-label="Aumentar cantidad">+</button>';
      stepper.querySelector('.qty-btn--minus').addEventListener('click', function () {
        window.FERREMAT_CART.decrement(product.id);
      });
      stepper.querySelector('.qty-btn--plus').addEventListener('click', function () {
        window.FERREMAT_CART.increment(product.id);
      });
      actions.appendChild(stepper);
    } else {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--outline btn--small product-card__add';
      btn.textContent = '+ Agregar';
      btn.addEventListener('click', function () {
        window.FERREMAT_CART.addItem(product.id, product.nombre);
      });
      actions.appendChild(btn);
    }
  }

  function renderGrid() {
    var filtered = getFilteredProducts();
    gridEl.innerHTML = '';

    if (filtered.length === 0) {
      emptyEl.hidden = false;
      loadMoreBtn.hidden = true;
      resultsCountEl.textContent = '0 productos encontrados';
      return;
    }

    emptyEl.hidden = true;
    var toShow = filtered.slice(0, visibleCount);
    toShow.forEach(function (p) {
      gridEl.appendChild(renderCard(p));
    });

    resultsCountEl.textContent = filtered.length + (filtered.length === 1 ? ' producto encontrado' : ' productos encontrados');
    loadMoreBtn.hidden = visibleCount >= filtered.length;
  }

  function refreshQuantitiesOnly() {
    // Actualiza solo los botones/steppers visibles sin re-renderizar todo (evita perder scroll)
    var cart = window.FERREMAT_CART;
    if (!cart) return;
    var nuevosWrap = document.getElementById('nuevosIngresosGrid');
    var cards = gridEl.querySelectorAll('.product-card');
    if (nuevosWrap) {
      cards = Array.prototype.slice.call(cards).concat(
        Array.prototype.slice.call(nuevosWrap.querySelectorAll('.product-card'))
      );
    }
    cards.forEach(function (card) {
      var id = card.getAttribute('data-id');
      var product = CATALOG.PRODUCTS.filter(function (p) { return p.id === id; })[0];
      if (!product) return;
      var actions = card.querySelector('.product-card__actions');
      renderCardActions(actions, product, cart.getQuantity(id));
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setActiveChip(categoria) {
    chipButtons.forEach(function (btn) {
      var isActive = btn.getAttribute('data-categoria') === categoria;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyCategoryFilter(slug, scrollTo) {
    filters.categoria = slug;
    visibleCount = PAGE_SIZE;
    setActiveChip(slug);
    renderGrid();
    if (scrollTo) {
      var target = document.getElementById('productos');
      if (target) {
        var header = document.getElementById('header');
        var offset = header ? header.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }
  }

  function buildFilterChips() {
    var wrap = document.getElementById('catalogFilters');
    if (!wrap) return;
    wrap.innerHTML = '';

    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'filter-chip is-active';
    allBtn.textContent = 'Todas';
    allBtn.setAttribute('data-categoria', 'all');
    allBtn.setAttribute('aria-pressed', 'true');
    wrap.appendChild(allBtn);

    CATALOG.CATEGORIES.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip';
      btn.textContent = cat.nombre;
      btn.setAttribute('data-categoria', cat.slug);
      btn.setAttribute('aria-pressed', 'false');
      wrap.appendChild(btn);
    });

    chipButtons = Array.prototype.slice.call(wrap.querySelectorAll('.filter-chip'));
    chipButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyCategoryFilter(btn.getAttribute('data-categoria'), false);
      });
    });
  }

  function hookCategoryCards() {
    var cards = document.querySelectorAll('[data-category-filter]');
    cards.forEach(function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        applyCategoryFilter(card.getAttribute('data-category-filter'), true);
      });
    });
  }

  function renderNuevosIngresos() {
    var wrap = document.getElementById('nuevosIngresosGrid');
    if (!wrap) return;
    var nuevos = CATALOG.PRODUCTS.filter(function (p) { return p.nuevo; });
    wrap.innerHTML = '';
    nuevos.forEach(function (p) { wrap.appendChild(renderCard(p)); });
  }

  function initDom() {
    gridEl = document.getElementById('catalogGrid');
    emptyEl = document.getElementById('catalogEmpty');
    loadMoreBtn = document.getElementById('catalogLoadMore');
    resultsCountEl = document.getElementById('catalogResultsCount');
    searchInput = document.getElementById('catalogSearch');
    sortSelect = document.getElementById('catalogSort');

    if (!gridEl) return false;

    buildFilterChips();
    hookCategoryCards();

    searchInput.addEventListener('input', function () {
      filters.search = searchInput.value;
      visibleCount = PAGE_SIZE;
      renderGrid();
    });

    sortSelect.addEventListener('change', function () {
      filters.orden = sortSelect.value;
      renderGrid();
    });

    loadMoreBtn.addEventListener('click', function () {
      visibleCount += PAGE_SIZE;
      renderGrid();
    });

    if (window.FERREMAT_CART) {
      window.FERREMAT_CART.onChange(refreshQuantitiesOnly);
    }

    return true;
  }

  function renderAll() {
    renderNuevosIngresos();
    // buildFilterChips() depende de CATALOG.CATEGORIES, que solo está
    // completo una vez que llega la respuesta de la API — por eso se
    // reconstruyen los chips de filtro aquí también, no solo en initDom().
    buildFilterChips();
    hookCategoryCards();
    renderGrid();
  }

  var domListo = false;

  function intentarRenderizar() {
    if (!domListo) {
      domListo = initDom();
      if (!domListo) return; // esta página no tiene catálogo (ej. no existe #catalogGrid)
    }
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    domListo = initDom();
    // Si el catálogo ya llegó de la API antes de que el DOM terminara de
    // cargar, píntalo de una vez. Si no, se pintará cuando llegue el
    // evento "ferremat:catalog-ready" (ver más abajo).
    if (domListo && CATALOG && !CATALOG.cargando) {
      renderAll();
    }
  });

  // Se dispara desde products-data.js cuando la respuesta de la API
  // (categorías + productos) ya está lista en window.FERREMAT_CATALOG.
  document.addEventListener('ferremat:catalog-ready', intentarRenderizar);
})();
