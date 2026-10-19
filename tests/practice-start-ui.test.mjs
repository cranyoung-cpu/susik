import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {PRACTICE_LESSONS} from '../dist/practice-lessons.js';
import {PRACTICE_PROBLEMS} from '../dist/learning-tools.js';
import {directMath} from '../dist/direct-editor.js';

function notebook(count,auxiliary=false){
 const row=i=>({value:`x+${i}`,title:'직접 입력',startNew:true,note:`기존 설명 ${i}`,condition:'x는 실수',assumptions:['x ≠ 0'],conditions:['x ≠ 0'],bindings:{t:'x+1'},excluded:['0'],pendingCases:[{condition:'x = 0',equation:'x^2=x'}],logicStatements:[{kind:'가정',domain:'x ∈ ℝ',formula:'x > 0',meaning:'양수'}],practiceId:'factor-1',practiceAnswer:'이전 답',practiceFeedback:{status:'unverified',message:'이전 결과'}});
 const rows=Array.from({length:count},(_,i)=>row(i));rows.at(-1).archived=true;
 return {rows,active:12,activeAuxId:auxiliary?'aux-1':null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:7,sourceValue:rows[7].value,rows:Array.from({length:300},(_,i)=>row(i+400)),active:1}]};
}
let sequence=0;
async function setup(book,linked=false){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.location={search:linked?`?practice=${linked===true?'log-2':encodeURIComponent(linked)}`:''};window.math=math;window.innerWidth=320;window.innerHeight=640;
 window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 window.HTMLInputElement.prototype.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
 let saved=JSON.stringify(book),writes=0;
 const storage={getItem:key=>key===WORK_KEY?saved:null,setItem:(key,value)=>{if(key===WORK_KEY){saved=value;writes++;}}};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?practice-start-test=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,'Missing '+s);return e;},click=s=>$(s).click();
 const picker=()=>{const e=$('[data-practice-picker]');e.open=true;e.dispatchEvent(new window.Event('toggle'));};
 return {window,document,$,click,picker,data:()=>JSON.parse(saved),writes:()=>writes,external:value=>{saved=JSON.stringify(value);}};
}

for(const auxiliary of [false,true])test(`linked practice shows its original problem and domain before changing ${auxiliary?'auxiliary':'main'} work`,async()=>{
 const book=notebook(20,auxiliary),h=await setup(book,'log-4'),p=PRACTICE_PROBLEMS.find(p=>p.id==='log-4');
 const banner=h.$('[data-linked-practice]');
 const expected=parseHTML(`<div>${directMath(p.value)}</div>`).document.querySelector('div');
 assert.equal(banner.querySelector('[data-linked-practice-problem]').innerHTML,expected.innerHTML);
 assert(banner.textContent.includes(`주어진 조건: ${p.condition}`));assert(banner.textContent.includes(p.prompt));
 assert.equal(banner.querySelector('[data-practice-start]').dataset.practiceStart,p.id);
 assert.equal(banner.querySelectorAll('details,[data-practice-guidance],[data-practice-answer]').length,0);
 assert(!banner.textContent.includes(p.learning.hint));assert(!banner.textContent.includes(p.learning.check));assert.doesNotMatch(banner.textContent,/x\s*=\s*6/);
 assert.deepEqual(h.data(),book);assert.equal(h.$(`[data-sheet="${auxiliary?'aux-1':'main'}"]`).getAttribute('aria-selected'),'true');
 const writes=h.writes();h.click('[data-linked-dismiss]');
 assert.equal(h.document.querySelector('[data-linked-practice]'),null);assert.deepEqual(h.data(),book);assert.equal(h.writes(),writes);
 assert.equal(h.$(`[data-sheet="${auxiliary?'aux-1':'main'}"]`).getAttribute('aria-selected'),'true');
});

