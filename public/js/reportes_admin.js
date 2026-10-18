document.addEventListener('DOMContentLoaded', () => {
  // Inicializar fechas por defecto para el reporte por periodo
  const hoy = new Date().toISOString().split('T')[0];
  const inicioAnio = `${new Date().getFullYear()}-01-01`;
  const inputDesde = document.getElementById('fecha-desde');
  const inputHasta = document.getElementById('fecha-hasta');
  if (inputDesde && !inputDesde.value) inputDesde.value = inicioAnio;
  if (inputHasta && !inputHasta.value) inputHasta.value = hoy;

  cargarReporteInventario();
  cargarReportePrestamosActivos();
  cargarReporteLibrosMasPrestados();
  cargarReporteUsuariosTop();

  document.getElementById('btn-cargar-activos').addEventListener('click', cargarReportePrestamosActivos);
  document.getElementById('btn-cargar-mas-prestados').addEventListener('click', cargarReporteLibrosMasPrestados);
});

async function cargarReporteInventario() {
  const res = await peticionAPI('/reportes/inventario', 'GET');
  const tbody = document.getElementById('tabla-reporte-inventario');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((item) => {
      tbody.innerHTML += `
        <tr>
          <td>${item.estado}</td>
          <td>${item.total || item.cantidad || 0}</td>
        </tr>
      `;
    });
  }
}

async function cargarReportePrestamosActivos() {
  const situacion = document.getElementById('filtro-situacion-activos').value;
  const query = situacion ? `?situacion=${situacion}` : '';
  const res = await peticionAPI(`/reportes/prestamos-activos${query}`, 'GET');
  const tbody = document.getElementById('tabla-reporte-activos');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((p) => {
      tbody.innerHTML += `
        <tr>
          <td>${p.id_prestamo}</td>
          <td>${p.usuario || p.nombres || '-'}</td>
          <td>${p.libro || p.titulo || '-'}</td>
          <td>${p.fecha_vencimiento || '-'}</td>
          <td>${p.situacion || '-'}</td>
        </tr>
      `;
    });
  }
}

async function cargarReporteLibrosMasPrestados() {
  const desde = document.getElementById('fecha-desde').value;
  const hasta = document.getElementById('fecha-hasta').value;
  if (!desde || !hasta) return;
  const params = new URLSearchParams();
  params.append('desde', desde);
  params.append('hasta', hasta);

  const res = await peticionAPI(`/reportes/libros-mas-prestados?${params.toString()}`, 'GET');
  const tbody = document.getElementById('tabla-reporte-libros');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((l) => {
      tbody.innerHTML += `
        <tr>
          <td>${l.id_libro}</td>
          <td>${l.titulo}</td>
          <td>${l.total_prestamos || l.cantidad || 0}</td>
        </tr>
      `;
    });
  }
}

async function cargarReporteUsuariosTop() {
  const res = await peticionAPI('/reportes/usuarios-top', 'GET');
  const tbody = document.getElementById('tabla-reporte-usuarios');
  tbody.innerHTML = '';

  if (res.ok && Array.isArray(res.data)) {
    res.data.forEach((u) => {
      tbody.innerHTML += `
        <tr>
          <td>${u.id_usuario}</td>
          <td>${u.nombres}</td>
          <td>${u.rol || '-'}</td>
          <td>${u.total_prestamos || u.cantidad || 0}</td>
        </tr>
      `;
    });
  }
}