export function sanitizeFilename(raw: string, fallback: string): string {
  const stem = raw
    .trim()
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^\.+/, '')
    .slice(0, 80);
  const base = stem.length > 0 ? stem : fallback;
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
}

export function filenameFromItem(
  item: Record<string, unknown>,
  index: number,
): string {
  const name = item.name;
  const raw =
    typeof name === 'string' && name.trim().length > 0
      ? name
      : `item-${index + 1}`;
  return sanitizeFilename(raw, `item-${index + 1}`);
}
