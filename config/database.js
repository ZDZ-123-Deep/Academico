const mongoose = require('mongoose');

/**
 * Conexión a MongoDB con cache para entornos serverless (Vercel).
 *
 * En serverless, el módulo se importa y la app se exporta antes de que
 * cualquier conexión async resuelva. Por eso cada handler llama a
 * conectarDB() — si ya está conectado, retorna inmediatamente del cache.
 */

let cached = global._mongooseConnection;
if (!cached) {
    cached = global._mongooseConnection = { conn: null, promise: null };
}

const conectarDB = async () => {
    // Conexión ya activa — retornar inmediatamente
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    const uri = process.env.MONGO_URI_ACADEMICO || 'mongodb://localhost:27017/ga2026';

    // Reutilizar promesa en curso (evita múltiples connect() simultáneos)
    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            // bufferCommands: true (default) — permite que las queries
            // esperen hasta que la conexión esté lista
        }).then(conn => {
            const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
            console.log(`🎓 Conectado a MongoDB académico: ${safeUri}`);
            return conn;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null; // Limpiar para reintentar en el próximo request
        console.error('❌ Error al conectar la base de datos académica:', error.message);
        throw error;
    }

    return cached.conn;
};

module.exports = conectarDB;
