// Controlador para gestión de inventario de ejemplares físicos

const { query } = require('../config/db');
const { respuestaExito, respuestaPaginada, respuestaError } = require('../utils/respuestas');
const { obtenerParametrosPaginacion, construirMetaPaginacion } = require('../utils/paginacion');

/**
 * Listado de ejemplares con filtros y paginación
 * GET /api/ejemplares (Personal)
 */
const listarEjemplares = async (req, res) => {
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);
  const { id_libro, estado, codigo_barras } = req.query;

  const condiciones = [];
  const valores = [];
  let paramIndex = 1;

  if (id_libro) {
    condiciones.push(`e.id_libro = $${paramIndex}`);
    valores.push(parseInt(id_libro, 10));
    paramIndex++;
  }

  if (estado && estado.trim() !== '') {
    condiciones.push(`e.estado = $${paramIndex}`);
    valores.push(estado.trim());
    paramIndex++;
  }

  if (codigo_barras && codigo_barras.trim() !== '') {
    condiciones.push(`e.codigo_barras ILIKE $${paramIndex}`);
    valores.push(`%${codigo_barras.trim()}%`);
    paramIndex++;
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  // Conteo total para paginación
  const countSql = `
    SELECT COUNT(*) AS total
    FROM ejemplares e
    JOIN libros l ON l.id_libro = e.id_libro
    ${whereClause};
  `;
  const countRes = await query(countSql, valores);
  const total = countRes.rows[0].total;

  // Listado de ejemplares paginados con datos del libro
  const dataSql = `
    SELECT e.id_ejemplar, e.id_libro, l.titulo AS libro_titulo, l.isbn AS libro_isbn,
           e.codigo_barras, e.sala, e.estante, e.estado
    FROM ejemplares e
    JOIN libros l ON l.id_libro = e.id_libro
    ${whereClause}
    ORDER BY e.id_ejemplar DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const dataRes = await query(dataSql, [...valores, limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

/**
 * Detalle de un ejemplar por ID con datos del libro
 * GET /api/ejemplares/:id (Personal)
 */
const obtenerEjemplarPorId = async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT e.id_ejemplar, e.id_libro, l.titulo AS libro_titulo, l.isbn AS libro_isbn,
           l.editorial AS libro_editorial, e.codigo_barras, e.sala, e.estante, e.estado
    FROM ejemplares e
    JOIN libros l ON l.id_libro = e.id_libro
    WHERE e.id_ejemplar = $1;
  `;

  const resultado = await query(sql, [id]);

  if (resultado.rowCount === 0) {
    return respuestaError(res, 'EJEMPLAR_NO_ENCONTRADO', 'El ejemplar solicitado no existe.', null, 404);
  }

  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Registra un nuevo ejemplar en el inventario
 * POST /api/ejemplares (Personal)
 */
const crearEjemplar = async (req, res) => {
  const { id_libro, codigo_barras, sala, estante, estado } = req.body;

  // Regla 9: En CRUD manual solo se permite 'disponible' o 'perdido'. El estado por defecto es 'disponible'.
  const estadoFinal = estado ? estado.trim() : 'disponible';

  if (!['disponible', 'perdido'].includes(estadoFinal)) {
    return respuestaError(
      res,
      'ESTADO_INVALIDO',
      "En el registro manual solo se permite el estado 'disponible' o 'perdido' ('prestado' lo asigna el sistema al aprobar un préstamo).",
      null,
      400
    );
  }

  const sql = `
    INSERT INTO ejemplares (id_libro, codigo_barras, sala, estante, estado)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id_ejemplar, id_libro, codigo_barras, sala, estante, estado;
  `;

  const valores = [
    parseInt(id_libro, 10),
    codigo_barras.trim(),
    sala.trim(),
    estante.trim(),
    estadoFinal
  ];

  const resultado = await query(sql, valores);
  return respuestaExito(res, resultado.rows[0], 201);
};

/**
 * Actualiza la información de un ejemplar
 * PUT /api/ejemplares/:id (Personal)
 */
const actualizarEjemplar = async (req, res) => {
  const { id } = req.params;
  const { codigo_barras, sala, estante, estado } = req.body;

  // 1. Consultar estado actual del ejemplar
  const consultaActual = await query('SELECT id_ejemplar, estado FROM ejemplares WHERE id_ejemplar = $1;', [id]);

  if (consultaActual.rowCount === 0) {
    return respuestaError(res, 'EJEMPLAR_NO_ENCONTRADO', 'El ejemplar no existe.', null, 404);
  }

  const ejemplarActual = consultaActual.rows[0];

  // Regla 9: Si el ejemplar está actualmente prestado, no se puede cambiar su estado manualmente
  if (ejemplarActual.estado === 'prestado') {
    if (estado && estado !== 'prestado') {
      return respuestaError(
        res,
        'EJEMPLAR_PRESTADO',
        'No es posible cambiar el estado de un ejemplar que se encuentra actualmente prestado.',
        null,
        409
      );
    }
  }

  // Si se envía un nuevo estado en el body, validar que sea 'disponible' o 'perdido'
  let nuevoEstado = ejemplarActual.estado;
  if (estado) {
    if (!['disponible', 'perdido'].includes(estado) && ejemplarActual.estado !== 'prestado') {
      return respuestaError(
        res,
        'ESTADO_INVALIDO',
        "Solo se permite establecer manualmente el estado 'disponible' o 'perdido'.",
        null,
        400
      );
    }
    nuevoEstado = estado;
  }

  const updateSql = `
    UPDATE ejemplares
    SET codigo_barras = $1, sala = $2, estante = $3, estado = $4
    WHERE id_ejemplar = $5
    RETURNING id_ejemplar, id_libro, codigo_barras, sala, estante, estado;
  `;

  const valores = [
    codigo_barras.trim(),
    sala.trim(),
    estante.trim(),
    nuevoEstado,
    id
  ];

  const resultado = await query(updateSql, valores);
  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Cambia exclusivamente el estado de un ejemplar (disponible | perdido)
 * PATCH /api/ejemplares/:id/estado (Personal)
 */
const cambiarEstadoEjemplar = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!['disponible', 'perdido'].includes(estado)) {
    return respuestaError(
      res,
      'ESTADO_INVALIDO',
      "Solo se permite cambiar el estado a 'disponible' o 'perdido'. El estado 'prestado' es exclusivo del flujo de préstamos.",
      null,
      400
    );
  }

  // Consultar estado actual
  const consultaActual = await query('SELECT id_ejemplar, estado FROM ejemplares WHERE id_ejemplar = $1;', [id]);

  if (consultaActual.rowCount === 0) {
    return respuestaError(res, 'EJEMPLAR_NO_ENCONTRADO', 'El ejemplar no existe.', null, 404);
  }

  const ejemplarActual = consultaActual.rows[0];

  // Regla 9: NO se puede cambiar el estado de un ejemplar que esté prestado
  if (ejemplarActual.estado === 'prestado') {
    return respuestaError(
      res,
      'EJEMPLAR_PRESTADO',
      'No se puede modificar manualmente el estado de un ejemplar que se encuentra prestado.',
      null,
      409
    );
  }

  const updateSql = `
    UPDATE ejemplares
    SET estado = $1
    WHERE id_ejemplar = $2
    RETURNING id_ejemplar, id_libro, codigo_barras, sala, estante, estado;
  `;

  const resultado = await query(updateSql, [estado, id]);
  return respuestaExito(res, resultado.rows[0]);
};

/**
 * Elimina un ejemplar físico (409 si tiene préstamos por restricción RESTRICT)
 * DELETE /api/ejemplares/:id (Personal)
 */
const eliminarEjemplar = async (req, res) => {
  const { id } = req.params;

  // Si tiene préstamos en la tabla prestamos, la restricción ON DELETE RESTRICT lanzará error 23503
  // que el errorHandler convertirá en HTTP 409 con mensaje claro.
  const deleteSql = 'DELETE FROM ejemplares WHERE id_ejemplar = $1 RETURNING id_ejemplar;';
  const deleteRes = await query(deleteSql, [id]);

  if (deleteRes.rowCount === 0) {
    return respuestaError(res, 'EJEMPLAR_NO_ENCONTRADO', 'El ejemplar a eliminar no existe.', null, 404);
  }

  return respuestaExito(res, {
    mensaje: `Ejemplar con ID ${id} eliminado exitosamente del inventario.`
  });
};

module.exports = {
  listarEjemplares,
  obtenerEjemplarPorId,
  crearEjemplar,
  actualizarEjemplar,
  cambiarEstadoEjemplar,
  eliminarEjemplar
};
