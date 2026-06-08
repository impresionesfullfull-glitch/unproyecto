// server.js
import 'dotenv/config';
import express from 'express';
import pool from './db.js';
import { Blockchain, Transaction } from './blockchain_core.js';
import { CriptoIdentidad } from './cripto_identidad.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURACIÓN R2 ---
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: true,
});	


// Instancia lógica única de la Blockchain conectada a Neon.tech
const miRedCrowdfunding = new Blockchain();

// Inicialización asíncrona obligatoria del bloque génesis relacional al arrancar la API
await miRedCrowdfunding.asegurarGenesis();

console.log('\n==========================================================');
console.log('=== SERVIDOR WEB3 API POSTGRESQL BIMODAL INICIADO ===');
console.log('==========================================================\n');

// 1. ENDPOINT: Registro
app.post('/api/auth/registrar', async (req, res) => {
    const { llavePublica, rol } = req.body;
    if (!llavePublica || !rol) return res.status(400).json({ success: false, error: 'Faltan parámetros.' });
    try {
        const checkUser = await pool.query('SELECT * FROM usuarios WHERE llave_publica = $1', [llavePublica]);
        if (checkUser.rows.length > 0) return res.status(400).json({ success: false, error: 'Ya registrado.' });
        await pool.query('INSERT INTO usuarios (llave_publica, rol, desafio_activo) VALUES ($1, $2, NULL)', [llavePublica, rol]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// 2. ENDPOINT: Desafío
app.post('/api/auth/desafio', async (req, res) => {
    const { llavePublica, rol } = req.body;
    try {
        const userCheck = await pool.query('SELECT * FROM usuarios WHERE llave_publica = $1 AND rol = $2', [llavePublica, rol]);
        if (userCheck.rows.length === 0) return res.status(403).json({ error: 'No registrado.' });
        const desafio = `Login:${rol}_Nonce:${Math.random()}_Time:${Date.now()}`;
        await pool.query('UPDATE usuarios SET desafio_activo = $1 WHERE llave_publica = $2', [desafio, llavePublica]);
        res.json({ desafio });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. ENDPOINT: Verificar
app.post('/api/auth/verificar', async (req, res) => {
    const { llavePublica, firmaDerivadaHex } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM usuarios WHERE llave_publica = $1', [llavePublica]);
        if (userRes.rows.length === 0 || !userRes.rows[0].desafio_activo) return res.status(400).json({ error: 'Sin desafío activo.' });
        const { desafio_activo, rol } = userRes.rows[0];
        if (CriptoIdentidad.verificarFirmaMensaje(desafio_activo, firmaDerivadaHex, llavePublica)) {
            await pool.query('UPDATE usuarios SET desafio_activo = NULL WHERE llave_publica = $1', [llavePublica]);
            res.json({ success: true, rol, redireccion: rol === 'postulante' ? '/panel-postulante' : '/panel-participante' });
        } else res.status(401).json({ success: false, error: 'Firma inválida.' });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// 4. ENDPOINT: Proyectos
app.get('/api/proyectos/publicos', async (req, res) => {
    try { res.json(await miRedCrowdfunding.smartContractManager.obtenerTodosLosContratos()); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. ENDPOINT: Lanzar Proyecto
app.post('/api/proyecto/lanzar', async (req, res) => {
    const { owner, titulo, descripcion, cantidadNodos, valorTotal, portada, galeria } = req.body;
    try {
        const idContrato = await miRedCrowdfunding.smartContractManager.inicializarContratoDinamico({
            owner, titulo, descripcion, cantidadNodos, valorTotal, portada, galeria, timestamp: Date.now()
        });
        res.json({ success: true, idContrato });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. ENDPOINT: Invertir
app.post('/api/proyecto/invertir', async (req, res) => {
    const { comprador, contractAddress, cantidad, firmaTx } = req.body;
    try {
        const tx = new Transaction(comprador, contractAddress, parseInt(cantidad));
        tx.signature = firmaTx;
        await miRedCrowdfunding.addTransaction(tx);
        await miRedCrowdfunding.minePendingTransactions('nodo_validador_sistema');
        res.json({ success: true });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/proyecto/presigned-url', async (req, res) => {
    const { fileName, fileType } = req.body;
    
    // 1. Definimos 'key' AQUÍ, dentro de la función, antes de usarla
    const key = `proyectos/${Date.now()}_${fileName}`;
    
    // 2. Ahora el comando puede acceder a 'key' sin problemas
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key, 
        ContentType: fileType,
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (err) {
        console.error("Error al generar URL:", err);
        res.status(500).json({ error: "No se pudo generar la URL" });
    }
});

// --- NUEVOS ENDPOINTS PARA GESTIÓN DE FOTOS ---

// 1. Actualizar Foto de Perfil (Para Participantes y Postulantes)
app.post('/api/perfil/actualizar', async (req, res) => {
    const { llavePublica, url } = req.body;
    try {
        await pool.query('UPDATE usuarios SET foto_perfil = $1 WHERE llave_publica = $2', [url, llavePublica]);
        res.json({ success: true, mensaje: 'Foto de perfil actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


app.post('/api/proyecto/presigned-url', async (req, res) => {
    const { fileName, fileType } = req.body;
    
    // Generamos un nombre de archivo único para evitar sobrescrituras
    const key = `proyectos/${Date.now()}_${fileName}`;
    
const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
});

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: "No se pudo generar la URL" });
    }
});

app.post('/api/proyecto/agregar-foto', async (req, res) => {
    const { llavePublica, url } = req.body; 
    
    try {
        // 1. Buscamos el proyecto del usuario
        const proyecto = await pool.query(
            'SELECT contract_address FROM smart_contracts WHERE owner = $1', 
            [llavePublica]
        );
        
        if (proyecto.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No tienes proyectos activos.' });
        }
        
        const addr = proyecto.rows[0].contract_address;
        
        // 2. Insertamos en la tabla de galería (asegúrate de que esta tabla exista en migrar.js)
        await pool.query(
            'INSERT INTO galeria_proyectos (contract_address, url_foto) VALUES ($1, $2)', 
            [addr, url]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/proyecto/obtener-galeria', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM galeria_proyectos ORDER BY fecha_subida DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para obtener el Feed con Comentarios
app.get('/api/proyecto/feed', async (req, res) => {
    try {
        // Obtenemos publicaciones y sus respectivos comentarios en una sola query
        const query = `
            SELECT p.*, json_agg(c.*) as comentarios
            FROM galeria_proyectos p
            LEFT JOIN comentarios_avances c ON p.id = c.proyecto_id
            GROUP BY p.id
            ORDER BY p.fecha_subida DESC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});






app.listen(PORT, () => console.log(`🚀 Servidor iniciado en puerto: ${PORT}`)); 