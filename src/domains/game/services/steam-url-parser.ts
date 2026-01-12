export function extractAppId(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/\/app\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}
