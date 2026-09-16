"""Regenerate endpoint metadata from Enfocus api_data.json (download separately).
Usage: python3 scripts/generate-catalog.py /path/to/api_data.json
No vendor prose or samples are copied into the generated catalog.
"""
import json, re, sys, hashlib
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]); docs=json.loads(source.read_text()); result=[]
for a in docs:
    name=a['name']; u=urlsplit(a['url']); helper=name.startswith('SwitchHelper'); method=a['type'].split()[0].upper()
    fields=[f for group in a.get('parameter',{}).get('fields',{}).values() for f in group]
    props={}; required=[]; locations={}
    def schema(f):
        typ=f.get('type','String'); key=f['field']
        if key=='visibility': return {'type':'boolean'}
        if typ=='Object[]' or typ=='Object':
            sub={}; req=[]
            for child in fields:
                if child['field'].startswith(key+'.'):
                    k=child['field'].split('.')[-1]; sub[k]=schema(child)
                    if not child['optional']: req.append(k)
            obj={'type':'object','properties':sub,'additionalProperties':not bool(sub)}
            if req: obj['required']=req
            return {'type':'array','items':obj} if typ=='Object[]' else obj
        if typ=='Array': return {'type':'array','items':{'type':'string'}}
        return {'type':{'Number':'number','Boolean':'boolean'}.get(typ,'string')}
    for f in fields:
        k=f['field']
        if '.' in k or k in ['filePath','fileContent']: continue
        props[k]=schema(f)
        if not f['optional']: required.append(k)
        locations[k]='path' if ':'+k in u.path else ('query' if method in ['GET','DELETE'] or (k=='lang' and not helper) or (name=='UnlockJob' and k=='check') else 'body')
    hints={
      'ids':'Comma-separated identifiers. Omit only when the operation should affect or return all applicable items.',
      'fields':'Comma-separated response field names; omitted means all available fields.',
      'lang':'Switch locale, for example enUS, deDE, or frFR.',
      'filter':'Saved filter ID or raw JSON filter string. Pass unescaped text; the client URL-encodes it once.',
      'query':'Switch filter expression encoded as a JSON string.',
      'sort':'Comma-separated sort keys; prefix a key with - for descending order.',
      'updated':'Existing job updated timestamp for optimistic concurrency. Omit to skip the relevance check.',
      'lastUpdated':'ISO timestamp; retrieve only newer job updates.',
      'metadata':'Switch metadata entries with id, name, and string value.',
      'connections':'Connection IDs to which the job should be routed.',
      'check':'true checks unlock permission without unlocking; false or omitted attempts to unlock.',
      'refresh':'true refreshes the Switch session; false only checks its status.',
      'period':'Relative time window such as 2d or 2h.',
      'timestamp':'ISO timestamp or a comma-separated start/end interval; either bound may be omitted.',
      'range':'Result index interval, such as 40,60; this is not a message ID interval.',
      'jobIds':'Comma-separated job IDs. Choose this or jobProcessingIds, never both.',
      'jobProcessingIds':'Comma-separated processing IDs. Choose this or jobIds, never both.',
      'acceptFileTypes':'Comma-separated extensions accepted by the Helper file chooser.',
      'submitId':'Switch Helper selection ID, reused across selection, submission, and progress calls.',
      'readonly':'Choose read-only or editable metadata; omit to return both.',
      'visibility':'Whether the saved job filter is visible to the user.',
      'data':'false tests for matching jobs without retrieving the job list.',
    }
    for k in props:
        if k in hints: props[k]['description']=hints[k]
    if name=='LoginQuery':
        required=[]
        props['password']['description']='Plaintext password; RSA encryption is performed locally. Prefer SWITCH_PASSWORD in the environment.'
        props['username']['description']='Defaults to SWITCH_USERNAME.'
    if helper:
        for k in ['token','swsUrl']:
            if k in props:
                required.remove(k)
                props[k]['description']='Defaults to the configured Switch session.'
    if name in ['SwitchHelperJobInEdit','SwitchHelperCancelEditJob']:
        props['jobId']={'type':'string','minLength':1};required.append('jobId');locations['jobId']='rawQuery'
    if name=='SwitchHelperDefaultApp': locations['extension']='rawQuery'
    if name=='AddAnnotations':
        props['annotations']={'oneOf':[props['annotations'],props['annotations']['items']]}
    if name=='GetMessagesList':
        for k in ['flow','type','module','element','prefix','job','message']:
            props[k]={'oneOf':[{'type':'string'},{'type':'array','items':{'type':'string'},'minItems':1}]}
    if name in ['PostJob','ReplaceJob']:
        props['files']={'type':'array','minItems':1,'items':{'type':'object','additionalProperties':False,'properties':{
          'localPath':{'type':'string','description':'Local file inside SWITCH_UPLOAD_ROOTS.'},
          'base64':{'type':'string','description':'Base64-encoded bytes, including empty string for an empty file.'},
          'filename':{'type':'string','minLength':1},
          'relativePath':{'type':'string','description':'Relative path within a folder job; required for every file when submitting multiple files.'},
          'mimeType':{'type':'string'}},'oneOf':[{'required':['localPath'],'not':{'required':['base64']}},{'required':['base64','filename'],'not':{'required':['localPath']}}]}}
        required.append('files'); locations['files']='multipart'
    if name=='dashboardGraphQL':
        props={'query':{'type':'string','minLength':1},'variables':{'type':'object','additionalProperties':True},'operationName':{'type':'string'}}
        required=['query'];locations={k:'body' for k in props}
    if name=='ReplaceJob':
        props['httpMethod']={'type':'string','enum':['PUT','POST'],'description':'PUT by default; POST is the documented alternative.'}
        locations['httpMethod']='local'
    if name=='GetThumbnails':
        extra={'oneOf':[{'required':['jobIds'],'not':{'required':['jobProcessingIds']}},{'required':['jobProcessingIds'],'not':{'required':['jobIds']}}]}
    else: extra={}
    for k in ['id','annotId','processingId','jobIds','jobProcessingIds']:
        if k in props: props[k]['minLength']=1
    schema_out={'type':'object','properties':props,'additionalProperties':False,**extra}
    if required: schema_out['required']=required
    snake=re.sub(r'([a-z0-9])([A-Z])',r'\1_\2',name).lower()
    tool='switch_'+('dashboard_graphql' if name=='dashboardGraphQL' else snake)
    readonly=method=='GET' and name not in ['LogoutQuery','Ping','SwitchHelperSelectJob']
    desc=re.sub(r'([a-z])([A-Z])',r'\1 \2',name)+'.'
    if name in ['DeleteJobFilter','DeleteMessageFilter']: desc+=' Omitting ids deletes ALL filters for the current user.'
    if name=='RemoveAnnotations': desc+=' Omitting annotId deletes ALL annotations in the flow.'
    if name=='PostClearMessages': desc+=' Clears the entire Switch message log.'
    if name in ['JobDownload','JobReportDownload']: desc+=' Returns a session-bound download URL, not file bytes.'
    if name=='SwitchHelperSelectJob': desc+=' Opens the native file chooser on the Helper machine.'
    result.append({'name':tool,'operation':name,'method':method,'path':u.path,'service':'helper' if helper else 'switch','fixedQuery':{k:v[0] for k,v in parse_qs(u.query).items()},'locations':locations,'inputSchema':schema_out,'description':desc,'annotations':{'readOnlyHint':readonly,'destructiveHint':not readonly,'idempotentHint':readonly,'openWorldHint':True}})
