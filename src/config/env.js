// Carga y validación estricta de variables de entorno

const dotenv = require('dotenv');
dotenv.config();

const variablesRequeridas = ['DATABASE_URL', 'JWT_SECRET'];
const variablesFaltantes = [];

for (const variable of variablesRequeridas) {
  if (!process.env[variable] || process.env[variable].trim() === '') {
    variablesFaltantes.push(variable);
  }
}

if (variablesFaltantes.length > 0) {
  console.error('\n[ERROR DE CONFIGURACIÓN] Faltan variables de entorno obligatorias:');
  variablesFaltantes.forEach((v) => console.error(`  - ${v}`));
  console.error('\nPor favor, cree y configure su archivo .env basándose en .env.example.\n');
  process.exit(1);
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL.trim(),
  JWT_SECRET: process.env.JWT_SECRET.trim(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  DIAS_PRESTAMO: parseInt(process.env.DIAS_PRESTAMO, 10) || 7,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

module.exports = env;
