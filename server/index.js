"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");

const footballRouter =
    require("./routes/football");

const matchesRouter =
    require("./routes/matches");


/* =========================================================
   APP
   ========================================================= */

const app =
    express();

const PORT =
    Number(process.env.PORT) || 3000;

const PUBLIC_DIR =
    path.join(
        __dirname,
        "..",
        "public"
    );


/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(
    express.json()
);


/*
 * Frontend público
 */
app.use(
    express.static(
        PUBLIC_DIR
    )
);


/* =========================================================
   HEALTH
   ========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            app: "SportDash Premium",
            environment:
                process.env.NODE_ENV ||
                "development"
        });
    }
);


/* =========================================================
   API ROUTES
   ========================================================= */

app.use(
    "/api/football",
    footballRouter
);

app.use(
    "/api/matches",
    matchesRouter
);


/* =========================================================
   ROOT
   ========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );
    }
);


/* =========================================================
   API 404
   ========================================================= */

app.use(
    (req, res) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    error:
                        "Ruta API no encontrada."
                });
        }


        res
            .status(404)
            .send(
                "Página no encontrada."
            );
    }
);


/* =========================================================
   SERVER
   ========================================================= */

app.listen(
    PORT,
    () => {

        console.log(`
========================================
        SPORTDASH PREMIUM
========================================
Servidor: http://localhost:${PORT}
API:      http://localhost:${PORT}/api
Frontend: http://localhost:${PORT}/
========================================
        `);
    }
);