import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initMonitoring } from './lib/monitoring';
import { installThemeVars } from './theme/cssVars';
import './theme/global.css';

installThemeVars();
initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
