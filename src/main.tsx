import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// [INDUSTRY-LEADING PIPELINE]: Suppress internal react-three-fiber (v9.5) warnings for THREE.Clock deprecation 
// (Introduced in three@0.183.2). This keeps the console pristine for performance tracking.
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("THREE.Clock: This module has been deprecated")) {
    return;
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