(root/'src/catalog.json').write_text(json.dumps(result,indent=2)+'\n')
manifest={'sources':['https://cdn.enfocus.com/manuals/DeveloperGuide/WebServices/24/api_data.json','https://cdn-www.enfocus.com/manuals/DeveloperGuide/WebServices/24.1-zip/SwitchWebServicesRESTAPIDocumentation.zip'],'apiDataSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'operations':[{k:e[k] for k in ['operation','name','method','service','path']} for e in result]}
(root/'docs/coverage.json').write_text(json.dumps(manifest,indent=2)+'\n')

lines=['# Tool reference','','Each tool corresponds to one documented operation. Full nested schemas are included below and in MCP discovery.','','| Tool | Service | HTTP request | Required arguments |','|---|---|---|---|']
for o in result:
    query='&'.join(k+'='+v for k,v in o['fixedQuery'].items())
    url=o['path']+('?' + query if query else '')
    required=', '.join('`'+k+'`' for k in o['inputSchema'].get('required',[])) or '—'
    lines.append(f"| `{o['name']}` | {o['service']} | `{o['method']} {url}` | {required} |")
lines+=['','Login and Helper session fields can use configuration defaults. The three Helper bare-query parameters are described in README.md. ReplaceJob also accepts the documented POST alias through httpMethod.','','## Argument schemas','']
for o in result:
    lines+=['### '+o['name'],'',o['description'],'','```json',json.dumps(o['inputSchema'],indent=2),'```','']
(root/'docs/TOOLS.md').write_text('\n'.join(lines))
