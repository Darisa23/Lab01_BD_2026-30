document.addEventListener('DOMContentLoaded', () => {
  consultarTarifaActual();
  cargarPrestamosAdmin();
  cargarDevolucionesAdmin();

  document.getElementById('btn-filtrar-prestamos').addEventListener('click', cargarPrestamosAdmin);
  document.getElementById('form-prestamo-directo').addEventListener('submit', crearPrestamoDirecto);
  document.getElementById('form-actualizar-multa').addEventListener('submit', actualizarTarifaMulta);
});

async function consultarTarifaActual() {
  const res = await peticionAPI('/multa', 'GET');
  const txt = document.getElementById('texto-tarifa-actual');
  if (res.ok && res.data) {
    txt.textContent = `Tarifa activa actual: $${res.data.valor_por_dia} por día de retraso.`;
  }
}

async function actualizarTarifaMulta(e) {
  e.preventDefault();
  const valor = Number(document.getElementById('nuevo-valor-multa').value);
  const res = await peticionAPI('/multa', 'POST', { valor_por_dia: valor });
  if (res.ok) {
    alert('Tarifa de multa actualizada.');
    document.getElementById('form-actualizar-multa').reset();
    consultarTarifaActual();
  } else {
    alert(res.error?.mensaje || 'Error al actualizar la tarifa');
  }
}

async function crearPrestamoDirecto(e) {
  e.preventDefault();
  const payload = {
    id_usuario: Number(document.getElementById('directo-id-usuario').value),
    id_ejemplar: Number(document.getElementById('directo-id-ejemplar').value)
  };

  const res = await peticionAPI('/prestamos/directo', 'POST', payload);
  if (res.ok) {
    alert('Préstamo directo registrado y aprobado.');
    document.getElementById('form-prestamo-directo').reset();
    cargarPrestamosAdmin();
  } else {
    alert(res.error?.mensaje || 'No se pudo realizar el préstamo directo');
  }
}

async function cargarPrestamosAdmin() {
  const estado = document.getElementById('filtro-estado-prestamos').value;
  const query = estado ? `?estado=${estado}` : '';
  const res = await peticionAPI(`/prestamos${query}`, 'GET');
  const tbody = document.getElementById('tabla-admin-prestamos-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((p) => {
      let botones = '';
      if (p.estado === 'solicitado') {
        botones = `
          <button onclick="aprobarPrestamo(${p.id_prestamo})">Aprobar</button>
          <button class="peligro" onclick="rechazarPrestamo(${p.id_prestamo})">Rechazar</button>
        `;
      } else if (p.estado === 'aprobado') {
        botones = `
          <button onclick="registrarDevolucion(${p.id_prestamo})">Recibir Devolución</button>
          <button class="peligro" onclick="marcarPrestamoPerdido(${p.id_prestamo})">Marcar Perdido</button>
        `;
      }

      tbody.innerHTML += `
        <tr>
          <td>${p.id_prestamo}</td>
          <td>${p.nombres || p.id_usuario}</td>
          <td>${p.titulo || ''} (Ejemplar #${p.id_ejemplar})</td>
          <td>Préstamo: ${p.fecha_prestamo || '-'}<br>Vence: ${p.fecha_vencimiento || '-'}</td>
          <td>${p.estado}</td>
          <td>${botones}</td>
        </tr>
      `;
    });
  }
}

async function aprobarPrestamo(id) {
  const res = await peticionAPI(`/prestamos/${id}/aprobar`, 'PATCH');
  if (res.ok) {
    cargarPrestamosAdmin();
  } else {
    alert(res.error?.mensaje || 'Error al aprobar préstamo');
  }
}

async function rechazarPrestamo(id) {
  const motivo = prompt('Indica el motivo del rechazo:');
  if (!motivo) return;
  const res = await peticionAPI(`/prestamos/${id}/rechazar`, 'PATCH', { motivo_rechazo: motivo });
  if (res.ok) {
    cargarPrestamosAdmin();
  } else {
    alert(res.error?.mensaje || 'Error al rechazar préstamo');
  }
}

async function marcarPrestamoPerdido(id) {
  if (!confirm('¿Marcar este préstamo y su ejemplar como PERDIDO?')) return;
  const res = await peticionAPI(`/prestamos/${id}/perdido`, 'PATCH');
  if (res.ok) {
    cargarPrestamosAdmin();
  } else {
    alert(res.error?.mensaje || 'Error al marcar como perdido');
  }
}

async function registrarDevolucion(idPrestamo) {
  const danado = confirm('¿El ejemplar fue entregado DAÑADO? (Aceptar = Sí / Cancelar = No)');
  const paginasFaltantes = confirm('¿El ejemplar tiene PÁGINAS FALTANTES? (Aceptar = Sí / Cancelar = No)');
  const observaciones = prompt('Observaciones de la devolución:', 'Entregado en buen estado') || '';

  const res = await peticionAPI(`/prestamos/${idPrestamo}/devolucion`, 'POST', {
    danado,
    paginas_faltantes: paginasFaltantes,
    observaciones
  });

  if (res.ok) {
    alert(`Devolución registrada. Días de retraso: ${res.data.dias_retraso}. Multa: $${res.data.valor_multa}`);
    cargarPrestamosAdmin();
    cargarDevolucionesAdmin();
  } else {
    alert(res.error?.mensaje || 'Error al registrar devolución');
  }
}

async function cargarDevolucionesAdmin() {
  const res = await peticionAPI('/devoluciones', 'GET');
  const tbody = document.getElementById('tabla-devoluciones-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((d) => {
      tbody.innerHTML += `
        <tr>
          <td>${d.id_devolucion}</td>
          <td>${d.id_prestamo}</td>
          <td>${d.fecha_devolucion}</td>
          <td>${d.dias_retraso}</td>
          <td>$${d.valor_multa}</td>
          <td>Dañado: ${d.danado ? 'Sí' : 'No'} | Hojas faltantes: ${d.paginas_faltantes ? 'Sí' : 'No'} (${d.observaciones || ''})</td>
        </tr>
      `;
    });
  }
}