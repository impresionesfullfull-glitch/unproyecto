const ec = new elliptic.ec('secp256k1');

let parDeLlaves = null;
let userPublicHex = '';
let miRolActivo = null;
let modoSeleccionado = 'login'; 
let proyectosCacheados = [];
let modoSubida = 'perfil';

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

const outputConsola = document.getElementById('outputConsola');
const blockchainGrid = document.getElementById('blockchainGrid');
const btnAccionPrincipal = document.getElementById('btnAccionPrincipal');



// Agrega esto a tu app.js
window.prepararSubidaProyecto = function() {
    modoSubida = 'proyecto';
    document.getElementById('fileInput').click();
};

function logConsola(mensaje) {
    const timestamp = new Date().toLocaleTimeString();
    outputConsola.innerText = `[${timestamp}] ${mensaje}\n` + outputConsola.innerText;
}

document.addEventListener('DOMContentLoaded', () => {
    logConsola("🚀 Motor social inicializado en producción.");


window.conmutarModoAutenticacion = function(modo) {
    modoSeleccionado = modo;
    const btn = document.getElementById('btnAccionPrincipal');
    document.getElementById('tabLogin').classList.toggle('active', modo === 'login');
    document.getElementById('tabRegistro').classList.toggle('active', modo === 'registro');
    btn.innerText = (modo === 'login') ? 'Ejecutar Ingreso Seguro' : 'Registrar Nueva Cuenta';
    btn.style.backgroundColor = (modo === 'login') ? '#0284c7' : '#a855f7';
};
document.getElementById('lnkCerrarSesion').addEventListener('click', () => {
    parDeLlaves = null;
    userPublicHex = '';
    miRolActivo = null;
    
    document.getElementById('panelPostulante').classList.add('hidden');
    document.getElementById('panelParticipante').classList.add('hidden');
    wrapperLogoutLink.classList.add('hidden');
    panelLoginGlobal.classList.remove('hidden');
    document.getElementById('authStatus').innerText = `Estado: Navegación Pública (Anónimo)`;
    
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    
    logConsola('✔ Sesión purgada de la memoria volatil del cliente de forma exitosa.');
    distribuirCarteleras();
});

// Función para renderizar el "Muro de Avances"
function renderizarAvances(listaAvances) {
    const contenedor = document.getElementById('muroAvances');
    contenedor.innerHTML = ''; // Limpiamos para redibujar

    listaAvances.forEach(avance => {
        const div = document.createElement('div');
        div.className = `avance-item ${avance.tipo_contenido}`; // Clase para estilos distintos
        
        div.innerHTML = `
            <h3>${avance.titulo_avance}</h3>
            ${avance.tipo_contenido === 'foto' ? `<img src="${avance.url_contenido}">` : ''}
            ${avance.tipo_contenido === 'video' ? `<video src="${avance.url_contenido}" controls></video>` : ''}
            <p>${avance.experiencia || ''}</p>
        `;
        contenedor.appendChild(div);
    });
}

async function derivarIdentidadDesdeCredenciales(email, password) {
    const semillaCruda = `unproyecto_web3_seed_email:${email.trim().toLowerCase()}_pass:${password}`;
    const encoder = new TextEncoder();
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(semillaCruda));
    const privateKeyHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    parDeLlaves = ec.keyFromPrivate(privateKeyHex, 'hex');
    userPublicHex = parDeLlaves.getPublic('hex');
}

function renderizarCadenaBloques(bloques) {
    blockchainGrid.innerHTML = ''; 
    bloques.forEach(bloque => {
        const esGenesis = bloque.bloque_id === 1;
        const blockCard = document.createElement('div');
        blockCard.className = `block-card ${esGenesis ? 'genesis' : ''}`;

        blockCard.innerHTML = `
            <div class="block-header">
                <span>📦 BLOQUE #${bloque.bloque_id}</span>
                <span style="color: ${esGenesis ? '#10b981' : '#38bdf8'}">${esGenesis ? 'GÉNESIS' : 'MINADO'}</span>
            </div>
            <div class="block-field">
                <span class="block-label">HASH PROPIO:</span>
                <span>${bloque.hash}</span>
            </div>
            <div class="block-field">
                <span class="block-label">HASH ANTERIOR (PREVIOUS):</span>
                <span>${bloque.previous_hash}</span>
            </div>
            <div class="block-field">
                <span class="block-label">NONCE (PRUEBA DE TRABAJO):</span>
                <span style="color: #e2e8f0; font-weight: bold;">${bloque.nonce}</span>
            </div>
            <div class="block-field">
                <span class="block-label">TIMESTAMP SERIAL:</span>
                <span style="color: #94a3b8;">${bloque.timestamp}</span>
            </div>
        `;
        blockchainGrid.appendChild(blockCard);
    });
}

btnAccionPrincipal.addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const rol = document.getElementById('selectRol').value;

    if (!email || !password) {
        return alert('Por favor, ingresa tu correo electrónico y contraseña para poder continuar.');
    }

    await derivarIdentidadDesdeCredenciales(email, password);

    if (modoSeleccionado === 'registro') {
        logConsola(`📡 Indexando cuenta de correo y registrando llave pública relacional en Neon...`);
        try {
            const resRegistro = await fetch('/api/auth/registrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ llavePublica: userPublicHex, rol })
            }).then(r => r.json());

            if (resRegistro.success) {
                logConsola(`🎉 ¡Cuenta indexada con éxito en PostgreSQL Cloud! Procediendo al ingreso...`);
            } else {
                parDeLlaves = null; userPublicHex = '';
                logConsola(`❌ Registro denegado: ${resRegistro.error}`);
                return alert(resRegistro.error);
            }
        } catch (err) {
            parDeLlaves = null; userPublicHex = '';
            return logConsola(`❌ Falla crítica de registro en base de datos: ${err.message}`);
        }
    }

    logConsola(`🔐 Solicitando desafío matemático para el correo: ${email.toLowerCase()}...`);
    try {
        const resDesafio = await fetch('/api/auth/desafio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ llavePublica: userPublicHex, rol })
        });

        if (!resDesafio.ok) {
            const errorData = await resDesafio.json();
            logConsola(`❌ Acceso rechazado por la red: ${errorData.error}`);
            return alert(errorData.error);
        }

        const desafioData = await resDesafio.json();
        logConsola(`-> Firmando desafío inyectando firma elíptica secp256k1 en background...`);

        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(desafioData.desafio));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const firmaDerivadaHex = parDeLlaves.sign(hashHex).toDER('hex');

        const resVerificar = await fetch('/api/auth/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ llavePublica: userPublicHex, firmaDerivadaHex })
        }).then(r => r.json());

   if (resVerificar.success) {
            miRolActivo = resVerificar.rol;
            document.getElementById('authStatus').innerText = `Usuario: ${email.toLowerCase()} | Rol: ${miRolActivo.toUpperCase()}`;
            
            // --- AQUÍ ESTÁ LA MAGIA PROFESIONAL DE TRANSICIÓN ---
            document.getElementById('panelLoginGlobal').style.display = 'none'; // Oculta el login
            document.getElementById('panelPrincipal').style.display = 'block';   // Muestra el ecosistema
            // ---------------------------------------------------

            wrapperLogoutLink.classList.remove('hidden');
            logConsola(`🎉 Sesión iniciada correctamente de forma bimodal.`);

            if (miRolActivo === 'postulante') {
                document.getElementById('panelPostulante').classList.remove('hidden');
                document.getElementById('panelParticipante').classList.add('hidden');
            } else {
                document.getElementById('panelParticipante').classList.remove('hidden');
                document.getElementById('panelPostulante').classList.add('hidden');
                await cargarNodosInversor();
            }
            await consultarEstadoSistema();
            await distribuirCarteleras();
        }
    } catch (err) {
        logConsola(`❌ Falla en la verificación criptográfica: ${err.message}`);
    }
});

