import { Tool } from '../types.js';
import { SoapEngine, SoapRequest } from '../engines/SoapEngine.js';

export interface SoapTestCase {
  id: string;
  name: string;
  description?: string;
  request: SoapRequest;
}

export const generateSoapTestsFromWsdlTool: Tool = {
  name: 'generate_soap_tests_from_wsdl',
  description: 'Generate basic SOAP test cases from imported WSDL operations.',
  inputSchema: {
    type: 'object',
    properties: {
      wsdl: {
        type: 'string',
        description: 'WSDL URL or path used for the operations',
      },
      operations: {
        type: 'array',
        description: 'Operations array returned by import_wsdl',
        items: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            port: { type: 'string' },
            method: { type: 'string' },
          },
        },
      },
    },
    required: ['wsdl', 'operations'],
  },
};

generateSoapTestsFromWsdlTool.handler = async (args: any) => {
  const { wsdl, operations } = args;

  const tests: SoapTestCase[] = (operations || []).map((op: any, index: number) => {
    const id = `${op.service}_${op.port}_${op.method}_${index}`;
    const name = `Test SOAP ${op.method}`;

    const request: SoapRequest = {
      wsdl,
      method: op.method,
      args: {}, // Placeholder; arguments can be customized by the caller/agent
    };

    return {
      id,
      name,
      description: `Service=${op.service}, Port=${op.port}, Method=${op.method}`,
      request,
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

export const runSoapTestSuiteTool: Tool = {
  name: 'run_soap_test_suite',
  description: 'Execute a suite of SOAP API test cases and return a summarized report.',
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
                wsdl: { type: 'string' },
                method: { type: 'string' },
                args: { type: 'object' },
                options: { type: 'object' },
              },
            },
          },
          required: ['id', 'name', 'request'],
        },
      },
    },
    required: ['tests'],
  },
};

runSoapTestSuiteTool.handler = async (args: any) => {
  const { tests } = args as { tests: SoapTestCase[] };

  const results: any[] = [];

  for (const test of tests) {
    const start = Date.now();
    const response = await SoapEngine.execute(test.request);
    const durationMs = Date.now() - start;

    const hasError = response && response.error;

    results.push({
      id: test.id,
      name: test.name,
      description: test.description,
      request: {
        wsdl: test.request.wsdl,
        method: test.request.method,
      },
      passed: !hasError,
      durationMs,
      error: hasError ? response.error : undefined,
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

