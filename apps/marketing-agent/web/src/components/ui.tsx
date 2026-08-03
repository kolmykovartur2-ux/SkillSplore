import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Spinner() {
  return (
    <div className="loading-wrap">
      <div className="spinner" aria-label="Loading" />
    </div>
  );
}

export function EmptyState({ emoji = '🗒️', title, children }: { emoji?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="emoji">{emoji}</span>
      <h3 className="mt-0">{title}</h3>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Alert({ type = 'info', children }: { type?: 'info' | 'error' | 'success'; children: ReactNode }) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'accent' | 'danger' | 'outline' | 'ghost'; loading?: boolean };
export function Button({ variant = 'outline', loading, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? '…' : children}
    </button>
  );
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = '', title }: { children: ReactNode; variant?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'; title?: string }) {
  return (
    <span className={`badge ${variant ? 'badge-' + variant : ''}`} title={title}>
      {children}
    </span>
  );
}

export function Field({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

const STATUS_VARIANT: Record<string, '' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'> = {
  IDEA: '',
  RESEARCHING: '',
  DRAFT: '',
  AWAITING_REVIEW: 'warning',
  CHANGES_REQUESTED: 'warning',
  APPROVED: 'primary',
  SCHEDULED: 'accent',
  PUBLISHING: 'accent',
  PUBLISHED: 'success',
  FAILED: 'danger',
  CANCELLED: 'danger',
  ARCHIVED: '',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? ''}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,40,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '86vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="card-body">
          <div className="spread" style={{ marginBottom: 12 }}>
            <h3 className="mt-0">{title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
