import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';import {WORK_KEY} from '../dist/workspace-state.js';import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
const problem=id=>PRACTICE_PROBLEMS.find(p=>p.id===id);
const row=(id,answer)=>({value:problem(id).value,title:problem(id).title,practiceId:id,practiceAnswer:answer,practiceFeedback:checkPractice(problem(id),answer),condition:'원래 조건 메모',bindings:{t:'x+1'},assumptions:['x는 실수'],excluded:['0'],pendingCases:[],logicStatements:[],note:'보존할 풀이'});
const notebook=()=>({rows:[row('factor-1','(x-3)(x+1)'),row('power-1','128'),row('power-3','63')],active:1,activeAuxId:null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x^2-2x-3',rows:[row('power-2','1/9')],active:0}]});
let sequence=0;
async function setup(book=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.math=math;window.innerWidth=320;window.innerHeight=640;window.matchMedia=()=>({matches:true});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};
 let saved=JSON.stringify(book),writes=0,blocked=false;
 Object.assign(globalThis,{window,document,localStorage:{getItem:k=>k===WORK_KEY?saved:null,setItem:(k,v)=>{if(blocked)throw Error('quota');saved=v;writes++;}},requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?followups=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,s);return e;},click=s=>$(s).click(),input=(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));};
 return {$,click,input,document,window,data:()=>JSON.parse(saved),writes:()=>writes,block:v=>blocked=v,external:b=>saved=JSON.stringify(b),menu:()=>click('[data-practice-panel] [data-practice-next]')};
}

test('saved correct answers offer an explicit choice; edits hide it and cannot be discarded by a background button',async()=>{
 const book=notebook();book.rows[1].practiceAnswer='';book.rows[1].practiceFeedback=null;
 const h=await setup(book),before=h.data();h.click('[data-practice-open]');h.input('[data-practice-answer]','128');h.click('[data-practice-check]');
 const checked=h.data();assert.equal(checked.active,before.active);assert.equal(checked.rows.length,before.rows.length);assert.deepEqual(checked.rows[1].bindings,before.rows[1].bindings);
 assert(h.$('[data-practice-check]').hidden);assert(!h.$('.work-task-navigation [data-practice-next]').hidden);
 h.input('[data-practice-answer]','128+1');const field=h.$('[data-practice-answer]');field.setSelectionRange(1,4);
 assert(!h.$('[data-practice-check]').hidden);assert(h.$('.work-task-navigation [data-practice-next]').hidden);h.menu();
 assert.equal(h.$('[data-practice-answer]'),field);assert.equal(field.value,'128+1');assert.deepEqual([field.selectionStart,field.selectionEnd],[1,4]);assert.deepEqual(h.data(),checked);
 h.input('[data-practice-answer]','128');const writes=h.writes();h.click('.work-task-navigation [data-practice-next]');
 assert.deepEqual(h.data(),checked);assert.equal(h.writes(),writes);assert(h.$('#toast').hidden);assert(h.$('[data-practice-start="power-2"]'));assert(h.$('[data-practice-resume="2"]'));
 assert.equal(h.document.querySelectorAll('.work-practice-followups button').length,2);h.click('[data-task-close]');assert.deepEqual(h.data(),checked);
});

test('choosing a new problem preserves all previous work and undo returns to the checked answer',async()=>{
 const h=await setup(),before=h.data();h.menu();h.click('[data-practice-start="power-2"]');const after=h.data();
 assert.equal(after.rows.length,before.rows.length+1);assert.equal(after.rows[after.active].practiceId,'power-2');assert.equal(after.rows[after.active].condition,problem('power-2').condition);assert.deepEqual(after.rows[after.active].bindings,{});assert.equal(after.rows[after.active].practiceFeedback,null);
 assert.deepEqual(after.rows.filter((_,i)=>i!==after.active),before.rows);assert.deepEqual(after.auxiliary,before.auxiliary);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);h.menu();assert(h.$('[data-practice-start="power-2"]'));
});

test('choosing an incorrect record reopens its answer with its exact conditions and substitutions',async()=>{
 const h=await setup(),before=h.data();h.menu();h.click('[data-practice-resume="2"]');const resumed=h.data();
 assert.equal(resumed.active,2);assert.deepEqual(resumed.rows,before.rows);assert.deepEqual(resumed.auxiliary,before.auxiliary);assert.equal(h.$('[data-practice-answer]').value,'63');assert.equal(h.$('[data-practice-feedback]').dataset.status,'incorrect');
 h.input('[data-practice-answer]','64');h.click('[data-practice-check]');const checked=h.data();assert.equal(checked.rows[2].practiceFeedback.status,'correct');assert.deepEqual(checked.rows[2].bindings,before.rows[2].bindings);assert.equal(checked.rows[2].condition,before.rows[2].condition);
 assert.deepEqual(parseBackup(serializeBackup(checked)),checked);const reload=await setup(parseBackup(serializeBackup(checked)));assert.deepEqual(reload.data(),checked);reload.menu();assert.equal(reload.document.querySelector('[data-practice-resume]'),null);assert(reload.$('[data-practice-start="power-4"]'));
});

