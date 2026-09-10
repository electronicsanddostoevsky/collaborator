import sys, unittest, tempfile, json, threading
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'workshop'))
from scene import validate
import companion
from unittest.mock import patch
import uuid

class WorkshopTests(unittest.TestCase):
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
                data={'id':str(uuid.uuid4()),'model':'test','prompt':'Make a rough object.'}
                self.assertEqual(post('/run',data)[0],201)
                self.assertEqual(post('/run',data)[0],200)
                self.assertEqual(post('/run',{**data,'prompt':'A different brief.'})[0],409)
                self.assertEqual(post('/cancel',{'id':str(uuid.uuid4())})[0],409)
                self.assertFalse(companion.CANCEL.is_set())
                self.assertEqual(post('/cancel',{'id':data['id']})[0],200)
                self.assertTrue(companion.CANCEL.is_set())
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
