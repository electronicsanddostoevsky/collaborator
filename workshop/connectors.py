"""Tool adapters are separate from agents. Only locally approved fixed GET URLs."""
import json,re,zipfile,platform
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,build_opener,ProxyHandler,HTTPRedirectHandler
CONFIG=Path(__file__).resolve().parent/'.local-connectors.json'
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise ValueError('Redirects are disabled. Configure the final API URL.')
def configured():
    if not CONFIG.exists():return []
    return json.loads(CONFIG.read_text(encoding='utf-8'))
def register(data):
    identifier=data.get('id','');name=data.get('name','');url=data.get('url','')
    if not re.fullmatch(r'[a-z][a-z0-9-]{1,39}',identifier) or identifier in ('blender','unreal'):raise ValueError('Choose a distinct connector ID, e.g. weather-api.')
    if not isinstance(name,str) or not 2<=len(name)<=80:raise ValueError('Name the connection.')
    parsed=urlparse(url)
    if not parsed.hostname or parsed.username or parsed.password or parsed.fragment or len(url)>2000:raise ValueError('Use a URL without embedded credentials or fragments.')
    if parsed.scheme!='https' and not(parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1','::1')):raise ValueError('Use HTTPS, or HTTP for a local API.')
    token=data.get('token','')
    if not isinstance(token,str) or len(token)>4096 or '\n' in token or '\r' in token:raise ValueError('Invalid API token.')
    rows=configured()
    if len(rows)>=12:raise ValueError('The local pilot supports 12 API connections.')
    if any(r['id']==identifier for r in rows):raise ValueError('This connector ID already exists.')
    rows.append({'id':identifier,'name':name,'url':url,'token':token})
    temp=CONFIG.with_suffix('.tmp');temp.write_text(json.dumps(rows),encoding='utf-8');temp.replace(CONFIG)
def capabilities(blender_ready):
    return [{'id':'blender','name':'Blender','operation':'3D blockout','available':blender_ready,'requiresAgent':True,'reason':'' if blender_ready else 'Install Blender on this computer.'},
            {'id':'unreal','name':'Unreal Engine','operation':'Scene workflow','available':False,'requiresAgent':False,'reason':'Required for some missions; execution adapter is not connected yet.'}]+[
            {'id':r['id'],'name':r['name'],'operation':'Read API data','available':True,'requiresAgent':False,'reason':'Configured GET endpoint; access is checked when you run it.'} for r in configured()]
def execute_api(job,folder):
    config=next((r for r in configured() if r['id']==job['tool']),None)
    if not config:raise ValueError('The local API connection is unavailable.')
    headers={'Accept':'application/json'}
    if config.get('token'):headers['Authorization']='Bearer '+config['token']
    request=Request(config['url'],headers=headers,method='GET')
    with build_opener(ProxyHandler({}),NoRedirect()).open(request,timeout=30) as response:
        raw=response.read(1048577)
        if len(raw)>1048576:raise ValueError('API response exceeds 1 MB.')
        value=json.loads(raw)
    (folder/'result.json').write_text(json.dumps(value,indent=2),encoding='utf-8')
    with zipfile.ZipFile(folder/'artifact.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        bundle.write(folder/'result.json','result.json')
        bundle.writestr('job.json',json.dumps({**job,'status':'ready'}))
