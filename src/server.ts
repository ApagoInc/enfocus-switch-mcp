import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { catalog, SwitchClient, SwitchError } from './client.js';
import type { Config } from './config.js';
export function createServer(config: Config) {
  const client = new SwitchClient(config);
  const server = new Server({name:'enfocus-switch-mcp', version:'1.0.0'}, {capabilities:{tools:{},resources:{}}});
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: catalog.map(({name,description,inputSchema,annotations}) => ({name,description,inputSchema,annotations})) }));
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    try {
      const result = await client.call(request.params.name, request.params.arguments ?? {}, extra.signal);
      return { content:[{type:'text', text:JSON.stringify(result.data)}], structuredContent:{status:result.status, data:result.data} };
    } catch (error) {
      const details = error instanceof SwitchError ? {message:error.message, status:error.status, details:error.details} : {message:'Local operation failed. Check configuration and file access.'};
      return {isError:true, content:[{type:'text', text:JSON.stringify(client.sanitize(details, true))}]};
    }
  });
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources:[{uri:'switch://api/operations',name:'Switch API operation catalog',mimeType:'application/json',description:'Complete endpoint mapping, input schemas, and mutation annotations.'}] }));
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    if (request.params.uri !== 'switch://api/operations') throw new McpError(ErrorCode.InvalidParams, 'Unknown resource.');
    return {contents:[{uri:request.params.uri,mimeType:'application/json',text:JSON.stringify(catalog)}]};
  });
  return server;
}
