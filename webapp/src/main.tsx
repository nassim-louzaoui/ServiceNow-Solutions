import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import type { InitData } from './types';

function mount(initData: InitData) {
  const el = document.getElementById('oi-root');
  if (!el) return;
  createRoot(el).render(<App initialData={initData} />);
}

function tryMountFromWindow() {
  if (window.__OI_INIT__) {
    mount(window.__OI_INIT__);
    return;
  }
  window.addEventListener('oi:data', function handler(e: Event) {
    window.removeEventListener('oi:data', handler);
    mount((e as CustomEvent<InitData>).detail);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryMountFromWindow);
} else {
  tryMountFromWindow();
}
