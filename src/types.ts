export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  // Make handler optional so tools can attach it after declaration
  handler?: (args: any) => Promise<any>;
}