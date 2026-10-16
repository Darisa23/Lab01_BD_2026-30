// Controlador para consultas analíticas y reportes de biblioteca

const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuestas');

/**
 * Reporte de préstamos actualmente activos (vigentes o vencidos)
 * GET /api/reportes/prestamos-activos?situacion=vencido|vigente (Personal)
 */
const reportarPrestamosActivos = async (req, res) => {
  const { situacion } = req.query;

  let sql = `
    SELECT id_prestamo, codigo_usuario, usuario, libro, ejemplar,
           fecha_prestamo, fecha_vencimiento, dias_retraso, situacion
    FROM v_prestamos_activos
  `;
  const valores = [];

  if (situacion && ['vencido', 'vigente'].includes(situacion.trim())) {
    sql += ' WHERE situacion = $1';
    valores.push(situacion.trim());
  }

  sql += ' ORDER BY fecha_vencimiento ASC;';

  const resultado = await query(sql, valores);
  return respuestaExito(res, resultado.rows);
};

/**
 * Reporte de libros más prestados en un rango de fechas
 * GET /api/reportes/libros-mas-prestados?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=10 (Personal)
 */
const reportarLibrosMasPrestados = async (req, res) => {
  const { desde, hasta } = req.query;
  const limit = parseInt(req.query.limit, 10) || 10;

  // Validación de rango temporal coherente
  if (desde > hasta) {
    return respuestaError(
      res,
      'RANGO_FECHAS_INVALIDO',
      "La fecha inicial 'desde' no puede ser posterior a la fecha final 'hasta'.",
      null,
      400
    );
  }

  const sql = `
    SELECT id_libro, titulo, isbn, total_prestamos
    FROM fn_libros_mas_prestados($1::date, $2::date)
    LIMIT $3;
  `;

  const resultado = await query(sql, [desde, hasta, limit]);
  return respuestaExito(res, resultado.rows);
};

/**
 * Reporte de usuarios con mayor número de préstamos acumulados
 * GET /api/reportes/usuarios-top?limit=10 (Personal)
 */
const reportarUsuariosTop = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const sql = `
    SELECT id_usuario, codigo, nombres, total_prestamos
    FROM v_usuarios_top
    LIMIT $1;
  `;

  const resultado = await query(sql, [limit]);
  return respuestaExito(res, resultado.rows);
};

/**
 * Reporte de inventario físico total discriminado por estado
 * GET /api/reportes/inventario (Personal)
 */
const reportarInventarioEstado = async (req, res) => {
  const sql = `
    SELECT estado, total
    FROM v_inventario_estado
    ORDER BY CASE estado
      WHEN 'disponible' THEN 1
      WHEN 'prestado' THEN 2
      WHEN 'perdido' THEN 3
      ELSE 4
    END;
  `;

  const resultado = await query(sql);
  return respuestaExito(res, resultado.rows);
};

module.exports = {
  reportarPrestamosActivos,
  reportarLibrosMasPrestados,
  reportarUsuariosTop,
  reportarInventarioEstado
};
