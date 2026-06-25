import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { CSS } from './styles.js';

window.__OI_MOUNT__ = function(shadowRoot, data) {
  const style = document.createElement('style');
  style.textContent = CSS;
  shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.style.cssText = 'display:block;height:100vh;overflow:hidden';
  shadowRoot.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App initialData={data} />
    </React.StrictMode>
  );

  return root;
};
