import soap from 'soap';

export interface SoapRequest {
  wsdl: string;
  method: string;
  args: any;
  options?: {
    endpoint?: string;
    headers?: Record<string, string>;
  };
}

export class SoapEngine {
  static async execute(request: SoapRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      soap.createClient(request.wsdl, (err, client) => {
        if (err) {
          resolve({ error: err.message });
          return;
        }

        if (request.options?.endpoint) {
          client.setEndpoint(request.options.endpoint);
        }

        if (request.options?.headers) {
          client.addSoapHeader(request.options.headers);
        }

        client[request.method](request.args, (err: any, result: any) => {
          if (err) {
            resolve({ error: err.message, details: err });
          } else {
            resolve(result);
          }
        });
      });
    });
  }
}