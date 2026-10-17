import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
import {originSnapshot} from '../dist/workspace-origin.js';
const original=()=>({value:'x^2=x',title:'직접 입력',condition:'x는 실수, x ≥ 0',conditions:['x ≥ 0'],assumptions:['x는 실수'],bindings:{t:'x+1'},excluded:['-2'],logicStatements:[{domain:'x ∈ ℝ',formula:'x ≥ 0',meaning:'원래 조건 기록',verification:'unverified'}],note:'원래 설명',practiceId:'roots-1',practiceAnswer:'이전 답',practiceFeedback:{status:'unverified',message:'이전 결과'}});
const fixture=(auxiliary=false)=>({rows:[{value:'x+9',title:'직접 입력'},original(),{value:'x+10',title:'다음 줄',parent:0}],active:1,activeAuxId:auxiliary?'aux-1':null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:2,sourceValue:'x+10',rows:[original(),{value:'x+7',title:'다음 줄',parent:0}],active:0}]});
const selected=book=>book.activeAuxId?book.auxiliary.find(a=>a.id===book.activeAuxId):book;
let sequence=0;
async function setup(book=fixture()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.math=math;window.innerWidth=320;window.innerHeight=420;window.HTMLElement.prototype.getBoundingClientRect=()=>({height:260});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};window.HTMLTextAreaElement.prototype.setSelectionRange=window.HTMLInputElement.prototype.setSelectionRange;
 let raw=JSON.stringify(book),blocked=false;const copied=[],storage={getItem:k=>k===WORK_KEY?raw:null,setItem:(k,v)=>{if(blocked)throw Error('quota');if(k===WORK_KEY)raw=v;}};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>copied.push(text)}}});
 (await import(`../dist/workspace-app.js?case-work=${sequence++}`)).startWorkspace();const $=s=>{const el=document.querySelector(s);assert(el,s);return el;};
 const h={window,document,$,click:s=>$(s).click(),data:()=>JSON.parse(raw),block:v=>blocked=v,external:b=>raw=JSON.stringify(b),copied,type:(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));}};
 h.divide=()=>{h.click('[data-direct-open]');h.click('[data-equation-mode="divide"]');h.click('[data-balance-manual]');h.type('[data-balance-input]','x');h.click('[data-balance-key="→"]');h.click('[data-balance-apply]');};
 h.start=()=>{h.click('[data-equation-case="0"]');h.click('[data-case-continue]');};
 h.line=async value=>{h.click('[data-direct-open-input]');h.type('[data-work-expression]',value);await new Promise(r=>setTimeout(r,140));h.click('[data-input-save]');};
 return h;
}
for(const auxiliary of [false,true])test(`zero-case workspace preserves the ${auxiliary?'auxiliary':'main'} nonzero branch and records an explicitly unverified conclusion`,async()=>{
 const h=await setup(fixture(auxiliary));h.divide();const before=h.data(),source=selected(before),nonzero=source.rows[source.active];assert(nonzero.assumptions.includes('x ≠ 0'));
 h.click('[data-equation-case="0"]');h.click('[data-task-close]');assert.deepEqual(h.data(),before);h.start();const started=h.data(),work=selected(started),row=work.rows[0];
 assert.deepEqual(started.rows,before.rows);assert.deepEqual(started.auxiliary.slice(0,-1),before.auxiliary);assert.equal(work.caseWork.sourceSheet,auxiliary?'aux-1':null);
 assert.equal(row.value,'x^2 = x');assert(row.assumptions.includes('x = 0'));assert(!row.assumptions.includes('x ≠ 0'));assert(!row.condition.includes('x ≠ 0'));
 for(const field of ['bindings','excluded','logicStatements'])assert.deepEqual(row[field],original()[field]);assert.deepEqual(row.conditions,['x ≥ 0']);assert.deepEqual(row.pendingCases,[]);assert.equal(row.practiceId,null);assert.equal(row.practiceAnswer,undefined);assert.deepEqual(row.origin,originSnapshot(row));assert.equal(h.document.querySelector('[data-aux-apply]'),null);
 await h.line('0=0');const written=h.data();h.click('[data-case-result-open]');h.click('[data-case-result-save]');assert.match(h.$('.work-task-error').textContent,/모두 적어/);assert.deepEqual(h.data(),written);
 h.type('[data-case-conclusion]','x=0은 해입니다.');h.type('[data-case-reason]','원래 범위에서 0이 허용되고, 0²=0입니다.');h.click('[data-case-result-save]');const recorded=h.data();assert.match(h.$('[data-case-status]').textContent,/기록됨.*검증 안 됨/);assert.equal(selected(recorded).caseWork.result.conclusion,'x=0은 해입니다.');assert.deepEqual(recorded.rows,before.rows);
 h.click('[data-case-return]');assert.equal(h.data().activeAuxId,before.activeAuxId);assert.equal(selected(h.data()).active,source.active);assert.deepEqual(selected(h.data()).rows,source.rows);assert.match(h.$('[data-equation-case="0"]').textContent,/결론 기록됨 · 미검증/);
 h.start();assert.equal(h.data().auxiliary.length,started.auxiliary.length);assert.equal(selected(h.data()).id,work.id);assert.equal(selected(h.data()).rows.length,2);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),written);h.click('[data-history-undo]');assert.deepEqual(h.data(),started);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

