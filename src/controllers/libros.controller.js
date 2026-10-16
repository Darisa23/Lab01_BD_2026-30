// Controlador para catálogo de libros, autores y categorías

const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaPaginada, respuestaError } = require('../utils/respuestas');
const { obtenerParametrosPaginacion, construirMetaPaginacion } = require('../utils/paginacion');

/**
 * Consulta del catálogo de libros con filtros y paginación
 * GET /api/libros (Autenticado)
 */
const listarLibros = async (req, res) => {
  const { page, limit, offset } = obtenerParametrosPaginacion(req.query);
  const { titulo, autor, isbn, categoria, disponible } = req.query;

  const condiciones = [];
  const valores = [];
  let paramIndex = 1;

  if (titulo && titulo.trim() !== '') {
    condiciones.push(`titulo ILIKE $${paramIndex}`);
    valores.push(`%${titulo.trim()}%`);
    paramIndex++;
  }

  if (autor && autor.trim() !== '') {
    condiciones.push(`autores ILIKE $${paramIndex}`);
    valores.push(`%${autor.trim()}%`);
    paramIndex++;
  }

  if (isbn && isbn.trim() !== '') {
    condiciones.push(`isbn ILIKE $${paramIndex}`);
    valores.push(`%${isbn.trim()}%`);
    paramIndex++;
  }

  if (categoria && categoria.trim() !== '') {
    condiciones.push(`categorias ILIKE $${paramIndex}`);
    valores.push(`%${categoria.trim()}%`);
    paramIndex++;
  }

  if (disponible === 'true' || disponible === true) {
    condiciones.push('ejemplares_disponibles > 0');
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  // Consulta de conteo total
  const countSql = `SELECT COUNT(*) AS total FROM v_catalogo ${whereClause};`;
  const countRes = await query(countSql, valores);
  const total = countRes.rows[0].total;

  // Consulta de registros paginados
  const dataSql = `
    SELECT id_libro, isbn, titulo, editorial, anio_publicacion, descripcion,
           autores, categorias, total_ejemplares, ejemplares_disponibles
    FROM v_catalogo
    ${whereClause}
    ORDER BY titulo ASC, id_libro ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const dataRes = await query(dataSql, [...valores, limit, offset]);

  return respuestaPaginada(res, dataRes.rows, construirMetaPaginacion(page, limit, total));
};

/**
 * Detalle de un libro por su ID junto con la lista de sus ejemplares
 * GET /api/libros/:id (Autenticado)
 */
const obtenerLibroPorId = async (req, res) => {
  const { id } = req.params;

  // 1. Consultar libro desde la vista v_catalogo
  const libroSql = `
    SELECT id_libro, isbn, titulo, editorial, anio_publicacion, descripcion,
           autores, categorias, total_ejemplares, ejemplares_disponibles
    FROM v_catalogo
    WHERE id_libro = $1;
  `;
  const libroRes = await query(libroSql, [id]);

  if (libroRes.rowCount === 0) {
    return respuestaError(res, 'LIBRO_NO_ENCONTRADO', 'El libro solicitado no existe.', null, 404);
  }

  const libro = libroRes.rows[0];

  // 2. Consultar ejemplares físicos del libro
  const ejemplaresSql = `
    SELECT id_ejemplar, codigo_barras, sala, estante, estado
    FROM ejemplares
    WHERE id_libro = $1
    ORDER BY id_ejemplar ASC;
  `;
  const ejemplaresRes = await query(ejemplaresSql, [id]);

  libro.ejemplares = ejemplaresRes.rows;

  return respuestaExito(res, libro);
};

/**
 * Crea un nuevo libro con sus autores y categorías en una transacción única
 * POST /api/libros (Personal)
 */
const crearLibro = async (req, res) => {
  const { isbn, titulo, editorial, anio_publicacion, descripcion, autores, categorias } = req.body;

  const resultadoTransaccion = await withTransaction(async (client) => {
    // 1. Insertar el libro principal
    const insertLibroSql = `
      INSERT INTO libros (isbn, titulo, editorial, anio_publicacion, descripcion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_libro, isbn, titulo, editorial, anio_publicacion, descripcion;
    `;
    const libroRes = await client.query(insertLibroSql, [
      isbn.trim(),
      titulo.trim(),
      editorial.trim(),
      parseInt(anio_publicacion, 10),
      descripcion ? descripcion.trim() : null
    ]);

    const idLibro = libroRes.rows[0].id_libro;

    // 2. Procesar autores (Upsert por nombre y vinculación en libro_autor)
    for (const nombreAutor of autores) {
      const nombreLimpio = nombreAutor.trim();
      const upsertAutorSql = `
        INSERT INTO autores (nombre)
        VALUES ($1)
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id_autor;
      `;
      const autorRes = await client.query(upsertAutorSql, [nombreLimpio]);
      const idAutor = autorRes.rows[0].id_autor;

      await client.query(
        'INSERT INTO libro_autor (id_libro, id_autor) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
        [idLibro, idAutor]
      );
    }

    // 3. Procesar categorías (Upsert por nombre y vinculación en libro_categoria)
    if (Array.isArray(categorias) && categorias.length > 0) {
      for (const nombreCat of categorias) {
        const catLimpia = nombreCat.trim();
        const upsertCatSql = `
          INSERT INTO categorias (nombre)
          VALUES ($1)
          ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
          RETURNING id_categoria;
        `;
        const catRes = await client.query(upsertCatSql, [catLimpia]);
        const idCat = catRes.rows[0].id_categoria;

        await client.query(
          'INSERT INTO libro_categoria (id_libro, id_categoria) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
          [idLibro, idCat]
        );
      }
    }

    // 4. Obtener el libro creado desde la vista v_catalogo
    const libroCreadoSql = `
      SELECT id_libro, isbn, titulo, editorial, anio_publicacion, descripcion,
             autores, categorias, total_ejemplares, ejemplares_disponibles
      FROM v_catalogo
      WHERE id_libro = $1;
    `;
    const resFinal = await client.query(libroCreadoSql, [idLibro]);
    return resFinal.rows[0];
  });

  return respuestaExito(res, resultadoTransaccion, 201);
};

/**
 * Actualiza los datos de un libro y reemplaza sus autores y categorías en una transacción única
 * PUT /api/libros/:id (Personal)
 */
const actualizarLibro = async (req, res) => {
  const { id } = req.params;
  const { isbn, titulo, editorial, anio_publicacion, descripcion, autores, categorias } = req.body;

  const libroActualizado = await withTransaction(async (client) => {
    // 1. Actualizar datos básicos del libro
    const updateSql = `
      UPDATE libros
      SET isbn = $1, titulo = $2, editorial = $3, anio_publicacion = $4, descripcion = $5
      WHERE id_libro = $6
      RETURNING id_libro;
    `;
    const updateRes = await client.query(updateSql, [
      isbn.trim(),
      titulo.trim(),
      editorial.trim(),
      parseInt(anio_publicacion, 10),
      descripcion ? descripcion.trim() : null,
      id
    ]);

    if (updateRes.rowCount === 0) {
      const err = new Error('El libro a actualizar no existe.');
      err.statusCode = 404;
      err.codigo = 'LIBRO_NO_ENCONTRADO';
      throw err;
    }

    // 2. Reemplazar vínculos de autores (borrar existentes y reinsertar)
    await client.query('DELETE FROM libro_autor WHERE id_libro = $1;', [id]);
    for (const nombreAutor of autores) {
      const nombreLimpio = nombreAutor.trim();
      const upsertAutorSql = `
        INSERT INTO autores (nombre)
        VALUES ($1)
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id_autor;
      `;
      const autorRes = await client.query(upsertAutorSql, [nombreLimpio]);
      const idAutor = autorRes.rows[0].id_autor;

      await client.query(
        'INSERT INTO libro_autor (id_libro, id_autor) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
        [id, idAutor]
      );
    }

    // 3. Reemplazar vínculos de categorías (borrar existentes y reinsertar)
    await client.query('DELETE FROM libro_categoria WHERE id_libro = $1;', [id]);
    if (Array.isArray(categorias) && categorias.length > 0) {
      for (const nombreCat of categorias) {
        const catLimpia = nombreCat.trim();
        const upsertCatSql = `
          INSERT INTO categorias (nombre)
          VALUES ($1)
          ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
          RETURNING id_categoria;
        `;
        const catRes = await client.query(upsertCatSql, [catLimpia]);
        const idCat = catRes.rows[0].id_categoria;

        await client.query(
          'INSERT INTO libro_categoria (id_libro, id_categoria) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
          [id, idCat]
        );
      }
    }

    // 4. Obtener el libro actualizado desde la vista v_catalogo
    const libroActualizadoSql = `
      SELECT id_libro, isbn, titulo, editorial, anio_publicacion, descripcion,
             autores, categorias, total_ejemplares, ejemplares_disponibles
      FROM v_catalogo
      WHERE id_libro = $1;
    `;
    const resFinal = await client.query(libroActualizadoSql, [id]);
    return resFinal.rows[0];
  });

  return respuestaExito(res, libroActualizado);
};

/**
 * Elimina un libro del catálogo (409 si tiene ejemplares registrados por restricción RESTRICT)
 * DELETE /api/libros/:id (Personal)
 */
const eliminarLibro = async (req, res) => {
  const { id } = req.params;

  // Si tiene ejemplares asociados, la restricción ON DELETE RESTRICT lanzará error 23503
  // el cual es capturado y traducido por el errorHandler global a HTTP 409.
  const deleteSql = 'DELETE FROM libros WHERE id_libro = $1 RETURNING id_libro;';
  const deleteRes = await query(deleteSql, [id]);

  if (deleteRes.rowCount === 0) {
    return respuestaError(res, 'LIBRO_NO_ENCONTRADO', 'El libro a eliminar no existe.', null, 404);
  }

  return respuestaExito(res, {
    mensaje: `Libro con ID ${id} eliminado exitosamente del catálogo.`
  });
};

/**
 * Listado de todos los autores ordenados alfabéticamente
 * GET /api/autores (Autenticado)
 */
const listarAutores = async (req, res) => {
  const sql = 'SELECT id_autor, nombre FROM autores ORDER BY nombre ASC;';
  const resultado = await query(sql);
  return respuestaExito(res, resultado.rows);
};

/**
 * Listado de todas las categorías ordenadas alfabéticamente
 * GET /api/categorias (Autenticado)
 */
const listarCategorias = async (req, res) => {
  const sql = 'SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC;';
  const resultado = await query(sql);
  return respuestaExito(res, resultado.rows);
};

module.exports = {
  listarLibros,
  obtenerLibroPorId,
  crearLibro,
  actualizarLibro,
  eliminarLibro,
  listarAutores,
  listarCategorias
};
