import { Tool } from '../types.js';
import { RestEngine } from '../engines/RestEngine.js';
import { JSONPath } from 'jsonpath-plus';

export const pollEndpointTool: Tool = {
  name: 'poll_endpoint',
  description:
    'Poll a REST endpoint repeatedly until a JSONPath condition is met or timeout expires.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
      headers: { type: 'object' },
      body: { type: 'any' },
      session: { type: 'string' },
      auth: { type: 'object' },
      condition_path: { type: 'string', description: 'JSONPath expression to evaluate against the response body' },
      expected_value: { type: 'any', description: 'Value to compare against the result of the path' },
      timeout: { type: 'number', default: 60000 },
      interval: { type: 'number', default: 1000 },
    },
    required: ['url', 'condition_path', 'expected_value'],
  },
};

pollEndpointTool.handler = async (args: any) => {
  const {
    url,
    method = 'GET',
    headers,
    body,
    session,
    auth,
    condition_path,
    expected_value,
    timeout = 60000,
    interval = 1000,
  } = args;

  const start = Date.now();
  while (true) {
    const result = await RestEngine.execute({ url, method, headers, body, session, auth });
    const data = result.data ?? result.body;
    const matches = JSONPath({ path: condition_path, json: data });
    if (matches.some((m: any) => deepEquals(m, expected_value))) {
      return {
        content: [
          { type: 'text', text: JSON.stringify({ passed: true, result }, null, 2) },
        ],
      };
    }
    if (Date.now() - start > timeout) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ passed: false, reason: 'timeout', lastResult: result }, null, 2),
          },
        ],
      };
    }
    await new Promise((r) => setTimeout(r, interval));
  }
};

function deepEquals(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
