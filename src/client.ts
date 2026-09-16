import { constants, publicEncrypt } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { Ajv } from 'ajv';
import type { AnySchema, ValidateFunction } from 'ajv';
import catalogData from './catalog.json' with { type: 'json' };
import type { Config } from './config.js';

export interface Operation {
  name: string; operation: string; method: string; path: string; service: string;
  fixedQuery: Record<string, string>; locations: Record<string, string>;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; [key: string]: unknown };
  description: string;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean };
}
export const catalog = catalogData as unknown as Operation[];
const ajv = new Ajv({ allErrors: true, strict: false });
const validators = new Map<string, ValidateFunction>(catalog.map(o => [o.name, ajv.compile(o.inputSchema as AnySchema)]));
export const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/ZW93qx1U6iGDwFWjYRpgS6/l
vFV/VGEM7wV14Gr4ZZxpZto3rpot3As4Cn0a++LwVh1oSidmiRWnHcKBDCmov8IL
fJ6SckFV41WZWibx8eSTCfn6zlrQ6QgJC2jdpLbWewxhox58zVXk5iK67GOKqbE/
HzSFJVdqIyjNX0/IpQIDAQAB
-----END PUBLIC KEY-----`;
export function encryptPassword(password: string): string {
  if (Buffer.byteLength(password, 'utf8') > 117) throw new Error('Switch RSA login supports at most 117 UTF-8 password bytes.');
  return '!@$' + publicEncrypt({ key: PUBLIC_KEY, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(password, 'utf8')).toString('base64');
}
export class SwitchError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: unknown) { super(message); }
}
type Args = Record<string, any>;
export interface Result { status: number; data: unknown }

/** One instance per stdio client; no shared/global authentication state. */
export class SwitchClient {
  private token?: string;
  private loginPending?: Promise<Result>;
  private readonly secrets = new Set<string>();
  // Serialize calls to avoid login/logout races and keep job mutation ordering deterministic.
  private queue: Promise<unknown> = Promise.resolve();
  constructor(public readonly config: Config, private readonly fetcher: typeof fetch = fetch) {
    this.token = config.token;
    for (const s of [config.token, config.password]) if (s) this.secrets.add(s);
  }
  sanitize(value: unknown, embedded = false): unknown {
    if (typeof value === 'string') {
      let safe = value;
      for (const secret of this.secrets) if (embedded || safe === secret) safe = safe.split(secret).join('[REDACTED]');
      return safe;
    }
    if (Array.isArray(value)) return value.map(v => this.sanitize(v, embedded));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) =>
      [k, /^(password|token|authorization)$/i.test(k) ? '[REDACTED]' : this.sanitize(v, embedded || /^(message|error|details)$/i.test(k))]));
    return value;
  }
  call(name: string, args: unknown = {}, signal?: AbortSignal): Promise<Result> {
    const run = this.queue.then(() => this.execute(name, args, signal));
    this.queue = run.catch(() => undefined);
    return run;
  }
  private async execute(name: string, input: unknown, signal?: AbortSignal): Promise<Result> {
    signal?.throwIfAborted();
    const op = catalog.find(o => o.name === name);
    if (!op) throw new SwitchError('Unknown Switch tool.');
    const validate = validators.get(name)!;
    if (!validate(input)) throw new SwitchError('Invalid tool arguments.', undefined, validate.errors?.map(e => ({ path: e.instancePath, keyword: e.keyword, message: e.message })));
    const args = { ...(input as Args) };
    if (op.operation === 'LoginQuery') return this.login(args, signal);
    if (op.service === 'switch' || 'token' in op.inputSchema.properties) {
      if (!args.token) await this.ensureToken(signal);
    }
    if (op.service === 'helper') {
      if ('token' in op.inputSchema.properties) { args.token ??= this.token; if (args.token) this.secrets.add(args.token); }
      if ('swsUrl' in op.inputSchema.properties) args.swsUrl ??= this.config.baseUrl;
    }
    const url = new URL((op.service === 'helper' ? this.config.helperUrl : this.config.baseUrl) + op.path.replace(/\/:([A-Za-z0-9_]+)/g, (_, k: string) => {
      if (args[k] === undefined) return '';
      const v = String(args[k]);
      if (v === '.' || v === '..') throw new SwitchError('Path identifiers cannot be dot segments.');
      return '/' + encodeURIComponent(v);
    }));
    for (const [k,v] of Object.entries(op.fixedQuery)) url.searchParams.set(k,v);
    const body: Args = {};
    for (const [k,v] of Object.entries(args)) {
      const location = op.locations[k];
      if (location === 'rawQuery') url.search = '?' + encodeURIComponent(String(v));
      else if (location === 'query') {
        for (const entry of Array.isArray(v) ? v : [v]) url.searchParams.append(k, String(entry));
      } else if (location === 'body') body[k] = v;
    }
    let payload: BodyInit | undefined;
    let contentType: string | undefined;
    if (args.files) payload = await this.multipart(args.files, body, signal);
    else if (Object.keys(body).length) {
      payload = JSON.stringify(op.operation === 'AddAnnotations' ? body.annotations : op.operation === 'EditAnnotation' ? body.annotation : body);
      contentType = 'application/json';
    }
    const result = await this.request(url, args.httpMethod ?? op.method, payload, contentType, op.service === 'switch' ? this.token : undefined, signal, op.operation === 'SwitchHelperJobInEdit');
    if (op.operation === 'LogoutQuery') this.token = undefined;
    return { status: result.status, data: this.sanitize(result.data) };
  }
  private async ensureToken(signal?: AbortSignal): Promise<void> {
    if (this.token) return;
    if (this.config.username === undefined || this.config.password === undefined)
      throw new SwitchError('Configure SWITCH_TOKEN or SWITCH_USERNAME and SWITCH_PASSWORD, or call switch_login_query first.');
    this.loginPending ??= this.login({}, signal).finally(() => { this.loginPending = undefined; });
    await this.loginPending;
  }
  private async login(args: Args, signal?: AbortSignal): Promise<Result> {
    const username = args.username ?? this.config.username;
    const password = args.password ?? this.config.password;
    if (username === undefined || password === undefined) throw new SwitchError('Login requires username and password, provided as arguments or environment variables.');
    if (password) this.secrets.add(password);
    const encrypted = encryptPassword(password); this.secrets.add(encrypted);
    const url = new URL(this.config.baseUrl + '/login');
    if (args.lang) url.searchParams.set('lang', args.lang);
    const result = await this.request(url, 'POST', JSON.stringify({username, password: encrypted}), 'application/json', undefined, signal);
    const data = result.data as Args;
    if (!data || typeof data.token !== 'string' || !data.token) throw new SwitchError('Login response did not contain a bearer token.');
    this.token = data.token; this.secrets.add(data.token);
    return { status: result.status, data: this.sanitize({...data, authenticated: true}) };
  }
  private async multipart(files: Args[], fields: Args, signal?: AbortSignal): Promise<FormData> {
    const form = new FormData(); let total = 0;
    for (const [k,v] of Object.entries(fields)) form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    const seen = new Set<string>();
    for (const [i, file] of files.entries()) {
      signal?.throwIfAborted();
      if (files.length > 1 && !file.relativePath) throw new SwitchError('Every file in a folder upload needs relativePath.');
      if (file.relativePath) {
        const rel: string = file.relativePath;
        if (/^[\\/]|^[A-Za-z]:|[\\\x00]/.test(rel) || rel.split('/').some(p => !p || p === '.' || p === '..')) throw new SwitchError('Invalid folder-relative upload path.');
        if (seen.has(rel)) throw new SwitchError('Duplicate folder-relative upload path.');
        seen.add(rel); form.append(`file[${i}][path]`, rel);
      }
      let bytes: Buffer;
      if (file.localPath !== undefined) {
        const resolved = await realpath(file.localPath);
        const roots = await Promise.all(this.config.uploadRoots.map(root => realpath(root)));
        if (!roots.some(root => { const rel = path.relative(root, resolved); return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); }))
          throw new SwitchError('Local upload is outside SWITCH_UPLOAD_ROOTS.');
        const handle = await open(resolved, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
        try {
          const stat = await handle.stat();
          if (!stat.isFile()) throw new SwitchError('Upload localPath must be a regular file.');
          if (stat.size + total > this.config.maxUploadBytes) throw new SwitchError('Upload exceeds SWITCH_MAX_UPLOAD_BYTES.');
          // Read at most the configured budget even if the file grows after stat().
          const chunks: Buffer[] = []; let size = 0;
          for await (const chunk of handle.createReadStream({autoClose: false})) {
            signal?.throwIfAborted(); size += chunk.length;
            if (size + total > this.config.maxUploadBytes) throw new SwitchError('Upload exceeds SWITCH_MAX_UPLOAD_BYTES.');
            chunks.push(chunk as Buffer);
          }
          bytes = Buffer.concat(chunks);
        } finally { await handle.close(); }
      } else {
        const b64 = file.base64 as string;
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64)) throw new SwitchError('Invalid canonical base64 upload.');
        if (b64.length > Math.ceil((this.config.maxUploadBytes - total) / 3) * 4) throw new SwitchError('Upload exceeds SWITCH_MAX_UPLOAD_BYTES.');
        bytes = Buffer.from(b64, 'base64');
        if (bytes.toString('base64') !== b64) throw new SwitchError('Invalid canonical base64 upload.');
      }
      total += bytes.length;
      if (total > this.config.maxUploadBytes) throw new SwitchError('Upload exceeds SWITCH_MAX_UPLOAD_BYTES.');
      const filename = file.filename ?? path.basename(file.localPath);
      if (/[\/\\\r\n\x00]/.test(filename) || filename === '.' || filename === '..') throw new SwitchError('filename must be a simple file name.');
      form.append(`file[${i}][file]`, new Blob([new Uint8Array(bytes)], { type: file.mimeType ?? 'application/octet-stream' }), filename);
    }
    return form;
  }
  private async request(url: URL, method: string, body?: BodyInit, contentType?: string, token?: string, signal?: AbortSignal, falseIsData = false): Promise<Result> {
    const headers: Record<string,string> = { Accept: 'application/json' };
    if (contentType) headers['Content-Type'] = contentType;
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await this.fetcher(url, { method, body, headers, redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(this.config.timeoutMs), ...(signal ? [signal] : [])]) });
      const reader = response.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
      if (reader) {
        try {
          for (;;) {
            const part = await reader.read(); if (part.done) break;
            size += part.value.length;
            if (size > this.config.maxResponseBytes) { await reader.cancel(); throw new SwitchError('Response exceeds SWITCH_MAX_RESPONSE_BYTES; narrow the requested fields or limit.'); }
            chunks.push(part.value);
          }
        } finally { reader.releaseLock(); }
      }
      const text = Buffer.concat(chunks).toString('utf8');
      let data: any = text;
      if (text) { try { data = JSON.parse(text); } catch { /* Helper can return plain text. */ } }
      else data = null;
      if (response.status === 401 && token === this.token) this.token = undefined;
      if (!response.ok || (data && (data.success === false || (data.status === false && (!falseIsData || data.error)) || data.status === 'error' || (Array.isArray(data.errors) && data.errors.length))))
        throw new SwitchError(`Switch request failed (HTTP ${response.status}).`, response.status, this.sanitize(data, true));
      return {status: response.status, data};
    } catch (error) {
      if (error instanceof SwitchError) throw error;
      if (signal?.aborted) throw new SwitchError('Switch request cancelled.');
      if (error instanceof Error && ['TimeoutError','AbortError'].includes(error.name)) throw new SwitchError('Switch request timed out; a write may have completed. Check its state before retrying.');
      throw new SwitchError('Switch network request failed. Check the configured service URL, TLS trust, and network; writes are never automatically replayed.');
    }
  }
}
