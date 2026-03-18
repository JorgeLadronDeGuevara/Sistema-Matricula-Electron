// tabla.js

import {
getEstudiantesGlobal,
getPaginaActual,
setPaginaActual,
getFilasPorPagina,
getModoEliminados
} from "./state.js";

import {
escapeHTML,
formatoDinero,
calcularEstado
} from "./utils.js";

import { editarEstudiante } from "./modal.js";

const tablaBody = document.querySelector("#tablaEstudiantes tbody");

window.api.onEstudianteRecuperado(() => {
    if (getModoEliminados()) {
        window.api.traerEliminados();
    } else {
        window.api.traerEstudiantes();
    }
});

// ----- PAGINACIÓN -----
export function renderizarPagina() {

        const inicio = (getPaginaActual() - 1) * getFilasPorPagina();
        const fin = inicio + getFilasPorPagina();
        
        const fragment = document.createDocumentFragment();

         // 🔹 Limpieza más rápida
        tablaBody.innerHTML = "";

        // dentro de renderizarPagina
        getEstudiantesGlobal().slice(inicio, fin).forEach(est => {
    
        const tr = document.createElement("tr");

    // 1️⃣ Poner el HTML primero
    tr.innerHTML = `
        <td>${est.id}</td>
        <td>${escapeHTML(est.cedula)}</td>
        <td>${escapeHTML(est.apellidos || "")}</td>
        <td>${escapeHTML(est.nombres)}</td>
        <td>${escapeHTML(est.sexo || "")}</td>
        <td>${escapeHTML(est.correo || "")}</td>
        <td>${formatoDinero(est.pagado)}</td>
        <td>${formatoDinero(est.seguro || 0)}</td>
        <td>${escapeHTML(est.grado)}</td>
        <td>${escapeHTML(est.cit || "")}</td>
        <td>${escapeHTML(est.hermano || "")}</td>
        <td>${calcularEstado(est.pagado, est.seguro, est.cit, est.hermano)}</td>
        <td class="acciones">
            ${
                est.estado_estudiante === "eliminado"
                ? `<button class="recuperar-btn" data-id="${est.id}"><i class="fas fa-undo"></i></button>`
                : `<button class="edit-btn" data-id="${est.id}"><i class="fas fa-pen"></i></button>
                   <button class="delete-btn" data-id="${est.id}"><i class="fas fa-trash"></i></button>`
            }
        </td>
    `;

    // 2️⃣ Luego agregar listeners
    if(est.estado_estudiante === "eliminado"){

        tr.querySelector(".recuperar-btn").addEventListener("click", (e) => {
            const id = Number(e.currentTarget.dataset.id);
            window.api.recuperarEstudiante(id);
        });

    } else {
        tr.querySelector(".edit-btn").addEventListener("click", (e) => {
            const id = Number(e.currentTarget.dataset.id);
            editarEstudiante(id);
        });

        tr.querySelector(".delete-btn").addEventListener("click", async (e) => {
            
            const id = Number(e.currentTarget.dataset.id);
            const res = await window.eliminarEstudiante(id);

             if(res?.success){
                    window.api.traerEstudiantes();
                }

            //setTimeout(() => window.api.traerEstudiantes(), 200);
        });
    }

    fragment.appendChild(tr);
});

        tablaBody.appendChild(fragment);
        renderizarBotonesPaginacion();
}

export function renderizarBotonesPaginacion() {
        
    const contenedor = document.getElementById("paginacion");
    if(!contenedor) return;

        contenedor.innerHTML = "";
        const totalPaginas = Math.ceil(getEstudiantesGlobal().length / getFilasPorPagina());

        for(let i = 1; i <= totalPaginas; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            if(i === getPaginaActual()) btn.classList.add("active");
            btn.addEventListener("click", () => {
                setPaginaActual(i);
                renderizarPagina();
            });
            contenedor.appendChild(btn);
        }
    }
