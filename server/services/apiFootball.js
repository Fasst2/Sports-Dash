"use strict";

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const API_FOOTBALL_BASE_URL =
    process.env.API_FOOTBALL_BASE_URL ||
    "https://v3.football.api-sports.io";

/**
 * Cliente centralizado para API-Football.
 *
 * IMPORTANTE:
 * La API key solamente existe en el backend.
 * Nunca debe enviarse al frontend.
 */
async function apiFootball(endpoint, params = {}) {
    if (!API_FOOTBALL_KEY) {
        throw new Error("API_FOOTBALL_KEY no está configurada.");
    }

    const url = new URL(`${API_FOOTBALL_BASE_URL}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.append(key, value);
        }
    });

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-apisports-key": API_FOOTBALL_KEY
        }
    });

    if (!response.ok) {
        throw new Error(
            `API-Football respondió con HTTP ${response.status}`
        );
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
        throw new Error(
            `API-Football: ${JSON.stringify(data.errors)}`
        );
    }

    return data;
}

module.exports = {
    apiFootball
};