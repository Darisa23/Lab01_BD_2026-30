// Configuración de la aplicación Express y middlewares globales

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const apiRouter = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 1. Cabeceras de seguridad HTTP
app.use(helmet());

// 2. Configuración de CORS
const configurarCors = () => {
  if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') {
    return cors({ origin: '*' });
  }

  const origenesPermitidos = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  return cors({
    origin: (origin, callback) => {
      // Permite solicitudes sin origen (como Postman o curl) o si está en la lista blanca
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado por la política de CORS'));
      }
    },
    credentials: true
  });
};

app.use(configurarCors());

// 3. Parseo del cuerpo de las solicitudes (JSON y formularios)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Redirección amigable o alias para /health directo a /api/health
app.get('/health', (req, res) => res.redirect('/api/health'));

// 5. Montaje de rutas con prefijo /api
app.use('/api', apiRouter);

// 6. Middleware para rutas no encontradas (404)
app.use(notFound);

// 7. Middleware global para manejo de errores
app.use(errorHandler);

module.exports = app;
