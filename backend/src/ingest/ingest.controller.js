const ingestService = require("./ingest.service");

exports.triggerSync = async (req, res) => {
  try {
    await ingestService.syncTopCryptos();

    res.status(200).json({
      message: "Ingestion started successfully.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Ingestion failed",
      details: error.message,
    });
  }
};
