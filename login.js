import { mostrarAlerta } from './renderer/ui.js';

document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");

    loginBtn.addEventListener("click", login);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") login();
    });
});

async function login() {
    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!usuario || !password) {
        mostrarAlerta("Por favor ingrese usuario y contraseña");
        return;
    }

    try {
        const res = await window.api.login(usuario, password);

        if (res?.success) {
            window.location = "index.html";
        } else {
            mostrarAlerta("Usuario o contraseña incorrectos");
        }
    } catch (err) {
        console.error("Error en login:", err);
        mostrarAlerta("Ocurrió un error al iniciar sesión");
    }
}