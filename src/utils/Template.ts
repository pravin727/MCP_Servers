import { EnvStore } from '../state/EnvStore.js';

// Minimal templating: replaces {{key}} with values from EnvStore.
// Also supports {{timestamp}} and {{uuid}}.
export function renderTemplate(input: any): any {
  if (typeof input === 'string') return renderString(input);
  if (Array.isArray(input)) return input.map(renderTemplate);
  if (input && typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input)) out[k] = renderTemplate(v);
    return out;
  }
  return input;
}

function renderString(s: string): string {
  return s.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key) => {
    if (key === 'timestamp') return new Date().toISOString();
    if (key === 'uuid') return cryptoRandomUuid();
    const v = EnvStore.get(key);
    return v === undefined || v === null ? '' : String(v);
  });
}

function cryptoRandomUuid(): string {
  // Node 18+ has crypto.randomUUID, but avoid importing crypto to keep simple.
  // Fallback: RFC4122-ish random (not cryptographically strong).
  const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

