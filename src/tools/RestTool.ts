import { RestEngine, RestRequest } from '../engines/RestEngine.js';
import { Tool } from '../types.js';

export const executeRestTool: Tool = {
  name: 'execute_rest',
  description: 'Execute REST API requests with support for GET, POST, PUT, DELETE and authentication.',
  inputSchema: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
      },
      url: { type: 'string' },
      headers: { type: 'object' },
      body: { type: 'any' },
      auth: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['basic', 'bearer', 'api-key'] },
          username: { type: 'string' },
          password: { type: 'string' },
          token: { type: 'string' },
          key: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    required: ['method', 'url'],
  },
};

executeRestTool.handler = async (args: any) => {
  const request: RestRequest = args;
  const result = await RestEngine.execute(request);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};