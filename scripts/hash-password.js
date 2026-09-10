"use strict";

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password || password.length < 8) {
  console.error('Uso: node scripts/hash-password.js "TuContraseña"');
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

bcrypt.hash(password, 12).then(hash => {
  console.log("\nHash bcrypt:");
  console.log(hash);
  console.log("\nCopialo en SPORTDASH_ADMIN_PASSWORD_HASH dentro de .env\n");
});
