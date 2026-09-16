#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';
try {
  const server = createServer(loadConfig());
  await server.connect(new StdioServerTransport());
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void server.close().finally(() => process.exit(0)); });
} catch {
  console.error('Unable to start Switch MCP server. Check SWITCH_* configuration and use Node.js 22.13 or newer.');
  process.exitCode = 1;
}
