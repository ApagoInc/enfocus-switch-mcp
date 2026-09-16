import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPublicKey } from 'node:crypto';
import { SwitchClient, catalog, encryptPassword, PUBLIC_KEY } from '../dist/client.js';
import { loadConfig } from '../dist/config.js';

async function fixture(t, options={}) {
  const requests=[];
  let handler=()=>({status:200,data:{status:true}});
  const server=http.createServer(async (req,res)=>{
    const chunks=[];for await (const c of req) chunks.push(c);
    const data=Buffer.concat(chunks); const item={url:req.url,method:req.method,headers:req.headers,body:data.toString(),bytes:data};requests.push(item);
    const response=await handler(item);
    res.writeHead(response.status??200, {'Content-Type':'application/json',...response.headers});
    res.end(typeof response.data==='string'?response.data:JSON.stringify(response.data));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const url=`http://127.0.0.1:${server.address().port}`;
  const config={...loadConfig({SWITCH_TOKEN:'secret-token'}),baseUrl:url,helperUrl:url,...options};
  const client=new SwitchClient(config);
  return {client,config,requests,setHandler:fn=>{handler=fn;}};
}
const call=(f,operation,args={})=>f.client.call(catalog.find(o=>o.operation===operation).name,args);

test('all 46 operations produce their independently specified wire requests', async t=>{
  const f=await fixture(t);
  f.setHandler(r=>r.url.startsWith('/login')?{data:{success:true,token:'secret-token'}}:{data:{status:true}});
  const file={base64:'AAH/',filename:'job.pdf'};
  const cases=[
    ['LoginQuery',{username:'u',password:'p'},'POST','/login','json'],
    ['GetFlows',{ids:'1,2'},'GET','/api/v1/flows?ids=1%2C2'],
    ['AddAnnotations',{id:'1',annotations:[{type:'info',title:'t',description:'d',x:0,y:1}]},'POST','/api/v1/flows/1/annotations','array'],
    ['EditAnnotation',{id:'1',annotId:'2',annotation:{x:4}},'PUT','/api/v1/flows/1/annotations/2','annotation'],
    ['RemoveAnnotations',{id:'1',annotId:'2'},'DELETE','/api/v1/flows/1/annotations/2'],
    ['StartFlow',{id:'1'},'PUT','/api/v1/flows/1?action=start'],
    ['StopFlow',{id:'1'},'PUT','/api/v1/flows/1?action=stop'],
    ['GetJobMetadata',{ids:'1,2',readonly:false},'GET','/api/v1/job/metadata?ids=1%2C2&readonly=false'],
    ['JobDownload',{id:'j'},'GET','/api/v1/job/j'],
    ['JobReportDownload',{id:'j'},'GET','/api/v1/job/report/j'],
    ['LockJob',{id:'j'},'PUT','/api/v1/job/j?action=lock'],
    ['PostJob',{flowId:'1',objectId:'2',jobName:'job.pdf',files:[file]},'POST','/api/v1/job','multipart'],
    ['ReplaceJob',{id:'j',updated:'2026-09-16T00:00:00Z',files:[file]},'PUT','/api/v1/job/j?action=replace','multipart'],
    ['RouteJob',{id:'j',connections:['a','b'],updated:'2026-09-16T00:00:00Z'},'PUT','/api/v1/job/j?action=route','json'],
    ['UnlockJob',{id:'j',check:true},'PUT','/api/v1/job/j?action=unlock&check=true'],
    ['RushJob',{processingId:'p'},'PUT','/api/v1/processingjob/p?action=rush'],
    ['UnrushJob',{processingId:'p'},'PUT','/api/v1/processingjob/p?action=unrush'],
    ['AddJobFilter',{name:'n',query:'{}',visibility:false},'POST','/api/v1/jobFilters','json'],
    ['DeleteJobFilter',{ids:'1,2'},'DELETE','/api/v1/jobFilters?ids=1%2C2'],
    ['EditJobFilter',{id:'f',visibility:false},'PUT','/api/v1/jobFilters/f','json'],
    ['GetJobFilter',{includePredefined:false},'GET','/api/v1/jobFilters?includePredefined=false'],
    ['ShareJobFilter',{id:'f',users:['user'],groups:[]},'PUT','/api/v1/jobFilters/f?action=share','json'],
    ['UnshareJobFilter',{id:'f',groups:['g']},'PUT','/api/v1/jobFilters/f?action=unshare','json'],
    ['GetJobs',{limit:10,data:false,filter:'{"and":[]}'},'GET','/api/v1/jobs?limit=10&data=false&filter=%7B%22and%22%3A%5B%5D%7D'],
    ['dashboardGraphQL',{query:'query Q { flows { flows { name } } }',variables:{a:1},operationName:'Q'},'POST','/api/v1/graphql','json'],
    ['AddMessageFilter',{name:'n',query:'{}'},'POST','/api/v1/messageFilters','json'],
    ['DeleteMessageFilter',{ids:'f'},'DELETE','/api/v1/messageFilters?ids=f'],
    ['EditMessageFilter',{id:'f',name:'new'},'PUT','/api/v1/messageFilters/f','json'],
    ['GetMessageFilter',{fields:'ID,name'},'GET','/api/v1/messageFilters?fields=ID%2Cname'],
    ['GetMessagesList',{module:['foo','bar'],limit:20},'GET','/api/v1/messages?module=foo&module=bar&limit=20'],
    ['PostClearMessages',{lang:'enUS'},'POST','/api/v1/messages/clear?lang=enUS'],
    ['Ping',{refresh:false},'GET','/api/v1/ping?refresh=false'],
    ['GetSubmitpoints',{id:'1-2'},'GET','/api/v1/submitpoints/1-2'],
    ['SwitchHelperDefaultApp',{extension:'pdf'},'GET','/api/v1/defaultApp?pdf'],
    ['SwitchHelperPing',{},'GET','/api/v1/ping'],
    ['SwitchHelperCancelEditJob',{jobId:'j'},'POST','/api/v1/cancelEditJob?j'],
    ['SwitchHelperDeleteSelectJob',{submitId:1,path:'/a b'},'DELETE','/api/v1/selectJob?submitId=1&path=%2Fa+b'],
    ['SwitchHelperEditJob',{jobId:'j',jobName:'j.pdf'},'POST','/api/v1/editJob','helper'],
    ['SwitchHelperJobInEdit',{jobId:'j'},'GET','/api/v1/jobInEdit?j'],
    ['SwitchHelperReplaceJob',{jobId:'j'},'PUT','/api/v1/replaceJob','helper'],
    ['SwitchHelperSelectJob',{jobFolder:false,submitId:0},'GET','/api/v1/selectJob?jobFolder=false&submitId=0'],
    ['SwitchHelperSubmitJob',{submitId:1,flowId:'1',objectId:'2'},'POST','/api/v1/submitJob','helper'],
    ['SwitchHelperSubmitProgress',{submitId:1},'GET','/api/v1/progress?submitId=1'],
    ['GetThumbnails',{jobProcessingIds:'1,2'},'GET','/api/v1/thumbnails?jobProcessingIds=1%2C2'],
    ['GetGroups',{},'GET','/api/v1/userpermissions/groups'],
    ['LogoutQuery',{},'GET','/logout'],
  ];
  assert.deepEqual(cases.map(c=>c[0]).sort(),catalog.map(o=>o.operation).sort());
  for (const [op,args,method,url,kind] of cases) {
    await call(f,op,args);const r=f.requests.at(-1);
    assert.equal(r.method,method,op);assert.equal(r.url,url,op);
    assert.equal(r.headers.authorization, op.startsWith('SwitchHelper')||op==='LoginQuery'?undefined:'Bearer secret-token',op);
    if (kind==='array') assert.deepEqual(JSON.parse(r.body),args.annotations);
    else if(kind==='annotation') assert.deepEqual(JSON.parse(r.body),args.annotation);
    else if(kind==='multipart') {assert.match(r.headers['content-type'],/^multipart\/form-data; boundary=/);assert.match(r.body,/name="file\[0\]\[file\]"; filename="job.pdf"/);assert.ok(r.bytes.includes(Buffer.from([0,1,255])));}
    else if(kind==='json'||kind==='helper') {
      const b=JSON.parse(r.body);const expected={...args};delete expected.id;
      if(op==='LoginQuery') {assert.match(b.password,/^!@\$/);delete expected.password;delete b.password;}
      if(kind==='helper'){expected.token='secret-token';expected.swsUrl=f.config.baseUrl;}
      assert.deepEqual(b,expected,op);
    } else assert.equal(r.body,'',op);
  }
});

test('RSA key and encryption match Switch protocol',()=>{
  assert.equal(createPublicKey(PUBLIC_KEY).asymmetricKeyDetails.modulusLength,1024);
  const a=encryptPassword(''); const b=encryptPassword('');
  assert.notEqual(a,b);assert.equal(Buffer.from(a.slice(3),'base64').length,128);
  assert.throws(()=>encryptPassword('x'.repeat(118)),/117/);
});

test('lazy auth, serialized concurrent calls, secret redaction and logout',async t=>{
  const f=await fixture(t,{token:undefined,username:'u',password:'private-password'});
  f.setHandler(r=>r.url==='/login'?{data:{success:true,token:'new-token'}}:{data:{token:'new-token',message:'private-password new-token'}});
  const results=await Promise.all([call(f,'GetFlows'),call(f,'GetJobs')]);
  assert.equal(f.requests.filter(r=>r.url==='/login').length,1);
  assert.equal(f.requests[1].headers.authorization,'Bearer new-token');
  assert.ok(!JSON.stringify(results).includes('new-token'));
  assert.ok(!JSON.stringify(results).includes('private-password'));
  await call(f,'LogoutQuery');await call(f,'GetGroups');
  assert.equal(f.requests.filter(r=>r.url==='/login').length,2);
});

test('no replay on unauthorized mutation; next explicit call can reauthenticate',async t=>{
  const f=await fixture(t,{username:'u',password:'p'});
  f.setHandler(r=>r.url==='/login'?{data:{success:true,token:'fresh-token'}}:{status:401,data:{message:'secret-token expired'}});
  await assert.rejects(call(f,'RouteJob',{id:'j',connections:['a']}),e=>e.status===401&&!JSON.stringify(e.details).includes('secret-token'));
  assert.equal(f.requests.length,1);
  f.setHandler(r=>r.url==='/login'?{data:{success:true,token:'fresh-token'}}:{data:{status:true}});
  await call(f,'GetFlows');assert.equal(f.requests.length,3);
});

test('optional path segments, encoding, language placement, single annotation object',async t=>{
  const f=await fixture(t);
  await call(f,'GetSubmitpoints');assert.equal(f.requests.at(-1).url,'/api/v1/submitpoints');
  await call(f,'RemoveAnnotations',{id:'a/b?c',lang:'frFR'});assert.equal(f.requests.at(-1).url,'/api/v1/flows/a%2Fb%3Fc/annotations?lang=frFR');
  await call(f,'DeleteJobFilter');assert.equal(f.requests.at(-1).url,'/api/v1/jobFilters');
  await call(f,'AddAnnotations',{id:'f',lang:'deDE',annotations:{type:'info',title:'a',description:'b',x:0,y:1}});
  assert.equal(f.requests.at(-1).url,'/api/v1/flows/f/annotations?lang=deDE');assert.equal(JSON.parse(f.requests.at(-1).body).type,'info');
  await call(f,'SwitchHelperEditJob',{jobId:'a',jobName:'a.pdf',lang:'deDE'});
  assert.equal(JSON.parse(f.requests.at(-1).body).lang,'deDE');
});

test('validation rejects malformed arguments before network access',async t=>{
  const f=await fixture(t);
  for(const [op,args] of [['StartFlow',{}],['StartFlow',{id:'..'}],['GetFlows',{typo:1}],['GetJobs',{limit:'5'}],['GetThumbnails',{}],['GetThumbnails',{jobIds:'1',jobProcessingIds:'2'}],['RouteJob',{id:'j',connections:'a'}],['RouteJob',{id:'j',connections:['a'],metadata:[{id:'x'}]}],['PostJob',{flowId:'f',objectId:'o',jobName:'j',files:[{base64:'?',filename:'x'}]}]]) await assert.rejects(call(f,op,args),undefined,op);
  assert.equal(f.requests.length,0);
});

test('folder multipart metadata, local file allowlist and symlink escapes',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'switch-upload-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const outside=await mkdtemp(path.join(tmpdir(),'switch-outside-'));t.after(()=>rm(outside,{recursive:true,force:true}));
  await writeFile(path.join(dir,'a.txt'),'alpha');await writeFile(path.join(outside,'secret.txt'),'secret');
  await symlink(path.join(outside,'secret.txt'),path.join(dir,'escape'));
  const f=await fixture(t,{uploadRoots:[dir]});
  await call(f,'PostJob',{flowId:'f',objectId:'o',jobName:'folder',metadata:[{id:'i',name:'n',value:'v'}],files:[{localPath:path.join(dir,'a.txt'),relativePath:'folder/a.txt'},{base64:'',filename:'empty.txt',relativePath:'folder/empty.txt'}]});
  const req=f.requests.at(-1);const form=await new Response(req.bytes,{headers:{'Content-Type':req.headers['content-type']}}).formData();
  assert.equal(form.get('file[0][path]'),'folder/a.txt');assert.equal(await form.get('file[0][file]').text(),'alpha');assert.deepEqual(JSON.parse(form.get('metadata')),[{id:'i',name:'n',value:'v'}]);
  for(const files of [[{localPath:path.join(dir,'escape')}],[{base64:'YQ==',filename:'a',relativePath:'../x'}],[{base64:'YQ==',filename:'a'},{base64:'Yg==',filename:'b'}]])
    await assert.rejects(call(f,'ReplaceJob',{id:'j',files}));
  assert.equal(f.requests.length,1);
});

test('upload size, response size, timeout, cancellation, redirects, application errors',async t=>{
  const f=await fixture(t,{maxUploadBytes:2,maxResponseBytes:100,timeoutMs:30});
  await assert.rejects(call(f,'ReplaceJob',{id:'j',files:[{base64:'YWJj',filename:'a'}]}),/exceeds/);
  f.setHandler(()=>({data:'x'.repeat(101)}));await assert.rejects(call(f,'GetFlows'),/Response exceeds/);
  for(const data of [{status:false,error:'failed'},{success:false},{status:'error'},{errors:[{message:'GraphQL failed'}]}]) {
    f.setHandler(()=>({data}));await assert.rejects(call(f,'GetFlows'),/failed/);
  }
  f.setHandler(()=>({status:302,headers:{Location:f.config.baseUrl+'/target'},data:''}));await assert.rejects(call(f,'GetFlows'),/network request failed/);
  const before=f.requests.length;assert.ok(!f.requests.some(r=>r.url==='/target'));
  const controller=new AbortController();controller.abort();await assert.rejects(f.client.call('switch_get_flows',{},controller.signal));assert.equal(f.requests.length,before);
  f.setHandler(async()=>{await new Promise(r=>setTimeout(r,100));return {data:{ok:true}};});await assert.rejects(call(f,'GetFlows'),/timed out/);
});

test('download links and plain Helper responses are preserved',async t=>{
  const f=await fixture(t);f.setHandler(()=>({data:{status:true,data:'https://switch.example/job/session-link'}}));
  assert.equal((await call(f,'JobDownload',{id:'j'})).data.data,'https://switch.example/job/session-link');
  f.setHandler(()=>({data:'Preview.app'}));assert.equal((await call(f,'SwitchHelperDefaultApp',{extension:'pdf'})).data,'Preview.app');
});

test('configuration rejects unsafe URLs and invalid limits',()=>{
  for(const env of [{SWITCH_BASE_URL:'file:///tmp/a'},{SWITCH_BASE_URL:'http://u:p@localhost'},{SWITCH_TIMEOUT_MS:'0'},{SWITCH_MAX_UPLOAD_BYTES:'NaN'}]) assert.throws(()=>loadConfig(env));
  assert.deepEqual(loadConfig({}).uploadRoots,[]);
});

test('replacement POST alias, multipart content length, and no retry after failed login',async t=>{
  const f=await fixture(t);
  await call(f,'ReplaceJob',{id:'j',httpMethod:'POST',files:[{base64:'YQ==',filename:'a.txt'}]});
  assert.equal(f.requests[0].method,'POST');assert.equal(Number(f.requests[0].headers['content-length']),f.requests[0].bytes.length);
  assert.ok(!f.requests[0].body.includes('httpMethod'));
  const unauth=await fixture(t,{token:undefined,username:'u',password:''});
  unauth.setHandler(()=>({status:403,data:{success:false,message:'not authorized'}}));
  await assert.rejects(call(unauth,'GetFlows'),e=>e.status===403);
  assert.equal(unauth.requests.length,1);assert.equal(unauth.requests[0].url,'/login');
});

test('Helper negative edit-state is data; short passwords do not corrupt successful payloads',async t=>{
  const f=await fixture(t,{password:'p'});
  f.setHandler(()=>({data:{status:false}}));
  assert.deepEqual((await call(f,'SwitchHelperJobInEdit',{jobId:'j'})).data,{status:false});
  f.setHandler(()=>({data:{status:false,error:'failed'}}));
  await assert.rejects(call(f,'SwitchHelperJobInEdit',{jobId:'j'}));
  f.setHandler(()=>({data:{status:true,data:'http://example/job/report.pdf'}}));
  assert.equal((await call(f,'JobDownload',{id:'j'})).data.data,'http://example/job/report.pdf');
});
