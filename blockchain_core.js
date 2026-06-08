// blockchain_core.js
import crypto from 'crypto';
import pool from './db.js';

/**
 * Representa una transacción individual en la red.
 */
export class Transaction {
    constructor(fromAddress, toAddress, amount, timestamp = Date.now(), signature = null) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = timestamp;
        this.signature = signature;
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(this.fromAddress + this.toAddress + this.amount + this.timestamp)
            .digest('hex');
    }
}

/**
 * Representa un bloque individual dentro de la cadena.
 */
export class Block {
    constructor(timestamp, transactions, previousHash = '', nonce = 0, hash = null) {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = nonce;
        this.hash = hash || this.calculateHash();
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(this.timestamp + JSON.stringify(this.transactions) + this.previousHash + this.nonce)
            .digest('hex');
    }

    mineBlock(difficulty) {
        const objetivo = '0'.repeat(difficulty);
        while (this.hash.substring(0, difficulty) !== objetivo) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`[MINADO EXITOSO] Bloque minado con éxito: ${this.hash} (Nonce: ${this.nonce})`);
    }
}

/**
 * Lógica programable del Smart Contract de Fondeo Parametrizable en PostgreSQL.
 */
export class SmartContractGimnasio {
    constructor() {
        this.contractAddressGlobalPlaceholder = 'CONTRATO_MAESTRO_DISTRIBUIDO';
    }

    async obtenerTodosLosContratos() {
        const res = await pool.query('SELECT * FROM smart_contracts ORDER BY fecha_inicio DESC');
        return res.rows;
    }

    async obtenerContratoPorId(address) {
        const res = await pool.query('SELECT * FROM smart_contracts WHERE contract_address = $1', [address]);
        return res.rows[0] || null;
    }

    /**
     * Inicializa el reloj del contrato inteligente dinámico (Actualizado).
     */
    async inicializarContratoDinamico({ owner, titulo, descripcion, cantidadNodos, valorTotal, portada, galeria, timestamp }) {
        const precioNodo = Number(valorTotal) / parseInt(cantidadNodos);
        const fechaLimite = timestamp + (150 * 24 * 60 * 60 * 1000); 

        const idContratoUnico = 'CTO_' + crypto.createHash('md5').update(owner + timestamp).digest('hex').substring(0, 10).toUpperCase();

        await pool.query(
            `INSERT INTO smart_contracts (contract_address, owner_address, titulo, descripcion, portada, galeria, max_nodos, precio_nodo_token, monto_total_necesitado, nodos_vendidos, fecha_inicio, fecha_limite, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, 'FONDEANDO')`,
            [idContratoUnico, owner, titulo, descripcion, portada, JSON.stringify(galeria), cantidadNodos, precioNodo, valorTotal, timestamp, fechaLimite]
        );
        
        await pool.query('DELETE FROM contrato_participantes WHERE contract_address = $1', [idContratoUnico]);
        console.log(`[SMART CONTRACT SQL] Proyecto "${titulo}" activado en Neon con dirección: ${idContratoUnico}`);
        return idContratoUnico;
    }

    async comprarNodoDinamico(contractAddress, comprador, cantidad, timestamp) {
        const sc = await this.obtenerContratoPorId(contractAddress);
        if (!sc) throw new Error('El Smart Contract especificado no existe o no ha sido desplegado.');

        if (sc.estado !== 'FONDEANDO') {
            throw new Error(`El contrato no está aceptando fondos. Estado actual: ${sc.estado}`);
        }

        if (timestamp > Number(sc.fecha_limite)) {
            await this.verificarCierrePorTiempo(contractAddress, timestamp);
            throw new Error('El plazo de 150 días ha expirado.');
        }

        const nuevosNodosVendidos = Number(sc.nodos_vendidos) + cantidad;
        if (nuevosNodosVendidos > sc.max_nodos) {
            throw new Error(`Cupo insuficiente. Quedan disponibles ${sc.max_nodos - Number(sc.nodos_vendidos)} nodos.`);
        }

        await pool.query(
            `INSERT INTO contrato_participantes (contract_address, inversor_llave_publica, nodos_adquiridos)
             VALUES ($1, $2, $3)
             ON CONFLICT (contract_address, inversor_llave_publica)
             DO UPDATE SET nodos_adquiridos = contrato_participantes.nodos_adquiridos + $3`,
            [contractAddress, comprador, cantidad]
        );

        let nuevoEstado = sc.estado;
        if (nuevosNodosVendidos === sc.max_nodos) {
            nuevoEstado = 'EXITOSO';
            console.log(`🎉 [HASH MAESTRO ACTIVADO] Proyecto ${contractAddress} completado.`);
        }

        await pool.query(
            'UPDATE smart_contracts SET nodos_vendidos = $1, estado = $2 WHERE contract_address = $3',
            [nuevosNodosVendidos, nuevoEstado, contractAddress]
        );
    }

