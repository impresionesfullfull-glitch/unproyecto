import elliptic from 'elliptic';
import crypto from 'crypto';

// Inicializamos la curva elíptica secp256k1 (Estándar Web3 de Bitcoin/Ethereum)
const ec = new elliptic.ec('secp256k1');

/**
 * Clase utilitaria para gestionar llaves y firmas de los usuarios
 */
export class CriptoIdentidad {
    /**
     * Genera un par de llaves completamente nuevo e independiente de forma aleatoria.
     * @returns {Object} { llavePrivada: string, llavePublica: string }
     */
    static generarNuevaIdentidad() {
        const keyPair = ec.genKeyPair();
        return {
            llavePrivada: keyPair.getPrivate('hex'),
            llavePublica: keyPair.getPublic('hex')
        };
    }

    /**
     * Firma un mensaje de texto plano utilizando la llave privada del usuario.
     * Útil para loguearse o autenticar publicaciones de proyectos.
     */
    static firmarMensaje(mensaje, llavePrivadaHex) {
        const key = ec.keyFromPrivate(llavePrivadaHex, 'hex');
        
        // Convertimos el mensaje a un hash SHA-256 antes de firmarlo
        const hashMensaje = crypto.createHash('sha256').update(mensaje).digest('hex');
        
        // Generamos la firma matemática en base al hash
        const firma = key.sign(hashMensaje);
        
        // Retornamos los componentes r y s, junto con la firma final codificada en formato DER
        return {
            r: firma.r.toString(16),
            s: firma.s.toString(16),
            derivadaHex: firma.toDER('hex') // Formato estándar de firma digital listo para la red
        };
    }

    /**
     * Verifica criptográficamente si una firma corresponde al emisor original del mensaje.
     * Esta es la barrera "inhackeable": si el mensaje cambia un solo bit, da FALSE.
     */
    static verificarFirmaMensaje(mensaje, firmaHex, llavePublicaHex) {
        try {
            const key = ec.keyFromPublic(llavePublicaHex, 'hex');
            const hashMensaje = crypto.createHash('sha256').update(mensaje).digest('hex');
            return key.verify(hashMensaje, firmaHex);
        } catch (error) {
            return false;
        }
    }
}