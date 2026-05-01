const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
        const uri = process.env.MONGO_URI_ACADEMICO || 'mongodb://localhost:27017/ga2026';
        await mongoose.connect(uri);
        // SEGURIDAD: No imprimir URI completa (contiene contraseña)
        const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`🎓 Conectado a MongoDB académico: ${safeUri}`);
    } catch (error) {
        console.error('❌ Error al conectar la base de datos académica:', error.message);
        process.exit(1);
    }
};

module.exports = conectarDB;

