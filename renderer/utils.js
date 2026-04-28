// utils.js

export function formatearNumero(valor) {
  return new Intl.NumberFormat("es-PA").format(valor);
}

function aNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function normalizarTextoBasico(valor) {
    return String(valor ?? "").trim();
}

export function sanitizarTexto(texto) {
    return normalizarTextoBasico(texto)
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ");
}

export function validarCedula(cedula) {
    const valor = normalizarTextoBasico(cedula).toUpperCase();
    return /^[A-Z0-9-]+$/.test(valor) && valor.length > 0;
}

export function validarCorreo(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarTextoBasico(correo));
}

export function formatoDinero(valor) {
    const numero = aNumero(valor);

    return "$" + new Intl.NumberFormat("es-PA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

export function escapeHTML(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function normalizarSiNo(valor) {
    const texto = String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (texto === "si") return "Si";
    if (texto === "no") return "No";

    return "";
}

export function obtenerDesglosePago(cti, _hermano, descuentoHermano = "No") {
    const esCTI = normalizarSiNo(cti) === "Si";
    const aplicaDescuentoHermano = normalizarSiNo(descuentoHermano) === "Si";

    // CTI tiene prioridad absoluta
    if (esCTI) {
        return {
            donacion: 2.50,
            informatica: 0.00,
            carnet: 1.00,
            odontologia: 0.00,
            seguro: 4.50,
            matricula: 3.50,
            total: 8.00,
            tipo: "CTI"
        };
    }

    // Los hermanos marcados con descuento_hermano="Si" no pagan donación
    if (aplicaDescuentoHermano) {
        return {
            donacion: 0.00,
            informatica: 3.00,
            carnet: 1.00,
            odontologia: 3.00,
            seguro: 4.50,
            matricula: 4.00,
            total: 8.50,
            tipo: "HERMANO_DESCUENTO"
        };
    }

    return {
        donacion: 10.00,
        informatica: 3.00,
        carnet: 1.00,
        odontologia: 3.00,
        seguro: 4.50,
        matricula: 14.00,
        total: 18.50,
        tipo: "NORMAL"
    };
}

export function obtenerLimites(cti, hermano, descuentoHermano = "No") {
    const desglose = obtenerDesglosePago(cti, hermano, descuentoHermano);

    return {
        matricula: desglose.matricula,
        seguro: desglose.seguro,
        total: desglose.total,
        donacion: desglose.donacion,
        informatica: desglose.informatica,
        carnet: desglose.carnet,
        odontologia: desglose.odontologia,
        tipo: desglose.tipo
    };
}

export function calcularEstado(pagado, seguro, cti, hermano, descuentoHermano = "No") {
    const limites = obtenerLimites(cti, hermano, descuentoHermano);

    const matriculaPagada = aNumero(pagado);
    const seguroPagado = aNumero(seguro);

    if (matriculaPagada >= limites.matricula && seguroPagado >= limites.seguro) {
        return "Cancelado";
    }

    if ((matriculaPagada + seguroPagado) > 0) {
        return "Abonado";
    }

    return "Pendiente";
}