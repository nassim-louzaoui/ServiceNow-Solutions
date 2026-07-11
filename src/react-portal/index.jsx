import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { setBridge } from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

var _root = null;

function mountReact() {
  var container = document.getElementById('oi-root');
  if (container && !_root) {
    _root = ReactDOM.createRoot(container);
    _root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    return;
  }
  if (!container) {
    var observer = new MutationObserver(function () {
      var el = document.getElementById('oi-root');
      if (el && !_root) {
        observer.disconnect();
        _root = ReactDOM.createRoot(el);
        _root.render(
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        );
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

window.addEventListener('oi:ready', function (e) {
  var detail = e.detail || {};
  setBridge({ call: detail.call });
  mountReact();
});

mountReact();
