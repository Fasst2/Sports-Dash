"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const users = require("../repositories/user.repository");
const sessions = require("../repositories/session.repository");
const audit = require("../services/audit.service");
const { adminUsername, adminPasswordHash } = require("../config/env");

const router = express.Router();

function publicUser(user) {
  if (!user) return null;
  return users.sanitize(user);
}

router.post("/login", async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const deviceId = typeof req.body.deviceId === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(req.body.deviceId)
    ? req.body.deviceId
    : null;

  if (!username || !password || username.length > 80 || password.length > 200) {
    return res.status(400).json({ success: false, message: "Completá usuario y contraseña." });
  }

  // Admin principal: permanece fuera de la base de miembros y no vence.
  if (username.toLowerCase() === adminUsername.toLowerCase()) {
    const ok = await bcrypt.compare(password, adminPasswordHash);
    if (!ok) return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });

    const token = sessions.create(`admin:${adminUsername}`);
    res.cookie("sportdash_session", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 86400000, path: "/"
    });
    audit.log("admin_login", adminUsername);
    return res.json({
      success: true,
      user: { id: "admin", username: adminUsername, displayName: "Administrador", role: "admin", status: "active", expiresAt: null }
    });
  }

  const user = users.findByUsername(username);
  if (!user) return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });

  const state = users.accessState(user);
  if (!state.allowed) {
    return res.status(403).json({
      success: false,
      code: state.reason,
      message: state.reason === "expired"
        ? "Tu acceso venció. Contactá al administrador para renovarlo."
        : "Tu cuenta está deshabilitada."
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos." });

  const maxDevices = Number(user.maxDevices) > 0 ? Number(user.maxDevices) : 2;

  let token;
  try {
    token = sessions.create(user.id, deviceId, maxDevices);
  } catch (error) {
    if (error.code === "DEVICE_LIMIT") {
      return res.status(409).json({
        success: false,
        code: "DEVICE_LIMIT",
        message: `Alcanzaste el límite de ${maxDevices} dispositivos/pantallas simultáneos. Cerrá una sesión en otro dispositivo e intentá nuevamente.`
      });
    }
    throw error;
  }

  users.markLogin(user.id);

  res.cookie("sportdash_session", token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000, path: "/"
  });
  audit.log("member_login", user.username, user.id);

  return res.json({ success: true, user: publicUser(user) });
});

router.post("/heartbeat", (req, res) => {
  const token = req.cookies?.sportdash_session;
  const session = sessions.find(token);
  if (!session) return res.status(401).json({ success: false, authenticated: false });

  if (session.userId.startsWith("admin:")) {
    sessions.touch(token);
    return res.json({ success: true, active: true });
  }

  const user = users.findById(session.userId);
  const access = users.accessState(user);
  if (!access.allowed) {
    sessions.destroy(token);
    res.clearCookie("sportdash_session");
    return res.status(403).json({ success: false, authenticated: false, code: access.reason });
  }

  sessions.touch(token);
  return res.json({
    success: true,
    active: true,
    maxDevices: Number(user.maxDevices) > 0 ? Number(user.maxDevices) : 2
  });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.sportdash_session;
  const session = sessions.find(token);
  if (!session) return res.status(401).json({ success: false, authenticated: false });
  sessions.touch(token);

  if (session.userId.startsWith("admin:")) {
    return res.json({
      success: true, authenticated: true,
      user: { id: "admin", username: adminUsername, displayName: "Administrador", role: "admin", status: "active", expiresAt: null }
    });
  }

  const user = users.findById(session.userId);
  const state = users.accessState(user);
  if (!state.allowed) return res.status(403).json({ success: false, authenticated: false, code: state.reason });

  return res.json({ success: true, authenticated: true, user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  sessions.destroy(req.cookies?.sportdash_session);
  res.clearCookie("sportdash_session", { httpOnly: true, sameSite: "lax", path: "/" });
  res.json({ success: true });
});

module.exports = router;
