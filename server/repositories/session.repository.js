"use strict";

const crypto = require("crypto");
const { readDb, updateDb, now } = require("../utils/db");
const { sessionSecret } = require("../config/env");

function create(userId, deviceId = null, maxDevices = null) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHmac("sha256", sessionSecret).update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  updateDb(db => {
    db.sessions = db.sessions.filter(s => new Date(s.expiresAt).getTime() > Date.now());

    if (maxDevices && userId && !String(userId).startsWith("admin:")) {
      const cutoff = Date.now() - 3 * 60 * 1000;
      const devices = new Set();
      for (const session of db.sessions) {
        if (session.userId !== userId) continue;
        const lastSeen = new Date(session.lastSeenAt || session.createdAt || 0).getTime();
        if (lastSeen < cutoff) continue;
        devices.add(session.deviceId || session.tokenHash);
      }
      if (devices.size >= maxDevices && !devices.has(deviceId || "")) {
        const error = new Error(`Alcanzaste el límite de ${maxDevices} dispositivos/pantallas simultáneos.`);
        error.code = "DEVICE_LIMIT";
        throw error;
      }
    }

    db.sessions.push({
      tokenHash,
      userId,
      deviceId: deviceId || null,
      createdAt: now(),
      lastSeenAt: now(),
      expiresAt
    });
  });

  return token;
}

function find(token) {
  if (!token) return null;
  const tokenHash = crypto.createHmac("sha256", sessionSecret).update(token).digest("hex");
  const db = readDb();
  return db.sessions.find(s =>
    s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > Date.now()
  ) || null;
}

function touch(token) {
  if (!token) return null;
  const tokenHash = crypto.createHmac("sha256", sessionSecret).update(token).digest("hex");
  return updateDb(db => {
    const session = db.sessions.find(s =>
      s.tokenHash === tokenHash &&
      new Date(s.expiresAt).getTime() > Date.now()
    );
    if (!session) return null;
    session.lastSeenAt = now();
    return session;
  });
}

function countActiveDevices(userId, windowMs = 3 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  const devices = new Set();
  for (const session of readDb().sessions) {
    if (session.userId !== userId) continue;
    if (new Date(session.expiresAt).getTime() <= Date.now()) continue;
    const lastSeen = new Date(session.lastSeenAt || session.createdAt || 0).getTime();
    if (lastSeen < cutoff) continue;
    devices.add(session.deviceId || session.tokenHash);
  }
  return devices.size;
}

function hasActiveDevice(userId, deviceId, windowMs = 3 * 60 * 1000) {
  if (!deviceId) return false;
  const cutoff = Date.now() - windowMs;
  return readDb().sessions.some(session =>
    session.userId === userId &&
    session.deviceId === deviceId &&
    new Date(session.expiresAt).getTime() > Date.now() &&
    new Date(session.lastSeenAt || session.createdAt || 0).getTime() >= cutoff
  );
}

function destroy(token) {
  if (!token) return;
  const tokenHash = crypto.createHmac("sha256", sessionSecret).update(token).digest("hex");
  updateDb(db => {
    db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
  });
}

module.exports = { create, find, touch, countActiveDevices, hasActiveDevice, destroy };
