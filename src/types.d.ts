declare module 'faker' {
  const faker: any;
  export default faker;
}


// Relax Tool typing inside tool modules to avoid TS complaining
declare module './types.js' {
  export interface Tool {
    name: string;
    description: string;
    inputSchema: any;
    // Allow handler to be assigned later
    handler?: (args: any) => Promise<any>;
  }
}