    async verificarCierrePorTiempo(contractAddress, timestampActual) {
        const sc = await this.obtenerContratoPorId(contractAddress);
        if (sc && sc.estado === 'FONDEANDO' && timestampActual > Number(sc.fecha_limite)) {
            const nuevoEstado = Number(sc.nodos_vendidos) < sc.max_nodos ? 'REEMBOLSANDO' : 'EXITOSO';
            await pool.query('UPDATE smart_contracts SET estado = $1 WHERE contract_address = $2', [nuevoEstado, contractAddress]);
        }
    }
}

/**
 * Gestiona la cadena de bloques completa y la ejecución de contratos sobre PostgreSQL Cloud.
 */
export class Blockchain {
    constructor() {
        this.difficulty = 3;
        this.miningReward = 50;
        this.smartContractManager = new SmartContractGimnasio();
    }

    async asegurarGenesis() {
        const res = await pool.query('SELECT * FROM bloques WHERE bloque_id = 1');
        if (res.rows.length === 0) {
            const genesis = new Block(1717113600000, [], "0", 0, null);
            await pool.query(
                'INSERT INTO bloques (bloque_id, timestamp, previous_hash, nonce, hash) VALUES (1, $1, $2, $3, $4)',
                [genesis.timestamp, genesis.previousHash, genesis.nonce, genesis.hash]
            );
        }
    }

    async getLatestBlock() {
        const res = await pool.query('SELECT * FROM bloques ORDER BY bloque_id DESC LIMIT 1');
        const dbBlock = res.rows[0];
        return new Block(Number(dbBlock.timestamp), [], dbBlock.previous_hash, dbBlock.nonce, dbBlock.hash);
    }

    async addTransaction(transaction) {
        const txHash = transaction.calculateHash();
        if (transaction.toAddress.startsWith('CTO_')) {
            await this.smartContractManager.comprarNodoDinamico(transaction.toAddress, transaction.fromAddress, transaction.amount, transaction.timestamp);
        }
        await pool.query(
            `INSERT INTO transacciones (from_address, to_address, amount, timestamp, signature, hash, bloque_id)
             VALUES ($1, $2, $3, $4, $5, $6, NULL)`,
            [transaction.fromAddress, transaction.toAddress, transaction.amount, transaction.timestamp, transaction.signature, txHash]
        );
    }

    async minePendingTransactions(miningRewardAddress) {
        const resPending = await pool.query('SELECT * FROM transacciones WHERE bloque_id IS NULL ORDER BY timestamp ASC');
        if (resPending.rows.length === 0) return;

        const txsParaBloque = resPending.rows.map(row => 
            new Transaction(row.from_address, row.to_address, Number(row.amount), Number(row.timestamp), row.signature)
        );
        
        const latestBlock = await this.getLatestBlock();
        const nuevoBloque = new Block(Date.now(), txsParaBloque, latestBlock.hash);
        nuevoBloque.mineBlock(this.difficulty);

        const resBloqueInsercion = await pool.query(
            'INSERT INTO bloques (timestamp, previous_hash, nonce, hash) VALUES ($1, $2, $3, $4) RETURNING bloque_id',
            [nuevoBloque.timestamp, nuevoBloque.previousHash, nuevoBloque.nonce, nuevoBloque.hash]
        );
        const nuevoBloqueId = resBloqueInsercion.rows[0].bloque_id;

        await pool.query('UPDATE transacciones SET bloque_id = $1 WHERE bloque_id IS NULL', [nuevoBloqueId]);
    }

    async isChainValid() {
        const res = await pool.query('SELECT * FROM bloques ORDER BY bloque_id ASC');
        const listaBloques = res.rows;
        for (let i = 1; i < listaBloques.length; i++) {
            const current = listaBloques[i];
            const previous = listaBloques[i - 1];
            const txsRes = await pool.query('SELECT * FROM transacciones WHERE bloque_id = $1', [current.bloque_id]);
            const mappedTxs = txsRes.rows.map(r => new Transaction(r.from_address, r.to_address, Number(r.amount), Number(r.timestamp), r.signature));
            const instanciaBloque = new Block(Number(current.timestamp), mappedTxs, current.previous_hash, current.nonce, current.hash);

            if (current.hash !== instanciaBloque.calculateHash()) return false;
            if (current.previous_hash !== previous.hash) return false;
        }
        return true;
    }
}