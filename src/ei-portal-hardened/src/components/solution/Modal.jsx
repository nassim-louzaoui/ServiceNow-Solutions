import React from 'react';
import OIIcon from '../../icons.jsx';

// A full viewport popup modal in the hardened house style. The header carries the title, an optional
// checkmark to save and close, and a close icon to exit without saving. Clicking the dim backdrop
// closes it. `size` widens it for the configuration surfaces.
export default function Modal(props) {
  function onBackdrop(e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); }
  return (
    <div className="ei-modal-overlay" onMouseDown={onBackdrop}>
      <div className={'ei-modal' + (props.size ? ' ei-modal-' + props.size : '')}>
        <div className="ei-modal-hd">
          <div className="ei-modal-title">{props.title}</div>
          <div className="ei-modal-hd-actions">
            {props.onSave ? (
              <button className="ei-modal-ic save" disabled={!!props.saveDisabled} title="Save and close"
                onClick={props.onSave}><OIIcon name="check" size={18} fill="currentColor" /></button>
            ) : null}
            {props.onClose ? (
              <button className="ei-modal-ic close" title="Close"
                onClick={props.onClose}><OIIcon name="close" size={18} fill="currentColor" /></button>
            ) : null}
          </div>
        </div>
        <div className="ei-modal-body">{props.children}</div>
      </div>
    </div>
  );
}
