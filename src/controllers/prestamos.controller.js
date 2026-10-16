// Controlador para el ciclo de vida de préstamos y devoluciones

const env = require('../config/env');
const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaPaginada, respuestaError } = require('../utils/respuestas');
const { obtenerParametrosPaginacion, construirMetaPaginacion } = require('../utils/paginacion');

/**
 * Solicitar un préstamo de libro (Exclusivo Usuario lector)
 * POST /api/prestamos
 * Regla 2: El trigger fn_validar_prestamo verifica usuario activo y ejemplar disponible.
 */
const solicitarPrestamo = async (req, res) => {
  const idUsuario = req.usuario.id;
  const { id_ejemplar } = req.body;

  const sql = `
    INSERT INTO prestamos (id_usuario, id_ejemplar)
    VALUES ($1, $2)
    RETURNING id_prestamo, id_usuario, id_ejemplar, id_bibliotecario,
              fecha_solicitud, fecha_prestamo, fecha_vencimiento, estado, motivo_rechazo;
  `;

  const resultado = await query(sql, [idUsuario, parseInt(id_ejemplar, 10)]);
  return respuestaExito(res, resultado.rows[0], 201);
};

/**
 * Préstamo directo en mostrador (Exclusivo Personal: bibliotecario / administrador)
 * POST /api/prestamos/directo
 * Inserta la solicitud y la aprueba en una sola transacción para que los triggers corran en orden.
 */
const prestamoDirecto = async (req, res) => {
  const idBibliotecario = req.usuario.id;
  const { id_usuario, id_ejemplar } = req.body;
  const diasPrestamo = env.DIAS_PRESTAMO;

  const resultado = await withTransaction(async (client) => {
    // 1. Insertar solicitud de préstamo
    const insertSql = `
      INSERT INTO prestamos (id_usuario, id_ejemplar)
      VALUES ($1, $2)
      RETURNING id_prestamo;
    `;
    const insertRes = await client.query(insertSql, [parseInt(id_usuario, 10), parseInt(id_ejemplar, 10)]);
    const idPrestamo = insertRes.rows[0].id_prestamo;

    // 2. Aprobar inmediatamente el préstamo
    const updateSql = `
      UPDATE prestamos
      SET estado = 'aprobado',
          id_bibliotecario = $1,
          fecha_prestamo = CURRENT_DATE,
          fecha_vencimiento = CURRENT_DATE + $2::int
      WHERE id_prestamo = $3 AND estado = 'solicitado'
      RETURNING id_prestamo, id_usuario, id_ejemplar, id_bibliotecario,
                fecha_solicitud, fecha_prestamo, fecha_vencimiento, estado, motivo_rechazo;
    `;
    const updateRes = await client.query(updateSql, [idBibliotecario, diasPrestamo, idPrestamo]);
    return updateRes.rows[0];
  });

  return respuestaExito(res, resultado, 201);
};

/**
 * Listado administrativo de préstamos con filtros y paginación
 * GET /api/prestamos (Personal)
 */
