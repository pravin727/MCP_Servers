import { Tool } from '../types.js';
import { writeFileSync } from 'fs';
import { Workbook } from 'exceljs';

export const exportResultsTool: Tool = {
  name: 'export_results',
  description: 'Export test results in JSON, CSV, Excel, or HTML format.',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: 'Test result data',
      },
      format: {
        type: 'string',
        enum: ['json', 'csv', 'excel', 'html'],
      },
      filename: { type: 'string' },
    },
    required: ['data', 'format'],
  },
};

exportResultsTool.handler = async (args: any) => {
  const { data, format, filename = 'test_results' } = args;

  let output: string | Buffer;

  switch (format) {
    case 'json':
      output = JSON.stringify(data, null, 2);
      break;
    case 'csv':
      output = dataToCSV(data);
      break;
    case 'excel':
      output = await dataToExcel(data);
      break;
    case 'html':
      output = dataToHTML(data);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  // In real implementation, save to file or return as base64
  if (typeof output === 'string') {
    writeFileSync(`${filename}.${format}`, output);
  } else {
    writeFileSync(`${filename}.xlsx`, output);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Results exported to ${filename}.${format}`,
      },
    ],
  };
};

function dataToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(h => item[h]).join(','));
  return [headers.join(','), ...rows].join('\n');
}

async function dataToExcel(data: any[]): Promise<any> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Results');
  if (data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
    worksheet.addRows(data);
  }
  return await workbook.xlsx.writeBuffer();
}

function dataToHTML(data: any[]): string {
  if (data.length === 0) return '<html><body>No data</body></html>';
  const headers = Object.keys(data[0]);
  const rows = data.map(item =>
    '<tr>' + headers.map(h => `<td>${item[h]}</td>`).join('') + '</tr>'
  ).join('');
  return `
    <html>
    <head><title>Test Results</title></head>
    <body>
      <table border="1">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;
}