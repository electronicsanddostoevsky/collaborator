"""Produce bounded planning data; never runs generated code or accepts work."""
import json

TASK_FIELDS = {'key':(2,40),'module':(2,80),'title':(5,120),'brief':(10,1200),'inputs':(3,500),'outputs':(3,500),'doneWhen':(10,1000)}
TASK_PROPERTIES = {name:{'type':'string','minLength':limits[0],'maxLength':limits[1]} for name,limits in TASK_FIELDS.items()}
TASK_PROPERTIES['key']['pattern'] = '^[a-z][a-z0-9-]{1,39}$'
for name,maximum in [('dependsOn',11),('tools',6)]:
    TASK_PROPERTIES[name]={'type':'array','maxItems':maximum,'uniqueItems':True,'items':{'type':'string','pattern':'^[a-z][a-z0-9-]{1,39}$'}}
SCHEMA = {'type':'object','required':['summary','tasks'],'additionalProperties':False,'properties':{'summary':{'type':'string','minLength':10,'maxLength':1200},'tasks':{'type':'array','minItems':1,'maxItems':12,'items':{'type':'object','required':list(TASK_PROPERTIES),'properties':TASK_PROPERTIES,'additionalProperties':False}}}}
INSTRUCTION = '''Propose a small modular work plan for a community mission. Use mission-writer as the tool ID for written drafts, research synthesis from supplied material, specifications, event plans, and creative writing. This tool generates text only: no browsing, external actions or code execution. Use an empty tools list for human-only tasks. Do not pretend unavailable applications can execute. Return ONLY JSON:
{"summary":"plain language approach", "tasks":[{"key":"unique-short-key", "module":"team or discipline", "title":"task title", "brief":"bounded work description", "inputs":"required input artifacts or decisions", "outputs":"specific deliverable", "doneWhen":"testable human acceptance criteria", "dependsOn":[], "tools":[]}]}
Use 3 to 6 tasks, never more than 12. Every task must include all fields. Keys and tool IDs use lowercase letters, digits and hyphens, length 2 to 40. Use canonical tool IDs blender and unreal for those applications, not display names. Dependencies reference other task keys, with no cycles. Keep brief under 800 characters, inputs and outputs under 300, doneWhen under 600, summary under 1000. Start with an achievable vertical slice, not a whole AAA production. Include human review and integration. Use mission-specific tools only when needed. Do not claim approval, execution, available staff, safety or costs. People will edit and approve this proposal before it creates tasks.'''

def generate(job, ollama):
    response = ollama('/api/chat', {'model':job['model'], 'stream':False, 'think':False, 'format':SCHEMA, 'keep_alive':0, 'options':{'num_predict':4096,'num_ctx':8192,'temperature':0.2}, 'messages':[{'role':'system','content':INSTRUCTION},{'role':'user','content':job['prompt']}]}, timeout=240)
    value = json.loads(response['message']['content'])
    if not isinstance(value,dict) or not isinstance(value.get('tasks'),list) or not 1<=len(value['tasks'])<=12 or len(json.dumps(value).encode())>24000:
        raise ValueError('The model did not return a bounded work plan. Try a smaller scope.')
    return value
