const express = require("express");
const cors = require("cors");
require("dotenv").config();

const cryptoRoutes = require("./src/crypto/crypto.routes");
const { loadOntology } = require("./src/ontology/ontology.loader");
const ingestRoutes = require("./src/ingest/ingest.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Register Routes
app.use("/api/crypto", cryptoRoutes);
app.use("/api/ingest", ingestRoutes);

const startServer = async () => {
  try {
    // Connect/Load ontology 
    console.log("Checking Ontology...");
    await loadOntology();

    // Start the server after ontology is ready
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Connected to Fuseki at ${process.env.FUSEKI_QUERY_URL}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
