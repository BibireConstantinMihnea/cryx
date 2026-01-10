const ingestService = require("./ingest.service");

exports.triggerSync = async (req, res) => {
  try {

    const mode = req.query.mode || "full";

    await ingestService.syncTopCryptos(mode);

    res.status(200).json({
      message: `Ingestion (${mode}) successful`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Ingestion failed",
      details: error.message,
    });
  }
};

exports.resetData = async (req, res) => {
  try {
    await require('../database/sparql.client').update(`DELETE WHERE { ?s ?p ?o }`);
    res.json({ message: "Cleared" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
