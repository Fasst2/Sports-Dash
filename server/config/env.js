"use strict";

require("dotenv").config();

const required = [
  "SESSION_SECRET",
  "SPORTDASH_ADMIN_USERNAME",
  "SPORTDASH_ADMIN_PASSWORD_HASH",
  "API_FOOTBALL_KEY"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno: ${key}`);
  }
}

if (process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",

  sessionSecret: process.env.SESSION_SECRET,
  adminUsername: process.env.SPORTDASH_ADMIN_USERNAME,
  adminPasswordHash: process.env.SPORTDASH_ADMIN_PASSWORD_HASH,

  footballApiKey: process.env.API_FOOTBALL_KEY,

  publicAppUrl:
    process.env.PUBLIC_APP_URL || "http://localhost:3000",

  supportWhatsapp:
    process.env.SUPPORT_WHATSAPP || ""
};