import { UIEngine, UITestScript } from '../engines/UIEngine.js';
import { Tool } from '../types.js';
import { renderTemplate } from '../utils/Template.js';

export const executeUiTestTool: Tool = {
  name: 'execute_ui_test',
  description: 'Execute UI tests using Playwright with browser automation.',
  inputSchema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['goto', 'click', 'type', 'waitForSelector', 'screenshot', 'download'] },
            selector: { type: 'string' },
            value: { type: 'string' },
            url: { type: 'string' },
            timeout: { type: 'number' },
            path: { type: 'string', description: 'optional file path for download action' },
          },
        },
      },
      headless: { type: 'boolean', default: true },
    },
    required: ['steps'],
  },
};

executeUiTestTool.handler = async (args: any) => {
  const script: UITestScript = renderTemplate(args);
  const result = await UIEngine.execute(script);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};