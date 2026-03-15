import { Tool } from '../types.js';
import { runInContainer, stopContainer } from '../utils/DockerHelper.js';

// NOTE: this file provides simple orchestration helpers. The actual helper
// functions could use the docker CLI or a library; here we stub minimal
// behavior.

export const runDockerTool: Tool = {
  name: 'run_docker_container',
  description: 'Start a Docker container with specified image, ports and env vars.',
  inputSchema: {
    type: 'object',
    properties: {
      image: { type: 'string' },
      ports: {
        type: 'array',
        items: { type: 'string' },
        description: 'Port mappings like "8080:80"',
      },
      env_vars: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
    required: ['image'],
  },
};

runDockerTool.handler = async (args: any) => {
  const { image, ports, env_vars } = args;
  // these helpers are placeholders; they could shell out to `docker run`.
  const id = await runInContainer(image, ports || [], env_vars || {});
  return {
    content: [
      { type: 'text', text: JSON.stringify({ containerId: id }, null, 2) },
    ],
  };
};

export const stopDockerTool: Tool = {
  name: 'stop_docker_container',
  description: 'Stop and remove a previously started Docker container.',
  inputSchema: {
    type: 'object',
    properties: {
      containerId: { type: 'string' },
    },
    required: ['containerId'],
  },
};

stopDockerTool.handler = async (args: any) => {
  const { containerId } = args;
  await stopContainer(containerId);
  return {
    content: [
      { type: 'text', text: `container ${containerId} stopped` },
    ],
  };
};
