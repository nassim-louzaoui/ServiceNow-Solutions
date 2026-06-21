import { useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ title, onClose, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const maxWidth = { sm: 360, md: 480, lg: 600 }[size];

  return (
    <div className="oi-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oi-modal" style={{ maxWidth }}>
        <div className="oi-modal-hdr">
          <span className="oi-modal-title">{title}</span>
          <button className="oi-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="oi-modal-body">{children}</div>
        {footer && <div className="oi-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title, message, onConfirm, onCancel, danger = false,
}: {
  title: string; message: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button className="oi-btn ghost sm" onClick={onCancel}>Cancel</button>
          <button className={`oi-btn sm ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>Confirm</button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: '#293E40', lineHeight: 1.55 }}>{message}</p>
    </Modal>
  );
}
