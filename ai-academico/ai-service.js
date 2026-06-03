/**
 * MÓDULO IA ACADÉMICO — Servicio independiente
 * Puerto: 3001 | Solo lectura de MongoDB | No modifica datos existentes
 *
 * Reutiliza la misma URI de MongoDB y JWT_SECRET del .env principal.
 * Los modelos se importan desde ../models/ (los mismos del sistema principal)
 * pero este proceso solo ejecuta operaciones de lectura (.find, .findOne, .aggregate).
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const conectarDB = require('../config/database');
const rutasIA = require('./routes/ia.routes');

const app = express();

// Helmet con Cross-Origin-Resource-Policy en cross-origin para permitir
// que el browser pueda leer las respuestas desde un origen diferente (puerto 8080 → 3001)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false
}));

// CORS: refleja el origen de la petición en lugar de usar '*'
// (browsers bloquean '*' cuando el servidor también envía Allow-Credentials)
app.use(cors({
  origin: (origin, cb) => cb(null, origin || '*'),
  credentials: false
}));
app.use(express.json());

// Rate limiting específico para el módulo IA (10 req/min por usuario)
const limiterIA = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera un momento antes de reintentar.' }
});

app.use('/api/ia', limiterIA);
app.use('/api/ia', rutasIA);

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'IA Académico v2', ts: new Date().toISOString() }));

const PORT = process.env.AI_PORT || 3001;

conectarDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Servicio IA v2 activo en puerto ${PORT}`));
  })
  .catch(err => {
    console.error('Error al conectar MongoDB para módulo IA:', err.message);
    process.exit(1);
  });
