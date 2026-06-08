// main.js
import { CriptoIdentidad } from './cripto_identidad.js';
import { Transaction } from './blockchain_core.js';

const API_URL = 'http://localhost:3000/api';

/**
 * Función utilitaria para hacer peticiones HTTP POST limpias sin librerías externas
 */
async function postData(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function ejecutarPruebaCompleta() {
    console.log('=== INICIANDO CLIENTE TESTING WEB3 + POSTGRESQL (NEON.TECH) ===\n');

    // 1. Generación de las identidades criptográficas por curva elíptica secp256k1
    const identidadPostulante = CriptoIdentidad.generarNuevaIdentidad();
    const identidadInversorA = CriptoIdentidad.generarNuevaIdentidad();

    console.log(`[BILLETERA] Llave pública Postulante: ${identidadPostulante.llavePublica.substring(0, 30)}...`);
    console.log(`[BILLETERA] Llave pública Inversor A: ${identidadInversorA.llavePublica.substring(0, 30)}...\n`);

    // ==========================================
    // PRUEBA 1: Autenticación Bimodal (Login)
    // ==========================================
    console.log('🔐 [PASO 1] Solicitando desafío criptográfico para el Postulante...');
    const resDesafio = await postData('/auth/desafio', {
        llavePublica: identidadPostulante.llavePublica,
        rol: 'postulante'
    });
    console.log(` -> Desafío recibido de Neon: "${resDesafio.desafio}"`);

    console.log('✍ Firmando el desafío con la llave privada del Postulante...');
    const firmaLogin = CriptoIdentidad.firmarMensaje(resDesafio.desafio, identidadPostulante.llavePrivada).derivadaHex;

    console.log('📡 Enviando firma de verificación al servidor...');
    const resVerificar = await postData('/auth/verificar', {
        llavePublica: identidadPostulante.llavePublica,
        firmaDerivadaHex: firmaLogin
    });
    console.log(` -> Resultado del Login: ${JSON.stringify(resVerificar)}\n`);


    // ==========================================
    // PRUEBA 2: Emitir Proyecto (Smart Contract)
    // ==========================================
    console.log('🏗 [PASO 2] Preparando transacción de apertura del proyecto (500 nodos)...');
    const txAperturaVirtual = new Transaction(identidadPostulante.llavePublica, 'CONTRATO_GIMNASIO_01', 500);
    const hashApertura = txAperturaVirtual.calculateHash();
    
    console.log('✍ Firmando hash de la transacción de emisión...');
    const firmaApertura = CriptoIdentidad.firmarMensaje(hashApertura, identidadPostulante.llavePrivada).derivadaHex;

    console.log('📡 Transmitiendo emisión de Smart Contract a PostgreSQL...');
    const resEmitir = await postData('/proyecto/emitir', {
        emisorLlavePublica: identidadPostulante.llavePublica,
        firmaTx: firmaApertura
    });
    console.log(` -> Respuesta del Servidor: ${JSON.stringify(resEmitir)}\n`);


    // ==========================================
    // PRUEBA 3: Adquisición de Nodos (Inversión)
    // ==========================================
    const cantidadAComprar = 200;
    console.log(`💰 [PASO 3] Inversor A intenta adquirir ${cantidadAComprar} Nodos...`);
    const txCompraVirtual = new Transaction(identidadInversorA.llavePublica, 'CONTRATO_GIMNASIO_01', cantidadAComprar);
    const hashCompra = txCompraVirtual.calculateHash();

    console.log('✍ Firmando hash de la transacción de compra...');
    const firmaCompra = CriptoIdentidad.firmarMensaje(hashCompra, identidadInversorA.llavePrivada).derivadaHex;

    console.log('📡 Transmitiendo orden de compra a la Mempool de Neon...');
    const resCompra = await postData('/proyecto/comprar', {
        compradorLlavePublica: identidadInversorA.llavePublica,
        cantidadNodos: cantidadAComprar,
        firmaTx: firmaCompra
    });
    console.log(` -> Respuesta de la red: ${JSON.stringify(resCompra)}\n`);


    // ==========================================
    // PRUEBA 4: Consultar estado final desde la nube (Sincronizado)
    // ==========================================
    console.log('📊 [PASO 4] Consultando la integridad y el libro mayor inmutable...');
    const resBlockchain = await fetch(`${API_URL}/blockchain`).then(r => r.json());
    const resContrato = await fetch(`${API_URL}/contrato/estado`).then(r => r.json());

    console.log(` -> Longitud de la Cadena de bloques en Neon: ${resBlockchain.longitud_cadena}`);
    console.log(` -> ¿La Blockchain es válida?: ${resBlockchain.es_valida_e_inmutable}`);
    console.log(` -> Estado del Contrato de Crowdfunding: ${JSON.stringify(resContrato)}`);
    
    console.log('\n=== PRUEBA FINALIZADA CON ÉXITO ===');
}

ejecutarPruebaCompleta().catch(err => console.error('❌ Error en el flujo de pruebas:', err));