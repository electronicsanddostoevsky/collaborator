import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_faithful_carmella_unuscione.sql','utf8'));sqlite.exec(readFileSync('drizzle/0001_strong_cable.sql','utf8'));
class Statement {constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}}}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}}
const db={prepare:sql=>new Statement(sql),batch:async statements=>statements.map(s=>({results:sqlite.prepare(s.sql).all(...s.args)}))};
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
const files=new Map();globalThis.__testBucket={put:async(key,bytes)=>{files.set(key,new Uint8Array(bytes))},get:async key=>files.has(key)?{body:files.get(key)}:null,delete:async key=>{files.delete(key)}};globalThis.__uploadUtils=uploadUtils;
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
const inputMod=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/mission-input.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));globalThis.__validateMission=inputMod.validateMission;
const missionApiSource=readFileSync('app/api/missions/route.ts','utf8').replace(/import \{\s*database\s*\} from '@\/db\/client';/,'const database=()=>globalThis.__testDB;').replace(/import \{\s*validateMission\s*\} from '@\/lib\/mission-input';/,'const validateMission=globalThis.__validateMission;');
const missionApi=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(missionApiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
async function missionCall(payload,actor,id){const headers={Origin:'https://local.test','Content-Type':'application/json'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test'}const r=await missionApi[payload?'POST':'GET'](new Request('https://local.test/api/missions'+(id?'?id='+id:''),{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined}));return {status:r.status,data:await r.json()}}
const mission={title:'Restore the community garden',category:'Local action',description:'Bring neighbors together to restore a shared growing space.',outcome:'Prepare one garden bed and agree on a volunteer care schedule.',roles:['Help with planting'],steps:['Find a small group'],intent:'community'};const newId=crypto.randomUUID(),create={action:'create',id:newId,mission};
assert.equal((await missionCall(create)).status,401);assert.equal((await missionCall({...create,mission:{...mission,title:'x'}},'alice')).status,400);
assert.equal((await missionCall(create,'alice')).status,201);assert.equal((await missionCall(create,'alice')).status,200);assert.equal((await missionCall(create,'bob')).status,409);
assert.equal((await missionCall(null,'alice',newId)).data.canEdit,true);assert.equal((await missionCall(null,'bob',newId)).data.canEdit,false);
const edit={action:'edit',id:newId,revision:1,mission:{...mission,title:'Restore our community garden'}};
assert.equal((await missionCall(edit,'bob')).status,403);assert.equal((await missionCall({...edit,mission:{...mission,intent:'commercial'}},'alice')).status,409);
assert.equal((await missionCall({...edit,mission:{...mission,roles:['Changed role']}},'alice')).status,409);
assert.equal((await missionCall(edit,'alice')).status,200);assert.equal((await missionCall(edit,'alice')).status,409);assert.equal((await missionCall(null,'alice',newId)).data.mission.revision,2);
globalThis.__createdMission=slug=>{const m=sqlite.prepare('SELECT * FROM community_missions WHERE id=?').get(slug);return m?{...m,slug:m.id,roles:JSON.parse(m.roles)}:null};
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
