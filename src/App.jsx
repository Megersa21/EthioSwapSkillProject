import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/home.jsx';
import Login from './pages/login.jsx';
import Register from './pages/register.jsx';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
