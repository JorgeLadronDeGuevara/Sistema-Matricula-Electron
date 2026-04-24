import { getEstudiantesGlobal } from "./state.js";
import { obtenerLimites, calcularEstado, obtenerDesglosePago } from "./utils.js";
import { mostrarAlerta, mostrarToast } from "./ui.js";

let estudianteSeleccionado = null;
let pagoEnProceso = false;
let pagosInicializados = false;
let ultimoHistorialMatriculaId = null;

function obtenerDescuentoActual(est) {
    if (!est) return "No";
    return est.descuento_hermano ?? est.descuentoHermano ?? "No";
}

function obtenerPagosActuales(est) {
    return {
        donacion: Number(est?.pagado_donacion || 0),
        informatica: Number(est?.pagado_informatica || 0),
        carnet: Number(est?.pagado_carnet || 0),
        odontologia: Number(est?.pagado_odontologia || 0),
        seguro: Number(est?.pagado_seguro || 0)
    };
}

function obtenerTotalPagadoDetalle(est) {
    const pagos = obtenerPagosActuales(est);
    return (
        pagos.donacion +
        pagos.informatica +
        pagos.carnet +
        pagos.odontologia +
        pagos.seguro
    );
}

function resetearVistaPagos() {
    estudianteSeleccionado = null;
    ultimoHistorialMatriculaId = null;
    limpiarInfoEstudiante();
    mostrarPanelPagoVacio();
    limpiarMensajesMaximos();
    limpiarHistorialPagos();
    ocultarBotonesComprobante();
    renderizarDesglose();
}

function obtenerElementosPago() {
    return {
        inputBuscar: document.getElementById("buscarPago"),
        resultados: document.getElementById("resultadosBusquedaPago"),
        panelPago: document.getElementById("panelPago"),
        panelHistorialPagos: document.getElementById("panelHistorialPagos"),
        tablaHistorialPagos: document.getElementById("tablaHistorialPagos")
    };
}



function buscarCoincidenciasPago(texto, estudiantes) {
    const textoNormalizado = String(texto || "").trim().toLowerCase();
    if (!textoNormalizado) return { exacta: null, lista: [] };

    const exacta = estudiantes.find(e =>
        String(e.cedula || "").toLowerCase() === textoNormalizado
    ) || null;

    if (exacta) {
        return { exacta, lista: [] };
    }

    const lista = estudiantes.filter(e =>
        String(e.cedula || "").toLowerCase().includes(textoNormalizado) ||
        String(e.nombres || "").toLowerCase().includes(textoNormalizado) ||
        String(e.apellidos || "").toLowerCase().includes(textoNormalizado)
    );

    return { exacta: null, lista };
}

