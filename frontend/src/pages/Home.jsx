import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { CryptoService } from '../services/api';
import api from '../services/api';

const Home = () => {
  const [cryptos, setCryptos] = useState([]);
  const [filteredCryptos, setFilteredCryptos] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getSafeSymbol = (val) => {
    if (!val) return null;
    const str = String(val).replace(/[/#]+$/, '');
    return str.split(/[\/#]/).pop() || null;
  };

  const loadData = () => {
    setLoading(true);
    CryptoService.getAll()
      .then((res) => {
        console.log("DATE BACKEND:", res.data);
        let processed = res.data.map(c => ({
          ...c,
          price: c.price ? parseFloat(c.price) : 0,
          marketCap: c.marketCap ? parseFloat(c.marketCap) : 0
        }));

        const uniqueMap = new Map();
        processed.forEach(item => {
          const s = getSafeSymbol(item.symbol);
          if (s && !uniqueMap.has(s)) {
            uniqueMap.set(s, item);
          }
        });
        const uniqueData = Array.from(uniqueMap.values());

        setCryptos(uniqueData);
        setFilteredCryptos(uniqueData);
        setError(null);
      })
      .catch((err) => {
        console.error("Error:", err);
        setError("Could not connect to the backend.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = cryptos;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(lowerTerm) || 
        (c.symbol && c.symbol.toLowerCase().includes(lowerTerm))
      );
    }
    if (typeFilter !== 'All') {
      result = result.filter(c => c.type === typeFilter);
    }
    setFilteredCryptos(result);
  }, [searchTerm, typeFilter, cryptos]);

  const handleFullRefresh = async () => {
    if (!confirm("This action will clear the database and repopulate it with fresh data. Continue?")) return;

    try {
      setIsRefreshing(true);
      await api.post('/api/ingest/reset');
      await api.post('/api/ingest/sync'); 
      alert("Data has been updated!");
      loadData(); 
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPieData = () => {
    const sorted = [...filteredCryptos].sort((a, b) => b.marketCap - a.marketCap);
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const data = top5.map(c => ({ name: getSafeSymbol(c.symbol), value: c.marketCap }));
    
    if (others.length > 0) {
      const othersCap = others.reduce((acc, curr) => acc + curr.marketCap, 0);
      data.push({ name: 'Others', value: othersCap });
    }
    return data.filter(d => d.value > 0);
  };

  const getScatterData = () => {
    return filteredCryptos
      .filter(c => c.price > 0 && c.marketCap > 0)
      .map(c => ({
        x: c.marketCap,
        y: c.price,
        z: getSafeSymbol(c.symbol),
        name: c.name
      }));
  };

  if (loading) return <div className="container"><h3>Loading dashboard...</h3></div>;
  if (error) return <div className="container" style={{color: 'red'}}>Error: {error}</div>;

  return (
    <div className="container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <h1 style={{margin: 0}}>Knowledge Explorer Dashboard</h1>
        
        <button 
          onClick={handleFullRefresh} 
          disabled={isRefreshing}
          style={{
            padding: '10px 20px', 
            background: isRefreshing ? '#94a3b8' : '#2563eb',
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: isRefreshing ? 'wait' : 'pointer',
            fontWeight: 'bold',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          {isRefreshing ? '⏳ Processing...' : '🔄 Reload Database'}
        </button>
      </div>

      {filteredCryptos.length > 0 && (
        <div style={{
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '20px', 
          marginBottom: '30px',
          justifyContent: 'center'
        }}>
          
          <div className="card" style={{
            width: '450px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center'
          }}>
            <h3 style={{marginTop:0, textAlign:'center'}}>Market Dominance</h3>
            
            <PieChart width={400} height={300}>
              <Pie
                data={getPieData()}
                cx={200}
                cy={150}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {getPieData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </div>

          <div className="card" style={{
            width: '450px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center'
          }}>
            <h3 style={{marginTop:0, textAlign:'center'}}>Price Analysis</h3>
            
            <ScatterChart width={400} height={300} margin={{top: 20, right: 20, bottom: 20, left: 0}}>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Market Cap" 
                unit="$" 
                tickFormatter={(val) => `${(val/1e9).toFixed(0)}B`} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Price" 
                unit="$" 
              />
              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={({active, payload}) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px'}}>
                        <strong>{data.name} ({data.z})</strong><br/>
                        Price: ${data.y.toLocaleString()}<br/>
                        Cap: ${data.x.toLocaleString()}
                      </div>
                    );
                  }
                  return null;
              }} />
              <Scatter name="Cryptos" data={getScatterData()} fill="#8884d8">
                {getScatterData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </div>
        </div>
      )}

      <div style={{
        background: 'white', padding: '1.5rem', borderRadius: '12px', 
        marginBottom: '2rem', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'end'
      }}>
        <div style={{flex: 1, minWidth: '200px'}}>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Search Crypto</label>
          <input 
            type="text" placeholder="Ex: Bitcoin..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc'}}
          />
        </div>
        <div style={{minWidth: '150px'}}>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Type</label>
          <select 
            value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc'}}
          >
            <option value="All">All Types</option>
            <option value="Coin">Coin</option>
            <option value="Token">Token</option>
          </select>
        </div>
      </div>

      <div className="grid">
        {filteredCryptos.map((coin) => {
          const safeSymbol = getSafeSymbol(coin.symbol);
          if (!safeSymbol) return null;

          return (
            <Link to={`/crypto/${safeSymbol}`} key={coin.symbol} className="card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                <div>
                  <h2 style={{fontSize: '1.25rem', margin: 0}}>{coin.name}</h2>
                  <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                    <span style={{background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                      {safeSymbol}
                    </span>
                    <span style={{background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem'}}>
                      {coin.type}
                    </span>
                  </div>
                </div>
              </div>
              {coin.price > 0 && (
                <div style={{marginTop: '15px', textAlign: 'right'}}>
                  <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b'}}>
                    ${coin.price.toLocaleString()}
                  </div>
                  <div style={{fontSize: '0.8rem', color: '#64748b'}}>Current Price</div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Home;