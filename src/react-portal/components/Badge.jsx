import React from 'react';

export default function Badge({ cls = 'neutral', children }) {
  return <span className={`oi-badge ${cls}`}>{children}</span>;
}
