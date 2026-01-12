import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import KnowledgeGraph from '../components/KnowledgeGraph';
import { CryptoService } from '../services/api';

const formatPrice = (price) => {
  if (!price) return "0";
  if (price < 0.01) {
    return parseFloat(price.toPrecision(4)).toString();
  }
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const CryptoDetail = () => {
  const { id } = useParams();
  
  const [data, setData] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllTags, setShowAllTags] = useState(false);

  const formatLabel = (key) => {
    let label = key.split(/[\/#]/).pop();
    label = label.replace(/([A-Z])/g, ' $1').trim();
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const extractNameFromURI = (uri) => {
    if (!uri) return "";
    const str = String(uri);
    if (str.startsWith('http')) {
        return str.split(/[\/#]/).pop().replace(/_/g, ' '); 
    }
    return str;
  };

  const renderValue = (val, rdfProperty = null) => {
    const sVal = String(val);

    if (/^\d{4}-\d{2}-\d{2}T/.test(sVal)) {
      const dateObj = new Date(sVal);
      return (
        <span property={rdfProperty} style={{ color: "#334155" }}>
          {dateObj.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    }

    if (sVal.startsWith('http')) {
      let displayText = extractNameFromURI(sVal);
      if (!displayText || displayText.trim() === "") {
        const cleanUrl = sVal.replace(/\/$/, "");
        displayText = cleanUrl.split(/[\/#]/).pop();
      }
      if (!displayText) displayText = sVal;

      return (
        <a href={sVal} target="_blank" rel="noopener noreferrer" property={rdfProperty} style={{color: '#2563eb', textDecoration: 'none', fontWeight: 'bold'}}>
          {displayText} ↗
        </a>
      );
    }
    return <span property={rdfProperty} style={{color: '#334155'}}>{sVal}</span>;
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [basicRes, semanticRes] = await Promise.all([
          CryptoService.getBasicDetails(id).catch(() => ({ data: {} })),
          CryptoService.getSemanticDetails(id).catch(() => ({ data: {} })),
        ]);

        if (
          !basicRes.data.name &&
          !semanticRes.data.name &&
          !basicRes.data.symbol
        ) {
          throw new Error("Data not found in the Knowledge Graph.");
        }

        const combined = {
          ...basicRes.data,
          ...semanticRes.data,
          symbol: basicRes.data.symbol || id,
        };

        setData(combined);

        const nodes = [];
        const links = [];
        const mainNodeId = combined.name || id;

        nodes.push({
          id: mainNodeId,
          group: 1,
          val: 35,
          img: combined.logo || combined["https://cryx.org/cryptonto#logo"],
        });

        const rawTags =
          combined.hasTag || combined["https://cryx.org/cryptonto#hasTag"];

        if (rawTags) {
          const tagList = Array.isArray(rawTags) ? rawTags : [rawTags];
          const hubId = "Category: Tags";

          nodes.push({
            id: hubId,
            group: 5, 
            val: 15, 
            color: "#6366f1",
          });

          links.push({
            source: mainNodeId,
            target: hubId,
            label: "hasTag",
          });

          tagList.forEach((tagItem) => {
            let label = "";
            if (typeof tagItem === "string") {
              label = extractNameFromURI(tagItem).replace(/^Tag\s+/i, "");
            } else {
              label =
                tagItem["rdfs:label"] ||
                tagItem.label ||
                extractNameFromURI(tagItem["@id"] || tagItem.id);
            }

            if (!label) return;

            if (!nodes.find((n) => n.id === label)) {
              nodes.push({ id: label, group: 2, val: 8 });
            }

            links.push({ source: hubId, target: label, label: "" });
          });
        }

        const rawSnaps =
          combined.hasMarketSnapshot ||
          combined["https://cryx.org/cryptonto#hasMarketSnapshot"];

        if (rawSnaps) {
          const snapList = Array.isArray(rawSnaps) ? rawSnaps : [rawSnaps];
          const snapHubId = "Category: Snapshots";

          nodes.push({ id: snapHubId, group: 5, val: 15, color: "#f59e0b" });
          links.push({
            source: mainNodeId,
            target: snapHubId,
            label: "history",
          });

          snapList.forEach((snapItem) => {
            const uri =
              typeof snapItem === "string"
                ? snapItem
                : snapItem.id || snapItem["@id"];
            let snapLabel = extractNameFromURI(uri);

            if (snapLabel.startsWith("Snapshot")) {
              snapLabel =
                snapLabel.replace("Snapshot_", "").substring(0, 15) + "...";
            }

            if (!nodes.find((n) => n.id === snapLabel)) {
              nodes.push({ id: snapLabel, group: 3, val: 10 });
            }
            links.push({ source: snapHubId, target: snapLabel, label: "" });

            if (typeof snapItem === "object") {
              Object.entries(snapItem).forEach(([propKey, propVal]) => {
                if (["id", "@id", "label", "type"].includes(propKey)) return;

                const leafId = `${snapLabel}_${propKey}`;
                const leafLabel = `${propKey}: ${propVal}`;

                nodes.push({
                  id: leafId,
                  label: leafLabel,
                  group: 4,
                  val: 5,
                  color: "#94a3b8",
                });

                links.push({ source: snapLabel, target: leafId, label: "" });
              });
            }
          });
        }

        if (semanticRes.data) {
          Object.entries(semanticRes.data).forEach(([key, value]) => {
            
            if (
              [
                "symbol",
                "type",
                "label",
                "description",
                "id",
                "graph",
                "price",
                "marketCap",
                "logo",
              ].includes(key)
            )
              return;

            if (key.includes("#logo") || key.includes("#description")) return;

            if (key === "hasTag" || key.includes("#hasTag")) return;

            let rawVal = value;

            if (typeof value === "object" && value !== null) {
              rawVal = value.id || value["@id"] || String(value);
            } else {
              rawVal = String(value);
            }

            if (rawVal === "[object Object]") return;

            if (!rawVal.startsWith("http") && rawVal.length > 50) return;

            const cleanNodeName = extractNameFromURI(rawVal);
            if (!cleanNodeName) return;

            let group = 3;
            if (rawVal.startsWith("http")) group = 4;

            const propName = formatLabel(key);
            const nodeLabel = `${propName}: ${cleanNodeName}`;

            if (!nodes.find((n) => n.id === cleanNodeName)) {
              nodes.push({ id: cleanNodeName, label: nodeLabel, group, val: 10 });
            }

            links.push({
              source: mainNodeId,
              target: cleanNodeName,
              label: formatLabel(key),
            });
          });
        }
        setGraphData({ nodes, links });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getDescription = () => {
    if (!data) return "";
    return data.description ||
           data["https://cryx.org/cryptonto#description"] ||
           `Explore semantic connections and financial data for ${data.name}.`;
  }

  const getLogo = () => {
    if (!data) return null;
    return data.logo || data["https://cryx.org/cryptonto#logo"];
  }

  const getSafeTags = () => {
    if (!data) return [];
    const raw = data.hasTag || data["https://cryx.org/cryptonto#hasTag"];
    if (!raw) return [];

    const list = Array.isArray(raw) ? raw : [raw];

    return list.map(item => {
      if (typeof item === "string") {
        const name = extractNameFromURI(item);
        return {
          uri: item,
          label: name.replace(/^Tag\s+/i, ""),
        };
      }

      return {
        uri: item["@id"] || item.id,
        label:
          item["rdfs:label"] || item.label || extractNameFromURI(item["@id"]),
      };
    });
  };

  const handleExportJSONLD = () => {
    const description = getDescription();
    const jsonLd = {
      "@context": {
        schema: "http://schema.org/",
        cryx: "https://cryx.org/cryptonto#",
        xsd: "http://www.w3.org/2001/XMLSchema#",
      },
      "@id": resourceUrl,
      "@type": ["cryx:CryptoAsset", "schema:FinancialProduct"],
      "schema:name": data.name,
      "cryx:symbol": data.symbol,
      "schema:description": description,
      "cryx:currentPrice": {
        "@type": "xsd:decimal",
        "@value": data.price,
      },
      "cryx:marketCap": {
        "@type": "xsd:decimal",
        "@value": data.marketCap,
      },
    };

    const blob = new Blob([JSON.stringify(jsonLd, null, 2)], {
      type: "application/ld+json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${data.slug || id}.jsonld`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTurtle = () => {
    const description = getDescription();
    const safeDesc = JSON.stringify(description);
    const ttl = `
      @prefix schema: <http://schema.org/> .
      @prefix cryx: <https://cryx.org/cryptonto#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      <${resourceUrl}>
          a cryx:CryptoAsset, schema:FinancialProduct ;
          schema:name "${data.name}" ;
          cryx:symbol "${data.symbol}" ;
          schema:description ${safeDesc} ;
          cryx:currentPrice "${data.price}"^^xsd:decimal ;
          cryx:marketCap "${data.marketCap}"^^xsd:decimal .
          `;

    const blob = new Blob([ttl.trim()], { type: "text/turtle" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${data.slug || id}.ttl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="container" style={{padding:'50px', textAlign:'center'}}>Loading assets...</div>;
  if (error) return <div className="container" style={{padding:'50px', color:'red'}}>Error: {error}</div>;
  if (!data) return null;

  const resourceUrl = window.location.href;
  const chartData = [{ name: 'Price', value: data.price || 0 }];

  return (
    <div
      className="container"
      prefix="schema: http://schema.org/ cryx: https://cryx.org/cryptonto# xsd: http://www.w3.org/2001/XMLSchema#"
      resource={resourceUrl}
      typeof="schema:FinancialProduct cryx:CryptoAsset"
    >
      <Helmet>
        <title>{data.name || id} - cryx</title>
      </Helmet>
      <div
        className="detail-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#64748b",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            ← Back to Dashboard
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "15px",
            }}
          >
            {getLogo() && (
              <img
                src={getLogo()}
                alt={`${data.name} logo`}
                property="schema:logo"
                style={{ width: "64px", height: "64px", borderRadius: "50%" }}
              />
            )}

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >
                <h1
                  property="schema:name"
                  style={{ margin: 0, fontSize: "2.5rem" }}
                >
                  {data.name || id}
                </h1>
                <span
                  property="cryx:symbol"
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                  }}
                >
                  {data.symbol || id}
                </span>

                {getSafeTags()
                  .slice(0, showAllTags ? undefined : 2)
                  .map((tag, i) => (
                    <span
                      key={i}
                      property="cryx:hasTag"
                      resource={tag.uri}
                      typeof="cryx:CryptoTag"
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "1rem",
                      }}
                    >
                      <span property="rdfs:label">#{tag.label}</span>
                    </span>
                  ))}

                {getSafeTags().length > 4 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      textDecoration: "underline",
                      padding: "0 5px",
                    }}
                  >
                    {showAllTags
                      ? "Show Less"
                      : `+${getSafeTags().length - 4} more`}
                  </button>
                )}
              </div>
            </div>
          </div>
          <p
            property="schema:description"
            style={{
              color: "#64748b",
              marginTop: "10px",
              maxWidth: "600px",
              lineHeight: "1.6",
            }}
          >
            {getDescription()}
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <button
              onClick={handleExportJSONLD}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}
            >
              Export JSON-LD
            </button>
            <button
              onClick={handleExportTurtle}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}
            >
              Export Turtle (.ttl)
            </button>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            borderLeft: "1px solid #eee",
            paddingLeft: "20px",
          }}
        >
          <QRCodeCanvas value={resourceUrl} size={90} />
          <div
            style={{
              fontSize: "11px",
              marginTop: "8px",
              color: "#94a3b8",
              fontWeight: "500",
            }}
          >
            RDF Resource
          </div>
        </div>
      </div>
      <div
        className="metadata-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "30px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h3
              style={{
                marginTop: 0,
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px",
                color: "#1e293b",
              }}
            >
              Ontology Properties
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {data.price > 0 && (
                <li
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <strong style={{ color: "#64748b" }}>Current Price</strong>
                  <span style={{ fontWeight: "bold", color: "#10b981" }}>
                    ${formatPrice(data.price)}
                  </span>
                </li>
              )}
              {data.marketCap > 0 && (
                <li
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <strong style={{ color: "#64748b" }}>Market Cap</strong>
                  <span style={{ fontWeight: "bold" }}>
                    ${data.marketCap.toLocaleString()}
                  </span>
                </li>
              )}
              {Object.entries(data).map(([key, val]) => {
                const HIDDEN_FIELDS = [
                  "name",
                  "symbol",
                  "price",
                  "marketCap",
                  "id",
                  "graph",
                  "description",
                  "logo",
                  "hasTag",
                  "hasMarketSnapshot",
                  "type",
                  "label",
                  "sameAs",
                  "website",
                  "sourceCode",
                  "explorer",
                  "messageBoard",
                  "chat",
                  "reddit",
                  "dateLaunched",
                  "technicalDocumentation",
                  "announcement",
                  "twitter",
                ];

                if (HIDDEN_FIELDS.includes(key)) return null;

                if (key === "description") return null;
                if (key === "https://cryx.org/cryptonto#description")
                  return null;
                if (key === "https://cryx.org/cryptonto#logo") return null;
                if (key === "https://cryx.org/cryptonto#hasTag") return null;

                const isURIProperty = key.startsWith("http");
                const rdfProperty = isURIProperty ? key : null;

                return (
                  <li
                    key={key}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #f8fafc",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "#64748b" }}>
                      {formatLabel(key)}
                    </strong>
                    <div style={{ textAlign: "right", maxWidth: "60%" }}>
                      {renderValue(val, rdfProperty)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Market Snapshot</h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#666",
                marginBottom: "10px",
              }}
            >
              Logarithmic Scale ($0.0001 - $100k)
            </p>

            <div style={{ width: "100%", height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis dataKey="name" hide />
                  <YAxis
                    scale="log"
                    domain={[0.0001, 100000]}
                    allowDataOverflow={true}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    formatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value > 1000
                            ? "#ef4444"
                            : entry.value > 1
                            ? "#3b82f6"
                            : "#10b981"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            minHeight: "500px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Network Graph</h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#94a3b8",
              marginBottom: "20px",
            }}
          >
            Interactive semantic map.
          </p>
          <div
            style={{
              flex: 1,
              width: "100%",
              minHeight: "400px",
              background: "#f8fafc",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              position: "relative",
            }}
          >
            <KnowledgeGraph data={graphData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoDetail;
