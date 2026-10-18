document.addEventListener('DOMContentLoaded', () => {
  listarLibrosAdmin();
  listarEjemplaresAdmin();

  document.getElementById('form-libro').addEventListener('submit', guardarLibro);
  document.getElementById('form-ejemplar').addEventListener('submit', guardarEjemplar);
});

async function listarLibrosAdmin() {
  const res = await peticionAPI('/libros?limit=50', 'GET');
  const tbody = document.getElementById('tabla-admin-libros-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((l) => {
      tbody.innerHTML += `
        <tr>
          <td>${l.id_libro}</td>
          <td>${l.isbn}</td>
          <td>${l.titulo}</td>
          <td>${l.autores || '-'}</td>
          <td>${l.ejemplares_disponibles} / ${l.total_ejemplares}</td>
          <td>
            <button class="peligro" onclick="eliminarLibro(${l.id_libro})">Eliminar</button>
          </td>
        </tr>
      `;
    });
  }
}

async function guardarLibro(e) {
  e.preventDefault();
  const idLibro = document.getElementById('libro-id').value;
  const payload = {
    isbn: document.getElementById('libro-isbn').value.trim(),
    titulo: document.getElementById('libro-titulo').value.trim(),
    editorial: document.getElementById('libro-editorial').value.trim(),
    anio_publicacion: Number(document.getElementById('libro-anio').value),
    descripcion: document.getElementById('libro-descripcion').value.trim(),
    autores: document.getElementById('libro-autores').value.split(',').map(a => a.trim()).filter(Boolean),
    categorias: document.getElementById('libro-categorias').value.split(',').map(c => c.trim()).filter(Boolean)
  };

  const endpoint = idLibro ? `/libros/${idLibro}` : '/libros';
  const metodo = idLibro ? 'PUT' : 'POST';

  const res = await peticionAPI(endpoint, metodo, payload);
  if (res.ok) {
    alert('Libro guardado correctamente.');
    document.getElementById('form-libro').reset();
    document.getElementById('libro-id').value = '';
    listarLibrosAdmin();
  } else {
    alert(res.error?.mensaje || 'Error al guardar el libro');
  }
}

async function eliminarLibro(id) {
  if (!confirm('¿Seguro que deseas eliminar este libro?')) return;
  const res = await peticionAPI(`/libros/${id}`, 'DELETE');
  if (res.ok) {
    listarLibrosAdmin();
  } else {
    alert(res.error?.mensaje || 'No se pudo eliminar el libro');
  }
}

async function listarEjemplaresAdmin() {
  const res = await peticionAPI('/ejemplares?limit=50', 'GET');
  const tbody = document.getElementById('tabla-admin-ejemplares-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((ej) => {
      const nuevoEstado = ej.estado === 'disponible' ? 'perdido' : 'disponible';
      tbody.innerHTML += `
        <tr>
          <td>${ej.id_ejemplar}</td>
          <td>${ej.id_libro} - ${ej.titulo || ''}</td>
          <td>${ej.codigo_barras}</td>
          <td>Sala ${ej.sala} - Estante ${ej.estante}</td>
          <td>${ej.estado}</td>
          <td>
            <button class="secundario" onclick="cambiarEstadoEjemplar(${ej.id_ejemplar}, '${nuevoEstado}')">
              Marcar ${nuevoEstado}
            </button>
            <button class="peligro" onclick="eliminarEjemplar(${ej.id_ejemplar})">Eliminar</button>
          </td>
        </tr>
      `;
    });
  }
}

async function guardarEjemplar(e) {
  e.preventDefault();
  const payload = {
    id_libro: Number(document.getElementById('ejemplar-id-libro').value),
    codigo_barras: document.getElementById('ejemplar-codigo').value.trim(),
    sala: document.getElementById('ejemplar-sala').value.trim(),
    estante: document.getElementById('ejemplar-estante').value.trim(),
    estado: document.getElementById('ejemplar-estado').value
  };

  const res = await peticionAPI('/ejemplares', 'POST', payload);
  if (res.ok) {
    alert('Ejemplar registrado.');
    document.getElementById('form-ejemplar').reset();
    listarEjemplaresAdmin();
    listarLibrosAdmin();
  } else {
    alert(res.error?.mensaje || 'Error al registrar ejemplar');
  }
}

async function cambiarEstadoEjemplar(id, estado) {
  const res = await peticionAPI(`/ejemplares/${id}/estado`, 'PATCH', { estado });
  if (res.ok) {
    listarEjemplaresAdmin();
    listarLibrosAdmin();
  } else {
    alert(res.error?.mensaje || 'No se pudo cambiar el estado');
  }
}

async function eliminarEjemplar(id) {
  if (!confirm('¿Eliminar este ejemplar físico?')) return;
  const res = await peticionAPI(`/ejemplares/${id}`, 'DELETE');
  if (res.ok) {
    listarEjemplaresAdmin();
    listarLibrosAdmin();
  } else {
    alert(res.error?.mensaje || 'No se pudo eliminar el ejemplar');
  }
}