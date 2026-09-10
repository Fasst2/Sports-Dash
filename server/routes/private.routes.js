"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/overview", (req, res) => {
  res.json({
    success: true,
    data: {
      featured: [],
      message: "Contenido privado listo para conectar con tus fuentes autorizadas."
    }
  });
});

module.exports = router;
