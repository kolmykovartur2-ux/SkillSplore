import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../lib/auth.js';
import { Spinner, Button } from '../components/ui.js';

interface CalDraft { id: number; title: string | null; scheduledFor?: string | null; publishedAt?: string | null; updatedAt?: string }
interface CalendarResponse { timezone: string; scheduled: CalDraft[]; published: CalDraft[]; failed: CalDraft[] }

// Month grid, read-only positions (no drag-and-drop reschedule in this
// release — see docs/marketing-agent/KNOWN_LIMITATIONS.md). Rescheduling is
// done from the draft page via unschedule + schedule.
export function Calendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const { config } = useAuth();

  const { from, to, days } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return { from: cells[0]!, to: cells[41]!, days: cells };
  }, [cursor]);

  const { data, loading } = useApi<CalendarResponse>(`/schedule?from=${from.toISOString()}&to=${to.toISOString()}`);

  const byDay = useMemo(() => {
    const map = new Map<string, { type: 'scheduled' | 'published' | 'failed'; item: CalDraft }[]>();
    const add = (type: 'scheduled' | 'published' | 'failed', item: CalDraft) => {
      const dateStr = item.publishedAt ?? item.scheduledFor ?? item.updatedAt;
      if (!dateStr) return;
      const key = new Date(dateStr).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type, item });
    };
    data?.scheduled.forEach((d) => add('scheduled', d));
    data?.published.forEach((d) => add('published', d));
    data?.failed.forEach((d) => add('failed', d));
    return map;
  }, [data]);

  return (
    <div className="page container">
      <div className="section-title">
        <h1>Calendar</h1>
        <div className="row">
          <Button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>← Prev</Button>
          <strong>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <Button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Next →</Button>
        </div>
      </div>
      <p className="muted">Times shown in {config?.defaultTimezone ?? data?.timezone ?? 'the configured timezone'}.</p>
      {loading ? (
        <Spinner />
      ) : (
        <div className="cal-grid">
          {days.map((d) => {
            const items = byDay.get(d.toDateString()) ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            return (
              <div key={d.toISOString()} className="cal-day" style={{ opacity: inMonth ? 1 : 0.45 }}>
                <div className="cal-date">{d.getDate()}</div>
                {items.map(({ type, item }) => (
                  <Link key={`${type}-${item.id}`} to={`/drafts/${item.id}`} className={`cal-item ${type}`}>
                    {item.title || `Draft #${item.id}`}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
