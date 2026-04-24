// ui.js

function bloquearScroll() {
    document.body.style.overflow = "hidden";
}

function desbloquearScroll() {
    document.body.style.overflow = "";
}

function cerrarConEscape(handler) {
    const keyHandler = (e) => {
        if (e.key === "Escape") {
            handler();
        }
    };

    document.addEventListener("keydown", keyHandler);

    return () => {
        document.removeEventListener("keydown", keyHandler);
    };
}

function cerrarClickFuera(modal, handler) {
    const clickHandler = (e) => {
        if (e.target === modal) {
            handler();
            modal.removeEventListener("click", clickHandler);
        }
    };
    modal.addEventListener("click", clickHandler);
}

// ---------------- ALERTA ----------------

export function mostrarAlerta(mensaje) {
    console.log("MOSTRAR ALERTA LLAMADA CON:", mensaje);
    console.trace();

    const modal = document.getElementById("alertModal");
    const texto = document.getElementById("alertText");
    const btn = document.getElementById("alertOk");
    const close = document.getElementById("alertClose");

    if (!modal || !texto || !btn) return;

    texto.textContent = mensaje;
    modal.classList.add("activo");
    bloquearScroll();

    let removerEscape = null;

    const cerrar = () => {
        modal.classList.remove("activo");
        desbloquearScroll();

        if (removerEscape) removerEscape();

        btn.onclick = null;
        close && (close.onclick = null);
    };

    removerEscape = cerrarConEscape(cerrar);

    btn.onclick = cerrar;
    if (close) close.onclick = cerrar;

    cerrarClickFuera(modal, cerrar);

    btn.focus();
}

export function mostrarToast(mensaje, tipo = "success") {
    if (!mensaje) return;

    let contenedor = document.getElementById("toastContainer");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "toastContainer";
        contenedor.style.position = "fixed";
        contenedor.style.top = "20px";
        contenedor.style.right = "20px";
        contenedor.style.zIndex = "99999";
        contenedor.style.display = "flex";
        contenedor.style.flexDirection = "column";
        contenedor.style.gap = "10px";
        contenedor.style.pointerEvents = "none";
        contenedor.style.maxWidth = "calc(100vw - 24px)";
        contenedor.style.alignItems = "flex-end";
        document.body.appendChild(contenedor);
    }

    const toast = document.createElement("div");
    toast.textContent = mensaje;

    let borde = "#22c55e";
    let fondo = "linear-gradient(180deg, #f0fdf4, #dcfce7)";
    let color = "#166534";

    if (tipo === "error") {
        borde = "#ef4444";
        fondo = "linear-gradient(180deg, #fef2f2, #fee2e2)";
        color = "#991b1b";
    } else if (tipo === "warning") {
        borde = "#f59e0b";
        fondo = "linear-gradient(180deg, #fffbeb, #fef3c7)";
        color = "#92400e";
    } else if (tipo === "info") {
        borde = "#2563eb";
        fondo = "linear-gradient(180deg, #eff6ff, #dbeafe)";
        color = "#1d4ed8";
    }

    toast.style.minWidth = "280px";
    toast.style.maxWidth = "380px";
    toast.style.padding = "14px 16px";
    toast.style.borderRadius = "14px";
    toast.style.borderLeft = `4px solid ${borde}`;
    toast.style.background = fondo;
    toast.style.color = color;
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "700";
    toast.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.14)";
    toast.style.pointerEvents = "auto";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    toast.style.transition = "all 0.25s ease";

    contenedor.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-8px)";

        setTimeout(() => {
            toast.remove();
            if (contenedor && contenedor.children.length === 0) {
                contenedor.remove();
            }
        }, 250);
    }, 3200);
}

// ---------------- CONFIRMAR ----------------

export function confirmar(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        const texto = document.getElementById("confirmText");
        const yes = document.getElementById("confirmYes");
        const no = document.getElementById("confirmNo");
        const close = document.getElementById("confirmClose");

        if (!modal || !texto || !yes || !no) {
            resolve(false);
            return;
        }

        texto.textContent = mensaje;
        modal.classList.add("activo");
        bloquearScroll();

        let removerEscape = null;

        const cerrar = (respuesta) => {
            modal.classList.remove("activo");
            desbloquearScroll();

            if (removerEscape) removerEscape();

            yes.onclick = null;
            no.onclick = null;
            close && (close.onclick = null);

            resolve(respuesta);
        };

        removerEscape = cerrarConEscape(() => cerrar(false));

        yes.onclick = () => cerrar(true);
        no.onclick = () => cerrar(false);
        if (close) close.onclick = () => cerrar(false);

        cerrarClickFuera(modal, () => cerrar(false));

        yes.focus();
    });
}