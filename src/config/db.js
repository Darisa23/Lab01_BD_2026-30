// Configuración del pool de conexiones PostgreSQL con el paquete 'pg'

const { Pool, types } = require('pg');
const env = require('./env');

// Configuración de parsers de tipos de datos de PostgreSQL
// OID 1082: DATE -> Devolver como cadena 'YYYY-MM-DD' para evitar problemas de desfase horario UTC
types.setTypeParser(1082, (val) => val);

// OID 1700: NUMERIC / DECIMAL -> Devolver como número de punto flotante en JavaScript
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

// OID 20: BIGINT / INT8 (utilizado habitualmente por COUNT) -> Devolver como entero de JavaScript
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

// Creación del pool de conexiones
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Monitoreo de errores inesperados en clientes inactivos del pool
pool.on('error', (err) => {
  console.error('[ERROR EN POOL PG] Error inesperado en cliente inactivo de base de datos:', err.message);
});

/**
 * Ejecuta una consulta SQL parametrizada utilizando un cliente del pool.
 * @param {string} text - Sentencia SQL con marcadores ($1, $2, ...)
 * @param {Array} params - Parámetros para la consulta
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Ejecuta una serie de operaciones dentro de una transacción de base de datos.
 * Maneja automáticamente BEGIN, COMMIT, ROLLBACK y la liberación del cliente al pool.
 * @param {function(import('pg').PoolClient): Promise<any>} callback - Función asíncrona que recibe el cliente de la transacción
 * @returns {Promise<any>} Resultado devuelto por el callback
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[ERROR EN ROLLBACK]', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Verifica la conectividad con la base de datos al inicializar la aplicación.
 * @returns {Promise<boolean>}
 */
const verificarConexion = async () => {
  const cliente = await pool.connect();
  try {
    const res = await cliente.query('SELECT NOW() AS hora_actual, current_database() AS bd');
    console.log(`[BD CONECTADA] Conectado exitosamente a: ${res.rows[0].bd} (${res.rows[0].hora_actual})`);
    return true;
  } finally {
    cliente.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
  verificarConexion
};
