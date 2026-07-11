import React from 'react';

const Chip = React.memo(function Chip({ status, label }) {
  return <span className={`chip ${status}`}>{label || status}</span>;
});

export default Chip;