for(const auxiliary of [false,true])for(const linked of [false,true])test(`300-row practice failure preserves ${auxiliary?'auxiliary':'main'} selection, draft and undo from ${linked?'lesson link':'picker'}`,async()=>{
 const h=await setup(notebook(300,auxiliary),linked),before=h.data();
 const active=auxiliary?before.auxiliary[0].active:before.active;
 h.click(`[data-note-edit="${active}"]`);h.$('[data-note-draft]').value='직전 저장한 설명';h.click('[data-note-save]');
 const saved=h.data();
 if(!linked)h.picker();
 h.click('[data-free-input]');const field=h.$('[data-work-expression]');field.value='(x+7)^2';field.dispatchEvent(new h.window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,150));field.setSelectionRange(1,4);
 const markup=h.$('#app').innerHTML,writes=h.writes(),selector=linked?'[data-linked-practice] [data-practice-start]':'[data-practice-list] [data-practice-preview="log-2"]';
 for(let i=0;i<3;i++){
  h.click(selector);assert.match(h.$('#toast').textContent,linked?/300줄/:/작성 중/);assert.equal(h.$('#toast').hidden,false);
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
 h.picker();const writes=h.writes();h.click('[data-practice-preview="roots-2"]');for(let i=0;i<2;i++)h.click('[data-practice-start="roots-2"]');assert.deepEqual(h.data(),saved);assert.equal(h.writes(),writes);assert.match(h.$('#toast').textContent,/300줄/);assert(h.$('[data-practice-preview-content]'));
 // Undo returns to the sheet and row selected before starting, including from an auxiliary sheet.
 // Failed attempts must not consume history; retry after undoing the successful start.
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);h.picker();h.click('[data-practice-preview="roots-2"]');h.click('[data-practice-start="roots-2"]');
 assert.equal(h.data().rows.length,300);assert.equal(h.data().rows[h.data().active].practiceId,'roots-2');assert.deepEqual(h.data().rows.filter((_,i)=>i!==insertAt),before.rows);
});

for(const auxiliary of [false,true])test(`all picker problems preview and cancel without changing ${auxiliary?'auxiliary':'main'} work`,async()=>{
 const h=await setup(notebook(20,auxiliary)),before=h.data(),writes=h.writes();h.picker();
 assert.equal(h.document.querySelectorAll('[data-practice-list] [data-practice-start]').length,0);
 for(const p of PRACTICE_PROBLEMS){
  for(let i=0;i<2;i++)h.click(`[data-practice-preview="${p.id}"]`);
  const preview=h.$('[data-practice-preview-content]'),expected=parseHTML(`<div>${directMath(p.value)}</div>`).document.querySelector('div');
  assert.equal(preview.querySelector('div').innerHTML,expected.innerHTML);assert(preview.textContent.includes(p.condition));assert(preview.textContent.includes(p.prompt));
  assert.equal(h.$('[data-work-task] [data-practice-start]').dataset.practiceStart,p.id);
  assert.equal(h.$('[data-work-task]').querySelectorAll('details,[data-practice-guidance],[data-practice-answer],[data-practice-feedback]').length,0);
  if(p.learning){assert(!preview.textContent.includes(p.learning.hint));assert(!preview.textContent.includes(p.learning.check));}
  assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);assert.equal(h.$(`[data-sheet="${auxiliary?'aux-1':'main'}"]`).getAttribute('aria-selected'),'true');
  h.click('[data-work-task] header [data-task-close]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 }
 assert(h.$('[data-history-undo]').disabled);
});

for(const auxiliary of [false,true])test(`negative exponent picker requires confirmation once and undo restores ${auxiliary?'auxiliary':'main'} work`,async()=>{
 const h=await setup(notebook(20,auxiliary)),before=h.data(),writes=h.writes();h.picker();
 h.click('[data-practice-preview="power-2"]');
 assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);assert.equal(h.document.querySelector('[data-practice-answer]'),null);
 const stale=h.$('[data-practice-start="power-2"]');h.click('[data-practice-preview="log-2"]');stale.click();
 assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 h.click('[data-practice-preview="power-2"]');const confirm=h.$('[data-practice-start="power-2"]');confirm.click();confirm.click();
 const after=h.data(),insertAt=(auxiliary?before.auxiliary[0].sourceIndex:before.active)+1,row=after.rows[insertAt];
 assert.equal(after.rows.length,before.rows.length+1);assert.equal(after.active,insertAt);assert.equal(after.activeAuxId,null);assert.equal(row.practiceId,'power-2');
 assert.equal(row.practiceAnswer,'');assert.equal(row.practiceFeedback,null);assert.deepEqual(row.bindings,{});assert.deepEqual(row.logicStatements,[]);
 assert.deepEqual(after.rows.filter((_,i)=>i!==insertAt),before.rows);assert.deepEqual(after.auxiliary,before.auxiliary);
 assert.equal(h.document.querySelector('[data-practice-preview-content]'),null);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);assert(h.$('[data-history-undo]').disabled);
});

