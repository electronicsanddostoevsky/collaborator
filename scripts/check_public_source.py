"""Check tracked history for excluded local data and common credential formats.

This is a release check, not a guarantee that every kind of secret is detectable.
"""
import re
import subprocess

def git(*args):
    return subprocess.check_output(['git', *args])

bad = []
count = 0
objects = [line.partition(' ') for line in git('rev-list', '--objects', '--all').decode().splitlines()]
batch = subprocess.run(['git', 'cat-file', '--batch'], input=('\n'.join(item[0] for item in objects)+'\n').encode(), stdout=subprocess.PIPE, check=True).stdout
cursor = 0
for oid, _, name in objects:
    end = batch.index(b'\n', cursor)
    header = batch[cursor:end].split()
    size = int(header[2])
    content = batch[end+1:end+1+size]
    cursor = end+size+2
    if header[1] != b'blob':
        continue
    count += 1
    if re.search(r'(^|/)(\.dev\.vars|\.env(?!\.example)|\.local-connectors|\.codex-agent|workshop-connection)|^workshop/runs/|^outputs/', name):
        bad.append(name + ' (private file path)')
    if re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-proj-[A-Za-z0-9_-]{40,}', content):
        bad.append(name + ' (credential pattern)')
if bad:
    raise SystemExit('\n'.join(sorted(set(bad))))
print(f'Checked {count} historical blobs: no excluded local files or matched credential patterns.')
