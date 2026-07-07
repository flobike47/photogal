export function htmlToInline(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '<br>')
    .replace(/(<br>\s*)+$/, '')
    .trim();
}
