(function () {
  'use strict';

  var apiFetch = window.Admin.apiFetch;
  var showToast = window.Admin.showToast;
  var escapeHtml = window.Admin.escapeHtml;
  var formatPEN = window.Admin.formatPEN;

  var categorias = [];
  var productos = [];
  var galeria = []; // URLs de la galería (existentes + añadidas por URL)

  var tbody = document.getElementById('tbodyProductos');
  var filtroTexto = document.getElementById('filtroTexto');
  var filtroCategoria = document.getElementById('filtroCategoria');

  var drawer = document.getElementById('drawerProducto');
  var form = document.getElementById('formProducto');
  var formError = document.getElementById('formProductoError');

  var previewGaleria = document.getElementById('previewGaleria');
  var fImagenesUrl = document.getElementById('fImagenesUrl');

  function cargarCategorias() {
    return apiFetch('/api/categorias').then(function (data) {
      categorias = data;
      var opciones = '<option value="">Todas las categorías</option>';
      categorias.forEach(function (c) {
        opciones += '<option value="' + c.slug + '">' + escapeHtml(c.nombre) + '</option>';
      });
      filtroCategoria.innerHTML = opciones;

      var opcionesForm = categorias
        .map(function (c) { return '<option value="' + c.id + '">' + escapeHtml(c.nombre) + '</option>'; })
        .join('');
      document.getElementById('fCategoriaId').innerHTML = opcionesForm;
    });
  }

  function cargarProductos() {
    var params = new URLSearchParams();
    if (filtroTexto.value.trim()) params.set('q', filtroTexto.value.trim());
    if (filtroCategoria.value) params.set('categoria', filtroCategoria.value);

    return apiFetch('/api/productos?' + params.toString()).then(function (data) {
      productos = data;
      renderTabla();
    });
  }

  function renderTabla() {
    if (productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table__empty">No se encontraron productos.</td></tr>';
      return;
    }

    tbody.innerHTML = productos.map(function (p) {
      var img = p.imagen
        ? '<img class="table__thumb" src="' + p.imagen + '" alt="">'
        : '<div class="table__thumb table__thumb--empty"></div>';

      var precioHtml = typeof p.precio === 'number' ? formatPEN(p.precio) : '<span class="muted">Consultar</span>';

      var estadoHtml = p.disponible
        ? '<span class="badge badge--ok">Disponible</span>'
        : '<span class="badge badge--off">Agotado</span>';

      var etiquetas = '';
      if (p.destacado) etiquetas += '<span class="badge badge--info">Destacado</span> ';
      if (p.nuevo) etiquetas += '<span class="badge badge--new">Nuevo</span>';

      return (
        '<tr>' +
        '<td>' + img + '</td>' +
        '<td>' + escapeHtml(p.nombre) + '<div class="muted">' + escapeHtml(p.sku || '') + '</div></td>' +
        '<td>' + escapeHtml(p.categoria ? p.categoria.nombre : '') + '</td>' +
        '<td>' + precioHtml + '</td>' +
        '<td>' + estadoHtml + '</td>' +
        '<td>' + etiquetas + '</td>' +
        '<td class="table__actions">' +
        '<button type="button" class="btn btn--small" data-editar="' + p.id + '">Editar</button>' +
        '<button type="button" class="btn btn--small btn--danger" data-eliminar="' + p.id + '">Eliminar</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function abrirDrawer(producto) {
    formError.hidden = true;
    form.reset();
    document.getElementById('previewImagen').innerHTML = '';
    document.getElementById('fId').value = '';
    galeria = [];
    renderGaleria();

    if (producto) {
      document.getElementById('drawerTitulo').textContent = 'Editar producto';
      document.getElementById('fId').value = producto.id;
      document.getElementById('fNombre').value = producto.nombre || '';
      document.getElementById('fDescripcion').value = producto.descripcion || '';
      document.getElementById('fCategoriaId').value = producto.categoriaId || '';
      document.getElementById('fSku').value = producto.sku || '';
      document.getElementById('fMarca').value = producto.marca || '';
      document.getElementById('fPrecio').value = producto.precio != null ? producto.precio : '';
      document.getElementById('fPrecioAnterior').value = producto.precioAnterior != null ? producto.precioAnterior : '';
      document.getElementById('fPrecioMayorista').value = producto.precioMayorista != null ? producto.precioMayorista : '';
      document.getElementById('fCantidadMayorista').value = producto.cantidadMayorista != null ? producto.cantidadMayorista : '';
      document.getElementById('fDisponible').checked = !!producto.disponible;
      document.getElementById('fDestacado').checked = !!producto.destacado;
      document.getElementById('fNuevo').checked = !!producto.nuevo;
      if (producto.imagen) {
        document.getElementById('previewImagen').innerHTML = '<img src="' + producto.imagen + '" alt="">';
      }
      galeria = (producto.imagenes && producto.imagenes.length) ? producto.imagenes.slice() : [];
      if (producto.imagen && galeria.indexOf(producto.imagen) === -1) galeria.unshift(producto.imagen);
      renderGaleria();
    } else {
      document.getElementById('drawerTitulo').textContent = 'Nuevo producto';
      document.getElementById('fDisponible').checked = true;
    }

    drawer.hidden = false;
  }

  // ------------------------------------------------------------
  // GALERÍA DE FOTOS
  // ------------------------------------------------------------
  function renderGaleria() {
    fImagenesUrl.value = JSON.stringify(galeria);
    previewGaleria.innerHTML = '';

    galeria.forEach(function (url, idx) {
      var item = document.createElement('div');
      item.className = 'g-item';
      item.innerHTML = '<img src="' + url + '" alt="">' +
        '<button type="button" class="g-remove" data-remover-galeria="' + idx + '" aria-label="Quitar foto">×</button>';
      previewGaleria.appendChild(item);
    });
  }

  function quitarDeGaleria(idx) {
    galeria.splice(idx, 1);
    renderGaleria();
  }

  previewGaleria.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remover-galeria]');
    if (btn) quitarDeGaleria(Number(btn.getAttribute('data-remover-galeria')));
  });

  document.getElementById('btnAgregarGaleria').addEventListener('click', function () {
    var input = document.getElementById('fGaleriaUrl');
    var url = (input.value || '').trim();
    if (url) {
      galeria.push(url);
      renderGaleria();
      input.value = '';
    }
  });

  var fImagenesArchivo = document.getElementById('fImagenesArchivo');
  fImagenesArchivo.addEventListener('change', function () {
    // Los archivos se guardan en el FormData al guardar; aquí solo mostramos
    // los nombres como indicación de que se subirán.
    var n = fImagenesArchivo.files ? fImagenesArchivo.files.length : 0;
    if (n) showToast('Se subirán ' + n + ' foto(s) al guardar.', 'info');
  });

  function cerrarDrawer() {
    drawer.hidden = true;
  }

  function guardarProducto(e) {
    e.preventDefault();
    formError.hidden = true;

    var id = document.getElementById('fId').value;
    var formData = new FormData(form);

    // Los checkboxes no marcados no se envían por FormData; forzamos su valor "false".
    ['disponible', 'destacado', 'nuevo', 'eliminarImagen'].forEach(function (campo) {
      var checkbox = form.querySelector('[name="' + campo + '"]');
      if (checkbox && !checkbox.checked) formData.set(campo, 'false');
    });

    var url = id ? '/api/productos/' + id : '/api/productos';
    var method = id ? 'PUT' : 'POST';

    apiFetch(url, { method: method, body: formData })
      .then(function () {
        cerrarDrawer();
        showToast(id ? 'Producto actualizado.' : 'Producto creado.', 'ok');
        return cargarProductos();
      })
      .catch(function (err) {
        formError.textContent = err.message;
        formError.hidden = false;
      });
  }

  function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    apiFetch('/api/productos/' + id, { method: 'DELETE' })
      .then(function () {
        showToast('Producto eliminado.', 'ok');
        return cargarProductos();
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  tbody.addEventListener('click', function (e) {
    var btnEditar = e.target.closest('[data-editar]');
    var btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEditar) {
      var producto = productos.filter(function (p) { return String(p.id) === btnEditar.getAttribute('data-editar'); })[0];
      if (producto) abrirDrawer(producto);
    } else if (btnEliminar) {
      eliminarProducto(btnEliminar.getAttribute('data-eliminar'));
    }
  });

  document.getElementById('btnNuevoProducto').addEventListener('click', function () { abrirDrawer(null); });
  document.getElementById('btnCancelarProducto').addEventListener('click', cerrarDrawer);
  document.getElementById('btnCerrarDrawer').addEventListener('click', cerrarDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', cerrarDrawer);
  form.addEventListener('submit', guardarProducto);

  var debounceTimer;
  filtroTexto.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(cargarProductos, 300);
  });
  filtroCategoria.addEventListener('change', cargarProductos);

  cargarCategorias().then(cargarProductos).catch(function (err) { showToast(err.message, 'error'); });
})();
