// state.js
let _estudiantesGlobal = [];
let _paginaActual = 1;
let _filasPorPagina = 50;
let _estudianteEditando = null;
// state.js

let _modoEliminados = false;

// Getter y Setter para 'modoEliminados'
export function setModoEliminados(valor) {
    _modoEliminados = valor;
}

export function getModoEliminados() {
    return _modoEliminados;
}

export function setEstudianteEditando(est){
    _estudianteEditando = est;
}

export function getEstudianteEditando(){
    return _estudianteEditando;
}
export function setEstudiantesGlobal(lista) {
    _estudiantesGlobal = lista;
}

export function getEstudiantesGlobal() {
    return _estudiantesGlobal;
}

export function setPaginaActual(pagina) {
    _paginaActual = pagina;
}

export function getPaginaActual() {
    return _paginaActual;
}

export function setFilasPorPagina(filas) {
    _filasPorPagina = filas;
}

export function getFilasPorPagina() {
    return _filasPorPagina;
}