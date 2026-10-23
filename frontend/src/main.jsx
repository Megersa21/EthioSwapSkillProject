import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import './styles/DarkMode.css';

try {
  const savedDarkMode = localStorage.getItem('ethioSwapSkillDarkMode') === 'true';
  document.documentElement.dataset.theme = savedDarkMode ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
