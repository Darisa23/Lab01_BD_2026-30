// mapeamos y traducimos los errores de PostgreSQL a respuestas estructuradas

// Diccionario de restricciones de unicidad (23505)
const RESTRICCIONES_UNICAS = {
  uq_libros_isbn: 'Ya existe un libro registrado con este ISBN.',
  uq_usuarios_codigo: 'Ya existe un usuario registrado con este código institucional.',
  uq_usuarios_identificacion: 'Ya existe un usuario registrado con esta identificación.',
  uq_usuarios_correo: 'Ya existe un usuario registrado con este correo electrónico.',
  uq_bibliotecarios_correo: 'Ya existe un miembro del personal registrado con este correo electrónico.',
  uq_autores_nombre: 'Ya existe un autor registrado con este nombre exacto.',
  uq_categorias_nombre: 'Ya existe una categoría registrada con este nombre exacto.',
  uq_ejemplares_codigo: 'Ya existe un ejemplar registrado con este código de barras.',
  uq_prestamo_abierto_por_ejemplar: 'El ejemplar ya tiene una solicitud o préstamo activo.',
  uq_multa_unica_activa: 'Ya existe una tarifa de multa activa en el sistema.',
  uq_devoluciones_prestamo: 'Este préstamo ya tiene registrada una devolución.'
};

// Diccionario de restricciones CHECK (23514)
const RESTRICCIONES_CHECK = {
  ck_libros_anio: 'El año de publicación debe encontrarse entre 1000 y 2100.',
  ck_ejemplares_estado: "El estado del ejemplar debe ser 'disponible', 'prestado' o 'perdido'.",
  ck_usuarios_rol: "El rol de usuario debe ser 'estudiante' o 'docente'.",
  ck_usuarios_estado: "El estado de usuario debe ser 'activo' o 'bloqueado'.",
  ck_bibliotecarios_rol: "El rol de personal debe ser 'administrador' o 'bibliotecario'.",
  ck_bibliotecarios_estado: "El estado de personal debe ser 'activo' o 'inactivo'.",
  ck_multa_valor: 'El valor por día de la multa debe ser mayor o igual a 0.',
  ck_prestamos_estado: "El estado del préstamo debe ser 'solicitado', 'aprobado', 'rechazado', 'devuelto' o 'perdido'.",
  ck_prestamos_fechas: 'La fecha de vencimiento no puede ser anterior a la fecha de préstamo.',
  ck_prestamos_aprobacion: 'El préstamo no cumple con los requisitos del personal o fechas para su estado.',
  ck_devoluciones_retraso: 'Los días de retraso no pueden ser negativos.',
  ck_devoluciones_tarifa: 'La tarifa de multa aplicada no puede ser negativa.',
  ck_devoluciones_multa: 'El valor de la multa no puede ser negativo.'
};

/**
 * Mapea un error proveniente del driver PostgreSQL a un objeto estructurado para la API.
 * @param {object} err - Objeto de error lanzado por pg
 * @returns {{ status: number, codigo: string, mensaje: string } | null}
 */
const mapearErrorPg = (err) => {
  if (!err || !err.code) {
    return null;
  }

  // 1. Violación de restricción UNIQUE (23505) -> HTTP 409
  if (err.code === '23505') {
    const mensaje = RESTRICCIONES_UNICAS[err.constraint] ||
      'Conflicto: Ya existe un registro con los mismos datos únicos en el sistema.';
    return {
      status: 409,
      codigo: 'REGISTRO_DUPLICADO',
      mensaje
    };
  }

  // 2. Violación de clave foránea / RESTRICT (23503)
  if (err.code === '23503') {
    const detalle = (err.detail || '').toLowerCase();
    // Caso A: Intento de eliminar registro padre referenciado por tablas hijas
    if (detalle.includes('still referenced') || detalle.includes('todavía es referenciada') || err.message.toLowerCase().includes('foreign key')) {
      if (err.table === 'usuarios' || detalle.includes('table "prestamos"')) {
        return {
          status: 409,
          codigo: 'REGISTRO_EN_USO',
          mensaje: 'No es posible eliminar el registro porque tiene préstamos asociados. Para usuarios, se sugiere cambiar su estado a "bloqueado" en lugar de eliminarlo.'
        };
      }
      if (err.table === 'libros' || detalle.includes('table "ejemplares"')) {
        return {
          status: 409,
          codigo: 'REGISTRO_EN_USO',
          mensaje: 'No es posible eliminar el libro porque tiene ejemplares registrados en inventario.'
        };
      }
      if (err.table === 'ejemplares') {
        return {
          status: 409,
          codigo: 'REGISTRO_EN_USO',
          mensaje: 'No es posible eliminar el ejemplar porque cuenta con historial de préstamos asociados.'
        };
      }
      if (err.table === 'autores' || err.table === 'categorias') {
        return {
          status: 409,
          codigo: 'REGISTRO_EN_USO',
          mensaje: 'No es posible eliminar el autor o categoría porque está asignado a uno o más libros.'
        };
      }

      return {
        status: 409,
        codigo: 'REGISTRO_EN_USO',
        mensaje: 'No se puede eliminar el registro porque tiene registros dependientes en otras tablas.'
      };
    }

    // Caso B: Intento de insertar/actualizar referencia que no existe
    return {
      status: 400,
      codigo: 'REFERENCIA_NO_EXISTE',
      mensaje: 'El registro referenciado (clave foránea) no existe en la base de datos.'
    };
  }

  // 3. Violación de CHECK (23514) -> HTTP 400
  if (err.code === '23514') {
    const mensaje = RESTRICCIONES_CHECK[err.constraint] ||
      'Los datos ingresados no cumplen con las reglas de validación de la base de datos.';
    return {
      status: 400,
      codigo: 'RESTRICCION_CHECK_VIOLADA',
      mensaje
    };
  }

  // 4. Violación de NOT NULL (23502) -> HTTP 400
  if (err.code === '23502') {
    const columna = err.column ? ` '${err.column}'` : '';
    return {
      status: 400,
      codigo: 'CAMPO_OBLIGATORIO_FALTANTE',
      mensaje: `El campo obligatorio${columna} no fue proporcionado en la solicitud.`
    };
  }

  // 5. Formato de dato inválido (22P02, 22007) -> HTTP 400
  if (err.code === '22P02' || err.code === '22007') {
    return {
      status: 400,
      codigo: 'FORMATO_DATO_INVALIDO',
      mensaje: 'Uno o más parámetros (identificador numérico, fecha o tipo de dato) tienen un formato inválido.'
    };
  }

  // 6. Excepción lanzada explícitamente por un Trigger (P0001) -> HTTP 409
  if (err.code === 'P0001') {
    return {
      status: 409,
      codigo: 'CONFLICTO_REGLA_NEGOCIO',
      mensaje: err.message || 'La operación fue rechazada por una regla de negocio del sistema.'
    };
  }

  return null;
};

module.exports = {
  mapearErrorPg
};
