import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'workshop'))
import companion
from launcher import WorkshopService, WorkshopWindow, tk


class LauncherTests(unittest.TestCase):
    def test_restart_rotates_code_preserves_work_and_drains_jobs(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(companion, 'RUNS', Path(directory)), patch.object(companion, 'ollama', return_value={'models': []}):
            folder = Path(directory) / 'retained'
            folder.mkdir()
            (folder / 'job.json').write_text(json.dumps({'id': 'retained', 'status': 'running', 'created': 1}))
            service = WorkshopService(('127.0.0.1', 0))
            try:
                service.start()
                first_code = companion.TOKEN
                def status(token):
                    request = Request('http://127.0.0.1:' + str(service.server.server_port) + '/status', headers={'Host': '127.0.0.1:8765', 'Origin': companion.ORIGIN, 'Authorization': 'Bearer ' + token})
                    with urlopen(request) as response:
                        return json.load(response)
                self.assertEqual(status(first_code)['jobs'][0]['status'], 'stopped')
                duplicate = WorkshopService(service.server.server_address)
                with self.assertRaises(OSError):
                    duplicate.start()
                self.assertEqual(companion.TOKEN, first_code)
                companion.ACTIVE = 'in-progress'
                service.request_stop()
                self.assertTrue(companion.CANCEL.is_set())
                self.assertTrue(companion.STOPPING)
                self.assertFalse(service.finish_stop())
                companion.ACTIVE = None
                self.assertTrue(service.finish_stop())
                service.start()
                self.assertNotEqual(companion.TOKEN, first_code)
                with self.assertRaises(HTTPError) as stale:
                    status(first_code)
                self.assertEqual(stale.exception.code, 403)
                self.assertEqual(len(status(companion.TOKEN)['jobs']), 1)
            finally:
                companion.ACTIVE = None
                service.request_stop()
                service.finish_stop()
                companion.STOPPING = False

    def test_window_requires_consent_and_returns_to_stopped(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(companion, 'RUNS', Path(directory)):
            root = tk.Tk()
            root.withdraw()
            window = WorkshopWindow(root)
            window.service = WorkshopService(('127.0.0.1', 0))
            try:
                window.start()
                self.assertIsNone(window.service.server)
                window.consent.set(True)
                window.start()
                self.assertEqual(window.code.get(), companion.TOKEN)
                self.assertEqual(str(window.start_button['state']), 'disabled')
                window.stop()
                self.assertIsNone(window.service.server)
                self.assertFalse(window.consent.get())
                self.assertEqual(window.code.get(), '')
            finally:
                window.service.request_stop()
                window.service.finish_stop()
                root.destroy()
                companion.STOPPING = False


if __name__ == '__main__':
    unittest.main()
