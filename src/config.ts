import path from 'node:path';
export interface Config {
  baseUrl: string; helperUrl: string; username?: string; password?: string; token?: string;
  timeoutMs: number; maxUploadBytes: number; maxResponseBytes: number; uploadRoots: string[];
}
function base(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('Service URLs must be HTTP(S) URLs without credentials, query, or fragment.');
  return url.toString().replace(/\/$/, '');
}
function positive(value: string | undefined, fallback: number): number {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Limits must be positive integers.');
  return n;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    baseUrl: base(env.SWITCH_BASE_URL ?? 'http://127.0.0.1:51088'),
    helperUrl: base(env.SWITCH_HELPER_URL ?? 'http://127.0.0.1:55150'),
    username: env.SWITCH_USERNAME, password: env.SWITCH_PASSWORD, token: env.SWITCH_TOKEN,
    timeoutMs: positive(env.SWITCH_TIMEOUT_MS, 120_000),
    maxUploadBytes: positive(env.SWITCH_MAX_UPLOAD_BYTES, 256 * 1024 * 1024),
    maxResponseBytes: positive(env.SWITCH_MAX_RESPONSE_BYTES, 16 * 1024 * 1024),
    uploadRoots: (env.SWITCH_UPLOAD_ROOTS ?? '').split(path.delimiter).filter(Boolean).map(p => path.resolve(p)),
  };
}
