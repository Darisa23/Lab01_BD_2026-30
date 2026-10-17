// frontend/js/api.js - Archivo base compartido por los 3 integrantes
const API_BASE_URL = 'http://localhost:3000/api';

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
        mensaje: 'No se pudo conectar con el servidor Backend (verifica que esté encendido en el puerto 3000).'
      }
    };
  }
}

// Función global para cerrar sesión y limpiar credenciales
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}
