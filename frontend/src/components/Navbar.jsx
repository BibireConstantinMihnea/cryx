import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', padding: 0 }}>
        <Link to="/" className="brand">cryx Explorer</Link>
        <div>
          <Link to="/">Dashboard</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;