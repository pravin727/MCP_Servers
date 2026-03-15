import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Tool } from '../types.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export const validateSchemaTool: Tool = {
  name: 'validate_schema',
  description:
    'Validate a JSON payload against a JSON Schema or an OpenAPI response schema. Returns detailed errors if any.',
  inputSchema: {
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'JSON Schema object to validate against',
      },
      data: {
        type: 'any',
        description: 'JSON payload to validate',
      },
    },
    required: ['schema', 'data'],
  },
};

validateSchemaTool.handler = async (args: any) => {
  const { schema, data } = args;

  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            valid,
            errors: validate.errors || [],
          },
          null,
          2,
        ),
      },
    ],
  };
};

