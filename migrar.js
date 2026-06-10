import pool from './db.js';

async function ejecutarMigracion() {
    try {
        console.log("🛠 Iniciando migración de base de datos...");
        
        // 1. Tabla de Usuarios (si la usas)
        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
            llave_publica TEXT PRIMARY KEY,
            rol TEXT,
            desafio_activo TEXT,
            foto_perfil TEXT
        );`);

        // 2. Tabla de Bloques (CRÍTICO)
        await pool.query(`CREATE TABLE IF NOT EXISTS bloques (
            bloque_id SERIAL PRIMARY KEY,
            timestamp BIGINT,
            previous_hash TEXT,
            hash TEXT,
            nonce INTEGER
        );`);

        // 3. Tabla de Transacciones (CRÍTICO)
        await pool.query(`CREATE TABLE IF NOT EXISTS transacciones (
            id SERIAL PRIMARY KEY,
            from_address TEXT,
            to_address TEXT,
            amount NUMERIC,
            timestamp BIGINT,
            signature TEXT,
            bloque_id INTEGER REFERENCES bloques(bloque_id)
        );`);

        // 4. Tus tablas existentes
        await pool.query(`CREATE TABLE IF NOT EXISTS galeria_proyectos (
            id SERIAL PRIMARY KEY,
            contract_address TEXT,
            url_foto TEXT,
            fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        
        console.log("✅ Tablas creadas y actualizadas correctamente.");
        process.exit();
    } catch (e) {
        console.error("❌ Error en migración:", e);
    }
}
ejecutarMigracion();