const listarPrestamos = async (req, res) => {
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);
  const { estado, id_usuario } = req.query;

  const condiciones = [];
  const valores = [];
  let paramIndex = 1;

  if (estado && estado.trim() !== '') {
    condiciones.push(`p.estado = $${paramIndex}`);
    valores.push(estado.trim());
    paramIndex++;
  }

  if (id_usuario) {
    condiciones.push(`p.id_usuario = $${paramIndex}`);
    valores.push(parseInt(id_usuario, 10));
    paramIndex++;
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  // Conteo total
  const countSql = `SELECT COUNT(*) AS total FROM prestamos p ${whereClause};`;
  const countRes = await query(countSql, valores);
  const total = countRes.rows[0].total;

  // Consulta paginada con joins
  const dataSql = `
    SELECT p.id_prestamo, p.id_usuario, u.codigo AS usuario_codigo, u.nombres AS usuario_nombres,
           p.id_ejemplar, e.codigo_barras AS ejemplar_codigo, l.id_libro, l.titulo AS libro_titulo,
           p.id_bibliotecario, b.nombres AS bibliotecario_nombres,
           p.fecha_solicitud, p.fecha_prestamo, p.fecha_vencimiento, p.estado, p.motivo_rechazo
    FROM prestamos p
    JOIN usuarios u ON u.id_usuario = p.id_usuario
    JOIN ejemplares e ON e.id_ejemplar = p.id_ejemplar
    JOIN libros l ON l.id_libro = e.id_libro
    LEFT JOIN bibliotecarios b ON b.id_bibliotecario = p.id_bibliotecario
    ${whereClause}
    ORDER BY p.id_prestamo DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const dataRes = await query(dataSql, [...valores, limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

/**
 * Detalle de un préstamo por ID (Personal o el propio dueño del préstamo)
 * GET /api/prestamos/:id
 */
const obtenerPrestamoPorId = async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT p.id_prestamo, p.id_usuario, u.codigo AS usuario_codigo, u.nombres AS usuario_nombres,
           p.id_ejemplar, e.codigo_barras AS ejemplar_codigo, l.id_libro, l.titulo AS libro_titulo,
           p.id_bibliotecario, b.nombres AS bibliotecario_nombres,
           p.fecha_solicitud, p.fecha_prestamo, p.fecha_vencimiento, p.estado, p.motivo_rechazo
    FROM prestamos p
    JOIN usuarios u ON u.id_usuario = p.id_usuario
    JOIN ejemplares e ON e.id_ejemplar = p.id_ejemplar
    JOIN libros l ON l.id_libro = e.id_libro
    LEFT JOIN bibliotecarios b ON b.id_bibliotecario = p.id_bibliotecario
    WHERE p.id_prestamo = $1;
  `;

  const resultado = await query(sql, [id]);

  if (resultado.rowCount === 0) {
    return respuestaError(res, 'PRESTAMO_NO_ENCONTRADO', 'El préstamo solicitado no existe.', null, 404);
  }

  const prestamo = resultado.rows[0];

  // Verificación de propiedad para lectores: un usuario solo puede ver sus propios préstamos
  if (req.usuario.tipo === 'usuario' && prestamo.id_usuario !== req.usuario.id) {
    return respuestaError(
      res,
      'ACCESO_DENEGADO',
      'No tiene autorización para visualizar los préstamos de otro usuario.',
      null,
      403
    );
  }

  // Si ya fue devuelto, adjuntar datos de la devolución
  if (prestamo.estado === 'devuelto') {
    const devSql = `
      SELECT id_devolucion, fecha_devolucion, dias_retraso, tarifa_aplicada,
             valor_multa, danado, paginas_faltantes, observaciones
      FROM devoluciones
      WHERE id_prestamo = $1;
    `;
    const devRes = await query(devSql, [id]);
    prestamo.devolucion = devRes.rows[0] || null;
  }

  return respuestaExito(res, prestamo);
};

/**
 * Aprobar una solicitud de préstamo (Regla 3)
 * PATCH /api/prestamos/:id/aprobar (Personal)
 */
