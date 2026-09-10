"use strict";

const { updateDb, id, now } = require("../utils/db");

function log(action, actor, target = null, metadata = {}) {
  updateDb(db => {
    db.audit.unshift({
      id: id("audit"),
      action,
      actor,
      target,
      metadata,
      createdAt: now()
    });
    db.audit = db.audit.slice(0, 500);
  });
}

module.exports = { log };
