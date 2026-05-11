const mongoose = require('mongoose');

/**
 * Conexión a MongoDB con cache para entornos serverless (Vercel).
 * 
 * En serverless, cada invocación puede reutilizar el mismo proceso Node.js.
 * Cachear la conexión en `global` evita crear una nueva conexión por cada
 * request, lo que agotaría el pool de conexiones de MongoDB Atlas.
 * 
 * Patrón estándar: https://mongoosejs.com/docs/lambda.html
 */

// Cache global (sobrevive entre invocaciones del mismo contenedor)
let cached = global._mongooseConnection;
if (!cached) {
    cached = global._mongooseConnection = { conn: null, promise: null };
}

const conectarDB = async () => {
    // Si ya hay conexión activa, reutilizarla
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    const uri = process.env.MONGO_URI_ACADEMICO || 'mongodb://localhost:27017/ga2026';

    // Si hay una promesa de conexión en curso, esperarla
    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            // Configuración optimizada para serverless
            maxPoolSize: 10,        // Máximo de conexiones en el pool
            serverSelectionTimeoutMS: 5000,  // Timeout selección de servidor
            socketTimeoutMS: 45000,          // Timeout de socket
            bufferCommands: false,           // No bufferar si no hay conexión
        }).then(conn => {
            const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
            console.log(`🎓 Conectado a MongoDB académico: ${safeUri}`);
            return conn;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        // Si falla, limpiar la promesa para reintentar en el próximo request
        cached.promise = null;
        console.error('❌ Error al conectar la base de datos académica:', error.message);
        throw error;
    }

    return cached.conn;
};

module.exports = conectarDB;