test('case conclusions survive reload and version-one backup, copy as unverified, and reset only to the zero case',async()=>{
 let h=await setup();h.divide();h.start();await h.line('0=0');h.click('[data-case-result-open]');h.type('[data-case-conclusion]','x=0');h.type('[data-case-reason]','0²=0。<script>not executable</script>');h.click('[data-case-result-save]');const saved=h.data(),backup=serializeBackup(saved);assert.equal(JSON.parse(backup).version,1);assert.deepEqual(parseBackup(backup),saved);
 h=await setup(parseBackup(backup));assert.match(h.$('[data-case-status]').textContent,/미검증|검증 안 됨/);assert.equal(h.document.querySelector('.work-case-work script'),null);
 h.click('[data-copy-menu]');h.click('[data-copy-format="steps"]');await Promise.resolve();assert.match(h.copied.at(-1),/결론 기록됨 · 수학적 검증 안 됨/);assert.match(h.copied.at(-1),/이유: 0²=0/);h.click('[data-task-close]');
 h.click('[data-direct-open]');h.click('[data-direct-reset]');const row=selected(h.data()).rows.at(-1);assert.equal(row.value,'x^2 = x');assert(row.assumptions.includes('x = 0'));assert(!row.assumptions.includes('x ≠ 0'));
 h.click('[data-backup-open]');Object.defineProperty(h.$('[data-backup-file]'),'files',{value:[{size:backup.length,text:async()=>backup}]});h.$('[data-backup-file]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));h.click('[data-backup-restore]');assert.deepEqual(h.data(),saved);
});

test('opening cases preserves existing input, and a conclusion draft survives navigation attempts, cancel, quota failure and retry',async()=>{
 const h=await setup();h.divide();const before=h.data();h.click('[data-free-input]');h.type('[data-work-expression]','x+77');const field=h.$('[data-work-expression]');h.click('[data-equation-case="0"]');assert.equal(h.$('[data-work-expression]'),field);assert.equal(field.value,'x+77');assert.deepEqual(h.data(),before);h.click('[data-task-close]');
 h.start();const started=h.data();h.click('[data-case-result-open]');h.type('[data-case-conclusion]','아직 작성 중');h.type('[data-case-reason]','취소할 이유');h.click('[data-sheet="main"]');h.click('[data-case-return]');h.click('[data-history-undo]');assert.equal(h.$('[data-case-conclusion]').value,'아직 작성 중');assert.deepEqual(h.data(),started);h.click('[data-task-close]');assert.deepEqual(h.data(),started);
 h.click('[data-case-result-open]');h.type('[data-case-conclusion]','x=0');h.type('[data-case-reason]','0²=0으로 확인');h.block(true);h.click('[data-case-result-save]');assert.match(h.$('.work-task-error').textContent,/저장하지 못/);assert.equal(h.$('[data-case-reason]').value,'0²=0으로 확인');assert.deepEqual(h.data(),started);h.block(false);h.click('[data-case-result-save]');assert.equal(selected(h.data()).caseWork.result.conclusion,'x=0');h.click('[data-history-undo]');assert.deepEqual(h.data(),started);
});

test('case creation is single-use, rolls back failed saves, and respects the auxiliary limit',async()=>{
 let h=await setup();h.divide();const before=h.data();h.click('[data-equation-case="0"]');h.block(true);h.click('[data-case-continue]');assert.deepEqual(h.data(),before);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.block(false);const button=h.$('[data-case-continue]');button.click();button.click();assert.equal(h.data().auxiliary.length,before.auxiliary.length+1);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 const full=structuredClone(before);full.auxiliary=Array.from({length:20},(_,i)=>({...structuredClone(before.auxiliary[0]),id:`aux-${i+1}`}));full.auxSequence=20;h=await setup(full);h.start();assert.deepEqual(h.data(),full);assert.match(h.$('.work-task-error').textContent,/20개/);
 const fullMain=structuredClone(before);while(fullMain.rows.length<300)fullMain.rows.push({value:'x+8',title:'직접 입력'});h=await setup(fullMain);h.start();assert.equal(h.data().rows.length,300);assert.equal(h.data().auxiliary.length,2);
});

test('legacy cases use only saved pre-division context, acquire a reusable link, and keep the same backup version',async()=>{
 const book=fixture(),branch={condition:'x = 0',equation:'x^2=x',previousCondition:'x는 실수',previousAssumptions:['x는 실수'],previousCases:[],bindings:{}};
 Object.assign(book.rows[1],{value:'x=1',condition:'x는 실수; x ≠ 0',assumptions:['x ≠ 0'],conditions:['x ≠ 0'],excluded:['0'],logicStatements:[{domain:'x ∈ ℝ',formula:'x ≠ 0',meaning:'나눈 뒤 주장'}],pendingCases:[branch]});
 const h=await setup(parseBackup(serializeBackup(book)));h.start();const row=selected(h.data()).rows[0];assert(!row.condition.includes('x ≠ 0'));assert.deepEqual(row.excluded,[]);assert.deepEqual(row.logicStatements,[]);assert.deepEqual(row.conditions,[]);const once=h.data();h.click('[data-case-return]');h.start();assert.equal(h.data().auxiliary.length,once.auxiliary.length);assert.deepEqual(parseBackup(serializeBackup(h.data())),h.data());
});

for(const auxiliary of [false,true])test(`return references survive inserting earlier ${auxiliary?'auxiliary':'main'} rows`,async()=>{
 const h=await setup(fixture(auxiliary));h.divide();const split=h.data(),source=selected(split);h.start();const workId=selected(h.data()).id;h.click('[data-case-return]');h.click('[data-work-row="0"]');await h.line('x+88');h.click(`[data-sheet="${workId}"]`);h.click('[data-case-return]');const returned=selected(h.data());assert.equal(returned.active,source.active+1);assert.equal(returned.rows[returned.active].value,source.rows[source.active].value);assert.deepEqual(parseBackup(serializeBackup(h.data())),h.data());
});

test('nested auxiliary work stays in the zero-case context and cannot offer a cross-branch result substitution',async()=>{
 const h=await setup();h.divide();h.start();const parent=selected(h.data());h.click('[data-new-aux]');h.type('[data-work-expression]','0^2=0');await new Promise(r=>setTimeout(r,140));h.click('[data-input-save]');const child=selected(h.data());assert.equal(child.caseWork.sourceSheet,parent.id);assert.equal(child.caseWork.condition,'x = 0');assert(child.rows[0].assumptions.includes('x = 0'));assert(!child.rows[0].assumptions.includes('x ≠ 0'));assert.equal(h.document.querySelector('[data-aux-apply]'),null);h.click('[data-case-return]');assert.equal(selected(h.data()).id,parent.id);
});

test('existing advanced calculations opened inside a zero case retain that scope without leaking matrix display into later formulas',async()=>{
 const h=await setup();h.divide();h.start();const before=h.data();h.click('[data-new-aux]');h.click('[data-input-type="matrix"]');h.click('[data-adv-example]');h.click('[data-adv-calculate]');const matrix=selected(h.data());assert.equal(matrix.caseWork.condition,'x = 0');assert(matrix.rows[matrix.active].displayLatex);assert(matrix.rows.every(r=>r.assumptions.includes('x = 0')&&!r.assumptions.includes('x ≠ 0')));assert.equal(h.document.querySelector('[data-aux-apply]'),null);
 h.click('[data-structured-input]');h.click('[data-input-type="calculus"]');h.click('[data-adv-example]');h.click('[data-adv-calculate]');const calculus=selected(h.data()),last=calculus.rows[calculus.active];assert.equal(calculus.caseWork.sourceSheet,matrix.id);assert(last.assumptions.includes('x = 0'));assert(!last.assumptions.includes('x ≠ 0'));assert.equal(last.displayLatex,undefined);assert.equal(last.matrix,undefined);assert.deepEqual(h.data().rows,before.rows);assert.deepEqual(parseBackup(serializeBackup(h.data())),h.data());
});

test('a newer workspace cannot be overwritten by a case start or conclusion save',async()=>{
 let h=await setup();h.divide();h.click('[data-equation-case="0"]');let latest=structuredClone(h.data());latest.rows.push({value:'99',title:'다른 화면'});h.external(latest);h.click('[data-case-continue]');assert.deepEqual(h.data(),latest);assert.match(h.$('.work-task-error').textContent,/다른 화면/);
 h=await setup();h.divide();h.start();h.click('[data-case-result-open]');h.type('[data-case-conclusion]','x=0');h.type('[data-case-reason]','0²=0');latest=structuredClone(h.data());latest.rows.push({value:'99',title:'다른 화면'});h.external(latest);h.click('[data-case-result-save]');assert.deepEqual(h.data(),latest);assert.equal(h.$('[data-case-reason]').value,'0²=0');
});
