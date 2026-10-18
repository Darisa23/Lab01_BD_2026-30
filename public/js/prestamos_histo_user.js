// frontend/js/prestamos_histo_user.js - Historial personal de préstamos del lector

document.addEventListener('DOMContentLoaded', () => {
  const usuario = obtenerUsuarioActual();
  const infoUsuario = document.getElementById('info-usuario');
  if (usuario && infoUsuario) {
    infoUsuario.textContent = `${usuario.nombres} (${usuario.rol || ''}) `;
  }

  cargarMisPrestamos();
  const btnFiltrar = document.getElementById('btn-filtrar-mis-prestamos');
  if (btnFiltrar) {
    btnFiltrar.addEventListener('click', cargarMisPrestamos);
  }
});

async function cargarMisPrestamos() {
  const selectEstado = document.getElementById('filtro-estado-mis-prestamos');
  const estado = selectEstado ? selectEstado.value : '';
  const query = estado ? `?estado=${estado}` : '';

  const res = await peticionAPI(`/mis-prestamos${query}`, 'GET');
  const tbody = document.getElementById('tabla-mis-prestamos-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">No tienes préstamos registrados.</td></tr>';
      return;
    }

    res.data.forEach((p) => {
      tbody.innerHTML += `
        <tr>
          <td>${p.id_prestamo}</td>
          <td>${p.titulo || p.libro_titulo || '-'}</td>
          <td>${p.ejemplar || p.codigo_barras || p.id_ejemplar}</td>
          <td>${p.fecha_prestamo || p.fecha_solicitud || '-'}</td>
          <td>${p.fecha_vencimiento || '-'}</td>
          <td><span class="badge estado-${p.estado}">${p.estado}</span></td>
          <td>$${p.valor_multa || 0}</td>
        </tr>
      `;
    });
  } else {
    alert(res.error?.mensaje || 'No se pudo cargar el historial de préstamos.');
  }
}
