"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const emptyDb = {
  version: 1,
  users: [],
  sessions: [],
  audit: []
};

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    atomicWrite(emptyDb);
  }
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    throw new Error("La base de datos local está dañada o no es JSON válido.");
  }
}

function atomicWrite(data) {
  const temp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DB_FILE);
}

function updateDb(mutator) {
  const db = readDb();
  const result = mutator(db);
  atomicWrite(db);
  return result;
}

function id(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

module.exports = { DB_FILE, readDb, updateDb, id, now, ensureDb };