export function initPagos() {
    if (pagosInicializados) return;
    pagosInicializados = true;

    const { inputBuscar, resultados, tablaHistorialPagos } = obtenerElementosPago();
    if (!inputBuscar || !resultados) return;

    resetearVistaPagos();

   const camposPago = [
        { id: "pagoDonacion", tipo: "donacion" },
        { id: "pagoInformatica", tipo: "informatica" },
        { id: "pagoCarnet", tipo: "carnet" },
        { id: "pagoOdontologia", tipo: "odontologia" },
        { id: "pagoSeguro", tipo: "seguro" }
    ];

    camposPago.forEach(({ id, tipo }) => {
        const input = document.getElementById(id);
        if (!input) return;

        input.addEventListener("input", () => validarInputPago(tipo));
        input.addEventListener("blur", () => validarInputPago(tipo, { formatear: true }));
    });

    inputBuscar.addEventListener("input", () => {
        const estudiantes = getEstudiantesGlobal();
        const texto = inputBuscar.value;

        if (!texto.trim()) {
            resultados.innerHTML = "";
            resetearVistaPagos();
            return;
        }

        const { exacta, lista } = buscarCoincidenciasPago(texto, estudiantes);

        if (exacta) {
            seleccionarEstudiantePago(exacta, { cargarHistorial: true });
            resultados.innerHTML = "";
            limpiarInputsPago();
            ocultarBotonesComprobante();
            return;
        }

        if (lista.length === 0) {
            resultados.innerHTML = `<div class="item-busqueda">Sin resultados</div>`;
            return;
        }

        resultados.innerHTML = lista.map(e => `
            <div class="item-busqueda" data-id="${e.id}">
                <strong>${e.nombres} ${e.apellidos}</strong><br>
                <small>${e.cedula} · ${e.grado}</small>
            </div>
        `).join("");
    });

    resultados.addEventListener("click", (event) => {
        const item = event.target.closest(".item-busqueda[data-id]");
        if (!item) return;

        const id = Number(item.dataset.id);
        const seleccionado = getEstudiantesGlobal().find(e => e.id === id);

        if (!seleccionado) return;

        seleccionarEstudiantePago(seleccionado, { cargarHistorial: true });
        inputBuscar.value = seleccionado.cedula;
        resultados.innerHTML = "";
        limpiarInputsPago();
        ocultarBotonesComprobante();
    });

    document.getElementById("btnGuardarPago")?.addEventListener("click", guardarPago);

    document.addEventListener("click", (e) => {
        const contenedor =
            inputBuscar.closest(".buscador-pagos-pro") ||
            inputBuscar.closest(".buscador-pagos") ||
            inputBuscar.parentElement;

        if (!contenedor) return;

        if (!contenedor.contains(e.target)) {
            resultados.innerHTML = "";
        }
    });

    window.api.onHistorialPagos((data) => {
        renderHistorialPagos(data);
    });

    tablaHistorialPagos?.addEventListener("click", async (event) => {
        const btn = event.target.closest(".btn-reimprimir-comprobante");
        if (!btn) return;

        const numeroComprobante = btn.dataset.comprobante;
        if (!numeroComprobante) {
            mostrarAlerta("No se encontró el número de comprobante.");
            return;
        }

        btn.disabled = true;

        try {
            const res = await window.api.abrirComprobanteDesdeHistorial(numeroComprobante);

            if (!res?.success) {
                mostrarAlerta(res?.message || "No se pudo abrir el comprobante.");
            }
        } catch (error) {
            console.error("Error abriendo comprobante desde historial:", error);
            mostrarAlerta("Ocurrió un error al abrir el comprobante.");
        } finally {
            btn.disabled = false;
        }
    });
}

function seleccionarEstudiantePago(estudiante, { cargarHistorial = false } = {}) {
    estudianteSeleccionado = estudiante;
    mostrarEstudiante({ cargarHistorial });
}

function mostrarPanelPagoVacio() {
    const { panelPago } = obtenerElementosPago();
    if (panelPago) panelPago.classList.remove("oculto");
    limpiarInputsPago();
    establecerEstadoFormularioPago(true);
}

function limpiarInputsPago() {
    [
        "pagoDonacion",
        "pagoInformatica",
        "pagoCarnet",
        "pagoOdontologia",
        "pagoSeguro"
    ].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = "";
    });
}

function establecerEstadoFormularioPago(deshabilitado = true) {
    const ids = [
        "pagoDonacion",
        "pagoInformatica",
        "pagoCarnet",
        "pagoOdontologia",
        "pagoSeguro",
        "btnGuardarPago"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = deshabilitado;
    });

    const btnVerComprobante = document.getElementById("btnVerComprobante");
    if (btnVerComprobante) {
        btnVerComprobante.disabled = deshabilitado;
    }
}

function limpiarInfoEstudiante() {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText("pNombre", "Sin estudiante seleccionado");
    setText("pCedula", "No disponible");
    setText("pGrado", "No disponible");
    setText("pTotalPagado", "0.00");
    setText("pFaltante", "0.00");
    setText("pEstadoResumen", "Pendiente");

    const pillEstadoPago = document.getElementById("pillEstadoPago");
    if (pillEstadoPago) {
        pillEstadoPago.textContent = "Sin seleccionar";
        pillEstadoPago.className = "estado-pill";
    }
}

function limpiarMensajesMaximos() {
    [
        "maxPagoDonacion",
        "maxPagoInformatica",
        "maxPagoCarnet",
        "maxPagoOdontologia",
        "maxPagoSeguro"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
    });
}

function limpiarHistorialPagos(mensaje = "Seleccione un estudiante para ver su historial.") {
    const { panelHistorialPagos, tablaHistorialPagos } = obtenerElementosPago();

    if (panelHistorialPagos) panelHistorialPagos.classList.add("oculto");

    if (tablaHistorialPagos) {
        tablaHistorialPagos.innerHTML = `
            <tr>
                <td colspan="11" class="historial-vacio">${mensaje}</td>
            </tr>
        `;
    }
}

