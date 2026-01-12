const express = require("express");
const router = express.Router();
const controller = require("./ingest.controller");
const ontologyLoader = require("../ontology/ontology.loader");

router.post("/sync", controller.triggerSync); // POST /api/ingest/sync
router.post("/reset", controller.resetData); // POST /api/ingest/reset

// POST /api/ingest/ontology
router.post("/ontology", async (req, res) => {
    try {
        await ontologyLoader.loadOntology();
        res.status(200).json({ message: "Ontology loaded successfully" });
    } catch (error) {
        console.error("Ontology loading error:", error);
        res.status(500).json({ error: "Ontology loading failed" });
    }
});

module.exports = router;
