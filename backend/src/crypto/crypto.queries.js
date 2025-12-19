const PREFIXES = `
    PREFIX : <https://cryx.org/cryptonto#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

module.exports = {
  // Get all cryptos with their basic info
  GET_ALL_ASSETS: () => `
        ${PREFIXES}
        SELECT ?symbol ?name ?type WHERE {
            ?asset a :CryptoAsset ;
                   rdfs:label ?name ;
                   :hasSymbol ?symbol ;
                   a ?type .
            # Filter out the base class to only show specific types like Coin/Token
            FILTER(?type != :CryptoAsset)
        }
    `,

  // Get details and latest market stats for a specific symbol
  GET_ASSET_DETAILS: (symbol) => `
        ${PREFIXES}
        SELECT ?name ?price ?marketCap ?lastUpdated WHERE {
            ?asset :hasSymbol "${symbol}" ;
                   rdfs:label ?name .
            
            OPTIONAL {
                ?asset :hasMarketSnapshot ?snap .
                ?snap :currentPrice ?price ;
                      :marketCap ?marketCap ;
                      :atTime ?lastUpdated .
            }
        }
        ORDER BY DESC(?lastUpdated)
        LIMIT 1
    `,

  // Create a new crypto asset (Metadata)
  CREATE_ASSET: (symbol, name, type) => `
        ${PREFIXES}
        INSERT DATA {
            :${name.replace(/\s+/g, "")} a :${type} ;
                                          a :CryptoAsset ;
                                          rdfs:label "${name}" ;
                                          :hasSymbol "${symbol}" .
        }
    `,
};