for(const kind of ['free','board'])test(`followup selection preserves an open ${kind} draft without changing rows or sheet`,async()=>{
 const h=await setup(),before=h.data();h.click(kind==='free'?'[data-free-input]':'[data-context-board]');
 const selector=kind==='free'?'[data-work-expression]':'[data-board-condition]';h.input(selector,kind==='free'?'x+99':'x > 9');if(kind==='free')await new Promise(r=>setTimeout(r,140));
 const field=h.$(selector);field.selectionStart=1;field.selectionEnd=3;const markup=h.$('[data-work-task]').innerHTML,writes=h.writes();
 h.menu();h.menu();assert.equal(h.$(selector),field);assert.equal(field.value,kind==='free'?'x+99':'x > 9');assert.deepEqual([field.selectionStart,field.selectionEnd],[1,3]);assert.equal(h.$('[data-work-task]').innerHTML,markup);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
});

test('resume storage failure retains the choice and original selection; explicit retry then succeeds',async()=>{
 const h=await setup(),before=h.data();h.menu();h.block(true);h.click('[data-practice-resume="2"]');assert.deepEqual(h.data(),before);assert(h.$('[data-practice-resume="2"]'));assert.match(h.$('.work-task-error').textContent,/열지 못/);assert(h.$('[data-work-row="1"]').closest('.work-row').classList.contains('is-current'));
 h.block(false);h.click('[data-practice-resume="2"]');assert.equal(h.data().active,2);assert.deepEqual(h.data().rows,before.rows);assert.equal(h.$('[data-practice-answer]').value,'63');
});

test('the 300-row limit blocks only a new problem and still permits reopening existing work',async()=>{
 const book=notebook();while(book.rows.length<300)book.rows.push({value:'x+1',title:'직접 입력'});const h=await setup(book),before=h.data();h.menu();
 h.click('[data-practice-start="power-2"]');assert.deepEqual(h.data(),before);assert(h.$('[data-practice-resume="2"]'));assert.match(h.$('#toast').textContent,/300줄/);
 h.click('[data-practice-resume="2"]');assert.equal(h.data().active,2);assert.equal(h.data().rows.length,300);assert.deepEqual(h.data().rows,before.rows);
});

test('a completed topic offers the existing full list without creating progress or moving automatically',async()=>{
 const book=notebook();book.rows[2]=row('power-3','64');book.rows.push(row('power-2','1/9'),row('power-4','1/4'));const h=await setup(book),before=h.data(),writes=h.writes();h.menu();
 assert.equal(h.document.querySelectorAll('.work-practice-followups button').length,0);assert.match(h.$('.work-task-body').textContent,/숙련도를 판정하지 않습니다/);h.click('[data-practice-list-open]');
 h.$('[data-practice-picker]').dispatchEvent(new h.window.Event('toggle'));assert(h.$('[data-practice-picker]').open);assert.equal(h.document.querySelectorAll('[data-practice-list] button').length,17);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
});


test('a changed notebook in another tab blocks both followup actions without overwriting it',async()=>{
 for(const selector of ['[data-practice-start="power-2"]','[data-practice-resume="2"]']){
  const h=await setup(),changed=h.data();h.menu();changed.rows[0].note='다른 탭에서 저장한 내용';h.external(changed);h.click(selector);
  assert.deepEqual(h.data(),changed);assert(h.$('[data-work-row="1"]').closest('.work-row').classList.contains('is-current'));assert(h.$('[data-task-storage-conflict]'));assert(h.$(selector));
 }
});

test('a free formula temporarily held by row-removal confirmation survives followup selection and cancellation',async()=>{
 const h=await setup(),before=h.data();h.click('[data-free-input]');h.input('[data-work-expression]','x+99');await new Promise(r=>setTimeout(r,140));h.$('[data-work-expression]').setSelectionRange(1,3);
 h.click('[data-draft-context]');h.input('[data-board-condition]','x > 9');h.click('[data-board-save]');h.click('[data-row-remove="0"]');const markup=h.$('[data-work-task]').innerHTML;
 h.menu();assert(h.$('[data-row-remove-confirm]'));assert.equal(h.$('[data-work-task]').innerHTML,markup);assert.deepEqual(h.data(),before);
 h.click('[data-task-close]');assert.equal(h.$('[data-work-expression]').value,'x+99');assert.deepEqual([h.$('[data-work-expression]').selectionStart,h.$('[data-work-expression]').selectionEnd],[1,3]);h.click('[data-draft-context]');assert.equal(h.$('[data-board-condition]').value,'x > 9');assert.deepEqual(h.data(),before);
});
