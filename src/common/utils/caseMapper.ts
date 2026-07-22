/**
 * DB columns are snake_case (Postgres convention); API request/response
 * bodies are camelCase (matches the frontend's TypeScript domain types
 * exactly, so no adapter layer is needed on the frontend side).
 * These two helpers convert at the repository boundary only — nowhere
 * else in the app should care about casing.
 */
export function camelToSnake(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    out[snakeKey] = value;
  }
  return out;
}

export function snakeToCamel<T = Record<string, unknown>>(input: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    out[camelKey] = value;
  }
  return out as T;
}

export function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => snakeToCamel<T>(row));
}
