const axios = require("axios");
require("dotenv").config();

class SparqlClient {
  constructor() {
    this.queryUrl = process.env.FUSEKI_QUERY_URL;
    this.updateUrl = process.env.FUSEKI_UPDATE_URL;
  }

  // Executes a SELECT query and returns formatted JSON results.
  async query(sparqlQuery) {
    try {
      const params = new URLSearchParams();
      params.append("query", sparqlQuery);

      const response = await axios.post(this.queryUrl, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/sparql-results+json",
        },
      });

      return response.data.results.bindings;
    } catch (error) {
      console.error(`[SPARQL Query Error]: ${error.message}`);
      throw error;
    }
  }

  // Executes an INSERT or DELETE command.
  async update(sparqlUpdate) {
    try {
      const params = new URLSearchParams();
      params.append("update", sparqlUpdate);

      await axios.post(this.updateUrl, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    } catch (error) {
      console.error(`[SPARQL Update Error]: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SparqlClient();
