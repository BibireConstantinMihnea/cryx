const sparqlClient = require("../database/sparql.client");
const queries = require("./crypto.queries");

class CryptoService {
  async getAllCryptos() {
    const rawData = await sparqlClient.query(queries.GET_ALL_ASSETS());

    return rawData.map((row) => ({
      symbol: row.symbol.value,
      name: row.name.value,
      type: row.type.value.split("#")[1],
      price: row.price ? parseFloat(row.price.value) : 0,
      marketCap: row.marketCap ? parseFloat(row.marketCap.value) : 0,
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
    const rawData = await sparqlClient.query(
      queries.GET_SEMANTIC_DETAILS(symbol)
    );

    const details = { symbol };

    rawData.forEach((row) => {
      const predicateURI = row.p.value;
      const shortKey = predicateURI.split(/[\/#]/).pop();
      const objectURI = row.o.value;

      const isCollection =
        shortKey === "hasTag" ||
        shortKey === "hasMarketSnapshot" ||
        predicateURI.includes("#hasTag");

      if (isCollection) {
        if (!details[shortKey]) {
          details[shortKey] = [];
        }

        let entry = details[shortKey].find((item) => item.id === objectURI);

        if (!entry) {
          entry = { id: objectURI };

          if (row.oLabel) {
            entry.label = row.oLabel.value;
          }
          details[shortKey].push(entry);
        }

        if (row.nestedP && row.nestedO) {
          const nestedKey = row.nestedP.value.split(/[\/#]/).pop();
          const nestedValue = row.nestedO.value;

          entry[nestedKey] = nestedValue;
        }
      } else {
        let value = objectURI;
        if (row.oLabel) {
          value = { id: objectURI, label: row.oLabel.value };
        }
        details[shortKey] = value;
        details[predicateURI] = value;
      }
    });

    return details;
  }

  async searchCryptos(term, type) {
    const query = queries.SEARCH_CRYPTOS(term || "", type || "All");
    const rawData = await sparqlClient.query(query);

    return rawData.map((row) => ({
      name: row.name.value,
      symbol: row.symbol.value,
      type: row.type ? row.type.value : "CryptoAsset",
      price: row.price ? parseFloat(row.price.value) : 0,
      marketCap: row.marketCap ? parseFloat(row.marketCap.value) : 0,
    }));
  }
}

module.exports = new CryptoService();
