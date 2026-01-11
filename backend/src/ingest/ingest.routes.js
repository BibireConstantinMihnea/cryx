const express = require("express");
const router = express.Router();
const controller = require("./ingest.controller");

router.post("/sync", controller.triggerSync); // POST /api/ingest/sync
router.post("/reset", controller.resetData); // POST /api/ingest/reset

module.exports = router;
