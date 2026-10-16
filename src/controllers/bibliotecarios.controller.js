// Controlador para administración del personal bibliotecario (Solo Administrador)

const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuestas');

/**
 * Listado de miembros del personal de biblioteca
 * GET /api/bibliotecarios (Solo Administrador)
 */
const listarBibliotecarios = async (req, res) => {
  const sql = `
    SELECT id_bibliotecario, nombres, correo, rol, estado
    FROM bibliotecarios
    ORDER BY id_bibliotecario ASC;
  `;

  const resultado = await query(sql);
  return respuestaExito(res, resultado.rows);
};

/**
 * Registro de un nuevo bibliotecario o administrador
 * POST /api/bibliotecarios (Solo Administrador)
 */
const crearBibliotecario = async (req, res) => {
  const { nombres, correo, password, rol, estado } = req.body;

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const estadoFinal = estado ? estado.trim() : 'activo';

  const sql = `
    INSERT INTO bibliotecarios (nombres, correo, password_hash, rol, estado)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id_bibliotecario, nombres, correo, rol, estado;
  `;

  const valores = [
    nombres.trim(),
    correo.trim().toLowerCase(),
    passwordHash,
    rol,
    estadoFinal
  ];

  const resultado = await query(sql, valores);
  return respuestaExito(res, resultado.rows[0], 201);
};

/**
 * Cambiar el estado de un bibliotecario (activo | inactivo)
 * PATCH /api/bibliotecarios/:id/estado (Solo Administrador)
 */
const cambiarEstadoBibliotecario = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const idAdminActual = req.usuario.id;

  // Prevenir que el administrador autenticado desactive su propia cuenta
  if (parseInt(id, 10) === idAdminActual && estado === 'inactivo') {
    return respuestaError(
      res,
      'ACCION_NO_PERMITIDA',
      'No puede desactivar su propia cuenta de administrador en sesión.',
      null,
      400
    );
  }

  const sql = `
    UPDATE bibliotecarios
    SET estado = $1
    WHERE id_bibliotecario = $2
    RETURNING id_bibliotecario, nombres, correo, rol, estado;
  `;

  const resultado = await query(sql, [estado, id]);

  if (resultado.rowCount === 0) {
    return respuestaError(res, 'PERSONAL_NO_ENCONTRADO', 'El miembro del personal solicitado no existe.', null, 404);
  }

  return respuestaExito(res, resultado.rows[0]);
};

module.exports = {
  listarBibliotecarios,
  crearBibliotecario,
  cambiarEstadoBibliotecario
};
