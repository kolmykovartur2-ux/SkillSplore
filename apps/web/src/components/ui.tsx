import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { initials } from '../lib/format.js';

export function Spinner() {
  return (
    <div className="loading-wrap">
      <div className="spinner" aria-label="Loading" />
    </div>
  );
}

export function EmptyState({ emoji = '📭', title, children }: { emoji?: string; title: string; children?: ReactNode }) {
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

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Badge({ children, variant = '', title }: { children: ReactNode; variant?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'; title?: string }) {
  return <span className={`badge ${variant ? 'badge-' + variant : ''}`} title={title}>{children}</span>;
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

export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (url) return <img className="avatar" src={url} alt={name} style={style} />;
  return <span className="avatar" style={style}>{initials(name)}</span>;
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" title={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? '' : 'empty'}>★</span>
      ))}
      {count !== undefined && <span className="muted" style={{ fontSize: '0.8rem', marginLeft: 6 }}>{rating.toFixed(1)} ({count})</span>}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, '' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'> = {
    APPROVED: 'success', PUBLISHED: 'success', COMPLETED: 'success', OPEN: 'success', ACTIVE: 'success', RESOLVED: 'success', ACCEPTED: 'success',
    PENDING: 'warning', CHANGES_REQUESTED: 'warning', PAUSED: 'warning', INVESTIGATING: 'warning', ARRANGED: 'primary',
    REJECTED: 'danger', SUSPENDED: 'danger', HIDDEN: 'danger', CANCELLED: 'danger', DECLINED: 'danger', WITHDRAWN: '',
    DRAFT: '', CLOSED: '', DISMISSED: '',
  };
  return <Badge variant={map[status] ?? ''}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,40,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 520, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="card-body">
          <div className="spread" style={{ marginBottom: 12 }}>
            <h3 className="mt-0">{title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
