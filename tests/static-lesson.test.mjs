import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';
import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';
import {serializeBackup} from '../dist/workspace-backup.js';
import {parseWorkspaceFormula} from '../dist/inequality-tools.js';
import {equivalent} from '../dist/engine.js';

test('static log lesson is readable without scripts and connects to an existing checked exercise',()=>{
 const {document}=parseHTML(fs.readFileSync(new URL('../dist/learn/log-equation/index.html',import.meta.url),'utf8'));
 assert.equal(document.querySelectorAll('script,iframe').length,0);
 assert.equal(document.querySelector('link[rel=canonical]').href,'https://susik.app/learn/log-equation/');
 const href=document.querySelector('a[href*="practice="]').href;
 const id=new URL(href,'https://susik.app').searchParams.get('practice');
 const problem=PRACTICE_PROBLEMS.find(p=>p.id===id);
 assert(problem);assert.equal(checkPractice(problem,'9').status,'correct');
 assert.equal(checkPractice(problem,'9, 1').status,'incorrect');
 // Exact integer arithmetic checks the worked candidate against the inverse definition.
 assert.equal(2n**3n,9n-1n);assert(9>1);
 assert.match(document.querySelector('article').textContent,/∀x ∈ D/);
 const sitemap=fs.readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
 assert(sitemap.includes('https://susik.app/learn/log-equation/'));
});

test('domain explanation covers distinct boundaries, original exclusions and only supported formula input',()=>{
 const {document}=parseHTML(fs.readFileSync(new URL('../dist/learn/log-equation/index.html',import.meta.url),'utf8'));
 const text=document.querySelector('article').textContent;
 for(const id of ['domain-basics','cancelled-denominator','domain-workspace','log-problem','self-check'])assert(document.getElementById(id));
 assert.match(document.title,/정의역.*분모·제곱근·로그/);
 assert.match(text,/x > 1, x ≠ 2/);assert.match(text,/x > −1, x ≠ 0/);
 assert.match(text,/입력한 식의 정의역과 조건 메모는 자동으로 증명하지 않습니다/);
 assert.equal(document.querySelectorAll('details[open]').length,0);
 for(const value of ['(x^2-1)/(x-1)=2','sqrt(x-1)/log(x-1,2)'])assert(parseWorkspaceFormula(value,math).value);
 // The identity justifies cancellation only when x-1 is nonzero.
 assert(equivalent('x^2-1','(x-1)*(x+1)'));
 const candidate=2n-1n;assert.equal(candidate,1n);assert.equal(candidate-1n,0n);assert.equal(candidate*candidate-1n,0n);
 // Exact inverse-log equalities identify the excluded denominator zeros.
 assert.equal(2n**0n,2n-1n);assert.equal(2n**0n,0n+1n);
 assert(equivalent('x^2-4','(x-2)*(x+2)'));assert.equal((-2n)**2n,4n);
});

test('lesson entry preserves saved reasoning, waits for explicit start, and never duplicates on re-render',async()=>{
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.location={search:'?practice=log-2'};window.math=math;window.innerWidth=360;window.innerHeight=640;
 window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 const initial={active:0,auxSequence:1,rows:[{value:'x+1',title:'직접 입력',note:'보존할 설명',bindings:{},conditions:['x는 실수'],logicStatements:[{domain:'x ∈ ℝ',formula:'x > 0',meaning:'x는 양수',verification:'unverified'}]}],auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x+1',active:0,rows:[{value:'2^3',title:'보조 식 시작',note:'보조 설명'}]}]};
 const memory=new Map([[WORK_KEY,JSON.stringify(initial)]]),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 const {startWorkspace}=await import('../dist/workspace-app.js');startWorkspace();
 assert.equal(loadWorkspace(storage).rows.length,1);
 assert(document.querySelector('[data-linked-practice]'));
 document.querySelector('[data-linked-practice] [data-practice-start]').click();
 let saved=loadWorkspace(storage);assert.equal(saved.rows.length,2);assert.equal(saved.rows[0].note,'보존할 설명');
 assert.deepEqual(saved.rows[0].conditions,initial.rows[0].conditions);assert.deepEqual(saved.rows[0].logicStatements,initial.rows[0].logicStatements);assert.deepEqual(saved.auxiliary,initial.auxiliary);
 assert.equal(saved.rows[1].practiceId,'log-2');assert.equal(saved.rows[1].note,'');
 startWorkspace();assert.equal(loadWorkspace(storage).rows.length,2);
 assert.equal(document.querySelector('[data-linked-practice]'),null);
 const before=loadWorkspace(storage),click=s=>document.querySelector(s).click();
 click('[data-backup-open]');const file=document.querySelector('[data-backup-file]');
 Object.defineProperty(file,'files',{value:[{size:1000,text:async()=>serializeBackup(before)}]});file.dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));
 assert(document.querySelector('[data-backup-restore]'));assert.deepEqual(loadWorkspace(storage),before);
 click('[data-backup-restore]');assert.deepEqual(loadWorkspace(storage),before);click('[data-backup-undo]');assert.deepEqual(loadWorkspace(storage),before);
 const write=storage.setItem;storage.setItem=()=>{throw Error('quota');};click('[data-work-row="0"]');assert(document.querySelector('.work-storage.is-error'));assert.deepEqual(loadWorkspace(storage),before);
 storage.setItem=write;click('[data-save-retry]');assert.equal(document.querySelector('.work-storage.is-error'),null);assert.equal(loadWorkspace(storage).rows[0].note,'보존할 설명');
});
