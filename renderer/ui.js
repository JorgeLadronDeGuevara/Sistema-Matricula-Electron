//ui.js

export function mostrarAlerta(mensaje){

    const modal = document.getElementById("alertModal");
    const texto = document.getElementById("alertText");
    const btn = document.getElementById("alertOk");
    const close = document.getElementById("alertClose");

    texto.textContent = mensaje;

    modal.style.display = "flex";

    const cerrar = () => {
        modal.style.display = "none";
        btn.onclick = null;
        close.onclick = null;
    };

    btn.onclick = cerrar;
    close.onclick = cerrar;

    btn.focus();
}

export function confirmar(mensaje) {

    return new Promise((resolve) => {

        const modal = document.getElementById("confirmModal");
        const texto = document.getElementById("confirmText");
        const yes = document.getElementById("confirmYes");
        const no = document.getElementById("confirmNo");
        const close = document.getElementById("confirmClose");

        texto.textContent = mensaje;

        modal.style.display = "flex";

        const cerrar = (respuesta) => {
            modal.style.display = "none";
            yes.onclick = null;
            no.onclick = null;
            close.onclick = null;
            resolve(respuesta);
        };

        yes.onclick = () => cerrar(true);
        no.onclick = () => cerrar(false);
        close.onclick = () => cerrar(false);

        yes.focus();
    });
}