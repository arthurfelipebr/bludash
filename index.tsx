import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // App.tsx should have a default export: export default App;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Elemento root não encontrado no DOM.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
