import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { Tool } from '../types.js';

export const analyzeCodebaseTool: Tool = {
  name: 'analyze_codebase',
  description: 'Analyze local source code to identify API endpoints (REST/SOAP) and UI components.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the codebase directory to analyze',
      },
    },
    required: ['path'],
  },
};

analyzeCodebaseTool.handler = async (args: any) => {
  const { path } = args;
  const endpoints: any[] = [];
  const uiComponents: any[] = [];

  function scanDirectory(dir: string) {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath);
      } else if (stat.isFile()) {
        const ext = extname(file);
        if (['.js', '.ts', '.java', '.py'].includes(ext)) {
          analyzeFile(filePath);
        }
      }
    }
  }

  function analyzeFile(filePath: string) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Simple pattern matching for REST endpoints
      const restPatterns: RegExp[] = [
        /@(?:Get|Post|Put|Delete)Mapping\(['"]([^'"]*)['"]/g, // Java Spring
        /router\.(get|post|put|delete)\(['"]([^'"]*)['"]/g, // Node.js Express
        /@app\.route\(['"]([^'"]*)['"]/g, // Flask Python
      ];

      for (const pattern of restPatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
          const m = match as RegExpExecArray;
          endpoints.push({
            type: 'REST',
            method: (m[1] as string) || 'GET',
            path: m[2] as string,
            file: filePath,
            line: lines.findIndex(line => line.includes(m[0] as string)) + 1,
          });
        }
      }

      // Simple UI component detection
      if (content.includes('React') || content.includes('Vue') || content.includes('Angular')) {
        const componentPatterns: RegExp[] = [
          /class\s+(\w+)\s+extends\s+React\.Component/g,
          /function\s+(\w+)\s*\(/g, // Simple function components
          /const\s+(\w+)\s*=\s*\(/g, // Arrow function components
        ];

        for (const pattern of componentPatterns) {
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(content)) !== null) {
            const m = match as RegExpExecArray;
            uiComponents.push({
              name: m[1] as string,
              file: filePath,
              line: lines.findIndex(line => line.includes(m[0] as string)) + 1,
            });
          }
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  scanDirectory(path);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ endpoints, uiComponents }, null, 2),
      },
    ],
  };
};