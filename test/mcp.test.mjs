import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('MCP stdio: initialization, 46 tool schemas, resource discovery, success and errors',async t=>{
  const requests=[];
  const mock=http.createServer(async(req,res)=>{
    requests.push({url:req.url,auth:req.headers.authorization});
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/v1/flows')res.end(JSON.stringify([{id:'f',name:'Production'}]));
    else {res.statusCode=403;res.end(JSON.stringify({message:'Denied Bearer test-token'}));}
  });
  await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
  t.after(()=>{mock.closeAllConnections();return new Promise(resolve=>mock.close(resolve));});
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../dist/index.js',import.meta.url))],env:{SWITCH_BASE_URL:`http://127.0.0.1:${mock.address().port}`,SWITCH_TOKEN:'test-token'},stderr:'pipe'});
  let stderr='';transport.stderr?.on('data',chunk=>stderr+=chunk);
  const client=new Client({name:'integration-test',version:'1.0.0'});
  t.after(()=>client.close());await client.connect(transport);
  const {tools}=await client.listTools();assert.equal(tools.length,46);
  assert.equal(tools.find(t=>t.name==='switch_get_flows').annotations.readOnlyHint,true);
  assert.equal(tools.find(t=>t.name==='switch_post_clear_messages').annotations.destructiveHint,true);
  const listed=await client.listResources();assert.equal(listed.resources[0].uri,'switch://api/operations');
  const resource=await client.readResource({uri:'switch://api/operations'});assert.equal(JSON.parse(resource.contents[0].text).length,46);
  const success=await client.callTool({name:'switch_get_flows',arguments:{}});
  assert.deepEqual(JSON.parse(success.content[0].text),[{id:'f',name:'Production'}]);
  assert.deepEqual(success.structuredContent,{status:200,data:[{id:'f',name:'Production'}]});
  assert.equal(requests[0].auth,'Bearer test-token');
  const invalid=await client.callTool({name:'switch_start_flow',arguments:{}});assert.equal(invalid.isError,true);assert.equal(requests.length,1);
  const denied=await client.callTool({name:'switch_stop_flow',arguments:{id:'f'}});assert.equal(denied.isError,true);assert.ok(!JSON.stringify(denied).includes('test-token'));
  const unknown=await client.callTool({name:'does_not_exist',arguments:{}});assert.equal(unknown.isError,true);
  await assert.rejects(client.readResource({uri:'switch://missing'}));
  assert.equal(stderr,'');
});
