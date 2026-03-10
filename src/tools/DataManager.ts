import faker from 'faker';
import { Tool } from '../types.js';

export const createTestDataTool: Tool = {
  name: 'create_test_data',
  description: 'Generate synthetic but realistic test data based on schema.',
  inputSchema: {
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'Schema defining the data structure',
        properties: {
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['string', 'number', 'email', 'date', 'boolean'] },
                length: { type: 'number' },
              },
            },
          },
          count: { type: 'number', default: 1 },
        },
      },
    },
    required: ['schema'],
  },
};

createTestDataTool.handler = async (args: any) => {
  const { schema } = args;
  const { fields, count = 1 } = schema;
  const data: any[] = [];

  for (let i = 0; i < count; i++) {
    const item: any = {};
    for (const field of fields) {
      switch (field.type) {
        case 'string':
          item[field.name] = faker.lorem.words(field.length || 3);
          break;
        case 'number':
          item[field.name] = faker.number.int({ min: 1, max: 100 });
          break;
        case 'email':
          item[field.name] = faker.internet.email();
          break;
        case 'date':
          item[field.name] = faker.date.recent().toISOString();
          break;
        case 'boolean':
          item[field.name] = faker.datatype.boolean();
          break;
      }
    }
    data.push(item);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
};