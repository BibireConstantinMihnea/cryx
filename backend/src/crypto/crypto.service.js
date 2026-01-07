const sparqlClient = require("../database/sparql.client");
const queries = require("./crypto.queries");

class CryptoService {
  async getAllCryptos() {
    const rawData = await sparqlClient.query(queries.GET_ALL_ASSETS());

    // Transform RDF format to clean JSON array
    return rawData.map((row) => ({
      symbol: row.symbol.value,
      name: row.name.value,
      type: row.type.value.split("#")[1], // Extract "Coin" from URI
    }));
  }

  async getCryptoBySymbol(symbol) {
    const rawData = await sparqlClient.query(queries.GET_ASSET_DETAILS(symbol));

    if (rawData.length === 0) return null;

    const row = rawData[0];
    return {
      name: row.name.value,
      symbol: symbol,
      price: row.price ? parseFloat(row.price.value) : null,
      marketCap: row.marketCap ? parseFloat(row.marketCap.value) : null,
      lastUpdated: row.lastUpdated ? row.lastUpdated.value : "Never",
    };
  }

  async createCrypto(data) {
    // data = { symbol: 'ETH', name: 'Ethereum', type: 'Coin' }
    await sparqlClient.update(
      queries.CREATE_ASSET(data.symbol, data.name, data.type)
    );
    return { message: `Created ${data.name} successfully` };
  }

  async getSemanticDetails(symbol) {
    console.log("Căutăm simbolul (cod corectat):", symbol);
    const rawData = await sparqlClient.query(
      queries.GET_SEMANTIC_DETAILS(symbol)
    );

    const details = { symbol };
    rawData.forEach((row) => {
      const predicate = row.p.value.split("/#|\//").pop(); // Get predicate name
      const object = row.o.value;
      details[predicate] = object;
    });

    return details;
  }
}

module.exports = new CryptoService();
