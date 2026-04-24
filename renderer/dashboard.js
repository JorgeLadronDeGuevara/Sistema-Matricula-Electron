import { getEstudiantesGlobal } from "./state.js";
import { calcularEstado, obtenerLimites, formatearNumero, formatoDinero } from "./utils.js";

// =========================
// CALENDARIO DASHBOARD
// =========================

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const dayNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

let currentCalendarDate = new Date();
let dashboardCalendarInitialized = false;

export function initDashboardCalendar() {
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  renderCalendar();

  if (dashboardCalendarInitialized) return;

  prevBtn?.addEventListener("click", () => {
    currentCalendarDate = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  nextBtn?.addEventListener("click", () => {
    currentCalendarDate = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  dashboardCalendarInitialized = true;
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("calendarMonthLabel");

  if (!grid || !label) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  label.textContent = `${monthNames[month]} ${year}`;

  grid.innerHTML = "";

  dayNames.forEach(day => {
    const el = document.createElement("span");
    el.textContent = day;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const prevLastDay = new Date(year, month, 0).getDate();
  const today = new Date();

  for (let i = start - 1; i >= 0; i--) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day muted";
    btn.textContent = prevLastDay - i;
    grid.appendChild(btn);
  }

  for (let d = 1; d <= totalDays; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    btn.textContent = d;

    if (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    ) {
      btn.classList.add("active");
    }

    grid.appendChild(btn);
  }

    const used = start + totalDays;
    const remaining = 42 - used;

  for (let i = 1; i <= remaining; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day muted";
    btn.textContent = i;
    grid.appendChild(btn);
  }
}

function obtenerEstadoReal(est) {
    const descuento = est.descuento_hermano ?? est.descuentoHermano ?? "No";

    return calcularEstado(
        est.pagado,
        est.seguro,
        est.cti,
        est.hermano,
        descuento
    );
}

export function actualizarStats() {
    const estudiantes = getEstudiantesGlobal();

    let total = estudiantes.length;
    let pendientes = 0;
    let cancelados = 0;
    let abonados = 0;

    let totalMatriculas = 0;
    let totalSeguros = 0;

    let totalDonaciones = 0;
    let totalInformatica = 0;
    let totalCarnet = 0;
    let totalOdontologia = 0;

    let totalEsperadoMatriculas = 0;
    let totalEsperadoSeguros = 0;

    let totalEsperadoDonaciones = 0;
    let totalEsperadoInformatica = 0;
    let totalEsperadoCarnet = 0;
    let totalEsperadoOdontologia = 0;

    estudiantes.forEach(est => {
        const descuento = est.descuento_hermano ?? est.descuentoHermano ?? "No";
        const estadoReal = obtenerEstadoReal(est);

        if (estadoReal === "Pendiente") pendientes++;
        else if (estadoReal === "Cancelado") cancelados++;
        else if (estadoReal === "Abonado") abonados++;

        const limites = obtenerLimites(est.cti, est.hermano, descuento);

        totalMatriculas += Number(est.pagado) || 0;
        totalSeguros += Number(est.seguro) || 0;

        totalDonaciones += Number(est.pagado_donacion) || 0;
        totalInformatica += Number(est.pagado_informatica) || 0;
        totalCarnet += Number(est.pagado_carnet) || 0;
        totalOdontologia += Number(est.pagado_odontologia) || 0;

        totalEsperadoMatriculas += Number(limites.matricula) || 0;
        totalEsperadoSeguros += Number(limites.seguro) || 0;

        totalEsperadoDonaciones += Number(limites.donacion) || 0;
        totalEsperadoInformatica += Number(limites.informatica) || 0;
        totalEsperadoCarnet += Number(limites.carnet) || 0;
        totalEsperadoOdontologia += Number(limites.odontologia) || 0;
    });

    const resumen = document.getElementById("resumenEstudiantes");
    if (resumen) {
        resumen.textContent = `Mostrando ${formatearNumero(total)} estudiantes`;
    }

    const resumenTop = document.getElementById("resumenEstudiantesTop");
    if (resumenTop) {
        resumenTop.textContent = `Mostrando ${formatearNumero(total)} estudiantes`;
    }

    const dashTotalEstudiantes = document.getElementById("dashTotalEstudiantes");
    const dashTotalPendientes = document.getElementById("dashTotalPendientes");
    const dashTotalCancelados = document.getElementById("dashTotalCancelados");
    const dashTotalAbonados = document.getElementById("dashTotalAbonados");
    const dashTotalSeguros = document.getElementById("dashTotalSeguros");
    const dashTotalDonaciones = document.getElementById("dashTotalDonaciones");
    const dashTotalInformatica = document.getElementById("dashTotalInformatica");
    const dashTotalCarnet = document.getElementById("dashTotalCarnet");
    const dashTotalOdontologia = document.getElementById("dashTotalOdontologia");

    const dashSubTotalEstudiantes = document.getElementById("dashSubTotalEstudiantes");
    const dashSubTotalPendientes = document.getElementById("dashSubTotalPendientes");
    const dashSubTotalAbonados = document.getElementById("dashSubTotalAbonados");
    const dashSubTotalCancelados = document.getElementById("dashSubTotalCancelados");
    const dashSubTotalSeguros = document.getElementById("dashSubTotalSeguros");
    const dashSubTotalDonaciones = document.getElementById("dashSubTotalDonaciones");
    const dashSubTotalInformatica = document.getElementById("dashSubTotalInformatica");
    const dashSubTotalCarnet = document.getElementById("dashSubTotalCarnet");
    const dashSubTotalOdontologia = document.getElementById("dashSubTotalOdontologia");

    if (dashTotalEstudiantes) dashTotalEstudiantes.textContent = formatearNumero(total);
    if (dashTotalPendientes) dashTotalPendientes.textContent = formatearNumero(pendientes);
    if (dashTotalCancelados) dashTotalCancelados.textContent = formatearNumero(cancelados);
    if (dashTotalAbonados) dashTotalAbonados.textContent = formatearNumero(abonados);

    if (dashTotalSeguros) dashTotalSeguros.textContent = formatoDinero(totalSeguros);
    if (dashTotalDonaciones) dashTotalDonaciones.textContent = formatoDinero(totalDonaciones);
    if (dashTotalInformatica) dashTotalInformatica.textContent = formatoDinero(totalInformatica);
    if (dashTotalCarnet) dashTotalCarnet.textContent = formatoDinero(totalCarnet);
    if (dashTotalOdontologia) dashTotalOdontologia.textContent = formatoDinero(totalOdontologia);

    if (dashSubTotalEstudiantes) dashSubTotalEstudiantes.textContent = `de ${formatearNumero(total)} estudiantes`;
    if (dashSubTotalPendientes) dashSubTotalPendientes.textContent = `de ${formatearNumero(total)} estudiantes`;
    if (dashSubTotalAbonados) dashSubTotalAbonados.textContent = `de ${formatearNumero(total)} estudiantes`;
    if (dashSubTotalCancelados) dashSubTotalCancelados.textContent = `de ${formatearNumero(total)} estudiantes`;

   if (dashSubTotalSeguros) dashSubTotalSeguros.textContent = `de ${formatoDinero(totalEsperadoSeguros)} total`;
    if (dashSubTotalDonaciones) dashSubTotalDonaciones.textContent = `de ${formatoDinero(totalEsperadoDonaciones)} total`;
    if (dashSubTotalInformatica) dashSubTotalInformatica.textContent = `de ${formatoDinero(totalEsperadoInformatica)} total`;
    if (dashSubTotalCarnet) dashSubTotalCarnet.textContent = `de ${formatoDinero(totalEsperadoCarnet)} total`;
    if (dashSubTotalOdontologia) dashSubTotalOdontologia.textContent = `de ${formatoDinero(totalEsperadoOdontologia)} total`;

    const porcentajePendientes = total > 0 ? (pendientes / total) * 100 : 0;
    const porcentajeCancelados = total > 0 ? (cancelados / total) * 100 : 0;
    const porcentajeAbonados = total > 0 ? (abonados / total) * 100 : 0;

    const porcentajeSeguros = totalEsperadoSeguros > 0
        ? (totalSeguros / totalEsperadoSeguros) * 100
        : 0;

    const porcentajeMatriculas = totalEsperadoMatriculas > 0
        ? (totalMatriculas / totalEsperadoMatriculas) * 100
        : 0;

    const porcentajeDonaciones = totalEsperadoDonaciones > 0
        ? (totalDonaciones / totalEsperadoDonaciones) * 100
        : 0;

    const porcentajeInformatica = totalEsperadoInformatica > 0
        ? (totalInformatica / totalEsperadoInformatica) * 100
        : 0;

    const porcentajeCarnet = totalEsperadoCarnet > 0
        ? (totalCarnet / totalEsperadoCarnet) * 100
        : 0;

    const porcentajeOdontologia = totalEsperadoOdontologia > 0
        ? (totalOdontologia / totalEsperadoOdontologia) * 100
        : 0;

    const aplicarRing = (ringId, textId, valor) => {
        const ring = document.getElementById(ringId);
        const text = document.getElementById(textId);

        const porcentajeReal = Math.max(0, Math.min(valor, 100));

        if (ring) {
            ring.style.setProperty("--progress", `${porcentajeReal}%`);
        }

        if (text) {
            let textoPorcentaje = "0%";

            if (porcentajeReal > 0 && porcentajeReal < 1) {
                textoPorcentaje = `${porcentajeReal.toFixed(2)}%`;
            } else if (porcentajeReal >= 1 && porcentajeReal < 100) {
                textoPorcentaje = `${porcentajeReal.toFixed(1)}%`;
            } else {
                textoPorcentaje = `${Math.round(porcentajeReal)}%`;
            }

            text.textContent = textoPorcentaje;
        }
    };

    aplicarRing("ringTotalEstudiantes", "ringTextTotalEstudiantes", total > 0 ? 100 : 0);
    aplicarRing("ringPendientes", "ringTextPendientes", porcentajePendientes);
    aplicarRing("ringAbonados", "ringTextAbonados", porcentajeAbonados);
    aplicarRing("ringCancelados", "ringTextCancelados", porcentajeCancelados);
    aplicarRing("ringSeguros", "ringTextSeguros", porcentajeSeguros);

    // Estos cuatro pueden usar el avance general de matrícula
    aplicarRing("ringDonaciones", "ringTextDonaciones", porcentajeDonaciones);
    aplicarRing("ringInformatica", "ringTextInformatica", porcentajeInformatica);
    aplicarRing("ringCarnet", "ringTextCarnet", porcentajeCarnet);
    aplicarRing("ringOdontologia", "ringTextOdontologia", porcentajeOdontologia);

}
