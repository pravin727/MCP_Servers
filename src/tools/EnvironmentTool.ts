import { readFileSync } from 'fs';
import { Tool } from '../types.js';
import { EnvProfile, EnvStore } from '../state/EnvStore.js';

export const loadEnvironmentTool: Tool = {
  name: 'load_environment',
  description: 'Load an environment profile (JSON) and set it as active. Supports secret masking.',
  inputSchema: {
    type: 'object',
    properties: {
      profileName: { type: 'string', description: 'Profile name (e.g. dev, qa, prod)' },
      filePath: { type: 'string', description: 'Path to JSON file containing { values, secrets? }' },
    },
    required: ['profileName', 'filePath'],
  },
};

loadEnvironmentTool.handler = async (args: any) => {
  const { profileName, filePath } = args;
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  const profile: EnvProfile = {
    name: profileName,
    values: parsed.values || parsed,
    secrets: parsed.secrets || [],
  };

  EnvStore.setProfile(profile);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          { activeProfile: EnvStore.getActiveProfileName(), values: EnvStore.snapshot(true) },
          null,
          2,
        ),
      },
    ],
  };
};

export const setEnvVarTool: Tool = {
  name: 'set_env_var',
  description: 'Set a runtime environment variable (optionally secret) for templating and chaining.',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      value: { type: 'any' },
      secret: { type: 'boolean', default: false },
    },
    required: ['key', 'value'],
  },
};

setEnvVarTool.handler = async (args: any) => {
  const { key, value, secret = false } = args;
  EnvStore.set(key, value, { secret });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            key,
            value: secret ? EnvStore.maskValue(value) : value,
            secret,
            activeProfile: EnvStore.getActiveProfileName(),
          },
          null,
          2,
        ),
      },
    ],
  };
};

export const showEnvironmentTool: Tool = {
  name: 'show_environment',
  description: 'Show current active environment variables (secrets masked).',
  inputSchema: { type: 'object', properties: {} },
};

showEnvironmentTool.handler = async () => {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          { activeProfile: EnvStore.getActiveProfileName(), values: EnvStore.snapshot(true) },
          null,
          2,
        ),
      },
    ],
  };
};

