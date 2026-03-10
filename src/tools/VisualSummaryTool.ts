import { Tool } from '../types.js';

export const generateVisualSummaryTool: Tool = {
  name: 'generate_visual_summary',
  description: 'Generate chart configuration data for pass/fail rates and latency.',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: 'Test result data with pass/fail and latency',
      },
      chartType: {
        type: 'string',
        enum: ['bar', 'pie', 'line'],
        default: 'bar',
      },
    },
    required: ['data'],
  },
};

generateVisualSummaryTool.handler = async (args: any) => {
  const { data, chartType = 'bar' } = args;

  const passCount = data.filter((d: any) => d.passed).length;
  const failCount = data.length - passCount;
  const latencies = data.map((d: any) => d.latency || 0);

  const chartConfig = {
    type: chartType,
    data: {
      labels: chartType === 'pie' ? ['Passed', 'Failed'] : data.map((_: any, i: number) => `Test ${i + 1}`),
      datasets: [{
        label: chartType === 'pie' ? 'Results' : 'Latency (ms)',
        data: chartType === 'pie' ? [passCount, failCount] : latencies,
        backgroundColor: chartType === 'pie' ? ['green', 'red'] : 'blue',
      }],
    },
    options: {
      responsive: true,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(chartConfig, null, 2),
      },
    ],
  };
};