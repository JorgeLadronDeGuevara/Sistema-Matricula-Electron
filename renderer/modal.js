// modal.js

import { getEstudiantesGlobal, setEstudianteEditando, getEstudianteEditando } from "./state.js";
import { normalizarSiNo, obtenerLimites } from "./utils.js";

export function editarEstudiante(id){

    console.log("Editar estudiante:", id);
    window.scrollTo(0, 0); // mueve la página arriba

    document.getElementById("seccionNuevo").style.display = "none";
    document.getElementById("seccionEdicion").style.display = "block";
    
    const est = getEstudiantesGlobal().find(e => e.id === id);

    if(!est) return;

    setEstudianteEditando(est);

    document.getElementById("nombre").value = est.nombres;
    document.getElementById("apellidos").value = est.apellidos || "";
    document.getElementById("cedula").value = est.cedula;
    document.getElementById("sexo").value = est.sexo || "";
    document.getElementById("correo").value = est.correo || "";
    document.getElementById("grado").value = est.grado || "";
    document.getElementById("matriculaActual").value = est.pagado || 0;
    document.getElementById("seguroActual").value = est.seguro || 0;

    document.getElementById("nuevoPagoMatricula").value = "";
    document.getElementById("nuevoPagoSeguro").value = "";
    document.getElementById("cit").value = normalizarSiNo(est.cit);
    document.getElementById("hermano").value = normalizarSiNo(est.hermano);

    // BLOQUEAR CAMPOS
    document.getElementById("cedula").disabled = true;
    document.getElementById("nombre").disabled = true;
    document.getElementById("apellidos").disabled = true;
    document.getElementById("sexo").disabled = true;

    calcularFaltante();

    document.getElementById("modal").style.display = "flex";

    console.log("Editando estudiante ID:", getEstudianteEditando().id);
}

export function calcularFaltante(){

    let matricula =
    Number(document.getElementById("matriculaActual")?.value) ||
    Number(document.getElementById("pagado")?.value) || 0;

    let seguro =
    Number(document.getElementById("seguroActual")?.value) ||
    Number(document.getElementById("seguro")?.value) || 0;

    let nuevoMatricula = Number(document.getElementById("nuevoPagoMatricula")?.value) || 0;
    let nuevoSeguro = Number(document.getElementById("nuevoPagoSeguro")?.value) || 0;

    let total = matricula + seguro + nuevoMatricula + nuevoSeguro;

    const limites = obtenerLimites(
        document.getElementById("cit").value,
        document.getElementById("hermano").value
    );

    let faltante = limites.total - total;

    if(faltante < 0) faltante = 0;

document.getElementById("faltante").value = faltante.toFixed(2);
}


export function validarPago(input, tipo, inputActual = null) {

    let aviso = document.createElement("span");
    aviso.classList.add("error");
    aviso.style.display = "none";
    input.parentNode.appendChild(aviso);

    input.addEventListener("input", () => {

        const limites = obtenerLimites(
            document.getElementById("cit").value,
            document.getElementById("hermano").value
        );

        const limite = limites[tipo];

        let valorNuevo = Number(input.value) || 0;
        let valorAcumulado = inputActual ? Number(inputActual.value) || 0 : 0;

        let total = valorNuevo + valorAcumulado;

        if(total > limite){

            valorNuevo = limite - valorAcumulado;

            if(valorNuevo < 0) valorNuevo = 0;

            input.value = valorNuevo.toFixed(2);

            aviso.textContent = `Máx. $${limite.toFixed(2)}`;
            aviso.style.display = "inline";

        }else{
            aviso.style.display = "none";
        }

        calcularFaltante();
    });
}