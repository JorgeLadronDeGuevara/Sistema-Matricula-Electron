// state.js

let _estudiantesGlobal = [];
let _paginaActual = 1;
let _filasPorPagina = 50;
let _estudianteEditando = null;
let _modoEliminados = false;

// ---------------- MODO ELIMINADOS ----------------

export function setModoEliminados(valor) {
    _modoEliminados = Boolean(valor);
}

export function getModoEliminados() {
    return _modoEliminados;
}

// ---------------- ESTUDIANTE EDITANDO ----------------

export function setEstudianteEditando(est) {
    _estudianteEditando = est ? { ...est } : null; // 🔥 copia segura
}

export function getEstudianteEditando() {
    return _estudianteEditando ? { ..._estudianteEditando } : null;
}

// ---------------- ESTUDIANTES ----------------

export function setEstudiantesGlobal(lista) {
    _estudiantesGlobal = Array.isArray(lista) ? [...lista] : [];
}

export function getEstudiantesGlobal() {
    return [..._estudiantesGlobal]; // 🔥 evita mutaciones externas
}

// 🔥 opcional pero PRO: actualizar uno específico
export function actualizarEstudianteEnEstado(estActualizado) {
    if (!estActualizado || !estActualizado.id) return;

    _estudiantesGlobal = _estudiantesGlobal.map(e =>
        e.id === estActualizado.id ? { ...estActualizado } : e
    );
}

// ---------------- PAGINACIÓN ----------------

export function setPaginaActual(pagina) {
    const totalPaginas = Math.ceil(_estudiantesGlobal.length / _filasPorPagina) || 1;

    if (!Number.isInteger(pagina)) return;

    _paginaActual = Math.max(1, Math.min(pagina, totalPaginas));
}

export function getPaginaActual() {
    return _paginaActual;
}

export function setFilasPorPagina(filas) {
    if (!Number.isInteger(filas) || filas <= 0) return;

    _filasPorPagina = filas;

    // 🔥 reajustar página si cambia el tamaño
    setPaginaActual(_paginaActual);
}

export function getFilasPorPagina() {
    return _filasPorPagina;
}

// ---------------- RESET (útil para futuro) ----------------

export function resetState() {
    _estudiantesGlobal = [];
    _paginaActual = 1;
    _estudianteEditando = null;
    _modoEliminados = false;
}