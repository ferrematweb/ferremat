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
      // Mensaje personalizado cuando la búsqueda no encuentra nada
      if (filters.search && filters.search.trim() !== '') {
        emptyEl.innerHTML = '<p>¡Próximamente lo incorporaremos!</p><p style="font-size:13px;color:var(--text-muted);margin-top:6px;">No encontramos "' + escapeHtml(filters.search.trim()) + '". Prueba con otro nombre o código.</p>';
      } else {
        emptyEl.innerHTML = '<p>No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría.</p>';
      }
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

  // ========================================
  // MODAL DE DETALLE DE PRODUCTO
  // ========================================
  var modalEl = null, modalMainImg = null, modalThumbsEl = null;
  var modalBrandEl = null, modalNameEl = null, modalMetaEl = null, modalPriceEl = null, modalDescEl = null, modalTagsEl = null;
  var modalQtyWrap = null, modalQtyValue = null, modalAddBtn = null, modalWhatsappBtn = null;
  var modalProduct = null;
  var modalQty = 1;

  function initModalDom() {
    modalEl = document.getElementById('productModal');
    if (!modalEl) return false;
    modalMainImg = document.getElementById('modalMainImg');
    modalThumbsEl = document.getElementById('modalThumbs');
    modalBrandEl = document.getElementById('modalProductBrand');
    modalNameEl = document.getElementById('modalProductName');
    modalMetaEl = document.getElementById('modalProductMeta');
    modalPriceEl = document.getElementById('modalProductPrice');
    modalDescEl = document.getElementById('modalProductDesc');
    modalTagsEl = document.getElementById('modalProductTags');
    modalQtyWrap = document.getElementById('modalQtyWrap');
    modalQtyValue = document.getElementById('modalQtyValue');
    modalAddBtn = document.getElementById('modalAddBtn');
    modalWhatsappBtn = document.getElementById('modalWhatsappBtn');

    document.getElementById('productModalClose').addEventListener('click', cerrarModal);
    document.getElementById('productModalOverlay').addEventListener('click', cerrarModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalEl.classList.contains('is-open')) cerrarModal(); });
    document.getElementById('modalQtyMinus').addEventListener('click', function () { if (modalQty > 1) { modalQty--; modalQtyValue.textContent = modalQty; }});
    document.getElementById('modalQtyPlus').addEventListener('click', function () { modalQty++; modalQtyValue.textContent = modalQty; });
    modalAddBtn.addEventListener('click', function () {
      if (!modalProduct) return;
      var cart = window.FERREMAT_CART;
      if (cart) {
        for (var i = 0; i < modalQty; i++) cart.addItem(modalProduct.id, modalProduct.nombre);
      }
      cerrarModal();
    });
    modalWhatsappBtn.addEventListener('click', function () {
      if (!modalProduct) return;
      var cfg = window.FERREMAT_CONFIG;
      if (!cfg || !cfg.VENDEDORES || !cfg.VENDEDORES.length) return;
      // Usa el primer vendedor por defecto para consulta rápida
      var vendedor = cfg.VENDEDORES[0];
      var msg = cfg.buildWhatsappMessage([{ nombre: modalProduct.nombre, cantidad: modalQty }], vendedor.nombre, '');
      var url = cfg.buildWhatsappUrl(vendedor.whatsapp, msg);
      window.open(url, '_blank', 'noopener');
    });
    return true;
  }

  function abrirModal(product) {
    if (!modalEl) initModalDom();
    if (!modalEl || !product) return;
    modalProduct = product;
    modalQty = 1;
    if (modalQtyValue) modalQtyValue.textContent = '1';

    // Galería
    var galeria = (product.imagenes && product.imagenes.length) ? product.imagenes.slice() : [product.imagen];
    if (galeria.indexOf(product.imagen) === -1) galeria.unshift(product.imagen);
    galeria = galeria.filter(Boolean);
    if (modalMainImg) {
      modalMainImg.src = galeria[0] || '';
      modalMainImg.alt = product.nombre;
    }
    if (modalThumbsEl) {
      modalThumbsEl.innerHTML = '';
      galeria.forEach(function (url, idx) {
        var t = document.createElement('img');
        t.src = url;
        t.alt = '';
        t.className = idx === 0 ? 'is-active' : '';
        t.addEventListener('click', function () {
          modalMainImg.src = url;
          Array.prototype.forEach.call(modalThumbsEl.children, function (c, i) { c.classList.toggle('is-active', i === idx); });
        });
        modalThumbsEl.appendChild(t);
      });
      modalThumbsEl.hidden = galeria.length <= 1;
    }

    if (modalBrandEl) modalBrandEl.textContent = product.marca || '';
    if (modalNameEl) modalNameEl.textContent = product.nombre || '';
    if (modalMetaEl) {
      var meta = [];
      if (product.sku) meta.push('<span>SKU: ' + escapeHtml(product.sku) + '</span>');
      if (product.categoria) {
        var catNombre = typeof product.categoria === 'string' ? product.categoria : (product.categoria.nombre || product.categoria);
        meta.push('<span>' + escapeHtml(categoryName(catNombre) !== catNombre ? categoryName(catNombre) : catNombre) + '</span>');
      }
      if (product.marca) meta.push('<span>' + escapeHtml(product.marca) + '</span>');
      modalMetaEl.innerHTML = meta.join(' · ');
    }
    if (modalPriceEl) {
      var pb = buildPriceBlock(product);
      modalPriceEl.innerHTML = pb.priceBlockHtml;
    }
    if (modalDescEl) modalDescEl.textContent = product.descripcion || 'Sin descripción disponible.';
    if (modalTagsEl) {
      var tags = '';
      if (product.destacado) tags += '<span class="badge badge--info">Destacado</span> ';
      if (product.nuevo) tags += '<span class="badge badge--new">Nuevo</span>';
      if (!product.disponible) tags += '<span class="badge badge--off">Agotado</span>';
      modalTagsEl.innerHTML = tags;
    }
    if (modalQtyWrap) modalQtyWrap.hidden = !product.disponible;
    if (modalAddBtn) {
      modalAddBtn.disabled = !product.disponible;
      modalAddBtn.textContent = product.disponible ? '+ Agregar a mi lista' : 'No disponible';
    }

    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function cerrarModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modalProduct = null;
  }

  // Delegación: clic en cualquier card (imagen o nombre) abre el modal, excepto en botones
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.product-card');
    if (!card) return;
    // Si clic fue en botones internos, no abrir modal
    if (e.target.closest('button') || e.target.closest('.product-card__actions')) return;
    var id = card.getAttribute('data-id');
    if (!id) return;
    var prod = null;
    if (CATALOG && CATALOG.PRODUCTS) {
      for (var i = 0; i < CATALOG.PRODUCTS.length; i++) {
        if (String(CATALOG.PRODUCTS[i].id) === String(id) || String(CATALOG.PRODUCTS[i].id) === id) { prod = CATALOG.PRODUCTS[i]; break; }
      }
    }
    if (prod) abrirModal(prod);
  });

  // Expone para debug si se necesita
  window.FERREMAT_MODAL = { abrir: abrirModal, cerrar: cerrarModal };

  function initHeaderSearch() {
    var btn = document.getElementById('headerSearchBtn');
    var headerSearch = document.getElementById('headerSearch');
    var headerInput = document.getElementById('headerSearchInput');
    var headerClose = document.getElementById('headerSearchClose');
    var catalogInput = document.getElementById('catalogSearch');
    var productosSection = document.getElementById('productos');
    if (!btn || !headerSearch || !headerInput) return;

    function abrirBusquedaHeader() {
      btn.hidden = true;
      headerSearch.hidden = false;
      headerInput.focus();
    }
    function cerrarBusquedaHeader() {
      var habiaBusqueda = headerInput.value.trim() !== '';
      headerSearch.hidden = true;
      btn.hidden = false;
      headerInput.value = '';
      // Si había búsqueda, limpia el filtro del catálogo
      if (habiaBusqueda) {
        if (catalogInput) catalogInput.value = '';
        filters.search = '';
        visibleCount = PAGE_SIZE;
        renderGrid();
      }
    }
    function filtrarDesdeHeader() {
      var q = headerInput.value.trim();
      // Sincroniza con el buscador del catálogo
      if (catalogInput) catalogInput.value = q;
      filters.search = q;
      visibleCount = PAGE_SIZE;
      renderGrid();
      // Si no hay resultados, el empty ya muestra el mensaje personalizado
      if (productosSection) {
        var header = document.getElementById('header');
        var offset = header ? header.offsetHeight : 0;
        var top = productosSection.getBoundingClientRect().top + window.scrollY - offset - 10;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }

    btn.addEventListener('click', abrirBusquedaHeader);
    headerClose.addEventListener('click', cerrarBusquedaHeader);
    // Cerrar con Escape
    headerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarBusquedaHeader();
    });
    // Filtrar al escribir (debounce) y al dar Enter
    var debounce = null;
    headerInput.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(filtrarDesdeHeader, 250);
    });
    headerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        filtrarDesdeHeader();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initModalDom();
    initHeaderSearch();
  });
})();
