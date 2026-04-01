const express = require('express');
const path = require('path');
const cors = require('cors');

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

// ========================================
// 📌 Middleware
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// 📌 Archivos estáticos
// ========================================
app.use(express.static(path.join(__dirname)));

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
// 📌 Conexión a DB y arranque
// ========================================
(async () => {
    try {
        await conectarDB();
        app.listen(port, () => {
            console.log(`🎓 Servidor Académico corriendo en http://localhost:${port}`);
            console.log(`📚 Panel Admin: http://localhost:${port}/admin`);
            console.log(`👨‍🏫 Panel Profesor: http://localhost:${port}/profesor`);
            console.log(`👨‍🎓 Panel Estudiante: http://localhost:${port}/estudiante`);
            console.log(`👨‍👩‍👧 Panel Padre: http://localhost:${port}/padre`);
        });
    } catch (err) {
        console.error('❌ Error al iniciar servidor académico:', err);
        process.exit(1);
    }
})();
