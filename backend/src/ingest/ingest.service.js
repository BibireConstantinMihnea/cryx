const cmcClient = require("./cmc.client");
const sparqlClient = require("../database/sparql.client");

const PREFIXES = `
    PREFIX : <https://cryx.org/cryptonto#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

class IngestService {
  async syncTopCryptos(mode = "full") {
    console.log(`Starting ingest process in ${mode} mode.`);

    // Get top listings IDs
    const listings = await cmcClient.getLatestListings(10);

    let metadataMap = {};

    if (mode === "full") {
      // Get metadata for IDs
      const ids = listings.map((c) => c.id).join(",");
      metadataMap = await cmcClient.getMetadata(ids);
    }

    // Create triples
    let triples = "";

    for (const coinBasic of listings) {
      const details = metadataMap[coinBasic.id] || {
        name: coinBasic.name,
        slug: coinBasic.slug,
        category: coinBasic.category,
      };

      triples += this.mapCoinToRDF(coinBasic, details, mode);
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
        `Successfully synced ${listings.length} cryptocurrencies (${mode} mode).`
      );
    }
  }

  // Convert cryptocurrency data to RDF Triples
  mapCoinToRDF(basic, details, mode) {
    const assetId = `:${basic.slug}`;
    const snapshotId = `:Snapshot_${basic.slug}_${Date.now()}`;
    const quote = basic.quote.USD;

    let rdf = "";

    // Crypto metadata
    if (mode === "full") {
      let typeClass = ":CryptoAsset";
      if (details.category === "coin") typeClass = ":Coin";
      else if (details.category === "token") typeClass = ":Token";

      // Sanitize text
      const safeDesc = details.description
        ? details.description.replace(/"/g, '\\"')
        : "";

      rdf += `
            ${assetId} a :CryptoAsset ;
                       a ${typeClass} ;
                       rdfs:label "${details.name}" ;
                       :symbol "${basic.symbol}" ;
                       :description "${safeDesc}" ;
                       :logo "${details.logo}"^^xsd:anyURI ;
                       :dateLaunched "${details.date_added}"^^xsd:dateTime ;
                       :hasMarketSnapshot ${snapshotId} .
        `;

      // Create tags
      if (details.tags && details.tags.length > 0) {
        details.tags.forEach((tag) => {
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
    } else {
      // Link existing asset to the new snapshot
      rdf += `
            ${assetId} :hasMarketSnapshot ${snapshotId} .
        `;
    }

    //Market snapshot
    rdf += `
            ${snapshotId} a :MarketSnapshot ;
                          :currency "USD" ;
                          :currentPrice "${quote.price}"^^xsd:decimal ;
                          :marketCap "${quote.market_cap}"^^xsd:decimal ;
                          :totalVolume24h "${quote.volume_24h}"^^xsd:decimal ;
                          :marketRank "${basic.cmc_rank}"^^xsd:integer ;
                          :atTime "${quote.last_updated}"^^xsd:dateTime .
        `;

    return rdf + "\n";
  }
}

module.exports = new IngestService();
