// migrar.js - Bloque de expansión social
async function ejecutarMigracion() {
    try {
        console.log("🛠 Iniciando migración de base de datos (Expansión Social)...");
        
        // 1. Tablas base existentes (mantenidas)
        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
            llave_publica TEXT PRIMARY KEY,
            rol TEXT,
            desafio_activo TEXT,
            foto_perfil TEXT
        );`);

        // 2. Tablas Sociales Nuevas
        // Tabla de publicaciones de los Postulantes
        await pool.query(`CREATE TABLE IF NOT EXISTS publicaciones (
            id SERIAL PRIMARY KEY,
            autor TEXT REFERENCES usuarios(llave_publica),
            contenido TEXT NOT NULL,
            media_url TEXT,
            timestamp BIGINT NOT NULL
        );`);

        // Tabla de comentarios en las publicaciones
        await pool.query(`CREATE TABLE IF NOT EXISTS comentarios (
            id SERIAL PRIMARY KEY,
            publicacion_id INTEGER REFERENCES publicaciones(id) ON DELETE CASCADE,
            autor TEXT REFERENCES usuarios(llave_publica),
            texto TEXT NOT NULL,
            timestamp BIGINT NOT NULL
        );`);

        // Tabla de likes (usamos UNIQUE para evitar que un usuario de doble like a lo mismo)
        await pool.query(`CREATE TABLE IF NOT EXISTS likes (
            publicacion_id INTEGER REFERENCES publicaciones(id) ON DELETE CASCADE,
            autor TEXT REFERENCES usuarios(llave_publica),
            PRIMARY KEY (publicacion_id, autor)
        );`);
        
        console.log("✅ Tablas sociales creadas correctamente.");
        process.exit();
    } catch (e) {
        console.error("❌ Error en la migración:", e);
        process.exit(1);
    }
}