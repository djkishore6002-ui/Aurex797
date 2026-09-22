export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item'
  );
}

/** Ensure a slug is unique within a table column. */
export function uniqueSlug(base: string, exists: (slug: string) => boolean): string {
  let slug = slugify(base);
  let i = 2;
  while (exists(slug)) slug = `${slugify(base)}-${i++}`;
  return slug;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Parse SQLite datetime ("YYYY-MM-DD HH:MM:SS", UTC) or ISO strings safely. */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  let v = value;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) v = v.replace(' ', 'T') + 'Z';
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function fmtDateTime(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export function timeAgo(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(value);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((part / total) * 1000) / 10, 0, 100);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatPrice(cents: number): string {
  if (cents <= 0) return 'Free';
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
