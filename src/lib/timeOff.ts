import { dateOnly } from './dates';
import type { supabase } from './api';

export function timeOffDates(start: string, end: string, today: string): string[] {
  if (!start || !end || dateOnly(start) !== start || dateOnly(end) !== end) throw new Error('Choose valid start and end dates.');
  if (start < today) throw new Error('Choose today or a future date.');
  if (end < start) throw new Error('The end date must be on or after the start date.');
  const first = Date.parse(`${start}T12:00:00Z`);
  const last = Date.parse(`${end}T12:00:00Z`);
  const count = Math.round((last - first) / 86400000) + 1;
  if (count > 366) throw new Error('Please block no more than 366 days at a time.');
  return Array.from({ length: count }, (_, i) => new Date(first + i * 86400000).toISOString().slice(0, 10));
}

export async function saveTimeOff(client: NonNullable<typeof supabase>, dates: string[], reason: string, progress: (done: number) => void) {
  if (!dates.length) throw new Error('Choose at least one date.');
  const start = dates[0];
  const endExclusive = new Date(Date.parse(`${dates[dates.length - 1]}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const [bookings, blocks] = await Promise.all([
    client.from('appointments').select('*').gte('appointment_date', start).lt('appointment_date', endExclusive).limit(1000),
    client.from('calendar_blocks').select('*').gte('block_date', start).lt('block_date', endExclusive).limit(1000),
  ]);
  if (bookings.error || blocks.error) throw new Error(bookings.error?.message || blocks.error?.message || 'Could not check these dates.');
  const conflict = (bookings.data || []).find((row: { status: string }) => row.status !== 'cancelled');
  if (conflict) throw new Error(`There is already a booking on ${dateOnly(conflict.appointment_date)}. Rearrange or cancel it before blocking these dates.`);
  const covered = new Set<string>((blocks.data || []).filter((row: { start_time: string; end_time: string }) => row.start_time.slice(0, 5) === '00:00' && row.end_time.slice(0, 5) >= '23:59').map((row: { block_date: string }) => dateOnly(row.block_date)));
  let saved = 0;
  let skipped = 0;
  for (const date of dates) {
    if (covered.has(date)) { skipped++; progress(saved + skipped); continue; }
    const result = await client.from('calendar_blocks').insert({ block_date: date, start_time: '00:00', end_time: '23:59', reason: reason.trim() || 'Time off / holiday' });
    if (result.error) return { saved, skipped, error: `Could not block ${date}: ${result.error.message}. ${saved} earlier date(s) were saved. Refresh the list before retrying.` };
    saved++;
    progress(saved + skipped);
  }
  return { saved, skipped, error: null };
}
