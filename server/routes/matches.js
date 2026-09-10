"use strict";

const express = require("express");

const router = express.Router();

const { apiFootball } = require("../services/apiFootball");

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const TIMEZONE = "America/Argentina/Buenos_Aires";

/*
 * Competiciones que SportDash mostrará.
 *
 * El nombre se normaliza porque API-Football puede devolver
 * pequeñas variaciones según la temporada/competición.
 */
const ALLOWED_LEAGUES = new Set([
    // Argentina
    "Liga Profesional Argentina",
    "Copa Argentina",
    "Supercopa Argentina",
    "Liga Profesional de Reserva",
    "Primera Nacional",
    "Primera B Metropolitana",
    "Primera C",
    "Primera D",
    "Federal A",
    "Federal Regional Amateur",

    // Sudamérica
    "Copa Libertadores",
    "Copa Sudamericana",
    "Brasileirão",
    "Liga MX",
    "MLS",
    "Liga BetPlay",
    "LigaPro",
    "Primera División Chile",
    "Primera División Uruguay",
    "Liga 1",

    // Europa
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "UEFA Champions League",
    "UEFA Europa League",
    "UEFA Conference League"
]);

/* =========================================================
   NORMALIZACIÓN DE LIGAS
   ========================================================= */

function normalizeLeagueName(name = "") {
    const value = String(name)
        .trim()
        .replace(/\s+/g, " ");

    const normalized = value.toLowerCase();

    const aliases = {
        "liga profesional": "Liga Profesional Argentina",
        "liga profesional argentina": "Liga Profesional Argentina",

        "copa argentina": "Copa Argentina",

        "supercopa argentina": "Supercopa Argentina",

        "liga profesional de reserva":
            "Liga Profesional de Reserva",

        "primera nacional": "Primera Nacional",

        "primera b nacional": "Primera Nacional",

        "primera b metropolitana":
            "Primera B Metropolitana",

        "primera c": "Primera C",

        "primera d": "Primera D",

        "torneo federal a": "Federal A",
        "federal a": "Federal A",

        "torneo regional federal amateur":
            "Federal Regional Amateur",

        "federal regional amateur":
            "Federal Regional Amateur",

        "copa libertadores":
            "Copa Libertadores",

        "copa libertadores de américa":
            "Copa Libertadores",

        "copa sudamericana":
            "Copa Sudamericana",

        "brasileirao":
            "Brasileirão",

        "brasileirão":
            "Brasileirão",

        "serie a brazil":
            "Brasileirão",

        "liga mx":
            "Liga MX",

        "mls":
            "MLS",

        "liga betplay":
            "Liga BetPlay",

        "liga betplay dimayor":
            "Liga BetPlay",

        "liga pro":
            "LigaPro",

        "ligapro":
            "LigaPro",

        "primera division chile":
            "Primera División Chile",

        "primera división chile":
            "Primera División Chile",

        "primera division - chile":
            "Primera División Chile",

        "primera division uruguay":
            "Primera División Uruguay",

        "primera división uruguay":
            "Primera División Uruguay",

        "liga 1":
            "Liga 1",

        "premier league":
            "Premier League",

        "la liga":
            "La Liga",

        "laliga":
            "La Liga",

        "serie a":
            "Serie A",

        "bundesliga":
            "Bundesliga",

        "ligue 1":
            "Ligue 1",

        "uefa champions league":
            "UEFA Champions League",

        "uefa europa league":
            "UEFA Europa League",

        "uefa conference league":
            "UEFA Conference League"
    };

    return aliases[normalized] || value;
}

/* =========================================================
   VALIDACIÓN DE LIGA
   ========================================================= */

function isAllowedLeague(name) {
    return ALLOWED_LEAGUES.has(
        normalizeLeagueName(name)
    );
}

/* =========================================================
   FECHA ARGENTINA
   ========================================================= */

function getTodayArgentina() {
    const formatter = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );

    return formatter.format(
        new Date()
    );
}

