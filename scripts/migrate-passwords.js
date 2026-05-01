/**
 * Script de migración: hashear contraseñas existentes con bcrypt
 * 
 * USO: node scripts/migrate-passwords.js
 * 
 * Este script:
 * 1. Conecta a la base de datos
 * 2. Lee todos los usuarios y acudientes con contraseñas en texto plano
 * 3. Las hashea con bcrypt (salt rounds = 10)
 * 4. Actualiza los documentos en la BD
 * 
 * SEGURO: Solo hashea contraseñas que NO empiezan con '$2' (ya hasheadas)
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Cargar .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SALT_ROUNDS = 10;

async function migrate() {
    const uri = process.env.MONGO_URI_ACADEMICO || 'mongodb://localhost:27017/ga2026';
    console.log('🔄 Conectando a la base de datos...');
    await mongoose.connect(uri);
    console.log('✅ Conectado');

    const db = mongoose.connection.db;

    // ========================
    // 1. Migrar usuarios (tabla: usuarios)
    // ========================
    console.log('\n📋 Migrando contraseñas de USUARIOS...');
    const usuarios = await db.collection('usuarios').find({ estado: 'A' }).toArray();
    let migrados = 0;
    let yaHasheados = 0;
    let sinPassword = 0;

    for (const u of usuarios) {
        if (!u.password) { sinPassword++; continue; }
        // Si ya está hasheada (empieza con $2a$ o $2b$), saltar
        if (u.password.startsWith('$2')) { yaHasheados++; continue; }

        const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
        await db.collection('usuarios').updateOne(
            { _id: u._id },
            { $set: { password: hash } }
        );
        migrados++;
        console.log(`  ✅ ${u.cuenta || u.id} → hasheado`);
    }
    console.log(`📊 Usuarios: ${migrados} migrados, ${yaHasheados} ya hasheados, ${sinPassword} sin contraseña`);

    // ========================
    // 2. Migrar acudientes (tabla: acudiente)
    // ========================
    console.log('\n📋 Migrando contraseñas de ACUDIENTES...');
    const acudientes = await db.collection('acudiente').find({ estado: 'A' }).toArray();
    let migradosAcud = 0;
    let yaHasheadosAcud = 0;
    let sinClaveAcud = 0;

    for (const a of acudientes) {
        if (!a.clave_acud) { sinClaveAcud++; continue; }
        if (a.clave_acud.startsWith('$2')) { yaHasheadosAcud++; continue; }

        const hash = await bcrypt.hash(a.clave_acud, SALT_ROUNDS);
        await db.collection('acudiente').updateOne(
            { _id: a._id },
            { $set: { clave_acud: hash } }
        );
        migradosAcud++;
        console.log(`  ✅ ${a.usuario_acud || a.Id} → hasheado`);
    }
    console.log(`📊 Acudientes: ${migradosAcud} migrados, ${yaHasheadosAcud} ya hasheados, ${sinClaveAcud} sin clave`);

    console.log('\n🎉 Migración completada');
    console.log(`   Total migrados: ${migrados + migradosAcud}`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
});
