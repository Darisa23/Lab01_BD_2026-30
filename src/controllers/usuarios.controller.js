// Controlador para la gestión de usuarios lectores e historial de préstamos

const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { query } = require('../config/db');
const { respuestaExito, respuestaPaginada, respuestaError } = require('../utils/respuestas');
const { obtenerParametrosPaginacion, construirMetaPaginacion } = require('../utils/paginacion');

/**
 * Listado de usuarios con filtros (búsqueda general, rol, estado) y paginación
 * GET /api/usuarios (Personal)
 */
const listarUsuarios = async (req, res) => {
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);
  const { q, rol, estado } = req.query;

  const condiciones = [];
  const valores = [];
  let paramIndex = 1;

  if (q && q.trim() !== '') {
    const patron = `%${q.trim()}%`;
    condiciones.push(`(nombres ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex} OR identificacion ILIKE $${paramIndex} OR correo ILIKE $${paramIndex})`);
    valores.push(patron);
    paramIndex++;
  }

  if (rol && ['estudiante', 'docente'].includes(rol.trim())) {
    condiciones.push(`rol = $${paramIndex}`);
    valores.push(rol.trim());
    paramIndex++;
  }

  if (estado && ['activo', 'bloqueado'].includes(estado.trim())) {
    condiciones.push(`estado = $${paramIndex}`);
    valores.push(estado.trim());
    paramIndex++;
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  // Conteo total
  const countSql = `SELECT COUNT(*) AS total FROM usuarios ${whereClause};`;
  const countRes = await query(countSql, valores);
  const total = countRes.rows[0].total;

  // Consulta paginada (NUNCA devolver password_hash)
  const dataSql = `
    SELECT id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado
    FROM usuarios
    ${whereClause}
    ORDER BY nombres ASC, id_usuario ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const dataRes = await query(dataSql, [...valores, limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

/**
 * Obtener un usuario por su ID
 * GET /api/usuarios/:id (Personal)
 */
const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado
    FROM usuarios
    WHERE id_usuario = $1;
  `;

  const resultado = await query(sql, [id]);

  if (resultado.rowCount === 0) {
    return respuestaError(res, 'USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.', null, 404);
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Creación administrativa de un usuario (permite especificar estado inicial)
 * POST /api/usuarios (Personal)
 */
const crearUsuario = async (req, res) => {
  const { codigo, identificacion, nombres, correo, password, rol, carrera, estado } = req.body;

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const estadoFinal = estado ? estado.trim() : 'activo';

  const sql = `
    INSERT INTO usuarios (codigo, identificacion, nombres, correo, password_hash, rol, carrera, estado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado;
  `;

  const valores = [
    codigo.trim(),
    identificacion.trim(),
    nombres.trim(),
    correo.trim().toLowerCase(),
    passwordHash,
    rol,
    carrera ? carrera.trim() : null,
    estadoFinal
  ];

  const resultado = await query(sql, valores);
  return respuestaExito(res, resultado.rows[0], 201);
};

/**
 * Actualizar datos de un usuario (password opcional; si viene se rehashea)
 * PUT /api/usuarios/:id (Personal)
 */
const actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { codigo, identificacion, nombres, correo, password, rol, carrera, estado } = req.body;

  // 1. Verificar si el usuario existe
  const usuarioActual = await query('SELECT id_usuario, password_hash FROM usuarios WHERE id_usuario = $1;', [id]);
  if (usuarioActual.rowCount === 0) {
    return respuestaError(res, 'USUARIO_NO_ENCONTRADO', 'El usuario a actualizar no existe.', null, 404);
  }

  // 2. Determinar hash de contraseña (actualizar o mantener)
  let nuevoHash = usuarioActual.rows[0].password_hash;
  if (password && password.trim().length > 0) {
    nuevoHash = await bcrypt.hash(password.trim(), env.BCRYPT_ROUNDS);
  }

  const sql = `
    UPDATE usuarios
    SET codigo = $1, identificacion = $2, nombres = $3, correo = $4,
        password_hash = $5, rol = $6, carrera = $7, estado = $8
    WHERE id_usuario = $9
    RETURNING id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado;
  `;

  const valores = [
    codigo.trim(),
    identificacion.trim(),
    nombres.trim(),
    correo.trim().toLowerCase(),
    nuevoHash,
    rol,
    carrera ? carrera.trim() : null,
    estado,
    id
  ];

  const resultado = await query(sql, valores);
  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Cambiar el estado de un usuario (activo | bloqueado)
 * PATCH /api/usuarios/:id/estado (Personal)
 */
const cambiarEstadoUsuario = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const sql = `
    UPDATE usuarios
    SET estado = $1
    WHERE id_usuario = $2
    RETURNING id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado;
  `;

  const resultado = await query(sql, [estado, id]);

  if (resultado.rowCount === 0) {
    return respuestaError(res, 'USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.', null, 404);
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Eliminar un usuario (Regla 10: 409 con sugerencia de bloqueo si tiene préstamos)
 * DELETE /api/usuarios/:id (Personal)
 */
const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  // Si tiene préstamos asociados, la restricción ON DELETE RESTRICT lanzará error 23503
  // que nuestro manejador traduce en HTTP 409 sugiriendo cambiar el estado a 'bloqueado'.
  const sql = 'DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario;';
  const resultado = await query(sql, [id]);

  if (resultado.rowCount === 0) {
    return respuestaError(res, 'USUARIO_NO_ENCONTRADO', 'El usuario a eliminar no existe.', null, 404);
  }

  return respuestaExito(res, {
    mensaje: `Usuario con ID ${id} eliminado exitosamente.`
  });
};

/**
 * Consultar el historial de préstamos de un usuario específico desde v_historial_prestamos_usuario
 * GET /api/usuarios/:id/historial (Personal)
 */
const obtenerHistorialUsuario = async (req, res) => {
  const { id } = req.params;
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);

  // Verificar que el usuario exista
  const existe = await query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1;', [id]);
  if (existe.rowCount === 0) {
    return respuestaError(res, 'USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.', null, 404);
  }

  // Conteo total en el historial
  const countSql = 'SELECT COUNT(*) AS total FROM v_historial_prestamos_usuario WHERE id_usuario = $1;';
  const countRes = await query(countSql, [id]);
  const total = countRes.rows[0].total;

  // Registros paginados de la vista
  const dataSql = `
    SELECT id_usuario, id_prestamo, titulo, ejemplar, fecha_solicitud,
           fecha_prestamo, fecha_vencimiento, fecha_devolucion, estado,
           dias_retraso, valor_multa
    FROM v_historial_prestamos_usuario
    WHERE id_usuario = $1
    ORDER BY fecha_solicitud DESC
    LIMIT $2 OFFSET $3;
  `;

  const dataRes = await query(dataSql, [id, limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

/**
 * Consultar el propio historial de préstamos del usuario autenticado
 * GET /api/mis-prestamos (Usuario: estudiante / docente)
 */
const obtenerMisPrestamos = async (req, res) => {
  const idUsuario = req.usuario.id;
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);
  const { estado } = req.query;

  const condiciones = ['id_usuario = $1'];
  const valores = [idUsuario];
  let paramIndex = 2;

  if (estado && estado.trim() !== '') {
    condiciones.push(`estado = $${paramIndex}`);
    valores.push(estado.trim());
    paramIndex++;
  }

  const whereClause = `WHERE ${condiciones.join(' AND ')}`;

  const countSql = `SELECT COUNT(*) AS total FROM v_historial_prestamos_usuario ${whereClause};`;
  const countRes = await query(countSql, valores);
  const total = countRes.rows[0].total;

  const dataSql = `
    SELECT id_usuario, id_prestamo, titulo, ejemplar, fecha_solicitud,
           fecha_prestamo, fecha_vencimiento, fecha_devolucion, estado,
           dias_retraso, valor_multa
    FROM v_historial_prestamos_usuario
    ${whereClause}
    ORDER BY fecha_solicitud DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const dataRes = await query(dataSql, [...valores, limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario,
  obtenerHistorialUsuario,
  obtenerMisPrestamos
};
