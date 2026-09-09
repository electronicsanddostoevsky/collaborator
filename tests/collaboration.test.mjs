import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_faithful_carmella_unuscione.sql','utf8'));
class Statement {constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}}}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}}
const db={prepare:sql=>new Statement(sql),batch:async statements=>statements.map(s=>({results:sqlite.prepare(s.sql).all(...s.args)}))};
globalThis.__testDB=db;
const source=readFileSync('app/api/collaboration/route.ts','utf8').replace("import { database, maintainerEmail } from '@/db/client';","const database=()=>globalThis.__testDB; const maintainerEmail=()=>'';");
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

