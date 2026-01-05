const express = require("express");
const router = express.Router();
const controller = require("./ingest.controller");

// POST /api/ingest/sync
router.post("/sync", controller.triggerSync);

module.exports = router;
