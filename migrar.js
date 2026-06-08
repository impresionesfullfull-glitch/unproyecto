import pool from './db.js';

async function ejecutarMigracion() {
    try {
        console.log("🛠 Iniciando migración de base de datos...");
        
        await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil TEXT;`);
        
        await pool.query(`CREATE TABLE IF NOT EXISTS galeria_proyectos (
            id SERIAL PRIMARY KEY,
            contract_address TEXT,
            url_foto TEXT,
            fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        
        console.log("✅ Tablas actualizadas correctamente.");
        process.exit();
    } catch (e) {
        console.error("❌ Error en migración:", e);
    }
}
ejecutarMigracion();