test('a storage conflict still permits a read-only problem preview but prevents starting or replacing a draft',async()=>{
 for(const draft of [false,true]){
  const h=await setup(notebook(20,true));h.picker();
  if(draft){h.click('[data-free-input]');h.$('[data-work-expression]').value='x+99';}
  const changed=h.data(),writes=h.writes();changed.rows[0].note='다른 탭에서 저장한 설명';h.external(changed);
  h.click('[data-practice-preview="power-2"]');assert.deepEqual(h.data(),changed);assert.equal(h.writes(),writes);
  if(draft){assert.equal(h.$('[data-work-expression]').value,'x+99');assert.equal(h.document.querySelector('[data-practice-preview-content]'),null);}
  else{
   assert(h.$('[data-practice-preview-content]'));h.click('[data-practice-start="power-2"]');
   assert.deepEqual(h.data(),changed);assert.equal(h.writes(),writes);assert(h.$('[data-task-storage-conflict]'));assert(h.$('[data-practice-preview-content]'));
   h.click('[data-task-close]');assert.deepEqual(h.data(),changed);assert.equal(h.writes(),writes);
  }
  assert.equal(h.$('[data-sheet="aux-1"]').getAttribute('aria-selected'),'true');
 }
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

test('practice summaries link only to existing lessons that connect back to the exercise',async()=>{
 for(const [id,lesson]of Object.entries(PRACTICE_LESSONS)){
  assert(PRACTICE_PROBLEMS.some(p=>p.id===id));
  const {document}=parseHTML(fs.readFileSync(new URL(`../dist${lesson.path}index.html`,import.meta.url),'utf8'));
  assert(document.querySelector(`a[href="/?practice=${id}"]`));
  assert(lesson.summary.trim());
 }
 const h=await setup(notebook(20));
 assert.equal(h.document.querySelector('.work-practice-lesson'),null);
});

for(const kind of ['free formula','answer','note'])test(`opening and closing a lesson summary preserves the ${kind} draft and selected row without saving`,async()=>{
 const book=notebook(20);book.rows[book.active].practiceId='log-2';
 const h=await setup(book,true);
 assert.equal(h.document.querySelectorAll('.work-practice-lesson').length,1);
 const detail=h.$('.work-practice-lesson');assert(!detail.hasAttribute('open'));
 const link=detail.querySelector('a');assert.equal(link.getAttribute('target'),'_blank');assert.equal(link.getAttribute('rel'),'noopener');
 if(kind==='free formula')h.click('[data-free-input]');else if(kind==='answer')h.click('[data-practice-open]');else h.click(`[data-note-edit="${book.active}"]`);
 const selector=kind==='free formula'?'[data-work-expression]':kind==='answer'?'[data-practice-answer]':'[data-note-draft]',field=h.$(selector);
 field.value=kind==='note'?'설명 초안':'(x+7)';field.dispatchEvent(new h.window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,150));
 if(field.setSelectionRange)field.setSelectionRange(1,4);
 const selection=[field.selectionStart,field.selectionEnd],before=h.data(),writes=h.writes(),taskMarkup=h.$('[data-work-task]').innerHTML;
 for(const open of [true,false,true,false]){
  detail.querySelector('summary').click();detail.open=open;detail.dispatchEvent(new h.window.Event('toggle'));
  assert.equal(h.$(selector),field);assert.equal(field.value,kind==='note'?'설명 초안':'(x+7)');assert.deepEqual([field.selectionStart,field.selectionEnd],selection);
  assert.equal(h.$('[data-work-task]').innerHTML,taskMarkup);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
  assert.equal(h.$('[data-sheet="main"]').getAttribute('aria-selected'),'true');
 }
});
