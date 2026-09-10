import sys, unittest, tempfile, json, threading
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'workshop'))
from scene import validate
import companion
from unittest.mock import patch
import uuid
import connectors
from inputs import validate_snapshot,reference_excerpt
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer

class WorkshopTests(unittest.TestCase):
    def test_data_only_snapshot(self):
        snapshot={'head':'a'*40,'files':{'mission.json':'A community game','../../danger.py':'Never execute this data','lore.md':'x'*60000}}
        self.assertEqual(json.loads(validate_snapshot(snapshot,'a'*40)),snapshot)
        self.assertLess(len(reference_excerpt(snapshot)),6500)
        with self.assertRaises(ValueError):validate_snapshot(snapshot,'b'*40)
        with self.assertRaises(ValueError):validate_snapshot({'head':'a'*40,'files':{'mission.json':'x'*65537}},'a'*40)
        with self.assertRaises(ValueError):validate_snapshot({'head':'a'*40,'files':{'mission.json':[]}},'a'*40)
    def test_planning_returns_data_without_running_project_tools(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(companion,'RUNS',Path(directory)), patch.object(companion,'generate_plan',return_value={'summary':'A bounded proposal','tasks':[]}), patch.object(companion,'execute_api') as api, patch.object(companion.subprocess,'Popen') as process:
            companion.CANCEL.clear()
            job={'id':str(uuid.uuid4()),'mission':'mahabharata','tool':'mission-planner','model':'test','prompt':'Plan a small milestone','status':'queued','created':1}
            companion.save(job);companion.execute(job)
            self.assertEqual(job['status'],'ready')
            self.assertTrue((Path(directory)/job['id']/'result.json').is_file())
            api.assert_not_called();process.assert_not_called()
            companion.CANCEL.set()
            job={**job,'id':str(uuid.uuid4()),'status':'queued'}
            companion.save(job);companion.execute(job)
            self.assertEqual(job['status'],'stopped')
            self.assertFalse((Path(directory)/job['id']/'result.json').exists())
            companion.CANCEL.clear()
    def test_generic_api_connector(self):
        class Api(BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def do_GET(self):
                if self.path=='/redirect':
                    self.send_response(302);self.send_header('Location','/data');self.end_headers();return
                self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"volunteers":12,"bags":40}')
        server=ThreadingHTTPServer(('127.0.0.1',0),Api);threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with tempfile.TemporaryDirectory() as directory,patch.object(connectors,'CONFIG',Path(directory)/'connections.json'):
                config={'id':'cleanup-api','name':'Cleanup inventory','url':'http://127.0.0.1:'+str(server.server_port)+'/data','token':'local-test-secret'}
                connectors.register(config)
                self.assertNotIn('local-test-secret',json.dumps(connectors.capabilities(False)))
                self.assertFalse(connectors.capabilities(False)[-1]['requiresAgent'])
                folder=Path(directory)/'run';folder.mkdir();connectors.execute_api({'tool':'cleanup-api'},folder)
                self.assertEqual(json.loads((folder/'result.json').read_text())['volunteers'],12)
                self.assertTrue((folder/'artifact.zip').is_file())
                with self.assertRaises(ValueError):connectors.register({**config,'id':'unsafe','url':'http://example.com/data'})
                with self.assertRaises(ValueError):connectors.register(config)
                connectors.register({**config,'id':'redirect-api','url':'http://127.0.0.1:'+str(server.server_port)+'/redirect'})
                with self.assertRaises(ValueError):connectors.execute_api({'tool':'redirect-api'},folder)
        finally:server.shutdown();server.server_close()
    def test_retry_and_scoped_cancel(self):
        previous=companion.RUNS
        with tempfile.TemporaryDirectory() as directory, patch.object(companion,'blender',return_value=sys.executable), patch.object(companion,'ollama',side_effect=lambda path,*args,**kwargs:{'models':[{'name':'test'}]} if path=='/api/tags' else {'model_info':{'local':True}}), patch.object(companion,'execute'):
            companion.RUNS=Path(directory);companion.ACTIVE=None;companion.CANCEL.clear()
            server=companion.ThreadingHTTPServer(('127.0.0.1',0),companion.Handler)
            threading.Thread(target=server.serve_forever,daemon=True).start()
            def post(path,data):
                request=Request('http://127.0.0.1:'+str(server.server_port)+path,data=json.dumps(data).encode(),headers={'Host':'127.0.0.1:8765','Origin':companion.ORIGIN,'Authorization':'Bearer '+companion.TOKEN})
                try:
                    with urlopen(request) as response:return response.status,json.load(response)
                except HTTPError as e:return e.code,json.load(e)
            try:
                data={'id':str(uuid.uuid4()),'model':'test','prompt':'Make a rough object.','taskId':str(uuid.uuid4()),'taskRevision':1,'inputHead':'a'*40}
                data['snapshot']={'head':'a'*40,'files':{'mission.json':'A community project','../../outside.py':'data, not executable'}}
                self.assertEqual(post('/run',{**data,'taskRevision':True})[0],400)
                self.assertEqual(post('/run',{**data,'inputHead':'not-a-head'})[0],400)
                self.assertEqual(post('/run',data)[0],201)
                self.assertEqual(json.loads((Path(directory)/data['id']/'inputs.json').read_text())['files']['../../outside.py'],'data, not executable')
                self.assertFalse((Path(directory).parent/'outside.py').exists())
                self.assertEqual(post('/run',data)[0],200)
                self.assertEqual(post('/run',{**data,'snapshot':{'head':'a'*40,'files':{'mission.json':'Different data'}}})[0],409)
                self.assertEqual(post('/run',{**data,'taskRevision':2})[0],409)
                self.assertEqual(post('/run',{**data,'taskId':str(uuid.uuid4())})[0],409)
                (Path(directory)/data['id']/'scene.json').write_text('{}')
                self.assertEqual(post('/run',{**data,'id':str(uuid.uuid4()),'taskId':str(uuid.uuid4()),'parent':data['id']})[0],400)
                self.assertEqual(post('/run',{**data,'prompt':'A different brief.'})[0],409)
                self.assertEqual(post('/cancel',{'id':str(uuid.uuid4())})[0],409)
                self.assertFalse(companion.CANCEL.is_set())
                self.assertEqual(post('/cancel',{'id':data['id']})[0],200)
                self.assertTrue(companion.CANCEL.is_set())
                companion.ACTIVE=None;companion.CANCEL.clear()
                cloud={**data,'id':str(uuid.uuid4()),'model':'codex:test'}
                with patch.object(companion.codex_agent,'status',return_value={'signedIn':True,'models':[{'id':'test'}]}):
                    calls=companion.ollama.call_count
                    self.assertEqual(post('/run',cloud)[0],400)
                    self.assertEqual(post('/run',{**cloud,'cloudConsent':True})[0],201)
                    self.assertEqual(post('/run',{**cloud,'cloudConsent':True})[0],200)
                    self.assertEqual(companion.ollama.call_count,calls)
                    self.assertEqual(post('/codex/disconnect',{})[0],409)
            finally:server.shutdown();server.server_close();companion.RUNS=previous;companion.ACTIVE=None;companion.CANCEL.clear()
    def scene(self): return {'objects':[{'name':'wheel','shape':'torus','position':[0,0,0],'rotation':[90,0,0],'scale':[1,1,1],'color':[0.3,0.2,0.1]}]}
    def test_schema(self):
        self.assertEqual(validate(self.scene()),self.scene())
        for key,value in [('shape','python'),('position',[float('nan'),0,0]),('scale',[-1,1,1]),('color',[1,2,3])]:
            scene=self.scene();scene['objects'][0][key]=value
            with self.assertRaises(ValueError): validate(scene)
        scene=self.scene();scene['script']='import os'
        with self.assertRaises(ValueError): validate(scene)
        with self.assertRaises(ValueError): validate({'objects':self.scene()['objects']*49})
    def test_origin_and_secret(self):
        server=companion.ThreadingHTTPServer(('127.0.0.1',0),companion.Handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            url='http://127.0.0.1:'+str(server.server_port)+'/status'
            for origin,token in [('https://untrusted.test',companion.TOKEN),(companion.ORIGIN,'wrong')]:
                with self.assertRaises(HTTPError) as err: urlopen(Request(url,headers={'Host':'127.0.0.1:8765','Origin':origin,'Authorization':'Bearer '+token}))
                self.assertEqual(err.exception.code,403)
            request=Request(url,method='OPTIONS',headers={'Host':'127.0.0.1:8765','Origin':companion.ORIGIN})
            with urlopen(request) as response:self.assertEqual(response.status,204)
        finally:server.shutdown();server.server_close()
    def test_validation_before_execution(self):
        previous=companion.RUNS
        with tempfile.TemporaryDirectory() as directory:
            companion.RUNS=Path(directory)
            job={'id':'test','status':'queued'};companion.save(job)
            self.assertEqual(companion.history()[0]['status'],'queued')
            self.assertFalse((Path(directory)/'test'/'job.tmp').exists())
        companion.RUNS=previous

if __name__=='__main__':unittest.main()
