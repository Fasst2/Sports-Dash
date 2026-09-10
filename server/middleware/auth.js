"use strict";

const sessions = require("../repositories/session.repository");
const users = require("../repositories/user.repository");
const { adminUsername } = require("../config/env");

function requireAuth(req, res, next) {
  const token = req.cookies?.sportdash_session;
  const session = sessions.find(token);
  if (!session) return res.status(401).json({ success: false, message: "Sesión no válida." });

  sessions.touch(token);

  if (session.userId === `admin:${adminUsername}`) {
    req.auth = {
      user: { id: "admin", username: adminUsername, displayName: "Administrador", role: "admin", status: "active", expiresAt: null }
    };
    return next();
  }

  const user = users.findById(session.userId);
  const state = users.accessState(user);
  if (!state.allowed) {
    sessions.destroy(token);
    res.clearCookie("sportdash_session");
    return res.status(403).json({
      success: false,
      code: state.reason,
      message: state.reason === "expired" ? "Tu acceso de 30 días ha vencido." : "Tu cuenta no tiene acceso activo."
    });
  }

  req.auth = { user };
  next();
}

function requireAdmin(req, res, next) {
  if (req.auth?.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Se requiere acceso de administrador." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