document.getElementById('btnLanzarContrato').addEventListener('click', async () => {
    // 1. Captura de los nuevos campos de Imagen
    const titulo = document.getElementById('pTitulo').value;
    const portada = document.getElementById('pFotoPortada').value; 
    const galeriaRaw = document.getElementById('pImagenesGaleria').value;
    const galeria = galeriaRaw.split(',').map(img => img.trim()).filter(i => i !== "");

    // 2. Captura del resto de los campos existentes
    const cantidadNodos = document.getElementById('pCantidadNodos').value;
    const valorTotal = document.getElementById('pValorTotal').value;
    const descripcion = document.getElementById('pDescripcion').value;
    const beneficios = document.getElementById('pBeneficios').value;

    if (!titulo || !portada || !cantidadNodos) {
        return alert('Por favor, completa Título, Portada y Cantidad de Nodos.');
    }

    logConsola(`🏗 Firmando transacción de emisión estructural...`);

    const res = await fetch('/api/proyecto/lanzar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            owner: userPublicHex,
            titulo,
            portada,      // <--- Aquí entra la nueva variable
            galeria,      // <--- Aquí entra el nuevo array
            descripcion,
            beneficios,
            cantidadNodos,
            valorTotal,
            firmaTx: 'FIRMA_MAESTRA_EMISION'
        })
    }).then(r => r.json());

    if (res.success) {
        logConsola(`✔ Proyecto "${titulo}" emitido con éxito.`);
        await distribuirCarteleras();
        await consultarEstadoSistema();
        
        // Limpieza de inputs
        document.getElementById('pTitulo').value = '';
        document.getElementById('pFotoPortada').value = '';
        document.getElementById('pImagenesGaleria').value = '';
    }
});

