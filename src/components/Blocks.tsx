/* Renders content blocks (CMS/lesson pages). Server component — React
   auto-escapes all text, so no XSS vector from stored content. */

export interface Block {
  type: string;
  data: Record<string, unknown>;
}

export function Blocks({ blocks }: { blocks: unknown }) {
  const list = Array.isArray(blocks) ? (blocks as Block[]) : [];
  return (
    <div className="prose-block">
      {list.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  const d = block.data || {};
  switch (block.type) {
    case 'heading':
      return <h2 className="pt-2 text-xl font-bold text-ink-950">{String(d.text ?? '')}</h2>;
    case 'paragraph':
      return <p className="text-[15px] leading-relaxed text-ink-700">{String(d.text ?? '')}</p>;
    case 'quote':
      return (
        <blockquote className="border-l-4 border-marigold-400 bg-marigold-50 px-4 py-3 text-[15px] italic text-ink-800">
          <span className="tamil text-base not-italic">{String(d.text ?? '')}</span>
        </blockquote>
      );
    case 'callout': {
      const tone = d.tone === 'tip' ? 'tip' : d.tone === 'warning' ? 'warning' : 'info';
      const styles = {
        tip: 'border-brand-300 bg-brand-50 text-brand-900',
        info: 'border-sky-300 bg-sky-50 text-sky-900',
        warning: 'border-marigold-400 bg-marigold-50 text-marigold-900',
      } as const;
      const icons = { tip: '💡', info: 'ℹ️', warning: '⚠️' } as const;
      return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>
          <span aria-hidden>{icons[tone]}</span>
          <p>{String(d.text ?? '')}</p>
        </div>
      );
    }
    case 'vocabulary':
      return (
        <div className="flex flex-wrap items-baseline gap-x-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <span className="tamil text-2xl font-semibold text-brand-900">{String(d.tamil ?? '')}</span>
          <span className="text-sm italic text-ink-600">/ {String(d.transliteration ?? '')} /</span>
          <span className="text-sm font-medium text-ink-800">— {String(d.meaning ?? '')}</span>
        </div>
      );
    case 'grammar':
      return (
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-bold uppercase tracking-wide text-brand-700">Grammar · {String(d.title ?? '')}</p>
          <p className="text-sm leading-relaxed text-ink-700">{String(d.explanation ?? '')}</p>
          {d.example ? (
            <p className="tamil mt-2 rounded-lg bg-ink-50 px-3 py-2 text-[15px] text-ink-900">{String(d.example)}</p>
          ) : null}
        </div>
      );
    case 'table': {
      const rows = Array.isArray(d.rows) ? (d.rows as unknown[][]) : [];
      if (!rows.length) return null;
      return (
        <div className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="w-full text-left text-sm">
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-ink-100 font-semibold' : 'odd:bg-white even:bg-ink-50/50'}>
                  {(r as unknown[]).map((cell, ci) => (
                    <td key={ci} className="border-b border-ink-100 px-3 py-2 last:border-b-0">
                      <span className={/[\u0B80-\u0BFF]/.test(String(cell)) ? 'tamil' : ''}>{String(cell)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'list': {
      const items = Array.isArray(d.items) ? (d.items as string[]) : [];
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink-700 marker:text-brand-500">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    }
    case 'image':
      return typeof d.src === 'string' ? <img src={d.src} alt={String(d.alt ?? '')} className="w-full rounded-xl" /> : null;
    case 'video':
      return typeof d.src === 'string' ? <video src={d.src} controls className="w-full rounded-xl" /> : null;
    case 'audio':
      return typeof d.src === 'string' ? <audio src={d.src} controls className="w-full" /> : null;
    default:
      return null;
  }
}
