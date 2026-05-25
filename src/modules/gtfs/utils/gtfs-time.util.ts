export function parseGtfsTimeToSeconds(raw: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(raw);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  return h * 3600 + m * 60 + s;
}
