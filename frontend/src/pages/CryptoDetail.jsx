import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import KnowledgeGraph from '../components/KnowledgeGraph';
import { CryptoService } from '../services/api';

const CryptoDetail = () => {
  const { id } = useParams();
  
  const [data, setData] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const renderValue = (val) => {
    const sVal = String(val);
    if (sVal.startsWith('http')) {
      return (
        <a href={sVal} target="_blank" rel="noopener noreferrer" style={{color: '#2563eb', textDecoration: 'none', fontWeight: 'bold'}}>
          {extractNameFromURI(sVal)} ↗
        </a>
      );
    }
    return <span style={{color: '#334155'}}>{sVal}</span>;
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [basicRes, semanticRes] = await Promise.all([
          CryptoService.getBasicDetails(id).catch(() => ({ data: {} })),
          CryptoService.getSemanticDetails(id).catch(() => ({ data: {} }))
        ]);

        if (!basicRes.data.name && !semanticRes.data.name && !basicRes.data.symbol) {
             throw new Error("Data not found in the Knowledge Graph.");
        }

        const combined = { 
          ...basicRes.data, 
          ...semanticRes.data,
          symbol: basicRes.data.symbol || id
        };
        
        setData(combined);

        const nodes = [];
        const links = [];
        const mainNodeId = combined.name || id;

        nodes.push({ id: mainNodeId, group: 1, val: 25 });

        if (semanticRes.data) {
            Object.entries(semanticRes.data).forEach(([key, value]) => {
              if (['symbol', 'type', 'label', 'description', 'id', 'graph', 'price', 'marketCap'].includes(key)) return;
              
              const rawVal = String(value);
              if (!rawVal.startsWith('http') && rawVal.length > 50) return;

              const cleanNodeName = extractNameFromURI(rawVal);
              if (!cleanNodeName) return;

              if (!nodes.find(n => n.id === cleanNodeName)) {
                nodes.push({ id: cleanNodeName, group: 2, val: 10 });
              }
              
              links.push({ 
                source: mainNodeId, 
                target: cleanNodeName, 
                label: formatLabel(key) 
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

  if (loading) return <div className="container" style={{padding:'50px', textAlign:'center'}}>Loading assets...</div>;
  if (error) return <div className="container" style={{padding:'50px', color:'red'}}>Error: {error}</div>;
  if (!data) return null;

  const resourceUrl = window.location.href;
  const chartData = [{ name: 'Price', value: data.price || 0 }];

  return (
    <div className="container">
      <Helmet>
        <title>{data.name || id} - cryx</title>
      </Helmet>

      <div className="detail-header" style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: '30px', 
        background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
      }}>
        <div>
           <Link to="/" style={{textDecoration: 'none', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px'}}>
             ← Back to Dashboard
           </Link>
           <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px'}}>
              <h1 style={{margin: 0, fontSize: '2.5rem'}}>{data.name || id}</h1>
              <span style={{background: '#eff6ff', color:'#2563eb', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '1rem'}}>
                {data.symbol || id}
              </span>
           </div>
           <p style={{color: '#64748b', marginTop: '10px', maxWidth: '600px', lineHeight: '1.6'}}>
             {data.description || `Explore semantic connections and financial data for ${data.name}.`}
           </p>
        </div>
        <div style={{textAlign: 'center', borderLeft: '1px solid #eee', paddingLeft: '20px'}}>
           <QRCodeCanvas value={resourceUrl} size={90} />
           <div style={{fontSize: '11px', marginTop: '8px', color: '#94a3b8', fontWeight: '500'}}>RDF Resource</div>
        </div>
      </div>

      <div className="metadata-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px'}}>
         
         <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <div className="card">
              <h3 style={{marginTop: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', color: '#1e293b'}}>
                Ontology Properties
              </h3>
              <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                {data.price > 0 && (
                  <li style={{padding: '12px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between'}}>
                    <strong style={{color: '#64748b'}}>Current Price</strong> 
                    <span style={{fontWeight: 'bold', color: '#10b981'}}>${data.price.toLocaleString()}</span>
                  </li>
                )}
                {data.marketCap > 0 && (
                  <li style={{padding: '12px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between'}}>
                    <strong style={{color: '#64748b'}}>Market Cap</strong> 
                    <span style={{fontWeight: 'bold'}}>${data.marketCap.toLocaleString()}</span>
                  </li>
                )}
                {Object.entries(data).map(([key, val]) => {
                   if(['name','symbol','price','marketCap','description','graph','id'].includes(key)) return null;
                   return (
                     <li key={key} style={{
                       padding: '12px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                     }}>
                       <strong style={{color: '#64748b'}}>{formatLabel(key)}</strong> 
                       <div style={{textAlign: 'right', maxWidth: '60%'}}>{renderValue(val)}</div>
                     </li>
                   )
                })}
              </ul>
            </div>

            <div className="card">
              <h3 style={{marginTop: 0, color: '#1e293b'}}>Market Snapshot</h3>
              <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '10px'}}>Logarithmic Scale ($0.0001 - $100k)</p>
              
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} margin={{left: 10}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" hide />
                     <YAxis 
                        scale="log" 
                        domain={[0.0001, 100000]} 
                        allowDataOverflow={true}
                        tickFormatter={(val) => `$${val}`}
                     />
                     <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(val) => `$${val.toLocaleString()}`} />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value > 1000 ? '#ef4444' : (entry.value > 1 ? '#3b82f6' : '#10b981')} />
                        ))}
                     </Bar>
                   </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
         </div>

         <div className="card" style={{minHeight: '500px', display: 'flex', flexDirection: 'column'}}>
            <h3 style={{marginTop: 0, color: '#1e293b'}}>Network Graph</h3>
            <p style={{fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px'}}>
              Interactive semantic map.
            </p>
            <div style={{flex: 1, width: '100%', minHeight: '400px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative'}}>
               <KnowledgeGraph data={graphData} />
            </div>
         </div>
      </div>
    </div>
  );
};

export default CryptoDetail;