import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // App.tsx should have a default export: export default App;

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Elemento root não encontrado no DOM.');
    return;
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', renderApp);
  window.addEventListener('load', renderApp);
} else {
  renderApp();
}
