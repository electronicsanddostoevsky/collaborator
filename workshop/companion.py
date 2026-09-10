"""Loopback-only local workshop. Python 3.10+, Blender 4+, local Ollama."""
import json, os, secrets, shutil, socket, subprocess, threading, time, uuid, zipfile
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer as BaseThreadingHTTPServer
from urllib.request import Request, urlopen, ProxyHandler, build_opener
from urllib.parse import urlparse
from scene import validate
from connectors import capabilities,register,execute_api
from planner import generate as generate_plan

ROOT=Path(__file__).resolve().parent
RUNS=ROOT/'runs'; RUNS.mkdir(exist_ok=True)
ORIGIN='https://make-exist-collaborator.kals19.chatgpt.site'
TOKEN=secrets.token_urlsafe(24)
LOCK=threading.Lock(); ACTIVE=None; CANCEL=threading.Event(); PROCESS=None; STOPPING=False
HTTP=build_opener(ProxyHandler({}))

class ThreadingHTTPServer(BaseThreadingHTTPServer):
    # Windows SO_REUSEADDR permits a competing listener; reserve this endpoint.
    allow_reuse_address = os.name != 'nt'
    def server_bind(self):
        if os.name == 'nt':
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

def ollama(path, data=None, timeout=4):
    request=Request('http://127.0.0.1:11434'+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
    with HTTP.open(request,timeout=timeout) as response:
        raw=response.read(262145)
        if len(raw)>262144: raise ValueError('Model response is too large.')
        return json.loads(raw)

def blender():
    candidate=os.environ.get('BLENDER_PATH') or shutil.which('blender')
    if candidate and Path(candidate).is_file(): return str(Path(candidate).resolve())
    for path in ('/Applications/Blender.app/Contents/MacOS/Blender','/usr/bin/blender','/snap/bin/blender'):
        if Path(path).is_file():return path
    found=sorted(Path('C:/Program Files/Blender Foundation').glob('Blender */blender.exe'),reverse=True)
    return str(found[0]) if found else None

def save(job):
    folder=RUNS/job['id'];folder.mkdir(exist_ok=True)
    temp=folder/'job.tmp';temp.write_text(json.dumps(job),encoding='utf-8');temp.replace(folder/'job.json')

def history():
    result=[]
    for path in sorted(RUNS.glob('*/job.json'),key=lambda p:p.stat().st_mtime,reverse=True)[:30]:
        try: result.append(json.loads(path.read_text(encoding='utf-8')))
        except (ValueError,OSError): pass
    return result

def execute(job):
    global ACTIVE,PROCESS
    folder=RUNS/job['id']; start=time.monotonic()
    try:
        if job.get('tool')=='mission-planner':
            job['status']='planning';save(job)
            plan=generate_plan(job,ollama)
            if CANCEL.is_set():raise InterruptedError()
            (folder/'result.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
            job['status']='ready';job['elapsed']=round(time.monotonic()-start);save(job)
            return
        if job.get('tool','blender')!='blender':
            job['status']='running';save(job)
            execute_api(job,folder)
            job['status']='stopped' if CANCEL.is_set() else 'ready';job['elapsed']=round(time.monotonic()-start);save(job)
            return
        job['status']='planning';save(job)
        prior=''
        if job.get('parent'):
            prior=' Previous scene: '+(RUNS/job['parent']/'scene.json').read_text(encoding='utf-8')
        instruction='Create a coherent Blender blockout. Return ONLY JSON with one objects array (1 to 48; prefer 8-16). Every object has name, shape (cube/sphere/cylinder/cone/torus), position [x,y,z] in -20..20, rotation [degrees x,y,z], scale [x,y,z] in 0.05..10, color [r,g,b] in 0..1. Coordinates: X left/right, Y forward/backward, Z UP. Every default cube is 2 units wide on ALL axes; scale means HALF extents for cubes, not dimensions. Default cylinders have radius 1 and length 2 ALONG LOCAL Z: wheel across X uses rotation [0,90,0] and scale [radius,radius,halfThickness]. Pole along Y uses rotation [90,0,0] and scale [radius,radius,halfLength]. Torus lies in local XY; rotate [0,90,0] for wheels across X. A horizontal platform uses small Z scale and nonzero Z position. Ground is Z=0. Keep all parts connected and wheels below the platform. Do not treat Y as up. No code, paths, lights or camera fields. Preserve previous scene coordinates and unchanged objects when revising. Return the complete scene, not a patch.'
        response=ollama('/api/chat',{'model':job['model'],'stream':False,'think':False,'format':'json','keep_alive':0,'options':{'num_predict':4096,'num_ctx':8192,'temperature':0.2},'messages':[{'role':'system','content':instruction},{'role':'user','content':job['prompt']+prior}]},timeout=240)
        if CANCEL.is_set(): raise InterruptedError()
        plan=validate(json.loads(response['message']['content']))
        (folder/'scene.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
        job['status']='rendering';save(job)
        with (folder/'render.log').open('w',encoding='utf-8') as log:
            PROCESS=subprocess.Popen([blender(),'--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',str(ROOT/'scene.py'),'--',str(folder)],stdout=log,stderr=subprocess.STDOUT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            while PROCESS.poll() is None:
                if CANCEL.is_set() or time.monotonic()-start>480:
                    PROCESS.kill();PROCESS.wait();raise InterruptedError()
                time.sleep(0.2)
            if PROCESS.returncode: raise ValueError('Blender could not render this scene. See the local render.log.')
        if CANCEL.is_set(): raise InterruptedError()
        job['elapsed']=round(time.monotonic()-start)
        with zipfile.ZipFile(folder/'artifact.zip','w',zipfile.ZIP_DEFLATED) as bundle:
            for name in ('artifact.blend','artifact.glb','preview.png','scene.json'): bundle.write(folder/name,name)
            bundle.writestr('job.json',json.dumps({**job,'status':'ready'}))
        job['status']='ready';save(job)
    except InterruptedError:
        job['status']='stopped';job['error']='Stopped or reached the eight-minute execution limit.';save(job)
    except Exception as e:
        job['status']='failed';job['error']=str(e)[:300];save(job)
    finally:
        with LOCK: ACTIVE=None;PROCESS=None

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def headers_ok(self):
        return self.headers.get('Host')=='127.0.0.1:8765' and self.headers.get('Origin')==ORIGIN
    def respond(self,value,status=200,kind='application/json'):
        data=json.dumps(value).encode() if kind=='application/json' else value
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin',ORIGIN);self.send_header('Vary','Origin')
        self.send_header('Access-Control-Allow-Private-Network','true')
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_OPTIONS(self):
        if not self.headers_ok(): return self.respond({'error':'Origin not allowed'},403)
        self.send_response(204);self.send_header('Access-Control-Allow-Origin',ORIGIN)
        self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type')
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Private-Network','true');self.end_headers()
    def authorized(self):
        if not self.headers_ok() or not secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+TOKEN):
            self.respond({'error':'Reconnect with the current pairing code.'},403);return False
        return True
    def do_GET(self):
        if not self.authorized(): return
        if self.path=='/status':
            try: models=[m['name'] for m in ollama('/api/tags').get('models',[]) if not m.get('remote_host')];problem=''
            except Exception: models=[];problem='Start Ollama and install a local model.'
            return self.respond({'version':3,'taskContext':True,'blender':bool(blender()),'models':models,'problem':problem,'tools':capabilities(bool(blender())),'jobs':history(),'active':ACTIVE})
        bits=self.path.split('/')
        if len(bits)==4 and bits[1]=='files' and bits[3] in ('preview.png','artifact.zip','result.json'):
            try: identifier=str(uuid.UUID(bits[2]))
            except ValueError: return self.respond({'error':'Invalid run'},400)
            path=RUNS/identifier/bits[3]
            if path.is_file() and path.stat().st_size<=10*1024*1024:
                return self.respond(path.read_bytes(),kind='image/png' if bits[3].endswith('png') else 'application/zip' if bits[3].endswith('zip') else 'text/plain')
        return self.respond({'error':'File unavailable or over the 10 MB pilot limit.'},404)
    def do_POST(self):
        global ACTIVE
        if not self.authorized(): return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=8192: raise ValueError('Request is too large.')
            d=json.loads(self.rfile.read(length))
            if self.path=='/connectors':
                with LOCK:register(d)
                return self.respond({'saved':True},201)
            if self.path=='/cancel':
                with LOCK:
                    if d.get('id')!=ACTIVE or not ACTIVE:return self.respond({'error':'This run is no longer active.'},409)
                    CANCEL.set()
                return self.respond({'stopping':True})
            if self.path!='/run': return self.respond({'error':'Unknown operation'},404)
            if not isinstance(d.get('prompt'),str) or not 10<=len(d['prompt'])<=3000: raise ValueError('Describe your artifact in 10–3000 characters.')
            tool=d.get('tool','blender');mission=d.get('mission','mahabharata')
            context={}
            if d.get('taskId'):
                task_id=str(uuid.UUID(d['taskId']));revision=d.get('taskRevision');head=d.get('inputHead')
                if type(revision)!=int or revision<1 or not isinstance(head,str) or len(head)!=40 or any(c not in '0123456789abcdef' for c in head):raise ValueError('Invalid task context.')
                context={'taskId':task_id,'taskRevision':revision,'inputHead':head}
            elif d.get('taskRevision') is not None or d.get('inputHead') is not None:raise ValueError('Task context requires a task ID.')
            if not isinstance(mission,str) or not 1<=len(mission)<=80 or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in mission):raise ValueError('Invalid mission.')
            capability=next((c for c in capabilities(bool(blender())) if c['id']==tool),None)
            if not capability or not capability['available']:raise ValueError('This tool has no available operation on this computer.')
            if capability['requiresAgent']:
                models=[m['name'] for m in ollama('/api/tags').get('models',[]) if not m.get('remote_host')]
                if d.get('model') not in models: raise ValueError('Choose an installed local model.')
                details=ollama('/api/show',{'model':d['model']})
                if details.get('remote_model') or details.get('remote_host') or not details.get('model_info'):
                    raise ValueError('Choose a downloaded local model, not a cloud model.')
            else:d['model']='No agent — fixed API request'
            parent=d.get('parent') or None
            if parent:
                parent=str(uuid.UUID(parent))
                if not (RUNS/parent/'scene.json').is_file(): raise ValueError('Previous scene unavailable.')
                parent_job=json.loads((RUNS/parent/'job.json').read_text())
                if parent_job.get('taskId')!=context.get('taskId'):raise ValueError('Choose a parent from the same task.')
                if parent_job.get('mission','mahabharata')!=mission or parent_job.get('tool','blender')!=tool:raise ValueError('Choose a parent from the same mission and tool.')
            with LOCK:
                identifier=str(uuid.UUID(d['id']))
                if (RUNS/identifier/'job.json').is_file():
                    existing=json.loads((RUNS/identifier/'job.json').read_text())
                    if any(existing.get(k)!=context.get(k) for k in ('taskId','taskRevision','inputHead')):return self.respond({'error':'Run ID belongs to different task inputs.'},409)
                    if any(existing.get(k)!=v for k,v in [('prompt',d['prompt']),('model',d['model']),('parent',parent)]) or existing.get('mission','mahabharata')!=mission or existing.get('tool','blender')!=tool:return self.respond({'error':'Run ID belongs to a different request.'},409)
                    return self.respond(existing)
                if STOPPING:return self.respond({'error':'Workshop is stopping. Start it again before requesting work.'},409)
                if ACTIVE: return self.respond({'error':'A job is already running.'},409)
                if len(list(RUNS.glob('*/job.json')))>=100: raise ValueError('The local pilot has 100 retained runs. Archive old runs before continuing.')
                job={'id':identifier,'prompt':d['prompt'],'model':d['model'],'parent':parent,'status':'queued','created':time.time(),'mission':mission,'tool':tool,**context}
                ACTIVE=job['id'];CANCEL.clear();save(job)
                threading.Thread(target=execute,args=(job,),daemon=True).start()
            return self.respond(job,201)
        except Exception as e: return self.respond({'error':str(e)[:300]},400)

if __name__=='__main__':
    for job in history():
        if job['status'] in ('queued','planning','rendering','running'):
            job['status']='stopped';job['error']='Workshop restarted; this run was interrupted.';save(job)
    print('Collaborator local workshop\nPairing code: '+TOKEN+'\nKeep this window open. Stop with Ctrl+C.\nBlender: '+('found' if blender() else 'not found'),flush=True)
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
