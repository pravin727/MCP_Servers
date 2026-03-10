import axios, { AxiosRequestConfig } from 'axios';

export interface RestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  auth?: {
    type: 'basic' | 'bearer' | 'api-key';
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    value?: string;
  };
}

export class RestEngine {
  static async execute(request: RestRequest): Promise<any> {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.url,
      headers: request.headers || {},
    };

    if (request.auth) {
      switch (request.auth.type) {
        case 'basic':
          config.auth = {
            username: request.auth.username!,
            password: request.auth.password!,
          };
          break;
        case 'bearer':
          config.headers!.Authorization = `Bearer ${request.auth.token}`;
          break;
        case 'api-key':
          config.headers![request.auth.key!] = request.auth.value!;
          break;
      }
    }

    if (request.body && ['POST', 'PUT'].includes(request.method)) {
      config.data = request.body;
    }

    try {
      const response = await axios(config);
      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
      };
    } catch (error: any) {
      return {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      };
    }
  }
}