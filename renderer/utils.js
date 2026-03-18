// utils.js


export function sanitizarTexto(texto){
  return String(texto)
    .replace(/[<>]/g,"")
    .trim();
}

// 🔹 FORMATO DE DINERO
export function formatoDinero(valor){
    return "$" + Number(valor || 0).toFixed(2);
}

export function escapeHTML(text){
    return String(text)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

export function calcularEstado(matricula, seguro, cit = "", hermano = ""){

    const limites = obtenerLimites(cit, hermano);

    const total = Number(matricula) + Number(seguro);

    if(total === 0) return "Pendiente";
    if(total >= limites.total) return "Cancelado";

    return "Abonado";
}

export function normalizarSiNo(valor){
    if(!valor) return "";

    valor = valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

    if(valor === "si") return "Si";
    if(valor === "no") return "No";

    return "";
}

export function obtenerLimites(cit, hermano){

    cit = normalizarSiNo(cit);
    hermano = normalizarSiNo(hermano);

    // CIT tiene prioridad
    if(cit === "Si"){
        return {
            matricula: 3.50,
            seguro: 4.50,
            total: 8
        };
    }

    if(hermano === "Si"){
        return {
            matricula: 6.50,
            seguro: 4.50,
            total: 11
        };
    }

    return {
        matricula: 17,
        seguro: 4.50,
        total: 21.50
    };
}