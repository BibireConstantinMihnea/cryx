import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CryptoDetail from './pages/CryptoDetail';

const App = () => {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/crypto/:id" element={<CryptoDetail />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;