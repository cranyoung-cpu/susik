import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
const problem=id=>PRACTICE_PROBLEMS.find(p=>p.id===id);
const row=(id,answer)=>({value:problem(id).value,title:problem(id).title,practiceId:id,practiceAnswer:answer||'',practiceFeedback:answer?checkPractice(problem(id),answer):null,condition:'보존할 조건',bindings:{t:'x+1'},note:'기존 풀이'});
const notebook=()=>({rows:[{value:'x+1',title:'직접 입력'},row('power-1')],active:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x+1',rows:[row('power-2','1/9')],active:0}],auxSequence:1});
let sequence=0;
async function setup(initial=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.math=math;window.innerWidth=320;window.innerHeight=420;window.matchMedia=()=>({matches:true});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};
 let saved=JSON.stringify(initial),writes=0,blocked=false;
 Object.assign(globalThis,{window,document,localStorage:{getItem:k=>k===WORK_KEY?saved:null,setItem:(k,v)=>{if(blocked)throw Error('quota');saved=v;writes++;}},requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?progress=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,s);return e;},click=s=>$(s).click(),input=(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));};
 const picker=()=>{$('[data-practice-picker]').open=true;$('[data-practice-picker]').dispatchEvent(new window.Event('toggle'));};
 return {$,click,input,picker,document,window,data:()=>JSON.parse(saved),writes:()=>writes,block:v=>blocked=v,counts:()=>$(('[data-practice-progress]')).textContent};
}

test('the existing picker provides three stages and distinguishes absent records from unchecked starts',async()=>{
 const initial=notebook();initial.rows=[initial.rows[0]];initial.active=0;const h=await setup(initial),before=h.data(),writes=h.writes();h.picker();h.picker();
 assert.equal(h.document.querySelectorAll('[data-practice-picker]').length,1);assert.equal(h.document.querySelectorAll('[data-practice-list] button').length,17);
 assert.equal(h.counts(),'답 확인 시도 0 · 정답 기록 0 · 미완료 17');assert.match(h.$('[data-practice-record-note]').textContent,/한 문제를 골라 첫 풀이를 시작/);
 assert.deepEqual([...h.document.querySelectorAll('.work-learning-path>ol strong')].map(e=>e.textContent),['개념 확인','예제로 연습','스스로 풀기']);
 assert.equal(h.$('[data-practice-state="power-2"]').textContent,'기록 없음');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 h.click('[data-practice-start="power-1"]');h.picker();assert.equal(h.$('[data-practice-state="power-1"]').textContent,'답 확인 전');assert.equal(h.counts(),'답 확인 시도 0 · 정답 기록 0 · 미완료 17');
 assert.deepEqual(h.data().rows.filter(r=>r.practiceId!=='power-1'),before.rows);assert.deepEqual(h.data().auxiliary,before.auxiliary);
});

test('answer checks update counts without replacing drafts; failures, undo, reload and backup retain the matching records',async()=>{
 const h=await setup(),before=h.data();h.picker();h.click('[data-practice-open]');h.click('[data-practice-check]');assert.equal(h.counts(),'답 확인 시도 0 · 정답 기록 0 · 미완료 17');
 h.input('[data-practice-answer]','127');h.click('[data-practice-check]');assert.equal(h.counts(),'답 확인 시도 1 · 정답 기록 0 · 미완료 17');assert.equal(h.$('[data-practice-state="power-1"]').textContent,'오답 기록');
 h.input('[data-practice-answer]','128');const field=h.$('[data-practice-answer]');field.setSelectionRange(1,2);const wrong=h.data();h.block(true);h.click('[data-practice-check]');assert.deepEqual(h.data(),wrong);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);assert.equal(h.counts(),'답 확인 시도 1 · 정답 기록 0 · 미완료 17');
 h.block(false);h.click('[data-practice-check]');assert.equal(h.$('[data-practice-answer]'),field);assert.deepEqual([field.selectionStart,field.selectionEnd],[1,2]);assert.equal(h.counts(),'답 확인 시도 1 · 정답 기록 1 · 미완료 16');assert.equal(h.$('[data-practice-state="power-1"]').textContent,'정답 기록 있음');
 const correct=h.data();h.input('[data-practice-answer]','129');assert.equal(h.counts(),'답 확인 시도 1 · 정답 기록 1 · 미완료 16');assert.deepEqual(h.data(),correct);h.click('[data-task-close]');h.click('[data-history-undo]');assert.deepEqual(h.data(),wrong);assert.equal(h.counts(),'답 확인 시도 1 · 정답 기록 0 · 미완료 17');
 const reloaded=await setup(parseBackup(serializeBackup(correct)));assert.deepEqual(reloaded.data(),correct);assert.equal(reloaded.counts(),'답 확인 시도 1 · 정답 기록 1 · 미완료 16');assert.deepEqual(correct.auxiliary,before.auxiliary);assert.deepEqual(correct.rows[1].bindings,before.rows[1].bindings);
});

test('reading progress preserves free and board drafts and the selected auxiliary sheet',async()=>{
 for(const kind of ['free','board']){
  const initial=notebook();initial.activeAuxId='aux-1';initial.rows[1]=row('power-1','128');const h=await setup(initial),before=h.data();h.click(kind==='free'?'[data-free-input]':'[data-context-board]');const selector=kind==='free'?'[data-work-expression]':'[data-board-condition]';h.input(selector,kind==='free'?'x+99':'x > 9');
  if(kind==='free')await new Promise(r=>setTimeout(r,140));const field=h.$(selector);field.selectionStart=1;field.selectionEnd=3;const writes=h.writes(),markup=h.$('[data-work-task]').innerHTML;h.picker();h.picker();
  assert.equal(h.counts(),'답 확인 시도 1 · 정답 기록 1 · 미완료 16');assert.equal(h.$('[data-practice-state="power-2"]').textContent,'기록 없음');h.click('[data-practice-start="log-4"]');
  assert.equal(h.$(selector),field);assert.deepEqual([field.selectionStart,field.selectionEnd],[1,3]);assert.equal(h.$('[data-work-task]').innerHTML,markup);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 }
});
