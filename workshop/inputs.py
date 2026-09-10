"""Bounded, data-only project context. Never extract or execute workspace paths."""
import json

def validate_snapshot(value, head):
    if not isinstance(value,dict) or set(value)!={'head','files'} or value['head']!=head:
        raise ValueError('Project snapshot does not match the task revision.')
    files=value['files']
    if not isinstance(files,dict) or not 1<=len(files)<=32 or 'mission.json' not in files:
        raise ValueError('Project snapshot must include the mission definition.')
    if any(not isinstance(k,str) or not 1<=len(k)<=200 or not isinstance(v,str) for k,v in files.items()):
        raise ValueError('Project snapshot contains invalid text files.')
    if sum(len(k.encode())+len(v.encode()) for k,v in files.items())>65536:
        raise ValueError('Project snapshot exceeds the 64 KB pilot limit.')
    return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':'))

def reference_excerpt(snapshot):
    files=snapshot['files']
    skipped={'mission-plan.json','mission-team.json','mission-tools.json'}
    names=['mission.json']+sorted(k for k in files if k!='mission.json' and k not in skipped)
    parts=[];remaining=6000
    for name in names:
        if remaining<100:break
        segment=json.dumps({'file':name,'text':files[name]},ensure_ascii=False)
        excerpt=segment[:min(remaining,2000)]
        parts.append(excerpt+(' [excerpt truncated]' if len(excerpt)<len(segment) else ''))
        remaining-=len(excerpt)
    return 'PROJECT REFERENCE (bounded excerpts; complete snapshot is saved in inputs.json):\n'+'\n'.join(parts)
