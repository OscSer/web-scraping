export function normalizeTicker(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.toLowerCase();
}
