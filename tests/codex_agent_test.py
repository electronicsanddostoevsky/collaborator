import sys,json,queue,threading,tempfile,unittest,io
from pathlib import Path
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'workshop'))
import codex_agent
from planner import SCHEMA

class CodexTests(unittest.TestCase):
    def client(self,mode='success'):
        c=Mock();c.events=queue.Queue();c.disconnected=threading.Event();c.proc.poll.return_value=None;c.cwd=Path(tempfile.gettempdir());c.status.return_value={'signedIn':True,'models':[{'id':'test-model'}]}
        def call(method,params,**kw):
            if method=='thread/start':return {'thread':{'id':'thread'}}
            if method=='turn/start':
                if mode!='wait':
                    c.events.put({'method':'item/completed','params':{'threadId':'wrong-thread','item':{'type':'agentMessage','text':'{"wrong":true}'}}})
                    c.events.put({'method':'item/completed','params':{'threadId':'thread','item':{'type':'agentMessage','text':'{"ok":true}'}}})
                    c.events.put({'method':'turn/completed','params':{'threadId':'thread','turn':{'status':'completed' if mode=='success' else 'failed'}}})
                return {'turn':{'id':'turn'}}
            return {}
        c.call.side_effect=call
        return c
    def test_streamed_result_and_terminal_failure(self):
        for mode in ('success','failed'):
            c=self.client(mode)
            with patch.object(codex_agent,'CLIENT',c):
                if mode=='success':self.assertEqual(codex_agent.generate('test-model','JSON only','test',threading.Event(),SCHEMA),{'ok':True})
                else:
                    with self.assertRaises(ValueError):codex_agent.generate('test-model','JSON only','test',threading.Event())
                self.assertFalse(c.active)
                self.assertNotIn('turn/interrupt',[a.args[0] for a in c.call.call_args_list])
    def test_cancel_interrupts_and_does_not_return_a_result(self):
        c=self.client('wait');cancel=threading.Event();cancel.set()
        with patch.object(codex_agent,'CLIENT',c):
            with self.assertRaises(InterruptedError):codex_agent.generate('test-model','JSON only','test',cancel)
        self.assertIn('turn/interrupt',[a.args[0] for a in c.call.call_args_list])
    def test_account_and_model_boundaries(self):
        c=self.client();c.status.return_value={'signedIn':False,'models':[]}
        with patch.object(codex_agent,'CLIENT',c):
            with self.assertRaises(ValueError):codex_agent.generate('test-model','JSON only','test',threading.Event())
        c.call.assert_not_called()
        c=self.client()
        with patch.object(codex_agent,'CLIENT',c):
            with self.assertRaises(ValueError):codex_agent.generate('unavailable','JSON only','test',threading.Event())
        c.call.assert_not_called()
    def test_schema_does_not_mutate_shared_validation(self):
        adapted=codex_agent.output_schema(SCHEMA)
        self.assertTrue(SCHEMA['properties']['tasks']['items']['properties']['tools']['uniqueItems'])
        self.assertNotIn('uniqueItems',adapted['properties']['tasks']['items']['properties']['tools'])
    def test_server_tool_requests_are_denied(self):
        c=codex_agent.Client.__new__(codex_agent.Client)
        c.lock=threading.Lock();c.pending={};c.events=queue.Queue();c.active=False;c.disconnected=threading.Event();c.send=Mock()
        c.proc=Mock();c.proc.stdout=io.StringIO(json.dumps({'id':1,'method':'item/commandExecution/requestApproval','params':{'command':'anything'}})+'\n')
        c._read()
        response=c.send.call_args.args[0]
        self.assertIn('error',response);self.assertNotIn('result',response)

if __name__=='__main__':unittest.main()
