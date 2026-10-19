import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
import {practiceAdditions} from './fixtures/practice-additions.mjs';

const original=()=>({rows:PRACTICE_PROBLEMS.filter(p=>!p.learning).map(p=>({value:p.value,title:p.title,practiceId:p.id,condition:p.condition,note:'보존할 기존 풀이',practiceAnswer:Array.isArray(p.answer)?p.answer.join(','):p.answer,practiceFeedback:checkPractice(p,Array.isArray(p.answer)?p.answer.join(','):p.answer)})),active:4,activeAuxId:null,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x^2-2x-3',rows:[{value:'x+1',condition:'x는 실수'}],active:0}],auxSequence:1});
let sequence=0;
async function setup(book){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.math=math;window.innerWidth=320;window.innerHeight=640;window.matchMedia=()=>({matches:true});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};
 const memory=new Map([[WORK_KEY,JSON.stringify(book)]]);let writes=0;
 Object.assign(globalThis,{window,document,localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>{writes++;memory.set(k,v);}},requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?additions=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,s);return e;};
 return {$,document,window,click:s=>$(s).click(),data:()=>JSON.parse(memory.get(WORK_KEY)),writes:()=>writes};
}

for(const cases of practiceAdditions)test(`${cases.id}: guidance keeps answer drafts and existing records, and checked work survives backup/reload`,async()=>{
 let h=await setup(original());const before=h.data();
 const picker=h.$('[data-practice-picker]');picker.open=true;picker.dispatchEvent(new h.window.Event('toggle'));
 assert.equal(h.document.querySelectorAll('[data-practice-list] button').length,17);const previewWrites=h.writes();h.click(`[data-practice-preview="${cases.id}"]`);assert.deepEqual(h.data(),before);assert.equal(h.writes(),previewWrites);h.click(`[data-practice-start="${cases.id}"]`);
 const started=h.data(),p=PRACTICE_PROBLEMS.find(p=>p.id===cases.id);
 assert.equal(started.rows[started.active].practiceId,cases.id);assert.equal(started.rows[started.active].condition,p.condition);
 assert.deepEqual(started.rows.filter(r=>r.practiceId!==cases.id),before.rows);assert.deepEqual(started.auxiliary,before.auxiliary);
 assert.match(h.$('[data-practice-guidance]').textContent,/난도:.*선행 개념:/);
 for(const s of ['[data-practice-hint]','[data-practice-solution]'])assert(!h.$(s).hasAttribute('open'));
 h.click('[data-practice-open]');const field=h.$('[data-practice-answer]');field.value=cases.correct[0];field.setSelectionRange(1,3);field.dispatchEvent(new h.window.Event('input',{bubbles:true}));
 const writes=h.writes();
 for(const s of ['[data-practice-hint]','[data-practice-solution]'])for(const open of [true,false,true]){
  const detail=h.$(`[data-work-task] ${s}`);detail.toggleAttribute('open',open);detail.dispatchEvent(new h.window.Event('toggle'));
  assert.equal(h.$('[data-practice-answer]'),field);assert.equal(field.value,cases.correct[0]);assert.deepEqual([field.selectionStart,field.selectionEnd],[1,3]);assert.deepEqual(h.data(),started);assert.equal(h.writes(),writes);
 }
 assert.equal(h.$('[data-work-task] [data-practice-solution] ol').children.length,3);
 h.click('[data-practice-check]');const checked=h.data();assert.equal(checked.rows[checked.active].practiceFeedback.status,'correct');
 assert.deepEqual(checked.rows.filter(r=>r.practiceId!==cases.id),before.rows);assert.deepEqual(checked.auxiliary,before.auxiliary);
 h.click('[data-task-close]');h.click('[data-history-undo]');assert.deepEqual(h.data(),started);
 const backup=serializeBackup(checked);assert.equal(JSON.parse(backup).version,1);assert.deepEqual(parseBackup(backup),checked);
 h=await setup(parseBackup(backup));assert.deepEqual(h.data(),checked);h.click('[data-practice-open]');assert.equal(h.$('[data-practice-answer]').value,cases.correct[0]);assert.equal(h.$('[data-practice-feedback]').dataset.status,'correct');
 h.$('[data-practice-answer]').value='취소할 초안';h.click('[data-task-close]');assert.deepEqual(h.data(),checked);
});
