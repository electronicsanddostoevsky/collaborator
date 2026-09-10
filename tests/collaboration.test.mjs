import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_faithful_carmella_unuscione.sql','utf8'));sqlite.exec(readFileSync('drizzle/0001_strong_cable.sql','utf8'));
class Statement {constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}}}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}}
sqlite.exec(readFileSync('drizzle/0014_stale_squadron_supreme.sql','utf8'));sqlite.exec(readFileSync('drizzle/0015_unique_sumo.sql','utf8'));
const db={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const results=statements.map(s=>{const statement=sqlite.prepare(s.sql);if(statement.columns().length)return {results:statement.all(...s.args),meta:{changes:0}};const result=statement.run(...s.args);return {results:[],meta:{changes:Number(result.changes)}}});sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
globalThis.__testDB=db;
const source=readFileSync('app/api/collaboration/route.ts','utf8').replace("import { database, maintainerEmail } from '@/db/client';","const database=()=>globalThis.__testDB; const maintainerEmail=()=>globalThis.__testMaintainer||'';");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const api=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
async function call(payload,actor,origin='https://local.test'){const h={'Content-Type':'application/json',Origin:origin};if(actor){h['oai-authenticated-user-id']=actor;h['oai-authenticated-user-email']=actor+'@example.test'}const r=await api[payload?'POST':'GET'](new Request('https://local.test/api/collaboration',{method:payload?'POST':'GET',headers:h,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
assert.equal((await call({action:'claim',taskId:'lore'})).status,401);
assert.equal((await call({action:'claim',taskId:'lore'},'alice','https://other.test')).status,403);
assert.equal((await call({action:'claim',taskId:'lore'},'alice')).status,200);
assert.equal((await call({action:'claim',taskId:'lore'},'bob')).status,409);
await call({action:'release',taskId:'lore'},'bob');assert.equal((await call(null,'alice')).data.claims[0].mine,true);
const p={action:'submit',taskId:'lore',id:crypto.randomUUID(),title:'Gandiva experiment',body:'An original contribution with references and clear acceptance criteria.',url:'javascript:alert(1)'};
assert.equal((await call(p,'alice')).status,400);p.url='https://example.com/artifact';assert.equal((await call(p,'bob')).status,409);assert.equal((await call(p,'alice')).status,200);assert.equal((await call(p,'alice')).status,200);assert.equal((await call(null,'alice')).data.proposals.length,1);
assert.equal((await call({...p,id:crypto.randomUUID()},'alice')).status,409);
assert.equal((await call({action:'review',id:p.id,status:'accepted',feedback:'Invalid reviewer'},'alice')).status,403);
await call({action:'follow',following:true},'alice');assert.equal((await call(null,'alice')).data.following,true);await call({action:'follow',following:false},'alice');assert.equal((await call(null,'alice')).data.following,false);
console.log('PASS: real SQLite route tests — identity, CSRF, exclusive claims, ownership, URL checks, duplicate retries, pending limits, reviewer denial, persisted follows.');


// Simulated review authority exists only in this in-memory test harness.
globalThis.__testMaintainer='reviewer@example.test';
assert.equal((await call(null,'reviewer')).data.user.isMaintainer,true);
assert.equal((await call({action:'review',id:p.id,status:'accepted',feedback:''},'reviewer')).status,400);
assert.equal((await call({action:'review',id:p.id,status:'accepted',feedback:'Fits the shared brief.'},'reviewer')).status,200);
let accepted=(await call(null,'alice')).data.proposals.find(x=>x.id===p.id);
assert.equal(accepted.revision,1);assert.equal(accepted.status,'accepted');
assert.equal((await call({action:'review',id:p.id,status:'changes_requested',feedback:'Late conflicting decision'},'reviewer')).status,409);
const p2={...p,id:crypto.randomUUID(),title:'Second contribution'};
assert.equal((await call(p2,'alice')).status,200);
assert.equal((await call({action:'review',id:p2.id,status:'changes_requested',feedback:'Please add a source.'},'reviewer')).status,200);
assert.equal((await call(null,'alice')).data.proposals.find(x=>x.id===p2.id).revision,null);
const p3={...p,id:crypto.randomUUID(),title:'Revised contribution'};
assert.equal((await call(p3,'alice')).status,200);
assert.equal((await call({action:'review',id:p3.id,status:'accepted',feedback:'Source supplied.'},'reviewer')).status,200);
assert.equal((await call(null,'alice')).data.proposals.find(x=>x.id===p3.id).revision,2);
assert.equal((await call(null,'alice')).data.proposals.find(x=>x.id===p2.id).status,'changes_requested');
console.log('PASS: maintainer acceptance, required feedback, monotonic revisions, conflicting review denial, change request and resubmission history.');

const uploadUtils=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/artifacts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const files=new Map();globalThis.__testBucket={put:async(key,bytes)=>{files.set(key,typeof bytes==='string'?new TextEncoder().encode(bytes):new Uint8Array(bytes))},get:async key=>files.has(key)?{body:files.get(key)}:null,delete:async key=>{files.delete(key)}};globalThis.__uploadUtils=uploadUtils;
const uploadSource=readFileSync('app/api/artifacts/route.ts','utf8').replace(/import \{\s*database,\s*bucket\s*\} from '@\/db\/client';/, 'const database=()=>globalThis.__testDB;const bucket=()=>globalThis.__testBucket;').replace(/import \{[^}]+\} from '@\/lib\/artifacts';/,'const {MAX_UPLOAD_BYTES,USER_STORAGE_BYTES,safeFilename,supportedFile,boundedBody}=globalThis.__uploadUtils;');
const uploadApi=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(uploadSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
async function upload(actor,name,body,taskId='lore'){const headers={Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await uploadApi.POST(new Request('https://local.test/api/artifacts?taskId='+taskId+'&filename='+encodeURIComponent(name),{method:'POST',headers,body}));return {status:r.status,data:await r.json()}}
async function download(id,actor){const headers={};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}return uploadApi.GET(new Request('https://local.test/api/artifacts?id='+id,{headers}))}
assert.equal((await upload(null,'brief.md','hello')).status,401);
assert.equal((await upload('bob','brief.md','hello')).status,409);
assert.equal((await upload('alice','run.html','hello')).status,400);
assert.equal((await upload('alice','brief.md','')).status,400);
assert.equal((await upload('alice','brief.md',new Uint8Array(10*1024*1024+1))).status,413);
const bytes='An immutable source-grounded mission brief.';
const uploaded=await upload('alice','../brief.md',bytes);assert.equal(uploaded.status,200);assert.equal(uploaded.data.filename,'brief.md');
assert.equal((await download(uploaded.data.id)).status,401);assert.equal((await download(uploaded.data.id,'bob')).status,404);
const downloaded=await download(uploaded.data.id,'alice');assert.equal(await downloaded.text(),bytes);assert.ok(downloaded.headers.get('Content-Disposition').startsWith('attachment;'));assert.equal(downloaded.headers.get('X-Content-Type-Options'),'nosniff');
await call({action:'claim',taskId:'direction'},'bob');
assert.equal((await call({...p,id:crypto.randomUUID(),taskId:'direction',artifactId:uploaded.data.id},'bob')).status,409);
assert.equal((await call({...p,id:crypto.randomUUID(),artifactId:uploaded.data.id,parentId:'missing'},'alice')).status,409);
const p4={...p,id:crypto.randomUUID(),artifactId:uploaded.data.id,parentId:p3.id};assert.equal((await call(p4,'alice')).status,200);
assert.equal((await download(uploaded.data.id,'bob')).status,200);
const current=(await call(null,'alice')).data.proposals.find(x=>x.id===p4.id);assert.equal(current.parent_id,p3.id);assert.equal(current.sha256,uploaded.data.sha256);
console.log('PASS: upload ownership, size/type limits, immutable download bytes, private draft access, attachment headers, cross-user attachment rejection, and revision lineage.');

sqlite.exec(readFileSync('drizzle/0002_great_aqueduct.sql','utf8'));
const missionSource=ts.transpileModule(readFileSync('lib/missions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
globalThis.__missions=(await import('data:text/javascript;base64,'+Buffer.from(missionSource).toString('base64'))).missions;
const participationSource=readFileSync('app/api/participation/route.ts','utf8').replace(/import \{\s*database\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;').replace(/import \{\s*getMission\s*\} from '@\/db\/missions';/, 'const getMission=async slug=>globalThis.__missions.find(m=>m.slug===slug)||globalThis.__createdMission?.(slug);');
const part=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(participationSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
// D1 all() adapter for aggregate queries in the participation endpoint.
Statement.prototype.all=async function(){return {results:sqlite.prepare(this.sql).all(...this.args)}};
async function participate(payload,actor){const headers={Origin:'https://local.test','Content-Type':'application/json'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await part[payload?'POST':'GET'](new Request('https://local.test/api/participation?mission=beach-cleanup',{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const interest={action:'interest',mission:'beach-cleanup',role:'Volunteer at the cleanup',note:'Available on a weekend'};
assert.equal((await participate(interest)).status,401);assert.equal((await participate(interest,'alice')).status,200);assert.equal((await participate(interest,'alice')).status,200);assert.equal((await participate(null,'alice')).data.counts[0].count,1);
assert.equal((await participate({...interest,role:'Invented role'},'alice')).status,400);
await participate({...interest,role:'Bring refreshments'},'alice');assert.equal((await participate(null,'alice')).data.own.role,'Bring refreshments');assert.equal((await participate(null,'bob')).data.own,null);
await participate({action:'withdraw',mission:'beach-cleanup'},'bob');assert.equal((await participate(null,'alice')).data.counts[0].count,1);
await participate({action:'withdraw',mission:'beach-cleanup'},'alice');assert.equal((await participate(null,'alice')).data.counts.length,0);
console.log('PASS: participation sign-in, role validation, idempotent interest, updates, private notes, ownership, withdrawal.');

sqlite.exec(readFileSync('drizzle/0003_deep_galactus.sql','utf8'));
sqlite.exec(readFileSync('drizzle/0005_narrow_patch.sql','utf8'));
sqlite.exec(readFileSync('drizzle/0006_happy_smiling_tiger.sql','utf8'));
sqlite.exec(readFileSync('drizzle/0007_steep_rafael_vega.sql','utf8'));
sqlite.exec(readFileSync('drizzle/0008_wealthy_juggernaut.sql','utf8'));
sqlite.exec(readFileSync('drizzle/0009_youthful_liz_osborn.sql','utf8'));
sqlite.exec(readFileSync('drizzle/0010_ordinary_pet_avengers.sql','utf8'));
globalThis.__gitFormat=await moduleFrom(readFileSync('lib/git-format.ts','utf8'));
globalThis.__missionGit=await moduleFrom(readFileSync('db/mission-git.ts','utf8').replace(/import \{\s*database,\s*bucket\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;const bucket=()=>globalThis.__testBucket;').replace(/import \{\s*getMission\s*\} from '@\/db\/missions';/,'const getMission=async slug=>globalThis.__createdMission?.(slug)||globalThis.__missions.find(m=>m.slug===slug);').replace(/import \{\s*createObjects,\s*gitBundle\s*\} from '@\/lib\/git-format';/,'const {createObjects,gitBundle}=globalThis.__gitFormat;'));
globalThis.__snapshot=(await moduleFrom(readFileSync('db/mission-revisions.ts','utf8').replace(/import \{\s*database\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;'))).snapshotStatement;
const inputMod=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/mission-input.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));globalThis.__validateMission=inputMod.validateMission;
globalThis.__toolRequirements=await moduleFrom(readFileSync('lib/mission-tools.ts','utf8'));
const missionApiSource=readFileSync('app/api/missions/route.ts','utf8').replace(/import \{\s*database\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;').replace(/import \{\s*validateMission\s*\} from '@\/lib\/mission-input';/,'const validateMission=globalThis.__validateMission;').replace(/import \{\s*snapshotStatement\s*\} from '@\/db\/mission-revisions';/,'const snapshotStatement=globalThis.__snapshot;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,prepareCommit,missionDefinition,readCommit}=globalThis.__missionGit;');
const missionApiPatched=missionApiSource.replace(/import \{\s*defaultMissionTools\s*\} from '@\/lib\/mission-tools';/,'const {defaultMissionTools}=globalThis.__toolRequirements;');
const missionApi=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(missionApiPatched,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
async function missionCall(payload,actor,id){const headers={Origin:'https://local.test','Content-Type':'application/json'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await missionApi[payload?'POST':'GET'](new Request('https://local.test/api/missions'+(id?'?id='+id:''),{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const mission={title:'Restore the community garden',category:'Local action',description:'Bring neighbors together to restore a shared growing space.',outcome:'Prepare one garden bed and agree on a volunteer care schedule.',roles:['Help with planting'],steps:['Find a small group'],intent:'community'};const newId=crypto.randomUUID(),create={action:'create',id:newId,mission};
assert.equal((await missionCall(create)).status,401);assert.equal((await missionCall({...create,mission:{...mission,title:'x'}},'alice')).status,400);
assert.equal((await missionCall(create,'alice')).status,201);assert.equal((await missionCall(create,'alice')).status,200);assert.equal((await missionCall(create,'bob')).status,409);
assert.equal((await missionCall(null,'alice',newId)).data.canEdit,true);assert.equal((await missionCall(null,'bob',newId)).data.canEdit,false);
const edit={action:'edit',id:newId,revision:1,mission:{...mission,title:'Restore our community garden'}};
assert.equal((await missionCall(edit,'bob')).status,403);assert.equal((await missionCall({...edit,mission:{...mission,intent:'commercial'}},'alice')).status,409);
assert.equal((await missionCall({...edit,mission:{...mission,roles:['Changed role']}},'alice')).status,409);
assert.equal((await missionCall(edit,'alice')).status,200);assert.equal((await missionCall(edit,'alice')).status,409);assert.equal((await missionCall(null,'alice',newId)).data.mission.revision,2);
globalThis.__createdMission=slug=>{const m=sqlite.prepare('SELECT * FROM community_missions WHERE id=?').get(slug);return m?{...m,slug:m.id,roles:JSON.parse(m.roles),steps:JSON.parse(m.steps)}:null};
const req=new Request('https://local.test/api/participation',{method:'POST',headers:{Origin:'https://local.test','Content-Type':'application/json','oai-authenticated-user-id':'bob','oai-authenticated-user-email':'bob@example.test'},body:JSON.stringify({action:'interest',mission:newId,role:'Help with planting',note:''})});assert.equal((await part.POST(req)).status,200);
console.log('PASS: mission validation, ownership, retry idempotency, fixed intent, preserved roles, edit conflicts, participation on a created mission.');

sqlite.exec(readFileSync('drizzle/0004_typical_gressill.sql','utf8'));
async function moduleFrom(source){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))}
const replaceDB=s=>s.replace(/import \{\s*database,\s*maintainerEmail\s*\} from '@\/db\/client';/,"const database=()=>globalThis.__testDB;const maintainerEmail=()=>globalThis.__testMaintainer||'';").replace(/import \{\s*database\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;');
globalThis.__access=(await moduleFrom(replaceDB(readFileSync('db/mission-access.ts','utf8')).replace(/import \{\s*getMission\s*\} from '@\/db\/missions';/,`const getMission=async slug=>{const m=globalThis.__createdMission(slug);return m?{...m,ownerId:m.owner_id}:globalThis.__missions.find(m=>m.slug===slug)};`))).missionAccess;
const updates=await moduleFrom(replaceDB(readFileSync('app/api/updates/route.ts','utf8')).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;'));
const mine=await moduleFrom(replaceDB(readFileSync('app/api/my-missions/route.ts','utf8')).replace(/import \{\s*missions\s*\} from '@\/lib\/missions';/,'const missions=globalThis.__missions;'));
async function updateCall(payload,actor,slug=newId,origin='https://local.test'){const headers={'Content-Type':'application/json',Origin:origin};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await updates[payload?'POST':'GET'](new Request('https://local.test/api/updates?mission='+slug,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const post={id:crypto.randomUUID(),mission:newId,kind:'progress',body:'The first garden bed is ready.'};
assert.equal((await updateCall(post)).status,401);assert.equal((await updateCall(post,'bob')).status,403);assert.equal((await updateCall(post,'alice',newId,'https://other.test')).status,403);
assert.equal((await updateCall(post,'alice')).status,201);assert.equal((await updateCall(post,'alice')).status,200);
const reply={id:crypto.randomUUID(),mission:newId,kind:'reply',parentId:post.id,body:'I can help with watering.'};
assert.equal((await updateCall(reply,'outsider')).status,403);assert.equal((await updateCall(reply,'bob')).status,201);
assert.equal((await updateCall({...reply,id:crypto.randomUUID(),parentId:reply.id},'bob')).status,400);
assert.equal((await updateCall({...reply,id:crypto.randomUUID(),mission:'beach-cleanup'},'reviewer')).status,400);
assert.equal((await updateCall(null,'bob')).data.posts.length,2);assert.equal((await updateCall(null,'bob')).data.canPost,false);
assert.equal((await updateCall({...post,id:crypto.randomUUID(),mission:'beach-cleanup'},'reviewer')).status,201);
async function myCall(actor){const headers=actor?{'oai-authenticated-user-id':actor,'oai-authenticated-user-email':actor+'@example.test'}:{};const r=await mine.GET(new Request('https://local.test/api/my-missions',{headers}));return {status:r.status,data:await r.json()}}
assert.equal((await myCall()).status,401);assert.equal((await myCall('outsider')).data.missions.length,0);
const aliceMine=(await myCall('alice')).data.missions.find(m=>m.id===newId);assert.equal(aliceMine.created,true);assert.equal(aliceMine.latest.body,post.body);assert.equal('owner_id' in aliceMine,false);
assert.equal((await myCall('bob')).data.missions.find(m=>m.id===newId).joined,true);
for(let i=0;i<29;i++)assert.equal((await updateCall({...post,id:crypto.randomUUID()},'alice')).status,201);
assert.equal((await updateCall({...post,id:crypto.randomUUID()},'alice')).status,429);
console.log('PASS: update ownership, joined replies, origin checks, duplicate retries, parent scope, daily cap, personal mission isolation and latest update.');

globalThis.__teamUtils=await moduleFrom(readFileSync('lib/teams.ts','utf8'));
globalThis.__teamAccess=await moduleFrom(replaceDB(readFileSync('db/team-access.ts','utf8')).replace(/import \{\s*moduleKey\s*\} from '@\/lib\/teams';/,'const {moduleKey}=globalThis.__teamUtils;'));
function replaceTeam(source){return source.replace(/import \{[^}]+\} from '@\/db\/team-access';/,'const {leadScopes,coversModules,scopeGuard}=globalThis.__teamAccess;').replace(/import \{[^}]+\} from '@\/lib\/teams';/,'const {moduleKey,validModule}=globalThis.__teamUtils;');}
globalThis.__actionUtils=await moduleFrom(readFileSync('lib/actions.ts','utf8'));
const actionApi=await moduleFrom(replaceTeam(replaceDB(readFileSync('app/api/actions/route.ts','utf8'))).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/lib\/actions';/,'const {actionKinds,actionEfforts,actionLink}=globalThis.__actionUtils;'));
async function actionCall(payload,actor,missionId=newId,actionId=''){const headers={'Content-Type':'application/json',Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await actionApi[payload?'POST':'GET'](new Request('https://local.test/api/actions?mission='+missionId+'&action='+actionId,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const task={id:crypto.randomUUID(),eventId:crypto.randomUUID(),mission:newId,operation:'create',title:'Prepare one garden bed',brief:'Prepare a small bed with compost and mark the planting area.',doneWhen:'Share the prepared dimensions and a short account of the work.',kind:'Time & practical help',effort:'A few hours'};
assert.equal((await actionCall(task)).status,401);assert.equal((await actionCall(task,'bob')).status,403);assert.equal((await actionCall(task,'alice')).status,201);assert.equal((await actionCall(task,'alice')).status,200);
const command=(operation,revision,extra={})=>({id:task.id,eventId:crypto.randomUUID(),mission:newId,operation,revision,...extra});
const claim=command('claim',1);assert.equal((await actionCall(claim,'charlie')).status,200);assert.equal((await actionCall(claim,'charlie')).status,200);assert.equal((await actionCall(command('claim',1),'bob')).status,409);
assert.equal((await actionCall(command('release',2),'bob')).status,403);assert.equal((await updateCall(null,'charlie')).data.canReply,true);assert.equal((await myCall('charlie')).data.missions.find(m=>m.id===newId).activeActions,1);
assert.equal((await actionCall(command('submit',2,{body:'We prepared a small bed.',url:'javascript:alert(1)'}),'charlie')).status,400);
assert.equal((await actionCall(command('submit',2,{body:'We prepared a small bed.',url:'https://example.com/garden'}),'charlie')).status,200);
assert.equal((await actionCall(command('accept',3,{body:'Looks good and meets the brief.'}),'bob')).status,403);
assert.equal((await myCall('alice')).data.missions.find(m=>m.id===newId).pendingActions,1);
assert.equal((await actionCall(command('revise',3,{body:'Please include the bed dimensions.'}),'alice')).status,200);
assert.equal((await actionCall(command('submit',4,{body:'The bed measures two meters by one meter.'}),'charlie')).status,200);
assert.equal((await actionCall(command('accept',5,{body:'Dimensions supplied; this meets our definition of done.'}),'alice')).status,200);
assert.equal((await actionCall(command('release',6),'charlie')).status,409);
const trace=(await actionCall(null,'bob',newId,task.id)).data;assert.equal(trace.events.length,6);assert.deepEqual(trace.events.map(e=>e.kind),['accept','submit','revise','submit','claim','create']);assert.equal(trace.actions[0].status,'done');assert.equal('assignee_id' in trace.actions[0],false);assert.equal((await myCall('charlie')).data.missions.find(m=>m.id===newId).activeActions,0);
const otherTask={...task,id:crypto.randomUUID(),eventId:crypto.randomUUID()};assert.equal((await actionCall(otherTask,'alice')).status,201);assert.equal((await actionCall({...command('claim',1),id:otherTask.id},'bob')).status,200);assert.equal((await actionCall({...command('release',2),id:otherTask.id},'bob')).status,200);assert.equal((await actionCall({...command('claim',3),id:otherTask.id},'charlie')).status,200);
const history=await moduleFrom(replaceDB(readFileSync('app/api/history/route.ts','utf8')).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;'));
const historyResponse=await history.GET(new Request('https://local.test/api/history?mission='+newId+'&download=1'));assert.equal(historyResponse.status,200);assert.ok(historyResponse.headers.get('Content-Disposition').includes('attachment'));
const log=await historyResponse.json();const versions=log.entries.filter(e=>e.kind==='brief');assert.equal(versions.length,2);assert.equal(versions.find(e=>e.revision===1).snapshot.title,mission.title);assert.equal(versions.find(e=>e.revision===2).snapshot.title,edit.mission.title);assert.ok(log.entries.some(e=>e.kind==='action:accept'));assert.ok(!JSON.stringify(log).includes('owner_id'));assert.ok(!JSON.stringify(log).includes('assignee_id'));
console.log('PASS: transactional action lifecycle, retry protection, competing claims, ownership, result URLs, revision history, My missions counts, brief snapshots and history export.');

const gitApi=await moduleFrom(readFileSync('app/api/mission-git/route.ts','utf8').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,ancestry,exportRepository}=globalThis.__missionGit;'));
async function gitInfo(id){const r=await gitApi.GET(new Request('https://local.test/api/mission-git?mission='+id));assert.equal(r.status,200);return r.json()}
const sourceGit=await gitInfo(newId);assert.equal(sourceGit.commits.length,2);assert.equal(sourceGit.repository.fork_policy,'allowed');
const forkId=crypto.randomUUID();const forkRequest={action:'fork',id:forkId,sourceMission:newId,baseOid:sourceGit.repository.head,title:'A smaller neighborhood garden'};
assert.equal((await missionCall(forkRequest)).status,401);assert.equal((await missionCall({...forkRequest,baseOid:'0'.repeat(40)},'bob')).status,409);assert.equal((await missionCall(forkRequest,'bob')).status,201);assert.equal((await missionCall(forkRequest,'bob')).status,200);
const forkGit=await gitInfo(forkId);assert.equal(forkGit.repository.upstream,newId);assert.equal(forkGit.repository.fork_base,sourceGit.repository.head);assert.equal(forkGit.commits[0].parent,sourceGit.repository.head);assert.equal(forkGit.commits.length,3);
assert.equal((await gitInfo(newId)).repository.head,sourceGit.repository.head);
assert.equal((await missionCall({action:'edit',id:forkId,revision:1,mission:{...mission,title:'A smaller neighborhood garden',outcome:'Grow herbs in a small shared bed with a regular volunteer care schedule.'}},'bob')).status,200);
const forkEdited=await gitInfo(forkId);assert.equal(forkEdited.commits.length,4);assert.equal((await gitInfo(newId)).repository.head,sourceGit.repository.head);
const closedId=crypto.randomUUID();assert.equal((await missionCall({...create,id:closedId,forkPolicy:'closed'},'alice')).status,201);const closed=await gitInfo(closedId);assert.equal((await missionCall({...forkRequest,id:crypto.randomUUID(),sourceMission:closedId,baseOid:closed.repository.head},'bob')).status,403);
const {mkdirSync,mkdtempSync,writeFileSync}=await import('node:fs');const {resolve,join}=await import('node:path');const {execFileSync}=await import('node:child_process');mkdirSync('outputs',{recursive:true});const gitTestDir=mkdtempSync(resolve('outputs/git-roundtrip-'));const bundleResponse=await gitApi.GET(new Request('https://local.test/api/mission-git?mission='+forkId+'&download=1'));assert.equal(bundleResponse.status,200);const bundlePath=join(gitTestDir,'mission.bundle');writeFileSync(bundlePath,new Uint8Array(await bundleResponse.arrayBuffer()));
const gitBin=process.env.GIT_TEST_EXECUTABLE||'git';execFileSync(gitBin,['bundle','verify',bundlePath],{stdio:'pipe'});const cloneDir=join(gitTestDir,'clone');execFileSync(gitBin,['clone',bundlePath,cloneDir],{stdio:'pipe'});execFileSync(gitBin,['-C',cloneDir,'fsck','--full','--strict'],{stdio:'pipe'});assert.equal(execFileSync(gitBin,['-C',cloneDir,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),forkEdited.repository.head);assert.equal(execFileSync(gitBin,['-C',cloneDir,'rev-list','--count','HEAD'],{encoding:'utf8'}).trim(),'4');assert.equal(execFileSync(gitBin,['-C',cloneDir,'merge-base',sourceGit.repository.head,'HEAD'],{encoding:'utf8'}).trim(),sourceGit.repository.head);const checkedOut=JSON.parse(execFileSync(gitBin,['-C',cloneDir,'show','HEAD:mission.json'],{encoding:'utf8'}));assert.equal(checkedOut.title,'A smaller neighborhood garden');assert.equal(checkedOut.intent,'community');
console.log('PASS: native Git bundle verification, clone, strict fsck, checked-out mission, commit count, independent forks, merge-base ancestry, fork policy and retry protection.');

const followApi=await moduleFrom(replaceDB(readFileSync('app/api/follow/route.ts','utf8')).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;'));
async function followCall(following,actor,missionId='beach-cleanup',origin='https://local.test'){const headers={'Content-Type':'application/json',Origin:origin};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await followApi[following===null?'GET':'POST'](new Request('https://local.test/api/follow?mission='+missionId,{method:following===null?'GET':'POST',headers,body:following===null?undefined:JSON.stringify({mission:missionId,following})}));return {status:r.status,data:await r.json()}}
assert.equal((await followCall(true)).status,401);assert.equal((await followCall(true,'watcher','beach-cleanup','https://other.test')).status,403);
assert.equal((await followCall(true,'watcher')).status,200);assert.equal((await followCall(true,'watcher')).status,200);assert.equal((await followCall(null,'watcher')).data.count,1);assert.equal((await followCall(null,'bob')).data.following,false);
const watched=(await myCall('watcher')).data.missions.find(m=>m.id==='beach-cleanup');assert.equal(watched.following,true);assert.equal(watched.joined,false);assert.equal(watched.role,'');assert.equal((await updateCall(null,'watcher','beach-cleanup')).data.canReply,true);
assert.equal((await followCall(false,'bob')).status,200);assert.equal((await followCall(null,'watcher')).data.count,1);assert.equal((await followCall(false,'watcher')).status,200);assert.equal((await myCall('watcher')).data.missions.length,0);
assert.equal((await followCall(true,'watcher',newId)).status,200);assert.equal((await myCall('watcher')).data.missions.find(m=>m.id===newId).following,true);assert.equal((await followCall(false,'watcher',newId)).status,200);
assert.equal((await followCall(true,'watcher','mahabharata')).status,200);assert.equal((await call(null,'watcher')).data.following,true);assert.equal((await myCall('watcher')).data.missions[0].id,'mahabharata');assert.equal((await followCall(false,'watcher','mahabharata')).status,200);
console.log('PASS: generic follows, repeat-safe updates, ownership, conversation access without role commitments, My missions inclusion and legacy Mahabharata compatibility.');

globalThis.__workspaceFiles=await moduleFrom(readFileSync('lib/workspace-files.ts','utf8'));
const fileApi=await moduleFrom(replaceDB(readFileSync('app/api/workspace/route.ts','utf8')).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,readCommit,prepareCommit,ancestry}=globalThis.__missionGit;').replace(/import \{[^}]+\} from '@\/lib\/workspace-files';/,'const {validWorkspacePath,workspaceSize}=globalThis.__workspaceFiles;'));
async function fileCall(payload,actor,missionId=newId){const headers={'Content-Type':'application/json',Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await fileApi[payload?'POST':'GET'](new Request('https://local.test/api/workspace?mission='+missionId,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const workspace=(await fileCall(null,'alice')).data;const fileRequest={id:crypto.randomUUID(),mission:newId,base:workspace.head,operation:'save',path:'design-notes.md',content:'# Garden design\nUse a two-meter planting bed.\n',message:'Add initial garden design notes'};
assert.equal((await fileCall(fileRequest)).status,401);assert.equal((await fileCall(fileRequest,'bob')).status,403);assert.equal((await fileCall({...fileRequest,path:'../escape.md'},'alice')).status,400);assert.equal((await fileCall({...fileRequest,path:'mission.json'},'alice')).status,400);assert.equal((await fileCall({...fileRequest,path:'CON.md'},'alice')).status,400);assert.equal((await fileCall({...fileRequest,content:'x'.repeat(16385)},'alice')).status,413);
assert.equal((await fileCall(fileRequest,'alice')).status,200);assert.equal((await fileCall(fileRequest,'alice')).status,200);assert.equal((await fileCall({...fileRequest,id:crypto.randomUUID(),content:'Stale edit'},'alice')).status,409);
let working=(await fileCall(null,'alice')).data;assert.equal(working.files['design-notes.md'],fileRequest.content);assert.equal((await fileCall({...fileRequest,id:crypto.randomUUID(),base:working.head,path:'DESIGN-NOTES.md'},'alice')).status,400);
assert.equal((await missionCall({action:'edit',id:newId,revision:2,mission:{...mission,title:'A shared neighborhood growing space'}},'alice')).status,200);working=(await fileCall(null,'alice')).data;assert.equal(working.files['design-notes.md'],fileRequest.content);
const fileForkId=crypto.randomUUID();assert.equal((await missionCall({action:'fork',id:fileForkId,sourceMission:newId,baseOid:working.head,title:'A fork with shared working files'},'bob')).status,201);const childWorkspace=(await fileCall(null,'bob',fileForkId)).data;assert.equal(childWorkspace.files['design-notes.md'],fileRequest.content);
const remove={id:crypto.randomUUID(),mission:fileForkId,base:childWorkspace.head,operation:'delete',path:'design-notes.md',content:'',message:'Remove notes from the fork direction'};assert.equal((await fileCall(remove,'bob',fileForkId)).status,200);assert.equal((await fileCall(remove,'bob',fileForkId)).status,200);assert.equal('design-notes.md' in (await fileCall(null,'bob',fileForkId)).data.files,false);assert.equal((await fileCall(null,'alice')).data.files['design-notes.md'],fileRequest.content);
const filesBundle=await gitApi.GET(new Request('https://local.test/api/mission-git?mission='+fileForkId+'&download=1'));assert.equal(filesBundle.status,200);const filesBundlePath=join(gitTestDir,'files.bundle');writeFileSync(filesBundlePath,new Uint8Array(await filesBundle.arrayBuffer()));const filesClone=join(gitTestDir,'files-clone');execFileSync(gitBin,['clone',filesBundlePath,filesClone],{stdio:'pipe'});execFileSync(gitBin,['-C',filesClone,'fsck','--full','--strict'],{stdio:'pipe'});assert.equal(execFileSync(gitBin,['-C',filesClone,'show','HEAD~1:design-notes.md'],{encoding:'utf8'}),fileRequest.content);assert.equal(execFileSync(gitBin,['-C',filesClone,'ls-tree','--name-only','HEAD'],{encoding:'utf8'}).trim(),'mission-tools.json\nmission.json');
console.log('PASS: working-file ownership, safe paths, size limits, conflict detection, retries, preservation through brief edits and forks, reversible deletion, and native Git multi-file history.');

globalThis.__mergeFiles=await moduleFrom(readFileSync('lib/merge-files.ts','utf8'));
const mergeApi=await moduleFrom(replaceDB(readFileSync('app/api/merge-requests/route.ts','utf8')).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,readCommit,prepareCommit,ancestry}=globalThis.__missionGit;').replace(/import \{\s*compareFiles\s*\} from '@\/lib\/merge-files';/,'const {compareFiles}=globalThis.__mergeFiles;'));
async function mergeCall(payload,actor,missionId=newId,id=''){const headers={'Content-Type':'application/json',Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await mergeApi[payload?'POST':'GET'](new Request('https://local.test/api/merge-requests?mission='+missionId+'&id='+id,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
async function writeWorking(missionId,actor,path,content){const w=(await fileCall(null,actor,missionId)).data;const r=await fileCall({id:crypto.randomUUID(),mission:missionId,base:w.head,operation:'save',path,content,message:'Update '+path},actor,missionId);assert.equal(r.status,200,JSON.stringify(r.data));}
await writeWorking(fileForkId,'bob','README.md','A contributed guide.');await writeWorking(newId,'alice','upstream.md','Independent upstream work.');
const mergeSource=(await gitInfo(fileForkId)).repository.head;const mergeTarget=(await gitInfo(newId)).repository.head;
const proposal={id:crypto.randomUUID(),mission:fileForkId,operation:'propose',sourceHead:mergeSource,title:'Contribute the garden guide',description:'Add a guide and remove the superseded notes.'};
assert.equal((await mergeCall(proposal)).status,401);assert.equal((await mergeCall(proposal,'outsider')).status,403);assert.equal((await mergeCall(proposal,'bob')).status,201);assert.equal((await mergeCall(proposal,'bob')).status,200);
const comparison=(await mergeCall(null,'alice',newId,proposal.id)).data;assert.equal(comparison.conflicts,0);assert.equal(comparison.changes.length,2);assert.equal('user_id' in comparison.proposal,false);
const decision={id:proposal.id,mission:newId,operation:'merge',feedback:'The guide meets the mission needs.'};assert.equal((await mergeCall(decision,'bob')).status,403);const merged=await mergeCall(decision,'alice');assert.equal(merged.status,200,JSON.stringify(merged.data));assert.equal((await mergeCall(decision,'alice')).status,200);
const mergedInfo=await gitInfo(newId);assert.equal(mergedInfo.commits[0].parent,mergeTarget);assert.equal(mergedInfo.commits[0].merge_parent,mergeSource);const mergedFiles=(await fileCall(null,'alice')).data.files;assert.equal(mergedFiles['README.md'],'A contributed guide.');assert.equal(mergedFiles['upstream.md'],'Independent upstream work.');assert.equal('design-notes.md' in mergedFiles,false);assert.equal(JSON.parse(mergedFiles['mission.json']).mission,newId);
const conflictFork=crypto.randomUUID();assert.equal((await missionCall({action:'fork',id:conflictFork,sourceMission:newId,baseOid:mergedInfo.repository.head,title:'Another garden contribution'},'bob')).status,201);
await writeWorking(conflictFork,'bob','README.md','The fork guide.');await writeWorking(newId,'alice','README.md','The upstream guide.');
const conflictProposal={...proposal,id:crypto.randomUUID(),mission:conflictFork,sourceHead:(await gitInfo(conflictFork)).repository.head};assert.equal((await mergeCall(conflictProposal,'bob')).status,201);assert.equal((await mergeCall(null,'alice',newId,conflictProposal.id)).data.conflicts,1);
const conflictDecision={...decision,id:conflictProposal.id};assert.equal((await mergeCall(conflictDecision,'alice')).status,409);assert.equal((await mergeCall({...conflictDecision,resolutions:{'README.md':'proposed'}},'alice')).status,200);assert.equal((await fileCall(null,'alice')).data.files['README.md'],'The fork guide.');assert.equal(JSON.parse((await mergeCall(null,'alice',newId,conflictProposal.id)).data.proposal.resolutions)['README.md'],'proposed');
await writeWorking(conflictFork,'bob','other.md','More ideas.');const stale={...conflictProposal,id:crypto.randomUUID(),sourceHead:(await gitInfo(conflictFork)).repository.head};assert.equal((await mergeCall(stale,'bob')).status,201);await writeWorking(newId,'alice','later.md','A later upstream change.');assert.equal((await mergeCall({...decision,id:stale.id},'alice')).status,409);assert.equal((await mergeCall({id:stale.id,mission:conflictFork,operation:'close',feedback:'Closing to refresh the comparison.'},'bob')).status,200);
const mergedBundle=await gitApi.GET(new Request('https://local.test/api/mission-git?mission='+newId+'&download=1'));assert.equal(mergedBundle.status,200);const mergedBundlePath=join(gitTestDir,'merged.bundle');writeFileSync(mergedBundlePath,new Uint8Array(await mergedBundle.arrayBuffer()));const mergedClone=join(gitTestDir,'merged-clone');execFileSync(gitBin,['clone',mergedBundlePath,mergedClone],{stdio:'pipe'});execFileSync(gitBin,['-C',mergedClone,'fsck','--full','--strict'],{stdio:'pipe'});assert.equal(execFileSync(gitBin,['-C',mergedClone,'rev-list','--parents','-n','1',merged.data.head],{encoding:'utf8'}).trim().split(' ').length,3);execFileSync(gitBin,['-C',mergedClone,'merge-base','--is-ancestor',mergeSource,'HEAD'],{stdio:'pipe'});assert.equal(execFileSync(gitBin,['-C',mergedClone,'show','HEAD:README.md'],{encoding:'utf8'}),'The fork guide.');
console.log('PASS: reviewed merges, permissions, fixed comparisons, explicit conflict decisions, stale-head protection, retry safety, and native Git two-parent ancestry.');

sqlite.exec(readFileSync('drizzle/0011_funny_caretaker.sql','utf8'));sqlite.exec(readFileSync('drizzle/0012_funny_the_order.sql','utf8'));
const workshopApi=await moduleFrom(readFileSync('app/api/workshop/route.ts','utf8').replace(/import \{\s*database,\s*bucket\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;const bucket=()=>globalThis.__testBucket;').replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,readCommit,prepareCommit}=globalThis.__missionGit;').replace(/import \{\s*boundedBody\s*\} from '@\/lib\/artifacts';/,'const {boundedBody}=globalThis.__uploadUtils;'));
const workshopId=crypto.randomUUID();
async function workshopCall(actor,action='',body=new Uint8Array([80,75,3,4,1]),id=workshopId){const headers={Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const url='https://local.test/api/workshop?'+new URLSearchParams({mission:newId,id,action,prompt:'A small garden model from my local workshop.',model:'local-test'});const response=await workshopApi.POST(new Request(url,{method:'POST',headers,body:['accept','revise'].includes(action)?JSON.stringify({feedback:'This draft has been reviewed against the brief.'}):body}));return {status:response.status,data:await response.json()}}
assert.equal((await workshopCall()).status,401);assert.equal((await workshopCall('bob','',new Uint8Array([1,2,3]))).status,400);assert.equal((await workshopCall('bob')).status,201);assert.equal((await workshopCall('bob')).status,200);assert.equal((await workshopCall('alice')).status,409);assert.equal((await workshopCall('bob','accept')).status,403);assert.equal((await workshopCall('alice','accept')).status,200);assert.equal((await workshopCall('alice','accept')).status,200);assert.equal(sqlite.prepare('SELECT status FROM workshop_artifacts WHERE id=?').get(workshopId).status,'accepted');const acceptedWorkspace=(await fileCall(null,'alice')).data.files;assert.equal(JSON.parse(acceptedWorkspace['workshop-'+workshopId+'.json']).artifact,workshopId);const workshopGet=await workshopApi.GET(new Request('https://local.test/api/workshop?mission='+newId,{headers:{'oai-authenticated-user-id':'bob','oai-authenticated-user-email':'bob@example.test'}}));const workshopList=await workshopGet.json();assert.equal(workshopList.artifacts.length,1);assert.equal(workshopList.canAccept,false);assert.equal('user_id' in workshopList.artifacts[0],false);
console.log('PASS: workshop upload authentication, format checks, retry safety, acceptance ownership, content-hashed Git references and private identity fields.');
const previewRun=crypto.randomUUID();assert.equal((await workshopCall('bob','',new Uint8Array([80,75,3,4,1]),previewRun)).status,201);
const png=new Uint8Array([137,80,78,71,13,10,26,10,0]);
assert.equal((await workshopCall('alice','preview',png,previewRun)).status,403);
assert.equal((await workshopCall('bob','preview',new Uint8Array([1,2]),previewRun)).status,400);
assert.equal((await workshopCall('bob','preview',png,previewRun)).status,201);
assert.equal((await workshopCall('bob','preview',png,previewRun)).status,200);
assert.equal((await workshopCall('alice','revise',undefined,previewRun)).status,200);
assert.equal((await workshopCall('alice','revise',undefined,previewRun)).status,200);
assert.equal((await workshopCall('alice','accept',undefined,previewRun)).status,409);
const reviewed=sqlite.prepare('SELECT * FROM workshop_artifacts WHERE id=?').get(previewRun);assert.equal(reviewed.status,'changes_requested');assert.ok(reviewed.feedback);assert.ok(reviewed.reviewer);assert.ok(reviewed.reviewed_at);
const previewResponse=await workshopApi.GET(new Request('https://local.test/api/workshop?mission='+newId+'&id='+previewRun+'&preview=1',{headers:{'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'alice@example.test'}}));assert.equal(previewResponse.status,200);assert.equal(previewResponse.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await previewResponse.arrayBuffer()),png);
console.log('PASS: preview ownership, PNG checks, immutable retries, served preview bytes and immutable review feedback.');
sqlite.exec(readFileSync('drizzle/0013_curious_tony_stark.sql','utf8'));
const toolsApi=await moduleFrom(replaceDB(readFileSync('app/api/mission-tools/route.ts','utf8')).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,readCommit,prepareCommit}=globalThis.__missionGit;').replace(/import \{[^}]+\} from '@\/lib\/mission-tools';/,'const {defaultMissionTools,validRequirements}=globalThis.__toolRequirements;').replace(/import \{\s*boundedBody\s*\} from '@\/lib\/artifacts';/,'const {boundedBody}=globalThis.__uploadUtils;'));
async function toolCall(payload,actor,missionId=newId){const headers={Origin:'https://local.test','Content-Type':'application/json'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await toolsApi[payload?'POST':'GET'](new Request('https://local.test/api/mission-tools?mission='+missionId,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
assert.deepEqual((await toolCall(null,'alice')).data.requirements,[]);assert.deepEqual((await toolCall(null,'reviewer','mahabharata')).data.requirements.map(t=>t.id),['blender','unreal']);
const toolEdit={mission:newId,revision:0,requirements:[{id:'garden-api',name:'Garden records',purpose:'Read our planting schedule.'}]};assert.equal((await toolCall(toolEdit)).status,401);assert.equal((await toolCall(toolEdit,'bob')).status,403);assert.equal((await toolCall({...toolEdit,requirements:[...toolEdit.requirements,...toolEdit.requirements]},'alice')).status,400);assert.equal((await toolCall(toolEdit,'alice')).status,200);assert.equal((await toolCall(toolEdit,'alice')).status,409);assert.equal((await toolCall(null,'alice')).data.revision,1);
const toolsFork=crypto.randomUUID();assert.equal((await missionCall({action:'fork',id:toolsFork,sourceMission:newId,baseOid:(await gitInfo(newId)).repository.head,title:'Garden with inherited tools'},'bob')).status,201);assert.deepEqual((await toolCall(null,'bob',toolsFork)).data.requirements,toolEdit.requirements);assert.equal((await toolCall({mission:toolsFork,revision:0,requirements:[]},'bob',toolsFork)).status,200);assert.deepEqual((await toolCall(null,'alice')).data.requirements,toolEdit.requirements);
console.log('PASS: mission-specific defaults, owner-only requirements, stale-write protection, Git snapshots and independent fork requirements.');
const epicFork=crypto.randomUUID();assert.equal((await missionCall({action:'fork',id:epicFork,sourceMission:'mahabharata',baseOid:(await gitInfo('mahabharata')).repository.head,title:'Another epic interpretation'},'bob')).status,201);assert.deepEqual((await toolCall(null,'bob',epicFork)).data.requirements.map(t=>t.id),['blender','unreal']);
console.log('PASS: default Mahabharata tool requirements persist in a fork.');


globalThis.__planning=await moduleFrom(readFileSync('lib/planning.ts','utf8'));
const planApi=await moduleFrom(replaceTeam(replaceDB(readFileSync('app/api/plans/route.ts','utf8'))).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,readCommit,prepareCommit}=globalThis.__missionGit;').replace(/import \{[^}]+\} from '@\/lib\/planning';/,'const {validPlan}=globalThis.__planning;').replace(/import \{\s*boundedBody\s*\} from '@\/lib\/artifacts';/,'const {boundedBody}=globalThis.__uploadUtils;'));
async function planCall(payload,actor,missionId=newId){const headers={'Content-Type':'application/json',Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await planApi[payload?'POST':'GET'](new Request('https://local.test/api/plans?mission='+missionId,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const taskDefinition={key:'reference',module:'Research',title:'Agree a reference brief',brief:'Gather and agree the references for the first prototype.',inputs:'Mission vision',outputs:'Reviewed reference brief',doneWhen:'The lead accepts the references and scope.',dependsOn:[],tools:[]};
const proposedPlan={id:crypto.randomUUID(),mission:newId,operation:'propose',brief:'Build a small first community prototype.',model:'Local test model',body:{summary:'Agree references, then build a tiny reviewed prototype.',tasks:[taskDefinition,{...taskDefinition,key:'prototype',module:'Design',title:'Build a small prototype',dependsOn:['reference']}]}};
assert.equal((await planCall(proposedPlan)).status,401);
assert.equal((await planCall(proposedPlan,'outsider')).status,403);
assert.equal((await planCall({...proposedPlan,body:{...proposedPlan.body,tasks:[{...taskDefinition,dependsOn:['missing']}] }},'alice')).status,400);
assert.equal(globalThis.__planning.validPlan({...proposedPlan.body,tasks:[{...taskDefinition,dependsOn:['prototype']},proposedPlan.body.tasks[1]]}),false);
assert.equal((await planCall(proposedPlan,'bob')).status,201);
assert.equal((await planCall(proposedPlan,'bob')).status,200);
assert.equal((await planCall({...proposedPlan,brief:'Changed retry payload'},'bob')).status,409);
const approvePlan={operation:'approve',id:proposedPlan.id,mission:newId,revision:1,feedback:'The scope is small and the review criteria are clear.'};
assert.equal((await planCall(approvePlan,'bob')).status,403);
assert.equal((await planCall({...approvePlan,operation:'edit',body:proposedPlan.body},'alice')).status,200);
assert.equal((await planCall(approvePlan,'alice')).status,409);
const acceptedPlan=await planCall({...approvePlan,revision:2},'alice');assert.equal(acceptedPlan.status,200,JSON.stringify(acceptedPlan.data));
assert.equal((await planCall({...approvePlan,revision:2},'alice')).status,409);
const links=sqlite.prepare('SELECT * FROM planned_tasks WHERE plan_id=? ORDER BY task_key').all(proposedPlan.id);assert.equal(links.length,2);
const referenceAction=links.find(t=>t.task_key==='reference').action_id,prototypeAction=links.find(t=>t.task_key==='prototype').action_id;
assert.equal((await actionCall({operation:'claim',id:prototypeAction,eventId:crypto.randomUUID(),mission:newId,revision:1},'bob')).status,409);
assert.equal((await actionCall({operation:'claim',id:referenceAction,eventId:crypto.randomUUID(),mission:newId,revision:1},'bob')).status,200);
assert.equal((await actionCall({operation:'submit',id:referenceAction,eventId:crypto.randomUUID(),mission:newId,revision:2,body:'References are ready for the lead to inspect.'},'bob')).status,200);
assert.equal((await actionCall({operation:'accept',id:referenceAction,eventId:crypto.randomUUID(),mission:newId,revision:3,body:'The references meet the agreed acceptance criteria.'},'alice')).status,200);
assert.equal((await actionCall({operation:'claim',id:prototypeAction,eventId:crypto.randomUUID(),mission:newId,revision:1},'bob')).status,200);
const acceptedFiles=(await globalThis.__missionGit.readCommit(acceptedPlan.data.head)).files;assert.equal(JSON.parse(acceptedFiles['mission-plan.json']).id,proposedPlan.id);
assert.equal(globalThis.__workspaceFiles.validWorkspacePath('mission-plan.json'),false);
assert.equal('user_id' in (await planCall(null,'alice')).data.plans[0],false);
const rejectedPlan={...proposedPlan,id:crypto.randomUUID()};assert.equal((await planCall(rejectedPlan,'alice')).status,201);assert.equal((await planCall({...approvePlan,id:rejectedPlan.id,operation:'reject'},'alice')).status,200);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM planned_tasks WHERE plan_id=?').get(rejectedPlan.id).n,0);
const stalePlan={...proposedPlan,id:crypto.randomUUID()};assert.equal((await planCall(stalePlan,'alice')).status,201);const originalBatch=db.batch;db.batch=async statements=>{sqlite.prepare('UPDATE mission_plans SET revision=revision+1 WHERE id=?').run(stalePlan.id);return originalBatch(statements)};try{assert.equal((await planCall({...approvePlan,id:stalePlan.id},'alice')).status,409)}finally{db.batch=originalBatch};assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM planned_tasks WHERE plan_id=?').get(stalePlan.id).n,0);
console.log('PASS: planning proposal permissions, edits, approvals, retries, Git snapshots, rejected/stale plans create no tasks, and accepted prerequisites unlock dependent work.');


const teamApi=await moduleFrom(replaceTeam(replaceDB(readFileSync('app/api/team/route.ts','utf8'))).replace(/import \{\s*missionAccess\s*\} from '@\/db\/mission-access';/,'const missionAccess=globalThis.__access;').replace(/import \{[^}]+\} from '@\/db\/mission-git';/,'const {ensureRepository,readCommit,prepareCommit}=globalThis.__missionGit;').replace(/import \{\s*boundedBody\s*\} from '@\/lib\/artifacts';/,'const {boundedBody}=globalThis.__uploadUtils;'));
async function teamCall(payload,actor,missionId=newId){const headers={'Content-Type':'application/json',Origin:'https://local.test'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test';headers['oai-authenticated-user-full-name']=actor;}const r=await teamApi[payload?'POST':'GET'](new Request('https://local.test/api/team?mission='+missionId,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
assert.equal((await teamCall({mission:newId,operation:'join'})).status,401);
assert.equal((await teamCall({mission:newId,operation:'join'},'bob')).status,200);
assert.equal((await teamCall({mission:newId,operation:'join'},'bob')).status,200);
let teamState=(await teamCall(null,'alice')).data;const bobMember=teamState.members.find(m=>m.name==='bob').id;assert.equal(teamState.members.length,1);assert.equal('user_id' in teamState.members[0],false);
const role={mission:newId,operation:'lead',module:'Research',memberId:bobMember,revision:0};
assert.equal((await teamCall(role,'bob')).status,403);assert.equal((await teamCall({...role,memberId:'not-a-member'},'alice')).status,400);assert.equal((await teamCall(role,'alice')).status,200);assert.equal((await teamCall(role,'alice')).status,409);
assert.equal((await teamCall({mission:newId,operation:'leave'},'bob')).status,409);
const researchPlan={...proposedPlan,id:crypto.randomUUID(),body:{...proposedPlan.body,tasks:[taskDefinition]}};assert.equal((await planCall(researchPlan,'bob')).status,201);
assert.equal((await planCall({...approvePlan,operation:'edit',id:researchPlan.id,body:{...researchPlan.body,tasks:[{...taskDefinition,module:'Gameplay'}]}},'bob')).status,403);
const scopedDecision=await planCall({...approvePlan,id:researchPlan.id},'bob');assert.equal(scopedDecision.status,200,JSON.stringify(scopedDecision.data));
const researchAction=sqlite.prepare('SELECT action_id FROM planned_tasks WHERE plan_id=?').get(researchPlan.id).action_id;
assert.equal((await actionCall({operation:'claim',id:researchAction,eventId:crypto.randomUUID(),mission:newId,revision:1},'alice')).status,200);
assert.equal((await actionCall({operation:'submit',id:researchAction,eventId:crypto.randomUUID(),mission:newId,revision:2,body:'A reviewed reference brief for this small milestone.'},'alice')).status,200);
assert.equal((await actionCall({operation:'accept',id:researchAction,eventId:crypto.randomUUID(),mission:newId,revision:3,body:'Accepted within my assigned research scope.'},'bob')).status,200);
assert.equal((await actionCall({operation:'submit',id:prototypeAction,eventId:crypto.randomUUID(),mission:newId,revision:2,body:'A completed prototype awaiting the design lead.'},'bob')).status,200);
assert.equal((await actionCall({operation:'accept',id:prototypeAction,eventId:crypto.randomUUID(),mission:newId,revision:3,body:'Attempt to review work outside my research role.'},'bob')).status,403);
const crossPlan={...proposedPlan,id:crypto.randomUUID()};assert.equal((await planCall(crossPlan,'bob')).status,201);assert.equal((await planCall({...approvePlan,id:crossPlan.id},'bob')).status,403);
const racePlan={...researchPlan,id:crypto.randomUUID()};assert.equal((await planCall(racePlan,'bob')).status,201);
const teamBatch=db.batch;db.batch=async statements=>{sqlite.prepare('UPDATE mission_leads SET member_id=NULL,revision=revision+1 WHERE mission=? AND module=?').run(newId,'research');return teamBatch(statements)};try{assert.equal((await planCall({...approvePlan,id:racePlan.id},'bob')).status,409)}finally{db.batch=teamBatch}
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM planned_tasks WHERE plan_id=?').get(racePlan.id).n,0);
assert.equal((await planCall({...approvePlan,id:racePlan.id},'bob')).status,403);
assert.equal((await teamCall({mission:newId,operation:'leave'},'bob')).status,200);
assert.equal((await teamCall({...role,revision:2},'alice')).status,400);
assert.equal((await teamCall({mission:newId,operation:'join'},'bob')).status,200);assert.equal((await teamCall({...role,revision:2},'alice')).status,200);assert.equal((await teamCall({...role,memberId:null,revision:3},'alice')).status,200);
const teamFiles=(await globalThis.__missionGit.readCommit((await gitInfo(newId)).repository.head)).files;assert.equal(JSON.parse(teamFiles['mission-team.json']).subdivisions.find(s=>s.module==='research').lead,null);
assert.equal(globalThis.__workspaceFiles.validWorkspacePath('mission-team.json'),false);
console.log('PASS: explicit membership, owner-only delegation, scoped planning and task reviews, forbidden scope changes, role revocation during approval, inactive member rejection, and Git-recorded roles.');
assert.equal((await teamCall({mission:'mahabharata',operation:'join'},'new-member','mahabharata')).status,200);assert.equal((await myCall('new-member')).data.missions.find(m=>m.id==='mahabharata').joined,true);assert.equal((await teamCall({mission:'mahabharata',operation:'leave'},'new-member','mahabharata')).status,200);assert.equal((await myCall('new-member')).data.missions.length,0);
assert.equal((await teamCall({mission:newId,operation:'join'},'new-member')).status,200);assert.equal((await myCall('new-member')).data.missions.find(m=>m.id===newId).joined,true);
console.log('PASS: explicit community membership appears in My missions and leaving removes membership-only entries.');
