// SQL DATE fields represent calendar days, not instants in the viewer's timezone.
export function dateOnly(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/.exec(value.trim());
  if (!match) return '';
  const day = match[1];
  const parsed = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day ? '' : day;
}

export function formatDate(value: unknown): string {
  const day = dateOnly(value);
  if (!day) return 'Date unavailable';
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

export function normalizeCalendarDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(row => normalizeCalendarDates(row)) as T;
  if (!value || typeof value !== 'object') return value;
  const row = { ...value } as Record<string, unknown>;
  for (const field of ['appointment_date', 'expense_date', 'block_date']) {
    const day = dateOnly(row[field]);
    if (day) row[field] = day;
  }
  return row as T;
}