const aprobarPrestamo = async (req, res) => {
  const { id } = req.params;
  const idBibliotecario = req.usuario.id;
  const diasPrestamo = env.DIAS_PRESTAMO;

  const updateSql = `
    UPDATE prestamos
    SET estado = 'aprobado',
        id_bibliotecario = $1,
        fecha_prestamo = CURRENT_DATE,
        fecha_vencimiento = CURRENT_DATE + $2::int
    WHERE id_prestamo = $3 AND estado = 'solicitado'
    RETURNING id_prestamo, id_usuario, id_ejemplar, id_bibliotecario,
              fecha_solicitud, fecha_prestamo, fecha_vencimiento, estado, motivo_rechazo;
  `;

  const resultado = await query(updateSql, [idBibliotecario, diasPrestamo, id]);

  // Regla 7: Si afecta 0 filas, diagnosticar si no existe (404) o estado incompatible (409)
  if (resultado.rowCount === 0) {
    const verif = await query('SELECT id_prestamo, estado FROM prestamos WHERE id_prestamo = $1;', [id]);
    if (verif.rowCount === 0) {
      return respuestaError(res, 'PRESTAMO_NO_ENCONTRADO', 'El préstamo no existe.', null, 404);
    }
    return respuestaError(
      res,
      'ESTADO_INCOMPATIBLE',
      `El préstamo se encuentra en estado '${verif.rows[0].estado}' y solo se pueden aprobar préstamos en estado 'solicitado'.`,
      null,
      409
    );
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Rechazar una solicitud de préstamo (Regla 4)
 * PATCH /api/prestamos/:id/rechazar (Personal)
 */
const rechazarPrestamo = async (req, res) => {
  const { id } = req.params;
  const idBibliotecario = req.usuario.id;
  const { motivo_rechazo } = req.body;

  const updateSql = `
    UPDATE prestamos
    SET estado = 'rechazado',
        id_bibliotecario = $1,
        motivo_rechazo = $2
    WHERE id_prestamo = $3 AND estado = 'solicitado'
    RETURNING id_prestamo, id_usuario, id_ejemplar, id_bibliotecario,
              fecha_solicitud, fecha_prestamo, fecha_vencimiento, estado, motivo_rechazo;
  `;

  const resultado = await query(updateSql, [idBibliotecario, motivo_rechazo.trim(), id]);

  // Regla 7: Verificación en 0 filas afectadas
  if (resultado.rowCount === 0) {
    const verif = await query('SELECT id_prestamo, estado FROM prestamos WHERE id_prestamo = $1;', [id]);
    if (verif.rowCount === 0) {
      return respuestaError(res, 'PRESTAMO_NO_ENCONTRADO', 'El préstamo no existe.', null, 404);
    }
    return respuestaError(
      res,
      'ESTADO_INCOMPATIBLE',
      `El préstamo se encuentra en estado '${verif.rows[0].estado}' y solo se pueden rechazar préstamos en estado 'solicitado'.`,
      null,
      409
    );
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Marcar préstamo aprobado como perdido (Regla 5)
 * PATCH /api/prestamos/:id/perdido (Personal)
 */
const marcarPerdido = async (req, res) => {
  const { id } = req.params;

  const updateSql = `
    UPDATE prestamos
    SET estado = 'perdido'
    WHERE id_prestamo = $1 AND estado = 'aprobado'
    RETURNING id_prestamo, id_usuario, id_ejemplar, id_bibliotecario,
              fecha_solicitud, fecha_prestamo, fecha_vencimiento, estado, motivo_rechazo;
  `;

  const resultado = await query(updateSql, [id]);

  // Regla 7: Verificación en 0 filas afectadas
  if (resultado.rowCount === 0) {
    const verif = await query('SELECT id_prestamo, estado FROM prestamos WHERE id_prestamo = $1;', [id]);
    if (verif.rowCount === 0) {
      return respuestaError(res, 'PRESTAMO_NO_ENCONTRADO', 'El préstamo no existe.', null, 404);
    }
    return respuestaError(
      res,
      'ESTADO_INCOMPATIBLE',
      `El préstamo se encuentra en estado '${verif.rows[0].estado}' y solo se pueden marcar como perdidos préstamos en estado 'aprobado'.`,
      null,
      409
    );
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Registrar la devolución de un préstamo (Regla 6)
 * POST /api/prestamos/:id/devolucion (Personal)
 * El trigger fn_calcular_devolucion calcula automáticamente multas y fechas.
 * El trigger fn_cerrar_prestamo_devuelto pasa el préstamo a 'devuelto' y el ejemplar a 'disponible'.
 */
const registrarDevolucion = async (req, res) => {
  const { id } = req.params;
  const idBibliotecario = req.usuario.id;
  const { danado, paginas_faltantes, observaciones } = req.body;

  const sql = `
    INSERT INTO devoluciones (id_prestamo, id_bibliotecario, danado, paginas_faltantes, observaciones)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id_devolucion, id_prestamo, id_bibliotecario, id_configuracion,
              fecha_devolucion, dias_retraso, tarifa_aplicada, valor_multa,
              danado, paginas_faltantes, observaciones;
  `;

  const valores = [
    parseInt(id, 10),
    idBibliotecario,
    danado === true || danado === 'true',
    paginas_faltantes === true || paginas_faltantes === 'true',
    observaciones ? observaciones.trim() : null
  ];

  const resultado = await query(sql, valores);
  return respuestaExito(res, resultado.rows[0], 201);
};

/**
 * Listado administrativo de devoluciones con detalles de multas
 * GET /api/devoluciones (Personal)
 */
const listarDevoluciones = async (req, res) => {
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);

  const countSql = 'SELECT COUNT(*) AS total FROM devoluciones;';
  const countRes = await query(countSql);
  const total = countRes.rows[0].total;

  const dataSql = `
    SELECT d.id_devolucion, d.id_prestamo, d.id_bibliotecario, b.nombres AS bibliotecario_nombres,
           d.fecha_devolucion, d.dias_retraso, d.tarifa_aplicada, d.valor_multa,
           d.danado, d.paginas_faltantes, d.observaciones,
           p.id_usuario, u.codigo AS usuario_codigo, u.nombres AS usuario_nombres,
           p.id_ejemplar, e.codigo_barras AS ejemplar_codigo,
           l.id_libro, l.titulo AS libro_titulo,
           p.fecha_prestamo, p.fecha_vencimiento
    FROM devoluciones d
    JOIN prestamos p ON p.id_prestamo = d.id_prestamo
    JOIN usuarios u ON u.id_usuario = p.id_usuario
    JOIN ejemplares e ON e.id_ejemplar = p.id_ejemplar
    JOIN libros l ON l.id_libro = e.id_libro
    JOIN bibliotecarios b ON b.id_bibliotecario = d.id_bibliotecario
    ORDER BY d.id_devolucion DESC
    LIMIT $1 OFFSET $2;
  `;

  const dataRes = await query(dataSql, [limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

module.exports = {
  solicitarPrestamo,
  prestamoDirecto,
  listarPrestamos,
  obtenerPrestamoPorId,
  aprobarPrestamo,
  rechazarPrestamo,
  marcarPerdido,
  registrarDevolucion,
  listarDevoluciones
};
