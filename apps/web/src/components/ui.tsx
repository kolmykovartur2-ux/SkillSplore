import type { ButtonHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
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

// Wires the label to its control (htmlFor/id) and the control to its hint/
// error text (aria-describedby) automatically, so every call site gets a
// correctly-associated form field for free instead of relying on each of the
// ~40 usages across the app to wire it up by hand.
export function Field({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: ReactNode }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-describedby': error ? errorId : hint ? hintId : undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {child}
      {hint && <div id={hintId} className="hint">{hint}</div>}
      {error && <div id={errorId} className="field-error" role="alert">{error}</div>}
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
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remember what opened the dialog so focus can go back there on close.
    // Without this, dismissing a dialog drops focus to the top of the
    // document and a keyboard user loses their place on the page.
    const opener = document.activeElement as HTMLElement | null;

    const focusable = (): HTMLElement[] =>
      Array.from(
        cardRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the dialog. aria-modal alone does not stop the
      // browser tabbing into the page behind the overlay.
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Move focus into the dialog so keyboard/screen-reader users land inside
    // it rather than staying on whatever triggered it behind the overlay.
    cardRef.current?.focus();

    // Stop the page behind the overlay scrolling, which on a phone otherwise
    // moves the content out from under the dialog.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,40,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: 520, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body">
          <div className="spread" style={{ marginBottom: 12 }}>
            <h3 id={titleId} className="mt-0">{title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
