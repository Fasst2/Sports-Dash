"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const deviceStorageKey = "sportdash_device_id";
  let deviceId = localStorage.getItem(deviceStorageKey);
  if (!deviceId) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    deviceId = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(deviceStorageKey, deviceId);
  }
  const form = document.getElementById("login-form");
  const message = document.getElementById("login-message");
  const submit = document.getElementById("login-submit");
  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle-password");

  fetch("/api/auth/me", { credentials: "same-origin" })
    .then(r => r.ok ? location.replace("/app") : null)
    .catch(() => {});

  toggle?.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    submit.disabled = true;
    submit.classList.add("is-loading");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: document.getElementById("username").value,
          password: password.value,
          deviceId
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo iniciar sesión.");
      location.replace("/app");
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("is-error");
    } finally {
      submit.disabled = false;
      submit.classList.remove("is-loading");
    }
  });
});
