(function () {
  'use strict';

  var apiFetch = window.Admin.apiFetch;
  var showToast = window.Admin.showToast;
  var escapeHtml = window.Admin.escapeHtml;

  var categorias = [];
  var tbody = document.getElementById('tbodyCategorias');
  var drawer = document.getElementById('drawerCategoria');
  var form = document.getElementById('formCategoria');
  var formError = document.getElementById('formCategoriaError');

  function cargarCategorias() {
    return apiFetch('/api/categorias').then(function (data) {
      categorias = data;
      renderTabla();
    });
  }

  function renderTabla() {
    if (categorias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table__empty">No hay categorías todavía.</td></tr>';
      return;
    }

    tbody.innerHTML = categorias.map(function (c) {
      var img = c.imagen
        ? '<img class="table__thumb" src="' + c.imagen + '" alt="">'
        : '<div class="table__thumb table__thumb--empty"></div>';

      var puedeEliminar = !c.totalProductos || c.totalProductos === 0;

      return (
        '<tr>' +
        '<td>' + img + '</td>' +
        '<td>' + escapeHtml(c.nombre) + '</td>' +
        '<td><code>' + escapeHtml(c.slug) + '</code></td>' +
        '<td>' + c.orden + '</td>' +
        '<td>' + c.totalProductos + '</td>' +
        '<td>' + (c.destacada ? '<span class="badge badge--info">Sí</span>' : '—') + '</td>' +
        '<td class="table__actions">' +
        '<button type="button" class="btn btn--small" data-editar="' + c.id + '">Editar</button>' +
        '<button type="button" class="btn btn--small btn--danger" data-eliminar="' + c.id + '"' +
          (puedeEliminar ? '' : ' disabled title="Tiene productos asociados"') + '>Eliminar</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function abrirDrawer(categoria) {
    formError.hidden = true;
    form.reset();
    document.getElementById('previewImagenCat').innerHTML = '';
    document.getElementById('cId').value = '';

    if (categoria) {
      document.getElementById('drawerTituloCat').textContent = 'Editar categoría';
      document.getElementById('cId').value = categoria.id;
      document.getElementById('cNombre').value = categoria.nombre || '';
      document.getElementById('cSlug').value = categoria.slug || '';
      document.getElementById('cOrden').value = categoria.orden || 0;
      document.getElementById('cDestacada').checked = !!categoria.destacada;
      if (categoria.imagen) {
        document.getElementById('previewImagenCat').innerHTML = '<img src="' + categoria.imagen + '" alt="">';
      }
    } else {
      document.getElementById('drawerTituloCat').textContent = 'Nueva categoría';
    }

    drawer.hidden = false;
  }

  function cerrarDrawer() {
    drawer.hidden = true;
  }

  function guardarCategoria(e) {
    e.preventDefault();
    formError.hidden = true;

    var id = document.getElementById('cId').value;
    var formData = new FormData(form);

    ['destacada', 'eliminarImagen'].forEach(function (campo) {
      var checkbox = form.querySelector('[name="' + campo + '"]');
      if (checkbox && !checkbox.checked) formData.set(campo, 'false');
    });

    var url = id ? '/api/categorias/' + id : '/api/categorias';
    var method = id ? 'PUT' : 'POST';

    apiFetch(url, { method: method, body: formData })
      .then(function () {
        cerrarDrawer();
        showToast(id ? 'Categoría actualizada.' : 'Categoría creada.', 'ok');
        return cargarCategorias();
      })
      .catch(function (err) {
        formError.textContent = err.message;
        formError.hidden = false;
      });
  }

  function eliminarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    apiFetch('/api/categorias/' + id, { method: 'DELETE' })
      .then(function () {
        showToast('Categoría eliminada.', 'ok');
        return cargarCategorias();
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  tbody.addEventListener('click', function (e) {
    var btnEditar = e.target.closest('[data-editar]');
    var btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEditar) {
      var categoria = categorias.filter(function (c) { return String(c.id) === btnEditar.getAttribute('data-editar'); })[0];
      if (categoria) abrirDrawer(categoria);
    } else if (btnEliminar && !btnEliminar.disabled) {
      eliminarCategoria(btnEliminar.getAttribute('data-eliminar'));
    }
  });

  document.getElementById('btnNuevaCategoria').addEventListener('click', function () { abrirDrawer(null); });
  document.getElementById('btnCancelarCategoria').addEventListener('click', cerrarDrawer);
  document.getElementById('btnCerrarDrawerCat').addEventListener('click', cerrarDrawer);
  document.getElementById('drawerBackdropCat').addEventListener('click', cerrarDrawer);
  form.addEventListener('submit', guardarCategoria);

  cargarCategorias().catch(function (err) { showToast(err.message, 'error'); });
})();
