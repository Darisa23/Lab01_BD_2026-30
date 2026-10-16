// Punto de entrada del servidor: verificación de BD y arranque de Express

const app = require('./app');
const env = require('./config/env');
const { verificarConexion, pool } = require('./config/db');

/**
 * Inicializa el servidor HTTP verificando previamente la conexión a la base de datos.
 */
const iniciarServidor = async () => {
  try {
    console.log('[SISTEMA] Iniciando servidor de la biblioteca...');
    console.log(`[SISTEMA] Entorno: ${env.NODE_ENV}`);

    // Verificación de conectividad a PostgreSQL antes de escuchar peticiones
    await verificarConexion();

    const servidor = app.listen(env.PORT, () => {
      console.log(`[SISTEMA] API REST operativa y escuchando en el puerto ${env.PORT}`);
      console.log(`[SISTEMA] Endpoint de comprobación: http://localhost:${env.PORT}/api/health`);
    });

    // Cierre ordenado (graceful shutdown)
    const cerrar = async (senal) => {
      console.log(`\n[SISTEMA] Señal ${senal} recibida. Cerrando conexiones...`);
      servidor.close(async () => {
        try {
          await pool.end();
          console.log('[BD] Pool de conexiones cerrado satisfactoriamente.');
          process.exit(0);
        } catch (err) {
          console.error('[BD ERROR] Error cerrando el pool:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => cerrar('SIGINT'));
    process.on('SIGTERM', () => cerrar('SIGTERM'));
  } catch (error) {
    console.error('\n[FATAL] Error crítico al inicializar la base de datos o el servidor:');
    console.error(error.message);
    process.exit(1);
  }
};

iniciarServidor();