async function cargarNodosInversor() {
    if (!userPublicHex) return;
    const nodos = await fetch(`/api/participante/nodos/${userPublicHex}`).then(r => r.json());
    const contenedor = document.getElementById('listaNodosAdquiridos');
    if (nodos.length === 0) {
        contenedor.innerHTML = 'Aún no posees nodos bajo custodia criptográfica.';
        return;
    }
    contenedor.innerHTML = nodos.map(n => `
        <div style="border-bottom: 1px solid #334155; padding: 8px 0;">
            🟢 Adquiriste <b>${n.nodos_adquiridos} nodos</b> de "${n.titulo}" | Valor Unitario: $${n.precio_nodo_token} | Estado: <span class="badge" style="background-color: ${n.estado === 'EXITOSO' ? '#10b981' : '#0284c7'}">${n.estado}</span>
        </div>
    `).join('');
}


async function distribuirCarteleras() {
    try {
        const proyectos = await fetch('/api/proyectos/publicos').then(r => r.json());
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



    document.getElementById('modalProyecto').classList.remove('hidden');





function abrirInspeccionModal(address) {
    const p = proyectosCacheados.find(item => item.contract_address === address);
    if (!p) return;

    document.getElementById('modalProyecto').classList.remove('hidden');
    const nodosFaltantes = p.max_nodos - p.nodos_vendidos;
    const stringFaltantes = nodosFaltantes > 0 
        ? `Faltan únicamente ${nodosFaltantes} nodos para completar el 100% de la emisión.`
        : `¡Fondeo Completo! Todos los nodos han sido adjudicados de forma inmutable.`;

    modalTitulo.innerText = `🔍 Análisis Estructural: ${p.titulo}`;
    modalAddress.innerText = p.contract_address;
    modalOwner.innerText = p.owner_address || p.owner || 'Indexado Neon';
    modalFaltantes.innerText = stringFaltantes;
    modalDescripcion.innerText = p.descripcion;
    
    modalBeneficios.innerText = p.beneficios || `Al adquirir un nodo de este comercio, obtendrás acceso prioritario a la liquidación de micro-créditos y derecho inmutable a los retornos del Pase Anual del establecimiento.`;
    
    // Se mapea la galería (galeria o fotos fallback)
    const fotos = (p.galeria && p.galeria.length > 0) ? p.galeria : ['https://images.unsplash.com/photo-1540574467063-178a50c2df87?w=300'];
    modalGridFotos.innerHTML = fotos.map(f => `<img src="${f}" class="modal-img" alt="Foto Local">`).join('');

    modalProyecto.classList.remove('hidden');
}





async function refrescarMuro() {
    logConsola("Actualizando feed...");
    await distribuirCarteleras(); // Esto ya recarga tus grids
}




document.getElementById('btnCerrarModal').addEventListener('click', () => {
    modalProyecto.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === modalProyecto) modalProyecto.classList.add('hidden');
});

async function consultarEstadoSistema() {
    try {
        const estadoBlockchain = await fetch('/api/blockchain').then(r => r.json());
        logConsola(`--- AUDITORÍA EN TIEMPO REAL (NEON.TECH) ---`);
        logConsola(`-> Bloques Totales Asentados: ${estadoBlockchain.longitud_cadena}`);
        logConsola(`-> Integridad del Libro Mayor: ${estadoBlockchain.es_valida_e_inmutable ? "IMPECABLE (TRUE)" : "CORRUPTA (FALSE)"}`);
        renderizarCadenaBloques(estadoBlockchain.bloques);
    } catch (err) {
        logConsola(`❌ Imposible sincronizar datos con el servidor Cloud.`);
    }
}

// --- INYECCIÓN MÍNIMA DE FUNCIONALIDAD ---

// Estructura de tarjeta social
function generarTarjetaSocial(post) {
    return `
        <div class="post-card">
            <div class="post-header">${post.owner_name}</div>
            <img src="${post.url_foto}" class="post-img">
            <div class="post-actions">
                <button onclick="validarNodo(${post.id})">💚 Nodo</button>
                <input type="text" placeholder="Comentar..." onkeypress="enviarComentario(event, ${post.id})">
            </div>
            <div class="comments-section" id="comments-${post.id}">
                ${post.comentarios ? post.comentarios.map(c => `<p><b>${c.user}:</b> ${c.texto}</p>`).join('') : ''}
            </div>
        </div>
    `;
}

function renderizarProgreso(proyecto) {
    const contenedor = document.getElementById('panelProgreso');
    const porcentaje = (proyecto.nodos_vendidos / proyecto.max_nodos) * 100;
    
    contenedor.innerHTML = `
        <div class="info-bloque">
            <h4>Estado del Proyecto</h4>
            <div class="barra-progreso"><div style="width: ${porcentaje}%"></div></div>
            <p>${proyecto.nodos_vendidos} de ${proyecto.max_nodos} nodos validados.</p>
            <button onclick="verAuditoriaDetallada('${proyecto.contract_address}')">Ver Auditoría Inmutable</button>
        </div>
    `;
}



async function ejecutarCompraDeNodos(contractAddress, cantidad, precio) {
    logConsola(`💰 Adquiriendo ${cantidad} nodos...`);
    try {
        const res = await fetch('/api/proyecto/adquirir', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ comprador: userPublicHex, contractAddress, cantidad: parseInt(cantidad) })
        }).then(r => r.json());
        
        if (res.success) {
            logConsola('✔ Compra exitosa.');
            await distribuirCarteleras();
            await cargarNodosInversor();
            await actualizarSaldoParticipante();
        }
    } catch (err) { logConsola('❌ Error en compra.'); }
}

