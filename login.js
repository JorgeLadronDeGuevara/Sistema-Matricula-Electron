import { mostrarAlerta } from './renderer/ui.js';

let loginEnProceso = false;

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("loginBtn");
    const loginForm = document.getElementById("loginForm");

    document.getElementById("usuario")?.focus();

    try {
        const session = await window.api.getSession();
        if (session?.logged) {
            window.location.replace("index.html");
            return;
        }
    } catch (error) {
        console.error("No se pudo validar la sesión actual:", error);
    }

    function actualizarEstadoBoton() {
        const usuario = usuarioInput?.value.trim() || "";
        const password = passwordInput?.value.trim() || "";

        if (loginBtn && !loginEnProceso) {
            loginBtn.disabled = !(usuario && password);
        }
    }

    usuarioInput?.addEventListener("input", actualizarEstadoBoton);
    passwordInput?.addEventListener("input", actualizarEstadoBoton);

    loginForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        login();
    });

    actualizarEstadoBoton();
});

async function login() {
    if (loginEnProceso) return;

    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("loginBtn");

    const usuario = usuarioInput?.value.trim() || "";
    const password = passwordInput?.value.trim() || "";

    if (!usuario || !password) {
        mostrarAlerta("Por favor ingrese usuario y contraseña.");
        return;
    }

    loginEnProceso = true;

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<span class="spinner"></span> Validando...`;
    }

    try {
        const res = await window.api.login(usuario, password);

        if (res?.success) {
            window.location.replace("index.html");
            return;
        }

        if (res?.locked) {
            mostrarAlerta(res.message);
        } else {
            mostrarAlerta(res?.message || "Usuario o contraseña incorrectos.");
        }

        passwordInput.value = "";
        passwordInput.focus();

    } catch (err) {
        console.error("Error en login:", err);
        mostrarAlerta("Ocurrió un error al iniciar sesión.");
    } finally {
        loginEnProceso = false;

        if (loginBtn) {
            loginBtn.textContent = "Entrar";
            loginBtn.disabled = !(
                (usuarioInput?.value.trim() || "") &&
                (passwordInput?.value.trim() || "")
            );
        }
    }
}