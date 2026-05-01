const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI_ACADEMICO) {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const conectarDB = require('./config/database');
const academicoRoutes = require('./routes/academico.routes');

const app = express();
const port = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// ========================================
// 🔒 SEGURIDAD - Headers HTTP
// ========================================
// Helmet configura headers de seguridad automáticamente:
// X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
// Strict-Transport-Security, Content-Security-Policy, etc.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            // Necesario para onload="this.media='all'" en el <link> de Bootstrap (Login.html)
            // Helmet 8 establece script-src-attr 'none' por defecto, esto lo sobreescribe
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "blob:"],
            // CDNs necesarios para source maps y requests desde los paneles
            connectSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "https://fonts.gstatic.com"
            ]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// ========================================
// 🔒 SEGURIDAD - CORS restringido
// ========================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (curl, server-to-server, same-origin)
        if (!origin) return callback(null, true);
        // En desarrollo permitir cualquier localhost
        if (!isProduction && origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        // En produccion, verificar lista de origenes permitidos
        if (allowedOrigins.length > 0 && allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        // Si no hay lista configurada en produccion, bloquear origen desconocido
        if (allowedOrigins.length === 0) return callback(null, true); // permisivo si no hay config
        return callback(new Error('Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
}));

// ========================================
// 🔒 SEGURIDAD - Rate Limiting
// ========================================
// Límite general: 200 requests por minuto por IP
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, intente de nuevo en un momento' }
});

// Límite estricto para login: 10 intentos por 15 minutos por IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Espere 15 minutos.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);

// ========================================
// 📌 Body parsers
// ========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// 🔒 SEGURIDAD - Bloquear archivos sensibles
// ========================================
// CRÍTICO: Evitar acceso a mongodump, scripts con credenciales,
// archivos de configuración y archivos internos del servidor
app.use((req, res, next) => {
    const blocked = [
        /^\/mongodump/i,
        /^\/\.env/i,
        /^\/\.git/i,
        /^\/config\//i,
        /^\/models\//i,
        /^\/routes\//i,
        /^\/node_modules\//i,
        /^\/check_types\.js/i,
        /^\/tmp_/i,
        /^\/server-academico\.js/i,
        /^\/package\.json/i,
        /^\/package-lock\.json/i,
        /^\/Dockerfile/i,
        /^\/\.dockerignore/i,
        /^\/\.gitignore/i
    ];

    if (blocked.some(pattern => pattern.test(req.path))) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
});

// ========================================
// 📌 Archivos estáticos (solo HTML y assets)
// ========================================
app.use(express.static(path.join(__dirname), {
    dotfiles: 'deny',
    index: false
}));

// ========================================
// 🔒 SEGURIDAD - JWT para proteger API
// ========================================
const { verificarToken } = require('./middleware/auth');

// Proteger TODAS las rutas /api/* EXCEPTO login y health
app.use('/api', (req, res, next) => {
    // Rutas públicas (no requieren token)
    const rutasPublicas = ['/auth/login', '/health'];
    if (rutasPublicas.some(ruta => req.path === ruta)) {
        return next();
    }
    // Todas las demás rutas requieren JWT válido
    verificarToken(req, res, next);
});

// ========================================
// 📌 Rutas API
// ========================================
app.use('/api', academicoRoutes);

// ========================================
// 📌 Rutas de vistas
// ========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'VistaAdmin.html')));
app.get('/profesor', (req, res) => res.sendFile(path.join(__dirname, 'VistaProfesor.html')));
app.get('/estudiante', (req, res) => res.sendFile(path.join(__dirname, 'VistaEstudiante.html')));
app.get('/padre', (req, res) => res.sendFile(path.join(__dirname, 'VistaPadre.html')));

// ========================================
// 💓 Health Check
// ========================================
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// ========================================
// 🔒 SEGURIDAD - Manejo global de errores
// ========================================
// No enviar error.message en producción para evitar fuga de información
app.use((err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ error: 'Origen no permitido' });
    }
    console.error('Error no manejado:', err.message);
    res.status(500).json({
        error: isProduction ? 'Error interno del servidor' : err.message
    });
});

// ========================================
// 📌 Conexión a DB y arranque
// ========================================
(async () => {
    try {
        await conectarDB();
        app.listen(port, () => {
            console.log(`🎓 Servidor Académico corriendo en puerto ${port}`);
            if (!isProduction) {
                console.log(`📚 Panel Admin: http://localhost:${port}/admin`);
                console.log(`👨‍🏫 Panel Profesor: http://localhost:${port}/profesor`);
                console.log(`👨‍🎓 Panel Estudiante: http://localhost:${port}/estudiante`);
                console.log(`👨‍👩‍👧 Panel Padre: http://localhost:${port}/padre`);
            }
        });
    } catch (err) {
        console.error('❌ Error al iniciar servidor académico:', err.message);
        process.exit(1);
    }
})();
