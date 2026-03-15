import { Tool } from '../types.js';
import { EnvStore } from '../state/EnvStore.js';

export const extractToEnvTool: Tool = {
  name: 'extract_to_env',
  description:
    'Extract values from a JSON object using dot paths and store them into environment variables (supports secrets).',
  inputSchema: {
    type: 'object',
    properties: {
      source: { type: 'any', description: 'Source object (e.g., REST response.data)' },
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            path: { type: 'string', description: 'Dot path, e.g. token.access or items.0.id' },
            secret: { type: 'boolean', default: false },
          },
          required: ['key', 'path'],
        },
      },
    },
    required: ['source', 'mappings'],
  },
};

extractToEnvTool.handler = async (args: any) => {
  const { source, mappings } = args as { source: any; mappings: Array<{ key: string; path: string; secret?: boolean }> };

  const applied: any[] = [];
  for (const m of mappings) {
    const value = getByPath(source, m.path);
    EnvStore.set(m.key, value, { secret: !!m.secret });
    applied.push({
      key: m.key,
      path: m.path,
      value: m.secret ? EnvStore.maskValue(value) : value,
      secret: !!m.secret,
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ applied, activeProfile: EnvStore.getActiveProfileName() }, null, 2),
      },
    ],
  };
};

function getByPath(obj: any, path: string): any {
  if (!path) return undefined;
  const parts = path.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    const idx = /^[0-9]+$/.test(p) ? Number(p) : null;
    cur = idx === null ? cur[p] : cur[idx];
  }
  return cur;
}

