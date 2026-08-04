/**
 * Minimal Markdown renderer for the policy documents.
 *
 * Written rather than pulled in as a dependency: the platform is meant to be
 * self-hostable with a small dependency surface, and this needs to handle
 * exactly the subset the legal documents use -- headings, paragraphs, lists,
 * blockquotes, tables, bold, italic, inline code and links.
 *
 * SECURITY: the input is escaped FIRST, unconditionally, and markup is applied
 * only to the escaped text. The output is passed to dangerouslySetInnerHTML,
 * so this ordering is what makes that safe. Policy bodies currently come from
 * our own source tree, but that is not a property worth depending on -- if a
 * document body ever became editable through an admin screen, this function
 * would still not produce executable markup.
 *
 * Consequence of that ordering: raw HTML in a document is displayed as text,
 * not interpreted. That is intended.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline markup, applied to already-escaped text. */
function inline(text: string): string {
  return text
    // `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // **bold**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // *italic* — after bold so ** is not consumed here
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    // [label](/path) — only relative and http(s) targets, so an escaped
    // javascript: URL cannot be reconstituted here.
    .replace(/\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function isTableDivider(line: string): boolean {
  return /^\|[\s|:-]+\|$/.test(line.trim());
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source).split('\n');
  const out: string[] = [];

  let listOpen: 'ul' | 'ol' | null = null;
  let quoteOpen = false;
  let paragraph: string[] = [];

  const closeList = () => { if (listOpen) { out.push(`</${listOpen}>`); listOpen = null; } };
  const closeQuote = () => { if (quoteOpen) { out.push('</blockquote>'); quoteOpen = false; } };
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const flushAll = () => { flushParagraph(); closeList(); closeQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();

    if (line === '') { flushParagraph(); closeList(); closeQuote(); continue; }

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) { flushAll(); out.push('<hr />'); continue; }

    // Table: a header row followed by a |---|---| divider.
    if (line.startsWith('|') && i + 1 < lines.length && isTableDivider(lines[i + 1]!)) {
      flushAll();
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const header = cells(line);
      out.push('<table><thead><tr>');
      for (const c of header) out.push(`<th>${inline(c)}</th>`);
      out.push('</tr></thead><tbody>');

      i += 2; // skip the divider
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        out.push('<tr>');
        for (const c of cells(lines[i]!)) out.push(`<td>${inline(c)}</td>`);
        out.push('</tr>');
        i++;
      }
      i--; // the outer loop increments again
      out.push('</tbody></table>');
      continue;
    }

    // Blockquote
    if (line.startsWith('&gt;')) {
      flushParagraph(); closeList();
      if (!quoteOpen) { out.push('<blockquote>'); quoteOpen = true; }
      const content = line.replace(/^&gt;\s?/, '');
      if (content) out.push(`<p>${inline(content)}</p>`);
      continue;
    }
    closeQuote();

    // Unordered list
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (listOpen !== 'ul') { closeList(); out.push('<ul>'); listOpen = 'ul'; }
      out.push(`<li>${inline(bullet[1]!)}</li>`);
      continue;
    }

    // Ordered list
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (listOpen !== 'ol') { closeList(); out.push('<ol>'); listOpen = 'ol'; }
      out.push(`<li>${inline(numbered[1]!)}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  flushAll();
  return out.join('\n');
}
