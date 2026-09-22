/* Minimal, safe markdown-lite renderer for AI answers.
   Strategy: escape ALL html first, then wrap safe patterns in spans.
   No dangerouslySetInnerHTML with unescaped input. */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderMarkdownLite(src: string): string {
  let out = escapeHtml(src);
  out = out.replace(/^### (.*)$/gm, '<p class="font-bold text-[15px]">$1</p>');
  out = out.replace(/^## (.*)$/gm, '<p class="font-bold text-base">$1</p>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Internal links: [label](/path) only — never http(s), never javascript:
  out = out.replace(/\[([^\]]+)\]\((\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
  // Tamil runs get a font class for correct glyph rendering
  out = out.replace(/[\u0B80-\u0BFF][\u0B80-\u0BFF\s\u0BCD-]*[\u0B80-\u0BFF]/g, (m) => `<span class="tamil">${m}</span>`);
  // Lists
  out = out.replace(/(?:^|\n)((?:[-•] .*(?:\n|$))+)/g, (_m, block: string) => {
    const items = block
      .trim()
      .split('\n')
      .map((l) => `<li>${l.replace(/^[-•]\s+/, '')}</li>`)
      .join('');
    return `\n<ul>${items}</ul>`;
  });
  out = out.replace(/(?:^|\n)((?:\d+\. .*(?:\n|$))+)/g, (_m, block: string) => {
    const items = block
      .trim()
      .split('\n')
      .map((l) => `<li>${l.replace(/^\d+\.\s+/, '')}</li>`)
      .join('');
    return `\n<ol>${items}</ol>`;
  });
  // Paragraphs
  out = out
    .split(/\n{2,}/)
    .map((para) => {
      const p = para.trim();
      if (!p) return '';
      if (p.startsWith('<ul>') || p.startsWith('<ol>')) return p;
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
  return out;
}

export function MarkdownLite({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`ai-md text-sm leading-relaxed text-ink-800 ${className}`} dangerouslySetInnerHTML={{ __html: renderMarkdownLite(text) }} />;
}
