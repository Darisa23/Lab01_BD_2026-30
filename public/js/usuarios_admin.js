document.addEventListener('DOMContentLoaded', () => {
  cargarUsuarios();
  cargarBibliotecarios();

  document.getElementById('btn-buscar-usuarios').addEventListener('click', cargarUsuarios);
  document.getElementById('form-admin-usuario').addEventListener('submit', crearUsuarioLector);
  document.getElementById('form-admin-bibliotecario').addEventListener('submit', crearBibliotecario);
});

async function cargarUsuarios() {
  const q = document.getElementById('busqueda-usuarios').value.trim();
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await peticionAPI(`/usuarios${query}`, 'GET');
  const tbody = document.getElementById('tabla-usuarios-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((u) => {
      const nuevoEstado = u.estado === 'activo' ? 'bloqueado' : 'activo';
      tbody.innerHTML += `
        <tr>
          <td>${u.id_usuario}</td>
          <td>${u.codigo}</td>
          <td>${u.nombres}</td>
          <td>${u.correo}</td>
          <td>${u.rol}</td>
          <td>${u.estado}</td>
          <td>
            <button onclick="cambiarEstadoUsuario(${u.id_usuario}, '${nuevoEstado}')">
              ${nuevoEstado === 'bloqueado' ? 'Bloquear' : 'Desbloquear'}
            </button>
            <button class="secundario" onclick="verHistorialUsuario(${u.id_usuario}, '${u.nombres.replace(/'/g, "\\'")}')">
              Historial
            </button>
            <button class="peligro" onclick="eliminarUsuario(${u.id_usuario})">Eliminar</button>
          </td>
        </tr>
      `;
    });
  }
}

async function crearUsuarioLector(e) {
  e.preventDefault();
  const payload = {
    codigo: document.getElementById('usr-codigo').value.trim(),
    identificacion: document.getElementById('usr-identificacion').value.trim(),
    nombres: document.getElementById('usr-nombres').value.trim(),
    correo: document.getElementById('usr-correo').value.trim(),
    password: document.getElementById('usr-password').value,
    rol: document.getElementById('usr-rol').value,
    carrera: document.getElementById('usr-carrera').value.trim() || undefined
  };

  const res = await peticionAPI('/usuarios', 'POST', payload);
  if (res.ok) {
    alert('Lector creado correctamente.');
    document.getElementById('form-admin-usuario').reset();
    cargarUsuarios();
  } else {
    alert(res.error?.mensaje || 'Error al crear lector');
  }
}

async function cambiarEstadoUsuario(id, estado) {
  const res = await peticionAPI(`/usuarios/${id}/estado`, 'PATCH', { estado });
  if (res.ok) {
    cargarUsuarios();
  } else {
    alert(res.error?.mensaje || 'No se pudo actualizar el estado');
  }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este lector?')) return;
  const res = await peticionAPI(`/usuarios/${id}`, 'DELETE');
  if (res.ok) {
    cargarUsuarios();
  } else {
    alert(res.error?.mensaje || 'No se pudo eliminar el lector');
  }
}

async function verHistorialUsuario(id, nombres) {
  const res = await peticionAPI(`/usuarios/${id}/historial`, 'GET');
  const seccion = document.getElementById('seccion-historial-lector');
  const tbody = document.getElementById('tabla-historial-lector-body');
  document.getElementById('titulo-historial-lector').textContent = `Historial de: ${nombres}`;
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((h) => {
      tbody.innerHTML += `
        <tr>
          <td>${h.id_prestamo}</td>
          <td>${h.titulo || '-'}</td>
          <td>${h.fecha_prestamo || '-'}</td>
          <td>${h.fecha_vencimiento || '-'}</td>
          <td>${h.estado}</td>
        </tr>
      `;
    });
    seccion.style.display = 'block';
  }
}

async function cargarBibliotecarios() {
  const res = await peticionAPI('/bibliotecarios', 'GET');
  const tbody = document.getElementById('tabla-bibliotecarios-body');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((b) => {
      const id = b.id_bibliotecario;
      const nuevoEstado = b.estado === 'activo' ? 'inactivo' : 'activo';
      tbody.innerHTML += `
        <tr>
          <td>${id}</td>
          <td>${b.nombres}</td>
          <td>${b.correo}</td>
          <td>${b.rol}</td>
          <td>${b.estado}</td>
          <td>
            <button onclick="cambiarEstadoBibliotecario(${id}, '${nuevoEstado}')">
              Pasar a ${nuevoEstado}
            </button>
          </td>
        </tr>
      `;
    });
  }
}

async function crearBibliotecario(e) {
  e.preventDefault();
  const payload = {
    nombres: document.getElementById('bib-nombres').value.trim(),
    correo: document.getElementById('bib-correo').value.trim(),
    password: document.getElementById('bib-password').value,
    rol: document.getElementById('bib-rol').value
  };

  const res = await peticionAPI('/bibliotecarios', 'POST', payload);
  if (res.ok) {
    alert('Personal registrado exitosamente.');
    document.getElementById('form-admin-bibliotecario').reset();
    cargarBibliotecarios();
  } else {
    alert(res.error?.mensaje || 'No autorizado o error al registrar personal');
  }
}

async function cambiarEstadoBibliotecario(id, estado) {
  const res = await peticionAPI(`/bibliotecarios/${id}/estado`, 'PATCH', { estado });
  if (res.ok) {
    cargarBibliotecarios();
  } else {
    alert(res.error?.mensaje || 'No se pudo cambiar el estado del personal');
  }
}