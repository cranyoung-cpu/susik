import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';

function notebook(count,auxiliary=false){
 const row=i=>({value:`x+${i}`,title:'직접 입력',startNew:true,note:`기존 설명 ${i}`,condition:'x는 실수',assumptions:['x ≠ 0'],conditions:['x ≠ 0'],bindings:{t:'x+1'},excluded:['0'],pendingCases:[{condition:'x = 0',equation:'x^2=x'}],logicStatements:[{kind:'가정',domain:'x ∈ ℝ',formula:'x > 0',meaning:'양수'}],practiceId:'factor-1',practiceAnswer:'이전 답',practiceFeedback:{status:'unverified',message:'이전 결과'}});
 const rows=Array.from({length:count},(_,i)=>row(i));rows.at(-1).archived=true;
 return {rows,active:12,activeAuxId:auxiliary?'aux-1':null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:7,sourceValue:rows[7].value,rows:Array.from({length:300},(_,i)=>row(i+400)),active:1}]};
}
let sequence=0;
async function setup(book,linked=false){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.location={search:linked?'?practice=log-2':''};window.math=math;window.innerWidth=320;window.innerHeight=640;
 window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 window.HTMLInputElement.prototype.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
 let saved=JSON.stringify(book),writes=0;
 const storage={getItem:key=>key===WORK_KEY?saved:null,setItem:(key,value)=>{if(key===WORK_KEY){saved=value;writes++;}}};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?practice-start-test=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,'Missing '+s);return e;},click=s=>$(s).click();
 const picker=()=>{const e=$('[data-practice-picker]');e.open=true;e.dispatchEvent(new window.Event('toggle'));};
 return {window,document,$,click,picker,data:()=>JSON.parse(saved),writes:()=>writes};
}

for(const auxiliary of [false,true])for(const linked of [false,true])test(`300-row practice failure preserves ${auxiliary?'auxiliary':'main'} selection, draft and undo from ${linked?'lesson link':'picker'}`,async()=>{
 const h=await setup(notebook(300,auxiliary),linked),before=h.data();
 const active=auxiliary?before.auxiliary[0].active:before.active;
 h.click(`[data-note-edit="${active}"]`);h.$('[data-note-draft]').value='직전 저장한 설명';h.click('[data-note-save]');
 const saved=h.data();
 if(!linked)h.picker();
 h.click('[data-free-input]');const field=h.$('[data-work-expression]');field.value='(x+7)^2';field.dispatchEvent(new h.window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,150));field.setSelectionRange(1,4);
 const markup=h.$('#app').innerHTML,writes=h.writes(),selector=linked?'[data-linked-practice] [data-practice-start]':'[data-practice-list] [data-practice-start="log-2"]';
 for(let i=0;i<3;i++){
  h.click(selector);assert.match(h.$('#toast').textContent,/300줄/);assert.equal(h.$('#toast').hidden,false);
  assert.deepEqual(h.data(),saved);assert.equal(h.writes(),writes);assert.equal(h.$('#app').innerHTML,markup);
  assert.equal(h.$('[data-work-expression]'),field);assert.equal(field.value,'(x+7)^2');assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,4);
  assert.equal(h.$(`[data-sheet="${auxiliary?'aux-1':'main'}"]`).getAttribute('aria-selected'),'true');
 }
 h.click('.work-task-navigation [data-task-close]');assert.deepEqual(h.data(),saved);assert.equal(h.writes(),writes);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);assert(h.$('[data-history-undo]').disabled);
 if(linked){assert(h.$('[data-linked-practice]'));const count=h.writes();h.click('[data-linked-dismiss]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),count);assert.equal(h.document.querySelector('[data-linked-practice]'),null);}
});

for(const auxiliary of [false,true])test(`299 main rows allow one practice from ${auxiliary?'a full auxiliary sheet':'main'}, and 300 rows reject the next`,async()=>{
 const h=await setup(notebook(299,auxiliary),true),before=h.data();h.click('[data-linked-practice] [data-practice-start]');
 const saved=h.data(),insertAt=(auxiliary?before.auxiliary[0].sourceIndex:before.active)+1;
 assert.equal(saved.rows.length,300);assert.equal(saved.activeAuxId,null);assert.equal(saved.active,insertAt);assert.equal(saved.rows[insertAt].practiceId,'log-2');
 assert.deepEqual(saved.rows.filter((_,i)=>i!==insertAt),before.rows);assert.deepEqual(saved.auxiliary,before.auxiliary);
 assert.equal(h.document.querySelector('[data-linked-practice]'),null);
 h.picker();const writes=h.writes();for(let i=0;i<2;i++)h.click('[data-practice-start="roots-2"]');assert.deepEqual(h.data(),saved);assert.equal(h.writes(),writes);assert.match(h.$('#toast').textContent,/300줄/);
 // Undo returns to the sheet and row selected before starting, including from an auxiliary sheet.
 // Failed attempts must not consume history; retry after undoing the successful start.
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);h.picker();h.click('[data-practice-start="roots-2"]');
 assert.equal(h.data().rows.length,300);assert.equal(h.data().rows[h.data().active].practiceId,'roots-2');assert.deepEqual(h.data().rows.filter((_,i)=>i!==insertAt),before.rows);
});

for(const auxiliary of [false,true])for(const kind of ['free formula','note'])test(`dismissing a linked practice preserves the open ${kind} on ${auxiliary?'auxiliary':'main'}`,async()=>{
 const h=await setup(notebook(20,auxiliary),true),active=auxiliary?h.data().auxiliary[0].active:h.data().active;
 if(kind==='free formula')h.click('[data-free-input]');else h.click(`[data-note-edit="${active}"]`);
 const before=h.data(),writes=h.writes(),selector=kind==='free formula'?'[data-work-expression]':'[data-note-draft]',field=h.$(selector);field.value=kind==='free formula'?'x+8':'작성 중인 설명';
 if(kind==='free formula'){field.dispatchEvent(new h.window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,150));field.setSelectionRange(1,3);}
 const task=h.$('[data-work-task]'),markup=task.innerHTML,button=h.$('[data-linked-dismiss]');button.click();button.click();
 assert.equal(h.document.querySelector('[data-linked-practice]'),null);assert.equal(h.$(selector),field);assert.equal(task.innerHTML,markup);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 assert.equal(h.$(`[data-sheet="${auxiliary?'aux-1':'main'}"]`).getAttribute('aria-selected'),'true');
 if(kind==='free formula'){assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,3);h.click('[data-input-save]');assert.equal(h.data().rows.length,before.rows.length+1);}
 else{h.click('[data-note-save]');assert.equal((auxiliary?h.data().auxiliary[0]:h.data()).rows[active].note,'작성 중인 설명');}
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);assert.equal(h.document.querySelector('[data-linked-practice]'),null);
});
