"use strict";

function parseCookies(req, res, next) {
  const raw = req.headers.cookie || "";
  req.cookies = {};
  for (const pair of raw.split(";")) {
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = pair.slice(0, index).trim();
    const value = decodeURIComponent(pair.slice(index + 1).trim());
    req.cookies[key] = value;
  }
  next();
}

module.exports = { parseCookies };
