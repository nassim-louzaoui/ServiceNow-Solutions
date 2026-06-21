import { useApp } from '../../context/AppContext';

export default function Toasts() {
  const { state, dispatch } = useApp();
  if (!state.toasts.length) return null;

  const icons: Record<string, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
  };

  return (
    <div className="oi-toasts">
      {state.toasts.map(t => (
        <div key={t.id} className={`oi-toast ${t.type}`}>
          <span className="oi-toast-icon">{icons[t.type]}</span>
          <span className="oi-toast-msg">{t.message}</span>
          <button className="oi-toast-close" onClick={() => dispatch({ type: 'POP_TOAST', payload: t.id })}>✕</button>
        </div>
      ))}
    </div>
  );
}