function cargarHistorialPagos(forzar = false) {
    if (!estudianteSeleccionado) {
        limpiarHistorialPagos();
        ultimoHistorialMatriculaId = null;
        return;
    }

    const matriculaId = Number(estudianteSeleccionado.id);

    if (!Number.isInteger(matriculaId)) {
        limpiarHistorialPagos("No se pudo identificar el estudiante.");
        ultimoHistorialMatriculaId = null;
        return;
    }

    if (!forzar && ultimoHistorialMatriculaId === matriculaId) {
        return;
    }

    ultimoHistorialMatriculaId = matriculaId;
    window.api.obtenerHistorialPagos(matriculaId);
}

function formatearMoneda(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function convertirFechaLocal(fecha) {
    if (!fecha) return null;

    let date = null;
    const valor = String(fecha).trim();

    if (valor.endsWith("Z")) {
        date = new Date(valor);
    } else if (valor.includes("T")) {
        date = new Date(valor);
    } else {
        const [fechaParte, horaParte = "00:00:00"] = valor.split(" ");
        const [anio, mes, dia] = fechaParte.split("-").map(Number);
        const [hora, minuto, segundo] = horaParte.split(":").map(Number);

        date = new Date(anio, (mes || 1) - 1, dia || 1, hora || 0, minuto || 0, segundo || 0);
    }

    if (Number.isNaN(date?.getTime?.())) return null;
    return date;
}

function formatearFechaCompleta(fecha) {
    const date = convertirFechaLocal(fecha);
    if (!date) return "—";

    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = date.getFullYear();

    let horas = date.getHours();
    const minutos = String(date.getMinutes()).padStart(2, "0");

    const ampm = horas >= 12 ? "PM" : "AM";
    horas = horas % 12;
    if (horas === 0) horas = 12;

    return `${dia}/${mes}/${anio} ${horas}:${minutos} ${ampm}`;
}

function renderHistorialPagos(historial) {
    const { panelHistorialPagos, tablaHistorialPagos } = obtenerElementosPago();
    if (!panelHistorialPagos || !tablaHistorialPagos) return;

    panelHistorialPagos.classList.remove("oculto");

    if (!Array.isArray(historial) || historial.length === 0) {
        tablaHistorialPagos.innerHTML = `
            <tr>
                <td colspan="11" class="historial-vacio">Este estudiante aún no tiene pagos registrados en el período activo.</td>
            </tr>
        `;
        return;
    }

    tablaHistorialPagos.innerHTML = historial.map(item => `
        <tr>
            <td>${item.id ?? "—"}</td>
            <td>${formatearFechaCompleta(item.fecha)}</td>
            <td>
                <span class="monto-chip matricula">
                    ${item.numero_comprobante || "—"}
                </span>
            </td>
            <td>${formatearMoneda(item.monto_donacion)}</td>
            <td>${formatearMoneda(item.monto_informatica)}</td>
            <td>${formatearMoneda(item.monto_carnet)}</td>
            <td>${formatearMoneda(item.monto_odontologia)}</td>
            <td>
                <span class="monto-chip seguro">
                    ${formatearMoneda(item.monto_seguro)}
                </span>
            </td>
            <td>
                <span class="monto-chip total">
                    ${formatearMoneda(item.monto_total)}
                </span>
            </td>
            <td>${item.usuario || "—"}</td>
            <td>
                ${
                    item.numero_comprobante
                        ? `
                            <button
                                type="button"
                                class="btn-reimprimir-comprobante"
                                data-comprobante="${item.numero_comprobante}"
                                title="Ver o reimprimir comprobante"
                            >
                                <i class="fas fa-print"></i>
                            </button>
                        `
                        : "—"
                }
            </td>
        </tr>
    `).join("");
}

function actualizarMensajesMaximos() {
    if (!estudianteSeleccionado) {
        limpiarMensajesMaximos();
        return;
    }

    const limites = obtenerLimites(
        estudianteSeleccionado.cti,
        estudianteSeleccionado.hermano,
        obtenerDescuentoActual(estudianteSeleccionado)
    );

    const pagos = obtenerPagosActuales(estudianteSeleccionado);

    const maximos = {
        donacion: Math.max(0, Number(limites.donacion || 0) - pagos.donacion),
        informatica: Math.max(0, Number(limites.informatica || 0) - pagos.informatica),
        carnet: Math.max(0, Number(limites.carnet || 0) - pagos.carnet),
        odontologia: Math.max(0, Number(limites.odontologia || 0) - pagos.odontologia),
        seguro: Math.max(0, Number(limites.seguro || 0) - pagos.seguro)
    };

    const mapa = {
        donacion: "maxPagoDonacion",
        informatica: "maxPagoInformatica",
        carnet: "maxPagoCarnet",
        odontologia: "maxPagoOdontologia",
        seguro: "maxPagoSeguro"
    };

    Object.entries(mapa).forEach(([clave, id]) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.textContent = `Máx. $${maximos[clave].toFixed(2)}`;
        el.classList.toggle("max-cero", maximos[clave] === 0);
    });
}

