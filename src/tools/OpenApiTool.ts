import axios from 'axios';
import { Tool } from '../types.js';

interface OpenApiOperation {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
  responses?: Record<string, any>;
}

export const importOpenApiTool: Tool = {
  name: 'import_openapi',
  description: 'Import an OpenAPI/Swagger document and extract REST operations for test generation.',
  inputSchema: {
    type: 'object',
    properties: {
      specUrl: {
        type: 'string',
        description: 'URL or local HTTP endpoint returning an OpenAPI/Swagger JSON document',
      },
    },
    required: ['specUrl'],
  },
};

importOpenApiTool.handler = async (args: any) => {
  const { specUrl } = args;

  const response = await axios.get(specUrl);
  const spec = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

  const operations: OpenApiOperation[] = [];

  const paths = spec.paths || {};
  for (const [path, methods] of Object.entries<any>(paths)) {
    for (const [method, op] of Object.entries<any>(methods)) {
      operations.push({
        method: method.toUpperCase(),
        path,
        operationId: op.operationId,
        summary: op.summary,
        tags: op.tags,
        responses: op.responses,
      });
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ operations }, null, 2),
      },
    ],
  };
};


