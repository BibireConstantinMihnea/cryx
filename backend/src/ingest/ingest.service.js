const cmcClient = require("./cmc.client");
const sparqlClient = require("../database/sparql.client");

// Ontology Prefixes
const PREFIXES = `
    PREFIX : <https://cryx.org/cryptonto#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

class IngestService {

  async syncTopCryptos() {
    console.log("Starting Ingest Process...");

    // Get Top 10 Listings IDs
    const listings = await cmcClient.getLatestListings(10);
    const ids = listings.map((c) => c.id).join(",");

    // Get Metadata for IDs
    const metadataMap = await cmcClient.getMetadata(ids);

    // Create triples
    let triples = "";

    for (const coinBasic of listings) {
      const details = metadataMap[coinBasic.id];
      if (!details) continue;

      triples += this.mapCoinToRDF(coinBasic, details);
    }

    // Insert in database
    if (triples) {
      const insertQuery = `
                ${PREFIXES}
                INSERT DATA {
                    ${triples}
                }
            `;
      await sparqlClient.update(insertQuery);
      console.log(
        `Successfully ingested ${listings.length} cryptocurrencies.`
      );
    }
  }

  // Convert cryptocurrency data to RDF Triples
  mapCoinToRDF(basic, details) {
    const assetId = `:${details.slug}`;

    let typeClass;

    if (details.category === "coin") {
      typeClass = ":Coin";
    } else if (details.category === "token") {
      typeClass = ":Token";
    }

    const quote = basic.quote.USD;
    const snapshotId = `:Snapshot_${assetId}_${Date.now()}`;

    // Sanitize text
    const safeDesc = details.description
      ? details.description.replace(/"/g, '\\"')
      : "";

    let rdf= `
            ${assetId} a :CryptoAsset ;
                       a ${typeClass} ;
                       rdfs:label "${details.name}" ;
                       :symbol "${details.symbol}" ;
                       :description "${safeDesc}" ;
                       :logo "${details.logo}"^^xsd:anyURI ;
                       :dateLaunched "${details.date_added}"^^xsd:dateTime ;
                       :hasMarketSnapshot ${snapshotId} .

            ${snapshotId} a :MarketSnapshot ;
                          :currency "USD" ;
                          :currentPrice "${quote.price}"^^xsd:decimal ;
                          :marketCap "${quote.market_cap}"^^xsd:decimal ;
                          :totalVolume24h "${quote.volume_24h}"^^xsd:decimal ;
                          :circulatingSupply "${basic.circulating_supply}"^^xsd:decimal ;
                          :marketRank "${basic.cmc_rank}"^^xsd:integer ;
                          :atTime "${quote.last_updated}"^^xsd:dateTime .
        `;

    // Create Tag Objects
    if (details.tags && details.tags.length > 0) {
      details.tags.forEach((tag) => {

        // Sanitize tag
        const safeTag = tag.replace(/[^a-zA-Z0-9]/g, "");
        const tagId = `:Tag_${safeTag}`;

        rdf += `
                    ${assetId} :hasTag ${tagId} .
                    ${tagId} a :CryptoTag ; rdfs:label "${tag}" .
                `;
      });
    }

    // Add URLs
    const urlMap = {
      website: details.urls.website?.[0],
      technicalDocumentation: details.urls.technical_doc?.[0],
      sourceCode: details.urls.source_code?.[0],
      explorer: details.urls.explorer?.[0],
      messageBoard: details.urls.message_board?.[0],
      chat: details.urls.chat?.[0],
      announcement: details.urls.announcement?.[0],
      twitter: details.urls.twitter?.[0],
      reddit: details.urls.reddit?.[0],
    };

    for (const [predicate, url] of Object.entries(urlMap)) {
      if (url) {
        rdf += `${assetId} :${predicate} "${url}"^^xsd:anyURI . \n`;
      }
    }

    return rdf + "\n";
  }
}

module.exports = new IngestService();
