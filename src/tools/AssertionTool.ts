import { Tool } from '../types.js';
import { JSONPath } from 'jsonpath-plus';

type Comparator =
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in';

export interface AssertionRule {
  kind: 'status' | 'duration' | 'jsonpath' | 'body_contains' | 'json_schema';
  comparator?: Comparator;
  expected?: any;
  path?: string; // for jsonpath
}

export const assertResponseTool: Tool = {
  name: 'assert_response',
  description:
    'Evaluate assertion rules (status, duration, JSONPath, bodyContains) against a REST/HTTP response object.',
  inputSchema: {
    type: 'object',
    properties: {
      response: {
        type: 'object',
        description: 'Response object returned by RestEngine (status, data, durationMs, etc.)',
      },
      rules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['status', 'duration', 'jsonpath', 'body_contains', 'json_schema'] },
            comparator: {
              type: 'string',
              enum: ['==', '!=', '>', '>=', '<', '<=', 'contains', 'not_contains', 'in', 'not_in'],
            },
            expected: { type: 'any' },
            path: { type: 'string' },
          },
          required: ['kind'],
        },
      },
    },
    required: ['response', 'rules'],
  },
};

assertResponseTool.handler = async (args: any) => {
  const { response, rules } = args as { response: any; rules: AssertionRule[] };

  const results: any[] = [];

  for (const rule of rules || []) {
    let actual: any = undefined;
    let passed = false;
    let reason = '';

    try {
      switch (rule.kind) {
        case 'status':
          actual = response.status ?? response.statusCode;
          passed = compare(actual, rule.comparator || '==', rule.expected);
          break;
        case 'duration':
          actual = response.durationMs;
          passed = compare(actual, rule.comparator || '<=', rule.expected);
          break;
        case 'jsonpath':
          if (!rule.path) throw new Error('jsonpath rule requires path');
          const matches = JSONPath({ path: rule.path, json: response.data ?? response.body });
          actual = matches;
          if (rule.comparator === 'contains' || rule.comparator === 'not_contains') {
            const contains = matches.some((m: any) => deepEquals(m, rule.expected));
            passed =
              rule.comparator === 'contains'
                ? contains
                : !contains;
          } else if (rule.comparator === 'in' || rule.comparator === 'not_in') {
            const list: any[] = Array.isArray(rule.expected) ? rule.expected : [];
            const found = list.some((v) => deepEquals(v, matches[0]));
            passed = rule.comparator === 'in' ? found : !found;
          } else {
            passed = compare(matches[0], rule.comparator || '==', rule.expected);
          }
          break;
        case 'body_contains':
          const text =
            typeof response.data === 'string'
              ? response.data
              : JSON.stringify(response.data ?? '');
          actual = text;
          passed = compare(text, rule.comparator || 'contains', rule.expected);
          break;
        case 'json_schema':
          // validate response body against JSON schema in expected
          actual = response.data ?? response.body;
          const Ajv = require('ajv');
          const ajv = new Ajv({ allErrors: true, strict: false });
          const validate = ajv.compile(rule.expected || {});
          passed = validate(actual);
          if (!passed) {
            reason = JSON.stringify(validate.errors, null, 2);
          }
          break;
      }
    } catch (e: any) {
      passed = false;
      reason = e.message || String(e);
    }

    results.push({
      rule,
      passed,
      actual,
      reason: passed ? undefined : reason || `Assertion failed`,
    });
  }

  const allPassed = results.every(r => r.passed);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ passed: allPassed, results }, null, 2),
      },
    ],
  };
};

function compare(actual: any, op: Comparator, expected: any): boolean {
  switch (op) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>':
      return Number(actual) > Number(expected);
    case '>=':
      return Number(actual) >= Number(expected);
    case '<':
      return Number(actual) < Number(expected);
    case '<=':
      return Number(actual) <= Number(expected);
    case 'contains':
      return String(actual).includes(String(expected));
    case 'not_contains':
      return !String(actual).includes(String(expected));
    default:
      return false;
  }
}

function deepEquals(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

