"use strict";

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { port, nodeEnv } = require("./server/config/env");
const { ensureDb } = require("./server/utils/db");
const { parseCookies } = require("./server/middleware/cookies");
const { requireAuth } = require("./server/middleware/auth");

const authRoutes = require("./server/routes/auth.routes");
const adminRoutes = require("./server/routes/admin.routes");
const privateRoutes = require("./server/routes/private.routes");
const matchesRoutes = require("./server/routes/matches.routes");

ensureDb();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://vjs.zencdn.net"],
      styleSrc: ["'self'", "https://vjs.zencdn.net"],
      imgSrc: [
        "'self'",
        "data:",
        "https://media.api-sports.io"
      ],
      mediaSrc: ["'self'", "blob:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:", "https://vjs.zencdn.net"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin"
  }
}));

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(parseCookies);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiados intentos. Esperá unos minutos." }
});

app.use("/api/auth", (req, res, next) => {
  if (req.method === "POST" && req.path === "/login") return loginLimiter(req, res, next);
  next();
}, authRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/private", privateRoutes);
app.use("/api/matches", requireAuth, matchesRoutes);

app.use(express.static(path.join(__dirname, "public"), {
  extensions: ["html"],
  maxAge: nodeEnv === "production" ? "1h" : 0
}));

app.get("/app", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "app.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Error interno del servidor." });
});

app.listen(port, () => {
  console.log(`SportDash Premium disponible en http://localhost:${port}`);
});
