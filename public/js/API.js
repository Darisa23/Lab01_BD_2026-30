// frontend/js/API.js - Archivo base compartido por los integrantes

/**
 * Determina dinámicamente la URL base del Backend:
 * - En producción (Vercel) o cuando se sirve en el mismo host/puerto: utiliza la ruta relativa '/api'.
 * - En desarrollo local desacoplado (Live Server, VSCode en puerto 5500, etc.): utiliza 'http://localhost:3000/api'.
 */
const obtenerBaseUrl = () => {
  if (window.API_URL) {
    return window.API_URL;
  }
  if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
    return 'http://localhost:3000/api';
  }
  return '/api';
};

const API_BASE_URL = obtenerBaseUrl();

/**
 * Función general para comunicarse con el Backend.
 * @param {string} endpoint - Ejemplo: '/libros' o '/auth/login'
 * @param {string} metodo - 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
 * @param {object|null} body - Objeto con los datos a enviar (opcional)
 */
async function peticionAPI(endpoint, metodo = 'GET', body = null) {
  const token = localStorage.getItem('token');

  const opciones = {
    method: metodo,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Si existe un token de sesión guardado, se adjunta automáticamente
  if (token) {
    opciones.headers['Authorization'] = `Bearer ${token}`;
  }

  // Convierte el objeto de datos a texto JSON si la petición lo requiere
  if (body) {
    opciones.body = JSON.stringify(body);
  }

  try {
    const respuesta = await fetch(`${API_BASE_URL}${endpoint}`, opciones);
    const resultado = await respuesta.json();
    return resultado; // Retorna { ok: true, data: ... } o { ok: false, error: ... }
  } catch (error) {
    console.error('Error conectando con el backend:', error);
    return {
      ok: false,
      error: {
        mensaje: 'No se pudo conectar con el servidor Backend. Verifica tu conexión de red o que el servidor esté activo.'
      }
    };
  }
}

/**
 * Obtiene los datos del usuario actual autenticado guardados en el almacenamiento local.
 * @returns {object|null}
 */
function obtenerUsuarioActual() {
  try {
    const datos = localStorage.getItem('usuario');
    return datos ? JSON.parse(datos) : null;
  } catch (error) {
    console.error('Error al parsear usuario de localStorage:', error);
    return null;
  }
}

// Función global para cerrar sesión y limpiar credenciales
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('tipo_cuenta');
  window.location.href = 'index.html';
}
