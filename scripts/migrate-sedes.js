/**
 * migrate-sedes.js
 * Crea "Sede Principal" y asigna sede_id a todos los documentos existentes.
 * IDEMPOTENTE: se puede ejecutar múltiples veces sin daño.
 * Uso: node scripts/migrate-sedes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI_ACADEMICO || process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
    console.log('🏫 Iniciando migración de Sedes...\n');
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Crear "Sede Principal" si no existe
    const sedesCol = db.collection('sedes');
    let sedePrincipal = await sedesCol.findOne({ codigo: 'SP-01' });

    if (!sedePrincipal) {
        const result = await sedesCol.insertOne({
            nombre: 'Sede Principal',
            codigo: 'SP-01',
            direccion: '',
            telefono: '',
            email: '',
            rector_sede: '',
            color: '#6366f1',
            activa: true,
            creado: new Date()
        });
        sedePrincipal = await sedesCol.findOne({ _id: result.insertedId });
        console.log(`✅ Sede Principal creada con _id: ${sedePrincipal._id}`);
    } else {
        console.log(`ℹ️  Sede Principal ya existe: ${sedePrincipal._id}`);
    }

    const sedeId = sedePrincipal._id;

    // 2. Colecciones a migrar
    const colecciones = [
        'estudiante',
        'docente',
        'curso',
        'asignaturas',
        'asistencia_detalle',
        'observaciones',
        'pagos',
        'horario',
        'horario_atencion',
        'anuncios',
    ];

    // Nombres reales en MongoDB pueden variar - probamos alternativas
    const coleccionesAlt = {
        'asignaturas': ['asignatura', 'asignaturas'],
        'asistencia_detalle': ['asistencia_detalle', 'asistencia', 'asistencias'],
        'observaciones': ['observaciones', 'observacion'],
        'pagos': ['pagos', 'pago'],
        'horario': ['horario', 'horarios'],
        'horario_atencion': ['horario_atencion', 'horarios_atencion'],
        'anuncios': ['anuncios', 'anuncio'],
    };

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('\n📋 Colecciones encontradas en MongoDB:', collectionNames.join(', '));

    let totalMigrado = 0;

    for (const col of colecciones) {
        // Resolver nombre real
        const altNames = coleccionesAlt[col] || [col];
        const realName = altNames.find(n => collectionNames.includes(n)) || col;

        if (!collectionNames.includes(realName)) {
            console.log(`  ⚠️  Colección "${realName}" no encontrada, saltando...`);
            continue;
        }

        const collection = db.collection(realName);
        const result = await collection.updateMany(
            { sede_id: { $exists: false } },
            { $set: { sede_id: sedeId } }
        );

        if (result.modifiedCount > 0) {
            console.log(`  ✅ ${realName}: ${result.modifiedCount} documentos migrados`);
            totalMigrado += result.modifiedCount;
        } else {
            console.log(`  ✓  ${realName}: ya migrado (0 pendientes)`);
        }
    }

    console.log(`\n🎉 Migración completa. Total documentos actualizados: ${totalMigrado}`);
    console.log(`   Sede Principal ID: ${sedeId}`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
});