// Delegación de eventos (Esto hace que TODOS los botones funcionen siempre)
document.body.addEventListener('click', (e) => {
    
    // 1. Botón de Ver Detalles (Modal)
    if (e.target.classList.contains('detalle-btn')) {
        abrirInspeccionModal(e.target.getAttribute('data-addr'));
    }
    
    // 2. Botón de Invertir (Adquirir Nodos)
    if (e.target.classList.contains('invertir-btn')) {
        const addr = e.target.getAttribute('data-addr');
        const cantidad = document.getElementById(`cant_${addr}`).value;
        ejecutarCompraDeNodos(addr, cantidad, 0);
    }
    
    // 3. Botón de Subida de Fotos
    if (e.target.classList.contains('upload-btn')) {
        // Evitamos que el formulario intente recargar la página si es un botón dentro de un form
        e.preventDefault(); 
        modoSubida = 'proyecto'; // Aseguramos que el sistema sabe que es para un proyecto
        document.getElementById('fileInput').click();
    }
});
document.getElementById('btnActualizarEstado').addEventListener('click', consultarEstadoSistema);
// EXPOSICIÓN GLOBAL PARA EL DOM
window.abrirInspeccionModal = abrirInspeccionModal;
window.ejecutarCompraDeNodos = ejecutarCompraDeNodos;
window.actualizarSaldoParticipante = actualizarSaldoParticipante;
window.distribuirCarteleras = distribuirCarteleras;
// Inicialización

// Agrega esto al final de app.js para inicializar la lógica de fotos
const fileInput = document.getElementById('fileInput');

// Variable para saber qué estamos subiendo
let modoSubida = 'perfil'; // 'perfil' o 'proyecto'

// --- DELEGACIÓN MAESTRA DE EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Delegación de eventos maestra: escucha CUALQUIER clic
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
    });

	
});

distribuirCarteleras();
consultarEstadoSistema();

function logConsola(mensaje) {
    if (!outputConsola) return;
    const timestamp = new Date().toLocaleTimeString();
    outputConsola.innerText = `[${timestamp}] ${mensaje}\n` + outputConsola.innerText;
}