/* =========================================================
   VALIDAR FECHA YYYY-MM-DD
   ========================================================= */

function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(
        date.getTime()
    );
}

/* =========================================================
   ESTADO DEL PARTIDO
   ========================================================= */

function mapMatchStatus(shortStatus) {
    const status = String(
        shortStatus || ""
    ).toUpperCase();

    switch (status) {
        case "NS":
        case "TBD":
            return "upcoming";

        case "1H":
        case "HT":
        case "2H":
        case "ET":
        case "P":
        case "BT":
            return "live";

        case "FT":
        case "AET":
        case "PEN":
            return "finished";

        case "PST":
            return "postponed";

        case "CANC":
            return "cancelled";

        case "SUSP":
            return "suspended";

        case "ABD":
            return "abandoned";

        default:
            return "upcoming";
    }
}

/* =========================================================
   FORMATEAR FECHA/HORA
   ========================================================= */

function getArgentinaDateTime(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return {
            date: null,
            time: null
        };
    }

    const dateFormatter = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );

    const timeFormatter = new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: TIMEZONE,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    );

    return {
        date: dateFormatter.format(date),
        time: timeFormatter.format(date)
    };
}

/* =========================================================
   MAPEAR FIXTURE
   ========================================================= */

function mapMatch(fixture) {
    const fixtureData = fixture?.fixture || {};
    const teams = fixture?.teams || {};
    const league = fixture?.league || {};
    const goals = fixture?.goals || {};

    const home = teams.home || {};
    const away = teams.away || {};

    const argentinaDateTime =
        getArgentinaDateTime(
            fixtureData.date
        );

    const fixtureStatus =
        fixtureData.status || {};

    return {
        id: String(
            fixtureData.id
        ),

        league: normalizeLeagueName(
            league.name || "Fútbol"
        ),

        country:
            league.country || "",

        date:
            argentinaDateTime.date,

        time:
            argentinaDateTime.time,

        home:
            home.name || "Local",

        away:
            away.name || "Visitante",

        codeHome:
            home.code || "",

        codeAway:
            away.code || "",

        homeLogo:
            home.logo || "",

        awayLogo:
            away.logo || "",

        leagueLogo:
            league.logo || "",

        status:
            mapMatchStatus(
                fixtureStatus.short
            ),

        fixtureStatus:
            fixtureStatus.short || "",

        fixtureStatusLong:
            fixtureStatus.long || "",

        elapsed:
            fixtureStatus.elapsed ?? null,

        scoreHome:
            goals.home ?? null,

        scoreAway:
            goals.away ?? null,

        /*
         * La asignación de canales se realizará
         * posteriormente mediante nuestro catálogo
         * interno de señales.
         */
        channelId: null,

        channelIds: []
    };
}

/* =========================================================
   GET /api/matches
   =========================================================
 *
 * Ejemplos:
 *
 * /api/matches
 * /api/matches?date=2026-09-10
 *
 * ========================================================= */

router.get("/", async (req, res) => {
    try {
        const requestedDate =
            String(
                req.query.date || ""
            ).trim();

        const date =
            requestedDate &&
            isValidDate(requestedDate)
                ? requestedDate
                : getTodayArgentina();

        const data =
            await apiFootball(
                "fixtures",
                {
                    date,
                    timezone: TIMEZONE
                }
            );

        const fixtures =
            Array.isArray(data.response)
                ? data.response
                : [];

        const matches =
            fixtures
                .map(mapMatch)
                .filter(match =>
                    isAllowedLeague(
                        match.league
                    )
                );

        res.json({
            success: true,
            date,
            timezone: TIMEZONE,
            count: matches.length,
            matches
        });

    } catch (error) {
        console.error(
            "SportDash /api/matches error:",
            error
        );

        res.status(502).json({
            success: false,
            error:
                "No se pudieron obtener los partidos."
        });
    }
});

/* =========================================================
   EXPORTAR
   ========================================================= */

module.exports = router;