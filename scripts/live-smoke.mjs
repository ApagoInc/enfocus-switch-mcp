// Opt-in live checks. Credentials are supplied only through the environment.
// Optional submissions require SWITCH_TEST_FLOW and SWITCH_TEST_SUBMIT_POINT.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

if (!process.env.SWITCH_USERNAME || process.env.SWITCH_PASSWORD === undefined) {
  throw new Error('Set SWITCH_USERNAME and SWITCH_PASSWORD for the live test.');
}
const report={timestamp:new Date().toISOString(),transport:'MCP stdio → live Switch HTTP',checks:[],submissions:[]};
const env=Object.fromEntries(Object.entries(process.env).filter(([,value])=>typeof value==='string'));
const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../dist/index.js',import.meta.url))],env,stderr:'pipe'});
const client=new Client({name:'switch-live-smoke',version:'1.0.0'});
let connected=false;
async function call(name,args={}, optional=false, summarize=()=>({})) {
  const result=await client.callTool({name,arguments:args},undefined,{timeout:150000});
  const data=result.structuredContent?.data ?? JSON.parse(result.content[0].text);
  if(result.isError) {
    // Avoid persisting potentially sensitive upstream payloads or download links.
    const accessDenied=/permission|authorized|forbidden|access denied/i.test(JSON.stringify(data));
    const entry={tool:name,result:data.status===404?'not-found-or-inaccessible':accessDenied?'permission-denied':'failed',httpStatus:data.status};
    report.checks.push(entry);
    if(!optional)throw new Error(`${name}: ${entry.result}`);
    return undefined;
  }
  report.checks.push({tool:name,result:'passed',...summarize(data)});
  return data;
}
try {
  await client.connect(transport);connected=true;
  const tools=await client.listTools();
  if(tools.tools.length!==46)throw new Error('Expected 46 MCP tools.');
  report.checks.push({operation:'tools/list',result:'passed',count:tools.tools.length});
  await call('switch_login_query');
  await call('switch_ping',{refresh:true});
  const flowName=process.env.SWITCH_TEST_FLOW;
  const flows=await call('switch_get_flows',{fields:'id,name,status'},false,data=>({count:data.length}));
  const points=await call('switch_get_submitpoints',{},false,data=>({count:data.length}));
  for(const name of ['switch_get_groups','switch_get_job_filter','switch_get_message_filter'])await call(name);
  await call('switch_get_messages_list',{limit:1,...(flowName?{flow:flowName}:{})});
  await call('switch_dashboard_graphql',{query:'{ jobs { count } }'},true);
  let ids=(process.env.SWITCH_TEST_JOB_IDS??'').split(',').filter(Boolean);
  if(process.env.SWITCH_LIVE_SUBMIT==='1') {
    const pointName=process.env.SWITCH_TEST_SUBMIT_POINT;
    if(!flowName||!pointName)throw new Error('Submission requires explicit SWITCH_TEST_FLOW and SWITCH_TEST_SUBMIT_POINT.');
    const matches=points.filter(p=>p.flowName===flowName&&p.name===pointName);
    if(matches.length!==1)throw new Error('Expected exactly one matching test submit point.');
    const point=matches[0];
    if(!flows.some(f=>String(f.id)===String(point.flowId)&&f.status==='running'))throw new Error('Test flow must already be running.');
    const metadata=JSON.parse(process.env.SWITCH_TEST_METADATA??'[]');
    if(!Array.isArray(metadata)||metadata.some(m=>!m||typeof m.id!=='string'||typeof m.name!=='string'||typeof m.value!=='string'))throw new Error('SWITCH_TEST_METADATA must be an array of {id,name,value} strings.');
    const missing=(point.metadata??[]).filter(m=>m.valueIsRequired&&!m.readOnly&&m.displayField!==false&&!metadata.some(v=>v.id===m.id&&v.value!==''));
    if(missing.length)throw new Error('Supply required submit metadata in SWITCH_TEST_METADATA: '+missing.map(m=>m.id).join(', '));
    const jobName=`mcp-live-smoke-${Date.now()}.txt`;
    const files=process.env.SWITCH_TEST_FILE?[{localPath:process.env.SWITCH_TEST_FILE}]:[{filename:jobName,base64:Buffer.from('Enfocus Switch MCP live smoke test.\n').toString('base64')}];
    const submitted=await call('switch_post_job',{flowId:String(point.flowId),objectId:String(point.objectId),jobName,files,...(metadata.length?{metadata}:{})});
    if(!submitted?.jobId)throw new Error('Submission did not return a job ID.');
    report.submissions.push({jobName,jobId:submitted.jobId,flowId:point.flowId,objectId:point.objectId});
    ids.push(submitted.jobId);
  }
  await call('switch_get_jobs',{limit:5,...(flowName?{filter:JSON.stringify({and:[{flow:{is:flowName}}]})}:{})},false,data=>({count:data.data?.length}));
  if(ids.length) {
    await call('switch_get_job_metadata',{ids:ids.join(',')});
    await call('switch_get_thumbnails',{jobIds:ids.join(',')},false,data=>({count:data.data?.length}));
    // The test flow may already have moved jobs out of downloadable checkpoints.
    for(const id of ids)await call('switch_job_download',{id},true,data=>({linkReturned:typeof data.data==='string'}));
  }
} catch(error) {
  report.failure=error.message;process.exitCode=1;
} finally {
  if(connected) {
    try {await call('switch_logout_query');} catch {report.checks.push({tool:'switch_logout_query',result:'failed'});process.exitCode=1;}
    await client.close();
  }
  const json=JSON.stringify(report,null,2)+'\n';
  if(process.env.SWITCH_LIVE_REPORT)await writeFile(process.env.SWITCH_LIVE_REPORT,json,{mode:0o600});
  console.log(json);
}
