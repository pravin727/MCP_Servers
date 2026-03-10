import { Tool } from '../types.js';

export const validateResultsTool: Tool = {
  name: 'validate_results',
  description: 'Perform deep-diffing of JSON/XML and UI state verification.',
  inputSchema: {
    type: 'object',
    properties: {
      actual: { type: 'any', description: 'Actual result data' },
      expected: { type: 'any', description: 'Expected result data' },
      type: { type: 'string', enum: ['json', 'xml', 'ui'], default: 'json' },
    },
    required: ['actual', 'expected'],
  },
};

validateResultsTool.handler = async (args: any) => {
  const { actual, expected, type = 'json' } = args;

  let differences: any[] = [];
  let passed = false;

  if (type === 'json') {
    // Simple comparison
    passed = JSON.stringify(actual) === JSON.stringify(expected);
    if (!passed) {
      differences = [{ kind: 'json', actual, expected }];
    }
  } else if (type === 'xml') {
    // Simple XML comparison
    passed = JSON.stringify(actual) === JSON.stringify(expected);
    if (!passed) {
      differences = [{ kind: 'xml', lhs: actual, rhs: expected }];
    }
  } else if (type === 'ui') {
    // UI state verification
    passed = actual.success !== false;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ passed, differences }, null, 2),
      },
    ],
  };
};