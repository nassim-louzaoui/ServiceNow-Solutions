import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';

const ICON_NAMES = { success: 'check', error: 'close', warning: 'warning_icon', info: 'info_icon' };

export default function ToastContainer() {
  const { state, dispatch } = useApp();
  return (
    <div className="oi-toasts">
      {state.toasts.map(t => (
        <div key={t.id} className={`oi-toast ${t.type || 'info'}`}>
          <span className="oi-toast-icon">
            <OIIcon name={ICON_NAMES[t.type] || 'info_icon'} size={16} />
          </span>
          <span className="oi-toast-msg">{t.message}</span>
          <button className="oi-toast-close" onClick={() => dispatch({ type: 'POP_TOAST', payload: t.id })}>
            <OIIcon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
