// ==========================================================
// 1. VARIABLES GLOBALES
// ==========================================================
const ec = new elliptic.ec('secp256k1');
let parDeLlaves = null;
let userPublicHex = '';
let miRolActivo = null;
let modoSeleccionado = 'login'; 
let proyectosCacheados = [];
let modoSubida = 'perfil';
const API_URL = '/api';

const outputConsola = document.getElementById('outputConsola');
const blockchainGrid = document.getElementById('blockchainGrid');
const btnAccionPrincipal = document.getElementById('btnAccionPrincipal');
const wrapperLogoutLink = document.getElementById('wrapperLogoutLink');
const panelLoginGlobal = document.getElementById('panelLoginGlobal');
const modalProyecto = document.getElementById('modalProyecto');
const modalTitulo = document.getElementById('modalTitulo');
const modalAddress = document.getElementById('modalAddress');
const modalOwner = document.getElementById('modalOwner');
const modalFaltantes = document.getElementById('modalFaltantes');
const modalDescripcion = document.getElementById('modalDescripcion');
const modalBeneficios = document.getElementById('modalBeneficios');
const modalGridFotos = document.getElementById('modalGridFotos');

// ==========================================================
// 2. FUNCIONES DE SISTEMA Y AUTENTICACIÓN
// ==========================================================
function logConsola(mensaje) {
    if (!outputConsola) return;
    const timestamp = new Date().toLocaleTimeString();
    outputConsola.innerText = `[${timestamp}] ${mensaje}\n` + outputConsola.innerText;
}

window.prepararSubidaProyecto = function() {
    modoSubida = 'proyecto';
    document.getElementById('fileInput').click();
};

window.conmutarModoAutenticacion = function(modo) {
    modoSeleccionado = modo;
    const btn = document.getElementById('btnAccionPrincipal');
    document.getElementById('tabLogin').classList.toggle('active', modo === 'login');
    document.getElementById('tabRegistro').classList.toggle('active', modo === 'registro');
    btn.innerText = (modo === 'login') ? 'Ejecutar Ingreso Seguro' : 'Registrar Nueva Cuenta';
    btn.style.backgroundColor = (modo === 'login') ? '#0284c7' : '#a855f7';
};

async function derivarIdentidadDesdeCredenciales(email, password) {
    const semillaCruda = `unproyecto_web3_seed_email:${email.trim().toLowerCase()}_pass:${password}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(semillaCruda));
    const privateKeyHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    parDeLlaves = ec.keyFromPrivate(privateKeyHex, 'hex');
    userPublicHex = parDeLlaves.getPublic('hex');
}

// ==========================================================
// 3. FUNCIONES DE MURO SOCIAL
// ==========================================================

async function darLike(publicacionId) {
    await fetch(`${API_URL}/social/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicacion_id: publicacionId, autor: userPublicHex })
    });
    cargarMuroSocial();
}

async function enviarComentario(publicacionId) {
    const texto = document.getElementById(`comentario-${publicacionId}`).value;
    await fetch(`${API_URL}/social/comentar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicacion_id: publicacionId, autor: userPublicHex, texto })
    });
    cargarMuroSocial();
}

// ==========================================================
// 4. FUNCIONES DE GESTIÓN DE PROYECTOS
// ==========================================================
async function distribuirCarteleras() {
    try {
        const proyectos = await fetch(API_URL + '/proyectos/publicos').then(r => r.json());
        proyectosCacheados = proyectos;
        const grid = document.getElementById('carteleraPublicaGrid');
        if (grid) {
            grid.innerHTML = proyectos.map(p => `
                <div class="proy-card">
                    <img src="${p.portada || 'https://images.unsplash.com/photo-1540574467063-178a50c2df87?w=300'}" style="width:100%; height:180px; object-fit:cover;">
                    <div class="proy-titulo">${p.titulo}</div>
                    <button class="detalle-btn" data-addr="${p.contract_address}">Ver Detalles</button>
                </div>
            `).join('');
        }
    } catch (e) { console.error("Error al cargar cartelera", e); }
}

async function consultarEstadoSistema() {
    try {
        const estadoBlockchain = await fetch(API_URL + '/blockchain').then(r => r.json());
        logConsola(`--- AUDITORÍA EN TIEMPO REAL (NEON.TECH) ---`);
        logConsola(`-> Bloques Totales: ${estadoBlockchain.longitud_cadena}`);
        renderizarCadenaBloques(estadoBlockchain.bloques);
    } catch (err) { logConsola(`❌ Imposible sincronizar con el servidor.`); }
}

function abrirInspeccionModal(address) {
    const p = proyectosCacheados.find(item => item.contract_address === address);
    if (!p) return;
    modalTitulo.innerText = `🔍 Análisis: ${p.titulo}`;
    modalAddress.innerText = p.contract_address;
    modalDescripcion.innerText = p.descripcion;
    modalProyecto.classList.remove('hidden');
}

async function ejecutarCompraDeNodos(contractAddress, cantidad) {
    try {
        const res = await fetch(API_URL + '/proyecto/adquirir', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ comprador: userPublicHex, contractAddress, cantidad: parseInt(cantidad) })
        }).then(r => r.json());
        if (res.success) {
            logConsola('✔ Compra exitosa.');
            distribuirCarteleras();
        }
    } catch (err) { logConsola('❌ Error en compra.'); }
}

function renderizarCadenaBloques(bloques) {
    if (!blockchainGrid) return;
    blockchainGrid.innerHTML = '';
    bloques.forEach(bloque => {
        const blockCard = document.createElement('div');
        blockCard.className = 'block-card';
        blockCard.innerHTML = `<div>📦 BLOQUE #${bloque.bloque_id}</div><div>HASH: ${bloque.hash}</div>`;
        blockchainGrid.appendChild(blockCard);
    });
}

// ==========================================================
// 5. DELEGACIÓN MAESTRA DE EVENTOS
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('upload-btn')) {
            e.preventDefault();
            modoSubida = 'proyecto';
            document.getElementById('fileInput').click();
        }
        if (e.target.classList.contains('detalle-btn')) {
            const addr = e.target.getAttribute('data-addr');
            if (addr) abrirInspeccionModal(addr);
        }
        if (e.target.id === 'btnCerrarModal') modalProyecto.classList.add('hidden');
        if (e.target.id === 'btnActualizarEstado') consultarEstadoSistema();
    });

    // ==========================================================
    // 6. INICIALIZACIÓN FINAL
    // ==========================================================
    distribuirCarteleras();
    consultarEstadoSistema();
    cargarMuroSocial();
});

// EXPOSICIÓN GLOBAL
window.abrirInspeccionModal = abrirInspeccionModal;
window.ejecutarCompraDeNodos = ejecutarCompraDeNodos;
window.distribuirCarteleras = distribuirCarteleras;
window.publicarAvance = publicarAvance;
window.darLike = darLike;
window.enviarComentario = enviarComentario;