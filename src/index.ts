// Simple MCP Server implementation without SDK

import { analyzeCodebaseTool } from './tools/CodeAnalysisTool.js';
import { generateTestPlanTool } from './tools/TestPlanGenerator.js';
import { createTestDataTool } from './tools/DataManager.js';
import { manageStateTool } from './tools/StateManager.js';
import { executeRestTool } from './tools/RestTool.js';
import { executeSoapTool } from './tools/SoapTool.js';
import { executeUiTestTool } from './tools/UITool.js';
import { validateResultsTool } from './tools/ValidationTool.js';
import { exportResultsTool } from './tools/ReportingTool.js';
import { generateVisualSummaryTool } from './tools/VisualSummaryTool.js';
import { importOpenApiTool } from './tools/OpenApiTool.js';
import { generateRestTestsFromOpenApiTool, runRestTestSuiteTool } from './tools/RestTestSuiteTool.js';
import { importWsdlTool } from './tools/WsdlTool.js';
import { generateSoapTestsFromWsdlTool, runSoapTestSuiteTool } from './tools/SoapTestSuiteTool.js';
import { loadEnvironmentTool, setEnvVarTool, showEnvironmentTool } from './tools/EnvironmentTool.js';
import { extractToEnvTool } from './tools/ExtractionTool.js';
import { validateSchemaTool } from './tools/SchemaValidationTool.js';
import { assertResponseTool } from './tools/AssertionTool.js';
import { pollEndpointTool } from './tools/PollTool.js';
import { runDockerTool, stopDockerTool } from './tools/DockerTool.js';
import { connectDatabaseTool, queryDatabaseTool, closeDatabaseTool, getConnectionStatusTool } from './tools/DatabaseTool.js';
import { getSchemaInfoTool, getTableStructureTool, getTableRelationshipsTool, generateSelectQueryTool } from './tools/QueryGeneratorTool.js';
import { executeParallelQueriesTool, mergeQueryResultsTool, createCompositeTestDataTool } from './tools/ParallelQueryTool.js';

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  handler?: (args: any) => Promise<any>;
}

const tools: Tool[] = [
  analyzeCodebaseTool,
  generateTestPlanTool,
  createTestDataTool,
  manageStateTool,
  executeRestTool,
  executeSoapTool,
  executeUiTestTool,
  validateResultsTool,
  exportResultsTool,
  generateVisualSummaryTool,
  importOpenApiTool,
   generateRestTestsFromOpenApiTool,
   runRestTestSuiteTool,
   importWsdlTool,
   generateSoapTestsFromWsdlTool,
   runSoapTestSuiteTool,
   loadEnvironmentTool,
   setEnvVarTool,
   showEnvironmentTool,
   extractToEnvTool,
   validateSchemaTool,
   assertResponseTool,
  pollEndpointTool,
  runDockerTool,
  stopDockerTool,
   connectDatabaseTool,
   queryDatabaseTool,
   closeDatabaseTool,
   getConnectionStatusTool,
   getSchemaInfoTool,
   getTableStructureTool,
   getTableRelationshipsTool,
   generateSelectQueryTool,
   executeParallelQueriesTool,
   mergeQueryResultsTool,
   createCompositeTestDataTool,
];

function handleRequest(request: any): Promise<any> {
  if (request.method === 'initialize') {
    return Promise.resolve({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'testing-agent',
          version: '1.0.1',
        },
      },
    });
  } else if (request.method === 'tools/list') {
    return Promise.resolve({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
  } else if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;
    const tool = tools.find(t => t.name === name);
    if (tool && tool.handler) {
      return tool.handler(args).then(result => ({
        jsonrpc: '2.0',
        id: request.id,
        result,
      })).catch(error => ({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32000, message: error.message },
      }));
    } else {
      return Promise.resolve({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: 'Method not found' },
      });
    }
  }
  return Promise.resolve({
    jsonrpc: '2.0',
    id: request.id,
    error: { code: -32601, message: 'Method not found' },
  });
}

process.stdin.on('data', async (data) => {
  const requests = data.toString().trim().split('\n');
  for (const req of requests) {
    if (req) {
      try {
        const request = JSON.parse(req);
        const response = await handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (e) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        }) + '\n');
      }
    }
  }
});

console.error('Testing Agent MCP Server running on stdio');