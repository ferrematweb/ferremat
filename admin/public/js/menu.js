(function () {
  'use strict';

  var apiFetch = window.Admin.apiFetch;
  var showToast = window.Admin.showToast;
  var escapeHtml = window.Admin.escapeHtml;

  var items = [];
  var tbody = document.getElementById('tbodyMenu');
  var drawer = document.getElementById('drawerItem');
  var form = document.getElementById('formItem');
  var formError = document.getElementById('formItemError');

  function cargarItems() {
    return apiFetch('/api/menu?todos=true').then(function (data) {
      items = data;
      renderTabla();
    });
  }

  function renderTabla() {
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table__empty">No hay ítems de menú todavía.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (item) {
      return (
        '<tr>' +
        '<td>' + item.orden + '</td>' +
        '<td>' + escapeHtml(item.nombre) + '</td>' +
        '<td><code>' + escapeHtml(item.enlace) + '</code></td>' +
        '<td>' + (item.visible ? '<span class="badge badge--ok">Visible</span>' : '<span class="badge badge--off">Oculto</span>') + '</td>' +
        '<td class="table__actions">' +
        '<button type="button" class="btn btn--small" data-editar="' + item.id + '">Editar</button>' +
        '<button type="button" class="btn btn--small btn--danger" data-eliminar="' + item.id + '">Eliminar</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function abrirDrawer(item) {
    formError.hidden = true;
    form.reset();
    document.getElementById('mId').value = '';

    if (item) {
      document.getElementById('drawerTituloItem').textContent = 'Editar ítem de menú';
      document.getElementById('mId').value = item.id;
      document.getElementById('mNombre').value = item.nombre || '';
      document.getElementById('mEnlace').value = item.enlace || '';
      document.getElementById('mOrden').value = item.orden || 0;
      document.getElementById('mVisible').checked = !!item.visible;
    } else {
      document.getElementById('drawerTituloItem').textContent = 'Nuevo ítem de menú';
      document.getElementById('mVisible').checked = true;
    }

    drawer.hidden = false;
  }

  function cerrarDrawer() {
    drawer.hidden = true;
  }

  function guardarItem(e) {
    e.preventDefault();
    formError.hidden = true;

    var id = document.getElementById('mId').value;
    var payload = {
      nombre: document.getElementById('mNombre').value,
      enlace: document.getElementById('mEnlace').value,
      orden: Number(document.getElementById('mOrden').value || 0),
      visible: document.getElementById('mVisible').checked
    };

    var url = id ? '/api/menu/' + id : '/api/menu';
    var method = id ? 'PUT' : 'POST';

    apiFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function () {
        cerrarDrawer();
        showToast(id ? 'Ítem actualizado.' : 'Ítem creado.', 'ok');
        return cargarItems();
      })
      .catch(function (err) {
        formError.textContent = err.message;
        formError.hidden = false;
      });
  }

  function eliminarItem(id) {
    if (!confirm('¿Eliminar este ítem del menú?')) return;
    apiFetch('/api/menu/' + id, { method: 'DELETE' })
      .then(function () {
        showToast('Ítem eliminado.', 'ok');
        return cargarItems();
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  tbody.addEventListener('click', function (e) {
    var btnEditar = e.target.closest('[data-editar]');
    var btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEditar) {
      var item = items.filter(function (i) { return String(i.id) === btnEditar.getAttribute('data-editar'); })[0];
      if (item) abrirDrawer(item);
    } else if (btnEliminar) {
      eliminarItem(btnEliminar.getAttribute('data-eliminar'));
    }
  });

  document.getElementById('btnNuevoItem').addEventListener('click', function () { abrirDrawer(null); });
  document.getElementById('btnCancelarItem').addEventListener('click', cerrarDrawer);
  document.getElementById('btnCerrarDrawerItem').addEventListener('click', cerrarDrawer);
  document.getElementById('drawerBackdropItem').addEventListener('click', cerrarDrawer);
  form.addEventListener('submit', guardarItem);

  cargarItems().catch(function (err) { showToast(err.message, 'error'); });
})();
