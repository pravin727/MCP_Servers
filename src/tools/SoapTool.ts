import { SoapEngine, SoapRequest } from '../engines/SoapEngine.js';
import { Tool } from '../types.js';

export const executeSoapTool: Tool = {
  name: 'execute_soap',
  description: 'Execute SOAP requests with WSDL support.',
  inputSchema: {
    type: 'object',
    properties: {
      wsdl: { type: 'string' },
      method: { type: 'string' },
      args: { type: 'object' },
      options: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          headers: { type: 'object' },
        },
      },
    },
    required: ['wsdl', 'method', 'args'],
  },
};

executeSoapTool.handler = async (args: any) => {
  const request: SoapRequest = args;
  const result = await SoapEngine.execute(request);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};