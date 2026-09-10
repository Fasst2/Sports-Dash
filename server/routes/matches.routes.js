"use strict";

const express = require("express");
const { footballApiKey } = require("../config/env");

const router = express.Router();

const API_URL = "https://v3.football.api-sports.io/fixtures";
const TIMEZONE = "America/Argentina/Buenos_Aires";


/* =========================================================
   LIGAS PERMITIDAS
   ========================================================= */

const ALLOWED_LEAGUES = new Set([
  /* 🇦🇷 ARGENTINA */

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


  /* 🌎 SUDAMÉRICA */

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


  /* 🇪🇺 EUROPA */

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
   NORMALIZAR NOMBRE DE LIGA
   ========================================================= */

function normalizeLeagueName(leagueName) {
  if (!leagueName) {
    return "";
  }

  const value = String(leagueName)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");


  /* =======================================================
     🇦🇷 ARGENTINA
     ======================================================= */

  if (
    value.includes("liga profesional de futbol") ||
    value.includes("liga profesional argentina") ||
    value.includes("primera division argentina") ||
    value.includes("argentine primera division") ||
    value === "lpf" ||
    value === "liga profesional"
  ) {
    return "Liga Profesional Argentina";
  }


  if (
    value.includes("copa argentina")
  ) {
    return "Copa Argentina";
  }


  if (
    value.includes("supercopa argentina")
  ) {
    return "Supercopa Argentina";
  }


  /*
   * Reserva
   */

  if (
    value.includes("reserva") &&
    (
      value.includes("liga profesional") ||
      value.includes("argentina")
    )
  ) {
    return "Liga Profesional de Reserva";
  }


  /*
   * Primera Nacional
   */

  if (
    value.includes("primera nacional")
  ) {
    return "Primera Nacional";
  }


  /*
   * Primera B Metropolitana
   */

  if (
    value.includes("primera b") &&
    (
      value.includes("metropolitana") ||
      value.includes("metropolitano")
    )
  ) {
    return "Primera B Metropolitana";
  }


  /*
   * Primera C
   */

  if (
    value === "primera c" ||
    value.includes("primera c argentina")
  ) {
    return "Primera C";
  }


  /*
   * Primera D
   */

  if (
    value === "primera d" ||
    value.includes("primera d argentina")
  ) {
    return "Primera D";
  }


  /*
   * Federal A
   */

  if (
    value.includes("federal a") ||
    value.includes("torneo federal a")
  ) {
    return "Federal A";
  }


  /*
   * Federal Regional Amateur
   */

  if (
    value.includes("regional amateur") ||
    value.includes("federal regional amateur")
  ) {
    return "Federal Regional Amateur";
  }


  /* =======================================================
     🌎 SUDAMÉRICA
     ======================================================= */

  if (
    value.includes("copa libertadores") ||
    value.includes("libertadores")
  ) {
    return "Copa Libertadores";
  }


  if (
    value.includes("copa sudamericana") ||
    value.includes("sudamericana")
  ) {
    return "Copa Sudamericana";
  }


  /*
   * Brasil
   *
   * IMPORTANTE:
   * Solo queremos Serie A.
   * No Serie B, C, etc.
   */

  if (
    value.includes("brasileirao") ||
    value.includes("brazil serie a") ||
    value.includes("serie a brazil")
  ) {
    return "Brasileirão";
  }


  /*
   * México
   */

  if (
    value.includes("liga mx") ||
    value.includes("liga bbva mx")
  ) {
    return "Liga MX";
  }


  /*
   * Estados Unidos
   */

  if (
    value === "mls" ||
    value.includes("major league soccer")
  ) {
    return "MLS";
  }


  /*
   * Colombia
   */

  if (
    value.includes("liga betplay") ||
    value.includes("liga bet play") ||
    value.includes("primera a colombia") ||
    value.includes("colombia primera a")
  ) {
    return "Liga BetPlay";
  }


  /*
   * Ecuador
   */

  if (
    value.includes("ligapro") ||
    value.includes("liga pro ecuador") ||
    value.includes("primera a ecuador")
  ) {
    return "LigaPro";
  }


  /*
   * Chile
   */

  if (
    value.includes("primera division chile") ||
    value.includes("chile primera division")
  ) {
    return "Primera División Chile";
  }


  /*
   * Uruguay
   */

  if (
    value.includes("primera division uruguay") ||
    value.includes("uruguay primera division")
  ) {
    return "Primera División Uruguay";
  }


  /*
   * Perú
   */

  if (
    value === "liga 1" ||
    value.includes("liga 1 peru") ||
    value.includes("primera division peru")
  ) {
    return "Liga 1";
  }


  /* =======================================================
     🇪🇺 EUROPA
     ======================================================= */

  if (
    value.includes("premier league")
  ) {
    return "Premier League";
  }


  if (
    value === "la liga" ||
    value.includes("laliga") ||
    value.includes("primera division spain")
  ) {
    return "La Liga";
  }


  if (
    value === "serie a" ||
    value.includes("italy serie a")
  ) {
    return "Serie A";
  }


  if (
    value.includes("bundesliga")
  ) {
    return "Bundesliga";
  }


  if (
    value.includes("ligue 1")
  ) {
    return "Ligue 1";
  }


  if (
    value.includes("champions league") ||
    value.includes("uefa champions")
  ) {
    return "UEFA Champions League";
  }


  if (
    value.includes("europa league") ||
    value.includes("uefa europa")
  ) {
    return "UEFA Europa League";
  }


  if (
    value.includes("conference league") ||
    value.includes("uefa conference")
  ) {
    return "UEFA Conference League";
  }


  return String(leagueName).trim();
}


/* =========================================================
   COMPROBAR SI LA LIGA ESTÁ PERMITIDA
   ========================================================= */

function isAllowedLeague(leagueName) {
  const normalized =
    normalizeLeagueName(leagueName);

  return ALLOWED_LEAGUES.has(normalized);
}


/* =========================================================
   FECHA ACTUAL ARGENTINA
   ========================================================= */

function getTodayArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}


/* =========================================================
   ESTADO DEL PARTIDO
   ========================================================= */

function mapMatchStatus(status) {
  switch (status) {

    case "NS":
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

    default:
      return "upcoming";
  }
}


/* =========================================================
   TRANSFORMAR FIXTURE
   ========================================================= */

function mapFixture(fixture) {

  const fixtureData =
    fixture.fixture || {};

  const league =
    fixture.league || {};

  const home =
    fixture.teams?.home || {};

  const away =
    fixture.teams?.away || {};

  const dateTime =
    new Date(fixtureData.date);


  return {

    id: String(
      fixtureData.id
    ),


    league:
      normalizeLeagueName(
        league.name || "Fútbol"
      ),


    date:
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: TIMEZONE,
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).format(dateTime),


    time:
      new Intl.DateTimeFormat(
        "es-AR",
        {
          timeZone: TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      ).format(dateTime),


    home:
      home.name || "Local",


    away:
      away.name || "Visitante",


    codeHome:
      home.code || "",


    codeAway:
      away.code || "",


    status:
      mapMatchStatus(
        fixtureData.status?.short
      ),


    channelId:
      null,


    fixtureStatus:
      fixtureData.status?.short || "",


    fixtureStatusLong:
      fixtureData.status?.long || "",


    elapsed:
      fixtureData.status?.elapsed ?? null,


    scoreHome:
      fixture.goals?.home ?? null,


    scoreAway:
      fixture.goals?.away ?? null,


    /*
     * API-Football devuelve estos logos
     * desde media.api-sports.io
     */

    homeLogo:
      home.logo || null,


    awayLogo:
      away.logo || null,


    leagueLogo:
      league.logo || null,


    country:
      league.country || ""
  };
}


/* =========================================================
   GET /api/matches
   ========================================================= */

router.get("/", async (req, res) => {

  try {

    if (!footballApiKey) {

      return res.status(500).json({
        success: false,
        message:
          "API_FOOTBALL_KEY no está configurada."
      });

    }


    const date =
      typeof req.query.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        req.query.date
      )
        ? req.query.date
        : getTodayArgentina();


    const url =
      new URL(API_URL);


    url.searchParams.set(
      "date",
      date
    );


    url.searchParams.set(
      "timezone",
      TIMEZONE
    );


    const response =
      await fetch(url, {

        method: "GET",

        headers: {
          "x-apisports-key":
            footballApiKey,

          "Accept":
            "application/json"
        }

      });


    if (!response.ok) {

      console.error(
        "API-Football HTTP error:",
        response.status,
        response.statusText
      );


      return res.status(502).json({
        success: false,
        message:
          "No se pudo obtener la información de partidos."
      });

    }


    const data =
      await response.json();


    if (
      data.errors &&
      Object.keys(data.errors).length > 0
    ) {

      console.error(
        "API-Football errors:",
        data.errors
      );


      return res.status(502).json({
        success: false,
        message:
          "API-Football devolvió un error."
      });

    }


    /*
     * Primero transformamos los partidos.
     */

    const allMatches =
      Array.isArray(data.response)
        ? data.response.map(mapFixture)
        : [];


    /*
     * Después filtramos.
     *
     * Esto evita que lleguen al frontend:
     *
     * - U19
     * - U17
     * - Youth League
     * - ligas regionales no deseadas
     * - divisiones extranjeras menores
     * - etc.
     */

    const matches =
      allMatches.filter(match =>
        isAllowedLeague(
          match.league
        )
      );


    console.log(
      `API-Football: ${allMatches.length} partidos recibidos.`
    );


    console.log(
      `SportDash: ${matches.length} partidos después del filtro.`
    );


    return res.json({

      success: true,

      date,

      timezone:
        TIMEZONE,

      count:
        matches.length,

      matches

    });


  } catch (error) {

    console.error(
      "Matches route error:",
      error
    );


    return res.status(500).json({
      success: false,
      message:
        "Error interno al obtener los partidos."
    });

  }

});


module.exports = router;