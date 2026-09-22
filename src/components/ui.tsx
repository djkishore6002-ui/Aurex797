import Link from 'next/link';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse-soft rounded-xl bg-ink-200/70 ${className}`} />;
}

export function EmptyState({ icon = '🌱', title, body, action }: { icon?: string; title: string; body?: string; action?: { label: string; href: string } }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span aria-hidden className="text-4xl">
        {icon}
      </span>
      <h3 className="mt-1 text-lg font-semibold text-ink-900">{title}</h3>
      {body && <p className="max-w-md text-sm text-ink-500">{body}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ProgressBar({ value, className = '', label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress ${v}%`}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-ink-200 ${className}`}
    >
      <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Badge({ tone = 'default', children }: { tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    default: 'bg-ink-100 text-ink-700',
    success: 'bg-brand-100 text-brand-800',
    warning: 'bg-marigold-100 text-marigold-800',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-800',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string | null; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink-500 sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, hint }: { label: string; value: React.ReactNode; icon?: string; hint?: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      {icon && (
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-500">{label}</p>
        <p className="truncate text-2xl font-bold text-ink-950">{value}</p>
        {hint && <p className="truncate text-xs text-ink-400">{hint}</p>}
      </div>
    </div>
  );
}

export function ErrorBanner({ error }: { error: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {error}
    </div>
  );
}
