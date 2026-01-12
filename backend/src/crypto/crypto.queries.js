const PREFIXES = `
    PREFIX : <https://cryx.org/cryptonto#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

module.exports = {
  // Get all cryptos with their basic info
  GET_ALL_ASSETS: () => `
        ${PREFIXES}
        SELECT ?symbol ?name ?type ?price ?marketCap WHERE {
            ?s a ?type ;
            :symbol ?symbol ;
            rdfs:label ?name .
            
            FILTER(?type != :CryptoAsset)

            OPTIONAL { 
                ?s :hasMarketSnapshot ?snap .
                ?snap :currentPrice ?price .
                ?snap :marketCap ?marketCap .
            }
        }
    `,

  // Get details and latest market stats for a specific symbol
  GET_ASSET_DETAILS: (symbol) => `
        ${PREFIXES}
        SELECT ?name ?price ?marketCap ?lastUpdated WHERE {
            ?asset :symbol "${symbol}" ;
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
                                          :symbol "${symbol}" .
        }
    `,

  GET_SEMANTIC_DETAILS: (symbol) => `
        ${PREFIXES}
        SELECT ?p ?o ?oLabel ?nestedP ?nestedO WHERE {
            ?asset :symbol "${symbol}" .
            ?asset ?p ?o .
            OPTIONAL {
                ?o a :CryptoTag ;
                   rdfs:label ?oLabel .
            }
            OPTIONAL {
                ?o ?nestedP ?nestedO .
                FILTER(isLiteral(?nestedO))
            }
        }
    `,

    SEARCH_CRYPTOS: (term, type) => {
        let filterClause = "";
        let typeClause = "";

        // Filter by search term
        if (term) {
            filterClause = `
                FILTER (
                    regex(?name, "${term}", "i") || 
                    regex(?symbol, "${term}", "i")
                )
            `;
        }

        // Filter by type
        if (type && type !== "All") {
            typeClause = `?asset a :${type} .`; 
        }

        return `
            ${PREFIXES}
            SELECT ?name ?symbol ?price ?marketCap ?type WHERE {
                ?asset a :CryptoAsset ;
                       :symbol ?symbol ;
                       rdfs:label ?name .
                
                # Get the specific type (Coin or Token) for display
                OPTIONAL { 
                    ?asset a ?typeClass .
                    FILTER(?typeClass = :Coin || ?typeClass = :Token)
                    BIND(strafter(str(?typeClass), "#") AS ?type) 
                }

                # Apply the Type Filter (if selected)
                ${typeClause}

                # Get latest snapshot data (Optional)
                OPTIONAL {
                    ?asset :hasMarketSnapshot ?snap .
                    ?snap :currentPrice ?price ;
                          :marketCap ?marketCap ;
                          :atTime ?lastUpdated .
                }

                # Apply the Search Filter (if typed)
                ${filterClause}
            }
            ORDER BY DESC(?marketCap)
            LIMIT 50
        `;
    },
};
