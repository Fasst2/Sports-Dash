"use strict";

const { readDb, updateDb, id, now } = require("../utils/db");

function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  safe.maxDevices = Number(safe.maxDevices) > 0 ? Number(safe.maxDevices) : 2;
  return safe;
}

function findByUsername(username) {
  const db = readDb();
  return db.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

function findById(userId) {
  const db = readDb();
  return db.users.find(u => u.id === userId) || null;
}

function list() {
  return readDb().users
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(sanitize);
}

function create({ username, passwordHash, displayName, days = 30, maxDevices = 2 }) {
  const createdAt = now();
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const user = {
    id: id("usr"),
    username,
    displayName: displayName || username,
    role: "member",
    status: "active",
    passwordHash,
    createdAt,
    expiresAt,
    lastLoginAt: null,
    maxDevices: Math.min(10, Math.max(1, Number(maxDevices) || 2))
  };

  updateDb(db => {
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      const err = new Error("Ese nombre de usuario ya existe.");
      err.code = "USER_EXISTS";
      throw err;
    }
    db.users.push(user);
    return user;
  });

  return sanitize(user);
}

function renew(userId, days = 30) {
  return updateDb(db => {
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    const base = new Date(user.expiresAt).getTime() > Date.now()
      ? new Date(user.expiresAt).getTime()
      : Date.now();
    user.expiresAt = new Date(base + days * 86400000).toISOString();
    user.status = "active";
    return sanitize(user);
  });
}

function setStatus(userId, status) {
  return updateDb(db => {
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.status = status;
    return sanitize(user);
  });
}

function setMaxDevices(userId, maxDevices) {
  return updateDb(db => {
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.maxDevices = Math.min(10, Math.max(1, Number(maxDevices) || 2));
    return sanitize(user);
  });
}

function markLogin(userId) {
  updateDb(db => {
    const user = db.users.find(u => u.id === userId);
    if (user) user.lastLoginAt = now();
  });
}

function accessState(user) {
  if (!user) return { allowed: false, reason: "not_found" };
  if (user.status !== "active") return { allowed: false, reason: "disabled" };
  if (new Date(user.expiresAt).getTime() <= Date.now()) return { allowed: false, reason: "expired" };
  return { allowed: true, reason: "active" };
}

module.exports = { findByUsername, findById, list, create, renew, setStatus, setMaxDevices, markLogin, accessState, sanitize };
