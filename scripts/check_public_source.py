"""Check tracked history for excluded local data and common credential formats.

This is a release check, not a guarantee that every kind of secret is detectable.
"""
import re
import subprocess

def git(*args):
    return subprocess.check_output(['git', *args])

bad = []
count = 0
for line in git('rev-list', '--objects', '--all').decode().splitlines():
    oid, _, name = line.partition(' ')
    if git('cat-file', '-t', oid).strip() != b'blob':
        continue
    count += 1
    if re.search(r'(^|/)(\.dev\.vars|\.env(?!\.example)|\.local-connectors|workshop-connection)|^workshop/runs/|^outputs/', name):
        bad.append(name + ' (private file path)')
    content = git('cat-file', 'blob', oid)
    if re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-proj-[A-Za-z0-9_-]{40,}', content):
        bad.append(name + ' (credential pattern)')
if bad:
    raise SystemExit('\n'.join(sorted(set(bad))))
print(f'Checked {count} historical blobs: no excluded local files or matched credential patterns.')
