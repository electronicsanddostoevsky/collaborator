import json, sys, tempfile, threading, unittest, zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'workshop'))
from writer import generate, validate

class WriterTests(unittest.TestCase):
    def test_generates_reviewable_files_with_reference_and_no_execution(self):
        draft={'title':'Neighborhood cleanup plan','body':'Agree on a date and disposal route. Recruit volunteers after the lead approves this proposed plan.','checks':['Confirm local collection arrangements.']}
        with tempfile.TemporaryDirectory() as path:
            folder=Path(path)
            (folder/'inputs.json').write_text(json.dumps({'head':'a'*40,'files':{'mission.json':'Our cleanup mission','prior.md':'Bring gloves'}}))
            def agent(path,data,timeout):
                self.assertEqual(path,'/api/chat');self.assertIn('Bring gloves',data['messages'][1]['content'])
                return {'message':{'content':json.dumps(draft)}}
            generate({'model':'local','prompt':'Make a small cleanup plan'},folder,agent,threading.Event())
            self.assertEqual(json.loads((folder/'result.json').read_text()),draft)
            with zipfile.ZipFile(folder/'artifact.zip') as archive:
                self.assertEqual(set(archive.namelist()),{'draft.md','result.json','inputs.json','context-used.txt','job.json'})
                self.assertIn(b'Confirm local',archive.read('draft.md'))
    def test_bounds_and_cancellation(self):
        for value in ({},{'title':'hello','body':'x'*20001,'checks':[]},{'title':'hello','body':'a'*50,'checks':['x'*301]},{'title':'hello','body':'a'*50,'checks':[],'script':'run me'}):
            with self.assertRaises(ValueError):validate(value)
        with tempfile.TemporaryDirectory() as path:
            cancel=threading.Event();cancel.set()
            with self.assertRaises(InterruptedError):generate({'model':'local','prompt':'Make a small plan'},Path(path),lambda *a,**k:{'message':{'content':'{}'}},cancel)
            self.assertFalse((Path(path)/'artifact.zip').exists())

if __name__=='__main__':unittest.main()