function sanitizarMontoInput(valor) {
    let limpio = String(valor || "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const partes = limpio.split(".");

    if (partes.length > 2) {
        limpio = `${partes[0]}.${partes.slice(1).join("")}`;
    }

    return limpio;
}

function validarInputPago(tipo, { formatear = false } = {}) {
    if (!estudianteSeleccionado) return;

    const mapaInputs = {
        donacion: "pagoDonacion",
        informatica: "pagoInformatica",
        carnet: "pagoCarnet",
        odontologia: "pagoOdontologia",
        seguro: "pagoSeguro"
    };

    const input = document.getElementById(mapaInputs[tipo]);
    if (!input) return;

    const valorOriginal = String(input.value || "");
    const valorTexto = sanitizarMontoInput(valorOriginal).trim();

    if (valorOriginal !== valorTexto) {
        input.value = valorTexto;
    }

    if (valorTexto === "") {
        input.value = "";
        actualizarMensajesMaximos();
        return;
    }

    const limites = obtenerLimites(
        estudianteSeleccionado.cti,
        estudianteSeleccionado.hermano,
        obtenerDescuentoActual(estudianteSeleccionado)
    );

    const pagos = obtenerPagosActuales(estudianteSeleccionado);

    const limiteTotal = Number(limites[tipo] || 0);
    const pagadoActual = Number(pagos[tipo] || 0);
    const maxDisponible = Math.max(0, limiteTotal - pagadoActual);

    let valor = Number(valorTexto);

    if (!Number.isFinite(valor) || valor < 0) {
        input.value = "";
        actualizarMensajesMaximos();
        return;
    }

    if (valor > maxDisponible) {
        valor = maxDisponible;
    }

    if (formatear) {
        input.value = valor <= 0 ? "" : valor.toFixed(2);
    } else {
        if (Number(valorTexto) > maxDisponible) {
            input.value = maxDisponible <= 0 ? "" : String(maxDisponible);
        }
    }

    actualizarMensajesMaximos();
}

function mostrarEstudiante({ cargarHistorial = true } = {}) {
    if (!estudianteSeleccionado) return;

    const descuentoActual = obtenerDescuentoActual(estudianteSeleccionado);

    const limites = obtenerLimites(
        estudianteSeleccionado.cti,
        estudianteSeleccionado.hermano,
        descuentoActual
    );

    const pagos = obtenerPagosActuales(estudianteSeleccionado);

    const matriculaPagada =
        pagos.donacion +
        pagos.informatica +
        pagos.carnet +
        pagos.odontologia;

    const seguroPagado = pagos.seguro;

    const totalPagado = matriculaPagada + seguroPagado;

    const faltanteMatricula = Math.max(0, limites.matricula - matriculaPagada);
    const faltanteSeguro = Math.max(0, limites.seguro - seguroPagado);
    const faltante = faltanteMatricula + faltanteSeguro;

    const estado = calcularEstado(
        matriculaPagada,
        seguroPagado,
        estudianteSeleccionado.cti,
        estudianteSeleccionado.hermano,
        descuentoActual
    );

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText("pNombre", `${estudianteSeleccionado.nombres} ${estudianteSeleccionado.apellidos}`);
    setText("pCedula", estudianteSeleccionado.cedula || "—");
    setText("pGrado", estudianteSeleccionado.grado || "—");
    setText("pTotalPagado", totalPagado.toFixed(2));
    setText("pFaltante", faltante.toFixed(2));
    setText("pEstadoResumen", estado);

    const pillEstadoPago = document.getElementById("pillEstadoPago");
    if (pillEstadoPago) {
        pillEstadoPago.textContent = estado;
        pillEstadoPago.className = `estado-pill ${estado.toLowerCase()}`;
    }

    renderizarDesglose();
    document.getElementById("panelPago")?.classList.remove("oculto");
    establecerEstadoFormularioPago(false);
    actualizarMensajesMaximos();

    if (cargarHistorial) {
        cargarHistorialPagos();
    }
}

function crearCardConcepto(nombre, total, pagado, faltante, destacado = false) {
    const porcentaje = total > 0 ? Math.min(100, (pagado / total) * 100) : 0;

    return `
        <div class="concepto-card ${destacado ? "destacado" : ""}">
            <div class="concepto-header">
                <span>${nombre}</span>
                <small>${porcentaje.toFixed(0)}%</small>
            </div>

            <div class="concepto-monto">$${Number(pagado || 0).toFixed(2)}</div>

            <div class="concepto-barra">
                <div class="concepto-barra-fill" style="width: ${porcentaje}%"></div>
            </div>

            <div class="concepto-meta">
                <span>Faltante: $${Number(faltante || 0).toFixed(2)}</span>
            </div>
        </div>
    `;
}

function renderizarDesglose() {
    const box = document.getElementById("desglosePagoBox");
    if (!box) return;

    if (!estudianteSeleccionado) {
        box.innerHTML = `
            <div class="empty-pagos-state">
                <div class="empty-pagos-icon">
                    <i class="fas fa-file-invoice-dollar"></i>
                </div>

                <h4>Sin estudiante seleccionado</h4>
                <p>
                    Selecciona un estudiante desde el buscador para ver el desglose de matrícula,
                    avances por concepto y estado de pago.
                </p>

                <div class="empty-pagos-guide">
                    <span><i class="fas fa-search"></i> Busca por cédula o nombre</span>
                    <span><i class="fas fa-hand-pointer"></i> Selecciona un estudiante</span>
                    <span><i class="fas fa-wallet"></i> Registra el pago</span>
                </div>
            </div>
        `;
        return;
    }

    const descuentoActual = obtenerDescuentoActual(estudianteSeleccionado);
    const desglose = obtenerDesglosePago(
        estudianteSeleccionado.cti,
        estudianteSeleccionado.hermano,
        descuentoActual
    );

    const pagos = obtenerPagosActuales(estudianteSeleccionado);

    const faltantes = {
        donacion: Math.max(0, desglose.donacion - pagos.donacion),
        informatica: Math.max(0, desglose.informatica - pagos.informatica),
        carnet: Math.max(0, desglose.carnet - pagos.carnet),
        odontologia: Math.max(0, desglose.odontologia - pagos.odontologia),
        seguro: Math.max(0, desglose.seguro - pagos.seguro)
    };

    box.innerHTML = `
        <div class="desglose-grid-pro">
            ${crearCardConcepto("Donación", desglose.donacion, pagos.donacion, faltantes.donacion)}
            ${crearCardConcepto("Informática", desglose.informatica, pagos.informatica, faltantes.informatica)}
            ${crearCardConcepto("Carnet", desglose.carnet, pagos.carnet, faltantes.carnet)}
            ${crearCardConcepto("Odontología", desglose.odontologia, pagos.odontologia, faltantes.odontologia)}
            ${crearCardConcepto("Seguro", desglose.seguro, pagos.seguro, faltantes.seguro)}
            ${crearCardConcepto(
                "Total",
                desglose.total,
                obtenerTotalPagadoDetalle(estudianteSeleccionado),
                faltantes.donacion +
                    faltantes.informatica +
                    faltantes.carnet +
                    faltantes.odontologia +
                    faltantes.seguro,
                true
            )}
        </div>
    `;
}

function guardarPago() {
    if (!estudianteSeleccionado) {
        mostrarAlerta("Seleccione un estudiante.");
        return;
    }

    const pagoDonacion = Number(document.getElementById("pagoDonacion")?.value || 0);
    const pagoInformatica = Number(document.getElementById("pagoInformatica")?.value || 0);
    const pagoCarnet = Number(document.getElementById("pagoCarnet")?.value || 0);
    const pagoOdontologia = Number(document.getElementById("pagoOdontologia")?.value || 0);
    const pagoSeguro = Number(document.getElementById("pagoSeguro")?.value || 0);

    const pagosIngresados = [
        pagoDonacion,
        pagoInformatica,
        pagoCarnet,
        pagoOdontologia,
        pagoSeguro
    ];

    if (pagosIngresados.some(v => !Number.isFinite(v) || v < 0)) {
        mostrarAlerta("Los montos ingresados no son válidos.");
        return;
    }

    const totalPagoActual =
        pagoDonacion +
        pagoInformatica +
        pagoCarnet +
        pagoOdontologia +
        pagoSeguro;

    if (totalPagoActual === 0) {
        mostrarAlerta("Ingrese al menos un pago.");
        return;
    }

    const descuentoActual = obtenerDescuentoActual(estudianteSeleccionado);
    const limites = obtenerLimites(
        estudianteSeleccionado.cti,
        estudianteSeleccionado.hermano,
        descuentoActual
    );

    const pagosActuales = obtenerPagosActuales(estudianteSeleccionado);

    const nuevoDonacion = Math.min(pagosActuales.donacion + pagoDonacion, limites.donacion);
    const nuevoInformatica = Math.min(pagosActuales.informatica + pagoInformatica, limites.informatica);
    const nuevoCarnet = Math.min(pagosActuales.carnet + pagoCarnet, limites.carnet);
    const nuevoOdontologia = Math.min(pagosActuales.odontologia + pagoOdontologia, limites.odontologia);
    const nuevoSeguro = Math.min(pagosActuales.seguro + pagoSeguro, limites.seguro);

    const nuevaMatricula =
        nuevoDonacion +
        nuevoInformatica +
        nuevoCarnet +
        nuevoOdontologia;

    const actualizado = {
        ...estudianteSeleccionado,
        descuentoHermano: descuentoActual,
        pagado_donacion: nuevoDonacion,
        pagado_informatica: nuevoInformatica,
        pagado_carnet: nuevoCarnet,
        pagado_odontologia: nuevoOdontologia,
        pagado_seguro: nuevoSeguro,
        pagado: nuevaMatricula,
        seguro: nuevoSeguro,
        pago_donacion_actual: pagoDonacion,
        pago_informatica_actual: pagoInformatica,
        pago_carnet_actual: pagoCarnet,
        pago_odontologia_actual: pagoOdontologia,
        pago_seguro_actual: pagoSeguro,
        estado_pago: calcularEstado(
            nuevaMatricula,
            nuevoSeguro,
            estudianteSeleccionado.cti,
            estudianteSeleccionado.hermano,
            descuentoActual
        )
    };

    estudianteSeleccionado = { ...actualizado };

    mostrarEstudiante({ cargarHistorial: false });
    limpiarInputsPago();

    pagoEnProceso = true;
    window.__pagoEnProcesoGlobal = true;
    ultimoHistorialMatriculaId = null;
    window.api.actualizarEstudiante(actualizado);
}

export function sincronizarEstudiantePagoDesdeLista(lista) {
    if (!estudianteSeleccionado || !Array.isArray(lista)) return;

    const actualizado = lista.find(
        e => Number(e.id) === Number(estudianteSeleccionado.id)
    );

    if (!actualizado) {
        resetearVistaPagos();
        pagoEnProceso = false;
        window.__pagoEnProcesoGlobal = false;
        return;
    }

    estudianteSeleccionado = { ...actualizado };

    mostrarEstudiante({ cargarHistorial: false });
    limpiarInputsPago();

    if (pagoEnProceso) {
        const vistaPagosActiva = document
            .getElementById("vista-pagos")
            ?.classList.contains("activa");

        if (vistaPagosActiva) {
            mostrarToast("Pago registrado correctamente.", "success");
        }

        cargarHistorialPagos(true);
        pagoEnProceso = false;
        window.__pagoEnProcesoGlobal = false;
    }
}

function ocultarBotonesComprobante() {
    document.getElementById("btnVerComprobante")?.classList.add("oculto");
}

function mostrarBotonesComprobante() {
    document.getElementById("btnVerComprobante")?.classList.remove("oculto");
}

export function mostrarAccionesComprobante() {
    mostrarBotonesComprobante();
}