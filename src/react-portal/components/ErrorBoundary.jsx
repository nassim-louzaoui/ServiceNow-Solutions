import React from 'react';
import OIIcon from '../icons.jsx';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, errorMsg: err ? (err.message || String(err)) : 'Unknown error' };
  }

  componentDidCatch(err, info) {
    console.error('[OI Portal]', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="oi-crash">
          <div className="oi-crash-card">
            <div className="oi-crash-icon"><OIIcon name="error_icon" size={40} fill="#D9534F" /></div>
            <h2 className="oi-crash-title">Portal Error</h2>
            <p className="oi-crash-desc">An unexpected error prevented the Operations Intelligence portal from loading.</p>
            <code className="oi-crash-msg">{this.state.errorMsg}</code>
            <button className="oi-btn primary" style={{ marginTop: '1.25rem' }} onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
