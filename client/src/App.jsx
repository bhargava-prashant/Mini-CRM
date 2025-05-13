// import tailwindConfig from '../tailwind.config';
// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Home from './pages/Home';

// import SignIn from "./pages/SignIn";
// import SignUp from "./pages/SignUp";
import CampaignApp from './CampaignApp';


// // Import other pages as needed
// // import Products from './pages/Products';
// // import Contact from './pages/Contact';
// // import Login from './pages/Login';
// // import Signup from './pages/Signup';

// function App() {
//   return (
//     <div>
//       {/* <CampaignApp /> */}
//       <Home />
//     </div>

//   );
// }

// export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import SignIn from './pages/SignIn';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/campaign" element={<CampaignApp />} /> 
      </Routes>
    </Router>
  );
}

export default App;
