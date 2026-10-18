document.addEventListener('DOMContentLoaded', () => {
  const usuario = obtenerUsuarioActual();
  const infoUsuario = document.getElementById('info-usuario');
  if (usuario && infoUsuario) {
    infoUsuario.textContent = `${usuario.nombres} (${usuario.rol || ''}) `;
  }

  // Si estamos en catalogo.html
  if (document.getElementById('tabla-catalogo-body')) {
    cargarTarifaMulta();
    cargarCatalogo();

    document.getElementById('form-filtros-catalogo').addEventListener('submit', (e) => {
      e.preventDefault();
      cargarCatalogo();
    });
  }

  // Si estamos en mis-prestamos.html
  if (document.getElementById('tabla-mis-prestamos-body')) {
    cargarMisPrestamos();
    document.getElementById('btn-filtrar-mis-prestamos').addEventListener('click', cargarMisPrestamos);
  }
});

async function cargarTarifaMulta() {
  const banner = document.getElementById('banner-multa');
  const res = await peticionAPI('/multa', 'GET');
  if (res.ok && res.data) {
    banner.textContent = `Tarifa de multa vigente por día de retraso: $${res.data.valor_por_dia}`;
  } else {
    banner.textContent = 'Información de tarifa de multa no disponible.';
  }
}

async function cargarCatalogo() {
  const params = new URLSearchParams();
  const titulo = document.getElementById('filtro-titulo').value.trim();
  const autor = document.getElementById('filtro-autor').value.trim();
  const isbn = document.getElementById('filtro-isbn').value.trim();
  const categoria = document.getElementById('filtro-categoria').value.trim();
  const disponible = document.getElementById('filtro-disponible').checked;

  if (titulo) params.append('titulo', titulo);
  if (autor) params.append('autor', autor);
  if (isbn) params.append('isbn', isbn);
  if (categoria) params.append('categoria', categoria);
  if (disponible) params.append('disponible', 'true');

  const res = await peticionAPI(`/libros?${params.toString()}`, 'GET');
  const tbody = document.getElementById('tabla-catalogo-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((libro) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${libro.isbn}</td>
        <td>${libro.titulo}</td>
        <td>${libro.autores || '-'}</td>
        <td>${libro.categorias || '-'}</td>
        <td>${libro.anio_publicacion || '-'}</td>
        <td>${libro.ejemplares_disponibles} / ${libro.total_ejemplares}</td>
        <td>
          <button onclick="verEjemplaresLibro(${libro.id_libro}, '${libro.titulo.replace(/'/g, "\\'")}')">
            Ver Ejemplares
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    alert(res.error?.mensaje || 'Error al consultar el catálogo');
  }
}

async function verEjemplaresLibro(idLibro, titulo) {
  const res = await peticionAPI(`/libros/${idLibro}`, 'GET');
  const seccion = document.getElementById('seccion-ejemplares-libro');
  const tbody = document.getElementById('tabla-ejemplares-libro-body');
  document.getElementById('titulo-libro-seleccionado').textContent = `Ejemplares de: ${titulo}`;
  tbody.innerHTML = '';

  if (res.ok && res.data) {
    const ejemplares = res.data.ejemplares || [];
    ejemplares.forEach((ej) => {
      const boton = ej.estado === 'disponible'
        ? `<button onclick="solicitarPrestamo(${ej.id_ejemplar})">Solicitar Préstamo</button>`
        : `<span>No disponible</span>`;

      tbody.innerHTML += `
        <tr>
          <td>${ej.id_ejemplar}</td>
          <td>${ej.codigo_barras}</td>
          <td>${ej.sala}</td>
          <td>${ej.estante}</td>
          <td>${ej.estado}</td>
          <td>${boton}</td>
        </tr>
      `;
    });
    seccion.style.display = 'block';
  }
}

async function solicitarPrestamo(idEjemplar) {
  const res = await peticionAPI('/prestamos', 'POST', { id_ejemplar: idEjemplar });
  if (res.ok) {
    alert('Solicitud de préstamo registrada exitosamente.');
    document.getElementById('seccion-ejemplares-libro').style.display = 'none';
    cargarCatalogo();
  } else {
    alert(res.error?.mensaje || 'No se pudo solicitar el préstamo');
  }
}

async function cargarMisPrestamos() {
  const estado = document.getElementById('filtro-estado-mis-prestamos').value;
  const query = estado ? `?estado=${estado}` : '';
  const res = await peticionAPI(`/mis-prestamos${query}`, 'GET');
  const tbody = document.getElementById('tabla-mis-prestamos-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((p) => {
      tbody.innerHTML += `
        <tr>
          <td>${p.id_prestamo}</td>
          <td>${p.titulo || p.libro_titulo || '-'}</td>
          <td>${p.codigo_barras || p.id_ejemplar}</td>
          <td>${p.fecha_prestamo || p.fecha_solicitud || '-'}</td>
          <td>${p.fecha_vencimiento || '-'}</td>
          <td>${p.estado}</td>
          <td>$${p.valor_multa || 0}</td>
        </tr>
      `;
    });
  }
}