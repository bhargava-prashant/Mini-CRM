import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import tailwindConfig from '../tailwind.config';

// Import other pages as needed
// import Products from './pages/Products';
// import Contact from './pages/Contact';
// import Login from './pages/Login';
// import Signup from './pages/Signup';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Add additional routes as needed */}
        {/* <Route path="/products" element={<Products />} /> */}
        {/* <Route path="/contact" element={<Contact />} /> */}
        {/* <Route path="/login" element={<Login />} /> */}
        {/* <Route path="/signup" element={<Signup />} /> */}
      </Routes>
    </Router>
  );
}

export default App;