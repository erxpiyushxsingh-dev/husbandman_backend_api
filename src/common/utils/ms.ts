/**
 * Tiny duration parser for strings like "15m", "7d", "30s", "1h" — just
 * enough to convert JWT expiry config (e.g. env.JWT_REFRESH_EXPIRES_IN)
 * into milliseconds for setting cookie/DB expiry. Not a full library;
 * extend the unit map below if you need more units.
 */
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export default function ms(duration: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Use formats like "15m", "7d", "30s".`);
  }
  const [, value, unit] = match;
  return Number(value) * UNIT_MS[unit];
}
