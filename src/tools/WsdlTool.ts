import soap from 'soap';
import { Tool } from '../types.js';

export interface SoapOperation {
  service: string;
  port: string;
  method: string;
}

export const importWsdlTool: Tool = {
  name: 'import_wsdl',
  description: 'Import a WSDL document and list available SOAP operations.',
  inputSchema: {
    type: 'object',
    properties: {
      wsdlUrl: {
        type: 'string',
        description: 'URL or path to the WSDL document',
      },
    },
    required: ['wsdlUrl'],
  },
};

importWsdlTool.handler = async (args: any) => {
  const { wsdlUrl } = args;

  const client = await new Promise<any>((resolve, reject) => {
    soap.createClient(wsdlUrl, (err, client) => {
      if (err) {
        reject(err);
      } else {
        resolve(client);
      }
    });
  }).catch((err: any) => {
    return { __error: err.message || String(err) };
  });

  if (client.__error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: client.__error }, null, 2),
        },
      ],
    };
  }

  const description = client.describe();
  const operations: SoapOperation[] = [];

  for (const [serviceName, service] of Object.entries<any>(description)) {
    for (const [portName, port] of Object.entries<any>(service)) {
      for (const methodName of Object.keys(port as any)) {
        operations.push({
          service: serviceName,
          port: portName,
          method: methodName,
        });
      }
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

