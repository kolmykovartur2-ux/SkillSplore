import type { Money } from './types.js';

export function money(m: Money | null | undefined): string {
  return m ? m.display : '—';
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function dateStr(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function slotLabel(dayOfWeek: number, startMinute: number, endMinute: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${ampm}`;
  };
  return `${DAYS[dayOfWeek]} ${fmt(startMinute)}–${fmt(endMinute)}`;
}

export function deliveryLabel(mode: string): string {
  return mode === 'ONLINE' ? 'Online' : mode === 'IN_PERSON' ? 'In person' : mode === 'BOTH' ? 'Online or in person' : mode;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}
