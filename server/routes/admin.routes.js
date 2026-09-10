"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const users = require("../repositories/user.repository");
const audit = require("../services/audit.service");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/users", (req, res) => {
  const list = users.list().map(u => ({
    ...u,
    daysRemaining: Math.max(0, Math.ceil((new Date(u.expiresAt) - Date.now()) / 86400000))
  }));
  res.json({ success: true, users: list });
});

router.post("/users", async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim() : "";
  const maxDevices = Number(req.body.maxDevices);

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    return res.status(400).json({ success: false, message: "El usuario debe tener 3-32 caracteres y solo usar letras, números, punto, guion o guion bajo." });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 8 caracteres." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = users.create({ username, passwordHash, displayName: displayName || username, days: 30, maxDevices: Number.isInteger(maxDevices) && maxDevices >= 1 && maxDevices <= 10 ? maxDevices : 2 });
    audit.log("user_created", req.auth.user.username, user.id, { username: user.username, days: 30 });
    res.status(201).json({ success: true, user });
  } catch (error) {
    if (error.code === "USER_EXISTS") return res.status(409).json({ success: false, message: error.message });
    console.error(error);
    res.status(500).json({ success: false, message: "No se pudo crear el usuario." });
  }
});

router.patch("/users/:id/devices", (req, res) => {
  const maxDevices = Number(req.body.maxDevices);
  if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 10) {
    return res.status(400).json({ success: false, message: "El límite debe ser un número entero entre 1 y 10." });
  }
  const user = users.setMaxDevices(req.params.id, maxDevices);
  if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });
  audit.log("user_device_limit_changed", req.auth.user.username, user.id, { maxDevices });
  res.json({ success: true, user });
});

router.post("/users/:id/renew", (req, res) => {
  const user = users.renew(req.params.id, 30);
  if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });
  audit.log("user_renewed", req.auth.user.username, user.id, { days: 30 });
  res.json({ success: true, user });
});

router.patch("/users/:id/status", (req, res) => {
  const status = req.body.status === "disabled" ? "disabled" : "active";
  const user = users.setStatus(req.params.id, status);
  if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });
  audit.log(status === "active" ? "user_enabled" : "user_disabled", req.auth.user.username, user.id);
  res.json({ success: true, user });
});

module.exports = router;
