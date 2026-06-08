// db.js
import pg from 'pg';
const { Pool } = pg;

// Configuramos el pool usando la variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Para entornos de desarrollo local en Windows, mantener false ayuda con certificados
    // Para producción real, lo ideal es cargar el certificado CA de Neon
    rejectUnauthorized: false 
  },
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Probamos la conexión al iniciar para detectar errores de inmediato
pool.on('connect', () => {
  console.log('✅ Conexión establecida con la base de datos Neon.tech');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de base de datos:', err);
});

export default pool;