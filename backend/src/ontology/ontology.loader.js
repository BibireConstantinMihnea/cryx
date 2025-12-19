const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

// SPARQL prefixes
const PREFIXES = `
    PREFIX : <https://cryx.org/cryptonto#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
`;

const ONTOLOGY_PATH = path.join(__dirname, "../ontology/cryptonto.ttl");
const QUERY_URL = process.env.FUSEKI_QUERY_URL;
const UPLOAD_URL = process.env.FUSEKI_ONTOLOGY_UPLOAD_URL;

exports.loadOntology = async () => {
  try {
    // Check if the ontology is already loaded
    // Look for :CryptoAsset
    const checkQuery = `
            ${PREFIXES}
            ASK { :CryptoAsset a owl:Class }
        `;

    const params = new URLSearchParams();
    params.append("query", checkQuery);

    const checkRes = await axios.post(QUERY_URL, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const exists = checkRes.data.boolean;

    if (exists) {
      console.log("Ontology already loaded. Skipping upload.");
      return;
    }

    // If not found, upload it
    console.log("Ontology not found. Uploading now...");
    const ttlData = fs.readFileSync(ONTOLOGY_PATH, "utf-8");

    await axios.post(UPLOAD_URL, ttlData, {
      headers: { "Content-Type": "text/turtle" },
    });

    console.log("Ontology uploaded successfully!");
  } catch (error) {
    console.error("Ontology Check/Load Failed:", error.message);
  }
};
