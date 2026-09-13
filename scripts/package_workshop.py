"""Build a shareable companion bundle from an explicit list, never a folder glob."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
FILES = ('companion.py','codex_agent.py','connectors.py','inputs.py','launcher.py','planner.py','scene.py','writer.py','README.md','Start workshop.cmd','Install prerequisites.ps1')
target = ROOT/'public'/'workshop'/'Collaborator-Workshop.zip'
target.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in FILES:
        archive.write(ROOT/'workshop'/name, name)
with ZipFile(target) as archive:
    assert set(archive.namelist()) == set(FILES)
    assert archive.testzip() is None
print(f'Packaged and verified {len(FILES)} shareable companion files.')
