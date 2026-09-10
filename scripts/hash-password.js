"use strict";

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/hash-password.js "TU_CONTRASEÑA"');
  process.exit(1);
}

if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

if (password.length > 200) {
  console.error("La contraseña no puede superar los 200 caracteres.");
  process.exit(1);
}

bcrypt.hash(password, 12).then(hash => {
  console.log("\nHash bcrypt generado:");
  console.log(hash);
  console.log("\nPegá SOLO ese hash en Render como:");
  console.log("SPORTDASH_ADMIN_PASSWORD_HASH");
  console.log("");
}).catch(error => {
  console.error("No se pudo generar el hash:", error.message);
  process.exit(1);
});
