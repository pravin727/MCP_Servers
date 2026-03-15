import { Tool } from '../types.js';
import { RestEngine, RestRequest } from '../engines/RestEngine.js';

export interface RestTestCase {
  id: string;
  name: string;
  description?: string;
  request: RestRequest;
  expectedStatus?: number;
  assertions?: any[];
  schema?: any;
}

export const generateRestTestsFromOpenApiTool: Tool = {
  name: 'generate_rest_tests_from_openapi',
  description:
    'Generate basic REST API test cases (happy-path + status checks) from OpenAPI operations.',
  inputSchema: {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        description: 'Operations array returned by import_openapi',
        items: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            path: { type: 'string' },
            operationId: { type: 'string' },
            summary: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            responses: { type: 'object' },
          },
        },
      },
      baseUrl: {
        type: 'string',
        description: 'Base URL to prepend to paths, e.g. https://api.example.com',
      },
      defaultExpectedStatus: {
        type: 'number',
        description: 'Default expected HTTP status code when none can be inferred',
        default: 200,
      },
    },
    required: ['operations', 'baseUrl'],
  },
};

generateRestTestsFromOpenApiTool.handler = async (args: any) => {
  const { operations, baseUrl, defaultExpectedStatus = 200 } = args;

  const tests: RestTestCase[] = (operations || []).map((op: any, index: number) => {
    const id = op.operationId || `${op.method}_${op.path}_${index}`;
    const name = op.summary || `Test ${op.method} ${op.path}`;
    const url = `${baseUrl.replace(/\/+$/, '')}${op.path}`;

    let expectedStatus = defaultExpectedStatus;
    const responses = op.responses || {};
    if (responses['200']) expectedStatus = 200;
    else if (responses['201']) expectedStatus = 201;
    else if (responses['204']) expectedStatus = 204;

    const request: RestRequest = {
      method: op.method || 'GET',
      url,
    };

    return {
      id,
      name,
      description: op.summary,
      request,
      expectedStatus,
    };
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ tests }, null, 2),
      },
    ],
  };
};

export const runRestTestSuiteTool: Tool = {
  name: 'run_rest_test_suite',
  description: 'Execute a suite of REST API test cases and return a summarized report.',
  inputSchema: {
    type: 'object',
    properties: {
      tests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            request: {
              type: 'object',
              properties: {
                method: { type: 'string' },
                url: { type: 'string' },
                headers: { type: 'object' },
                body: { type: 'any' },
                auth: { type: 'object' },
              },
            },
            expectedStatus: { type: 'number' },
            assertions: { type: 'array' },
            schema: { type: 'object' },
          },
          required: ['id', 'name', 'request'],
        },
      },
    },
    required: ['tests'],
  },
};

runRestTestSuiteTool.handler = async (args: any) => {
  const { tests } = args as { tests: RestTestCase[] };

  const results: any[] = [];

  for (const test of tests) {
    const start = Date.now();
    const response = await RestEngine.execute(test.request);
    const durationMs = Date.now() - start;

    const status = (response && response.status) || response?.statusCode;
    const expectedStatus = test.expectedStatus ?? 200;
    const basePassed = status === expectedStatus;

    let assertionResults: any = null;
    let schemaResults: any = null;
    let passed = basePassed;

    if (test.assertions && test.assertions.length > 0) {
      const { assertResponseTool } = await import('./AssertionTool.js');
      const assertionResp = await (assertResponseTool.handler as any)({
        response: { ...response, durationMs },
        rules: test.assertions,
      });
      assertionResults = safeParseContent(assertionResp);
      if (assertionResults && assertionResults.passed === false) {
        passed = false;
      }
    }

    if (test.schema) {
      const { validateSchemaTool } = await import('./SchemaValidationTool.js');
      const schemaResp = await (validateSchemaTool.handler as any)({
        schema: test.schema,
        data: response.data,
      });
      schemaResults = safeParseContent(schemaResp);
      if (schemaResults && schemaResults.valid === false) {
        passed = false;
      }
    }

    results.push({
      id: test.id,
      name: test.name,
      description: test.description,
      request: {
        method: test.request.method,
        url: test.request.url,
      },
      expectedStatus,
      actualStatus: status,
      passed,
      durationMs,
      error: response?.error,
      assertions: assertionResults,
      schemaValidation: schemaResults,
    });
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ summary, results }, null, 2),
      },
    ],
  };
};

function safeParseContent(toolResult: any): any {
  try {
    const content = toolResult?.content?.[0]?.text;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}


