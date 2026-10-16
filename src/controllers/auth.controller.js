// Controlador de autenticación: registro, login de usuarios, login de personal y perfil /me

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuestas');

/**
 * Genera un token JWT para la sesión.
 * @param {object} payload - { id, tipo, rol }
 * @returns {string} Token firmado
 */
const generarToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
};

/**
 * Registro público de usuarios (estudiantes o docentes)
 * POST /api/auth/registro
 */
const registrarUsuario = async (req, res) => {
  const { codigo, identificacion, nombres, correo, password, rol, carrera } = req.body;

  // Hashear contraseña con los rounds configurados en las variables de entorno
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  // El estado siempre se fuerza a 'activo' en el registro público
  const sql = `
    INSERT INTO usuarios (codigo, identificacion, nombres, correo, password_hash, rol, carrera, estado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo')
    RETURNING id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado;
  `;

  const valores = [
    codigo.trim(),
    identificacion.trim(),
    nombres.trim(),
    correo.trim().toLowerCase(),
    passwordHash,
    rol,
    carrera ? carrera.trim() : null
  ];

  const resultado = await query(sql, valores);
  const nuevoUsuario = resultado.rows[0];

  // Generar token JWT automático tras el registro
  const token = generarToken({
    id: nuevoUsuario.id_usuario,
    tipo: 'usuario',
    rol: nuevoUsuario.rol
  });

  return respuestaExito(
    res,
    {
      token,
      usuario: nuevoUsuario
    },
    201
  );
};

/**
 * Inicio de sesión de usuarios (estudiantes o docentes)
 * POST /api/auth/login
 */
const loginUsuario = async (req, res) => {
  const { correo, password } = req.body;

  const sql = `
    SELECT id_usuario, codigo, identificacion, nombres, correo, password_hash, rol, carrera, estado
    FROM usuarios
    WHERE LOWER(correo) = LOWER($1);
  `;

  const resultado = await query(sql, [correo.trim()]);

  if (resultado.rowCount === 0) {
    return respuestaError(
      res,
      'CREDENCIALES_INVALIDAS',
      'Correo electrónico o contraseña incorrectos.',
      null,
      401
    );
  }

  const usuario = resultado.rows[0];

  // Comprobar contraseña con bcrypt
  const passwordValido = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValido) {
    return respuestaError(
      res,
      'CREDENCIALES_INVALIDAS',
      'Correo electrónico o contraseña incorrectos.',
      null,
      401
    );
  }

  // Nota: Un usuario 'bloqueado' sí puede iniciar sesión según regla 5,
  // los triggers de la BD impedirán la creación de préstamos.

  const token = generarToken({
    id: usuario.id_usuario,
    tipo: 'usuario',
    rol: usuario.rol
  });

  // NUNCA devolver password_hash en la respuesta
  const { password_hash, ...datosUsuario } = usuario;

  return respuestaExito(res, {
    token,
    usuario: datosUsuario
  });
};

/**
 * Inicio de sesión para personal de la biblioteca (bibliotecarios y administradores)
 * POST /api/auth/login-personal
 */
const loginPersonal = async (req, res) => {
  const { correo, password } = req.body;

  const sql = `
    SELECT id_bibliotecario, nombres, correo, password_hash, rol, estado
    FROM bibliotecarios
    WHERE LOWER(correo) = LOWER($1);
  `;

  const resultado = await query(sql, [correo.trim()]);

  if (resultado.rowCount === 0) {
    return respuestaError(
      res,
      'CREDENCIALES_INVALIDAS',
      'Correo electrónico o contraseña incorrectos.',
      null,
      401
    );
  }

  const personal = resultado.rows[0];

  // Comprobar contraseña con bcrypt
  const passwordValido = await bcrypt.compare(password, personal.password_hash);
  if (!passwordValido) {
    return respuestaError(
      res,
      'CREDENCIALES_INVALIDAS',
      'Correo electrónico o contraseña incorrectos.',
      null,
      401
    );
  }

  // Regla 5: Un bibliotecario 'inactivo' NO puede iniciar sesión
  if (personal.estado === 'inactivo') {
    return respuestaError(
      res,
      'CUENTA_INACTIVA',
      'Su cuenta de personal se encuentra inactiva. Comuníquese con el administrador del sistema.',
      null,
      403
    );
  }

  const token = generarToken({
    id: personal.id_bibliotecario,
    tipo: 'personal',
    rol: personal.rol
  });

  // NUNCA devolver password_hash
  const { password_hash, ...datosPersonal } = personal;

  return respuestaExito(res, {
    token,
    usuario: datosPersonal
  });
};

/**
 * Obtener perfil del usuario autenticado actual a partir del token JWT
 * GET /api/auth/me
 */
const obtenerPerfilActual = async (req, res) => {
  const { id, tipo } = req.usuario;

  if (tipo === 'usuario') {
    const sql = `
      SELECT id_usuario, codigo, identificacion, nombres, correo, rol, carrera, estado
      FROM usuarios
      WHERE id_usuario = $1;
    `;
    const resultado = await query(sql, [id]);

    if (resultado.rowCount === 0) {
      return respuestaError(res, 'USUARIO_NO_ENCONTRADO', 'El usuario no fue encontrado.', null, 404);
    }

    return respuestaExito(res, {
      tipo: 'usuario',
      ...resultado.rows[0]
    });
  }

  if (tipo === 'personal') {
    const sql = `
      SELECT id_bibliotecario, nombres, correo, rol, estado
      FROM bibliotecarios
      WHERE id_bibliotecario = $1;
    `;
    const resultado = await query(sql, [id]);

    if (resultado.rowCount === 0) {
      return respuestaError(res, 'PERSONAL_NO_ENCONTRADO', 'El personal no fue encontrado.', null, 404);
    }

    return respuestaExito(res, {
      tipo: 'personal',
      ...resultado.rows[0]
    });
  }

  return respuestaError(res, 'TIPO_INVALIDO', 'Tipo de cuenta no reconocido.', null, 400);
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  loginPersonal,
  obtenerPerfilActual
};
