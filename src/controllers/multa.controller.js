// Controlador para consulta y configuración de tarifas de multa diaria

const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuestas');

/**
 * Consulta de la tarifa de multa activa actual
 * GET /api/multa (Autenticado)
 */
const obtenerTarifaActiva = async (req, res) => {
  const sql = `
    SELECT id_configuracion, valor_por_dia, vigente_desde, activa
    FROM configuracion_multa
    WHERE activa = TRUE;
  `;

  const resultado = await query(sql);

  if (resultado.rowCount === 0) {
    return respuestaError(
      res,
      'SIN_TARIFA_ACTIVA',
      'Actualmente no hay una tarifa de multa activa configurada en el sistema.',
      null,
      404
    );
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Historial completo de tarifas de multa configuradas
 * GET /api/multa/historial (Personal)
 */
const listarHistorialTarifas = async (req, res) => {
  const sql = `
    SELECT id_configuracion, valor_por_dia, vigente_desde, activa
    FROM configuracion_multa
    ORDER BY id_configuracion DESC;
  `;

  const resultado = await query(sql);
  return respuestaExito(res, resultado.rows);
};

/**
 * Establecer una nueva tarifa de multa activa (Regla 8: Solo Administrador)
 * POST /api/multa
 * En una transacción desactiva la tarifa previa y crea la nueva activa.
 */
const establecerNuevaTarifa = async (req, res) => {
  const { valor_por_dia } = req.body;
  const valorNumerico = parseFloat(valor_por_dia);

  if (isNaN(valorNumerico) || valorNumerico < 0) {
    return respuestaError(
      res,
      'VALOR_INVALIDO',
      'El valor de la tarifa por día debe ser un número mayor o igual a 0.',
      null,
      400
    );
  }

  const nuevaTarifa = await withTransaction(async (client) => {
    // 1. Desactivar la tarifa activa actual
    await client.query('UPDATE configuracion_multa SET activa = FALSE WHERE activa = TRUE;');

    // 2. Insertar la nueva tarifa como activa
    const insertSql = `
      INSERT INTO configuracion_multa (valor_por_dia, vigente_desde, activa)
      VALUES ($1, CURRENT_DATE, TRUE)
      RETURNING id_configuracion, valor_por_dia, vigente_desde, activa;
    `;
    const insertRes = await client.query(insertSql, [valorNumerico]);
    return insertRes.rows[0];
  });

  return respuestaExito(res, nuevaTarifa, 201);
};

module.exports = {
  obtenerTarifaActiva,
  listarHistorialTarifas,
  establecerNuevaTarifa
};
