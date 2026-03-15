import axios, { AxiosRequestConfig } from 'axios';
import { EnvStore } from '../state/EnvStore.js';
import { HttpSessionStore } from '../state/HttpSessionStore.js';
import { renderTemplate } from '../utils/Template.js';

export interface RestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  session?: string;
  auth?: {
    type: 'basic' | 'bearer' | 'api-key';
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    value?: string;
  };
  /**
   * Optional map of form field name → local file path for multipart upload.
   */
  files?: Record<string, string>;
}

export class RestEngine {
  static async execute(request: RestRequest): Promise<any> {
    const rendered = renderTemplate(request);

    const sessionName = rendered.session || 'default';
    const session = HttpSessionStore.getOrCreate(sessionName);

    const config: AxiosRequestConfig = {
      method: rendered.method,
      url: rendered.url,
      headers: rendered.headers || {},
    };

    if (rendered.auth) {
      switch (rendered.auth.type) {
        case 'basic':
          config.auth = {
            username: rendered.auth.username!,
            password: rendered.auth.password!,
          };
          break;
        case 'bearer':
          config.headers!.Authorization = `Bearer ${rendered.auth.token}`;
          break;
        case 'api-key':
          config.headers![rendered.auth.key!] = rendered.auth.value!;
          break;
      }
    }

    // support multipart/form-data file uploads
    if (rendered.files && Object.keys(rendered.files).length > 0) {
      // lazy import to avoid adding a dependency if not used
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FormData = require('form-data');
      const form = new FormData();
      if (rendered.body && typeof rendered.body === 'object') {
        for (const [k, v] of Object.entries(rendered.body)) {
          form.append(k, v as any);
        }
      }
      for (const [field, path] of Object.entries(rendered.files)) {
        form.append(field, require('fs').createReadStream(path));
      }
      config.data = form;
      // let axios set appropriate headers for the form boundary
      config.headers = { ...config.headers, ...form.getHeaders() };
    } else if (rendered.body && ['POST', 'PUT'].includes(rendered.method)) {
      config.data = rendered.body;
    }

    try {
      const start = Date.now();
      const response = await session.client(config);
      const durationMs = Date.now() - start;
      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
        durationMs,
        session: sessionName,
        curl: this.toCurl({ ...config, data: config.data }, EnvStore),
      };
    } catch (error: any) {
      return {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        session: sessionName,
        curl: this.toCurl({ ...config, data: config.data }, EnvStore),
      };
    }
  }

  private static toCurl(config: AxiosRequestConfig, env: typeof EnvStore): string {
    const method = String(config.method || 'GET').toUpperCase();
    const url = String(config.url || '');
    const headers = (config.headers || {}) as Record<string, any>;
    const parts: string[] = ['curl'];
    parts.push('-X', method);
    for (const [k, v] of Object.entries(headers)) {
      const raw = v == null ? '' : String(v);
      const masked = this.maskByEnv(raw, env);
      parts.push('-H', shellQuote(`${k}: ${masked}`));
    }
    if (config.data !== undefined) {
      const body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
      const masked = this.maskByEnv(body, env);
      parts.push('--data', shellQuote(masked));
    }
    parts.push(shellQuote(url));
    return parts.join(' ');
  }

  private static maskByEnv(text: string, env: typeof EnvStore): string {
    // Mask values for any secret keys we know about (best-effort).
    let out = text;
    const snapshot = env.snapshot(false);
    for (const [k, v] of Object.entries(snapshot)) {
      if (!env.isSecretKey(k)) continue;
      if (v == null) continue;
      const s = String(v);
      if (!s) continue;
      out = out.split(s).join(String(env.maskValue(s)));
    }
    return out;
  }
}

function shellQuote(s: string): string {
  if (s === '') return "''";
  if (/^[a-zA-Z0-9_./:=@-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\"'\"'`)}'`;
}