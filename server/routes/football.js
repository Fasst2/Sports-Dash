"use strict";

const express = require("express");
const router = express.Router();

const { apiFootball } = require("../services/apiFootball");

/*
 * GET /api/football/status
 *
 * Comprueba que SportDash puede comunicarse
 * correctamente con API-Football.
 */
router.get("/status", async (req, res) => {
    try {
        const data = await apiFootball("status");

        res.json({
            success: true,
            source: "api-football",
            data
        });
    } catch (error) {
        console.error("API-Football status error:", error);

        res.status(502).json({
            success: false,
            error: "No se pudo conectar con API-Football."
        });
    }
});

/*
 * GET /api/football/leagues
 *
 * Ejemplo:
 * /api/football/leagues
 * /api/football/leagues?country=Argentina
 */
router.get("/leagues", async (req, res) => {
    try {
        const data = await apiFootball("leagues", {
            country: req.query.country
        });

        res.json({
            success: true,
            source: "api-football",
            results: data.results || 0,
            data: data.response || []
        });
    } catch (error) {
        console.error("API-Football leagues error:", error);

        res.status(502).json({
            success: false,
            error: "No se pudieron obtener las ligas."
        });
    }
});

module.exports = router;