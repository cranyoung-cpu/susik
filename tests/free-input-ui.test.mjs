import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';
import {originSnapshot} from '../dist/workspace-origin.js';
import {serializeBackup,parseBackup,isManualRow} from '../dist/workspace-backup.js';

const richRow=()=>({value:'x^2=x',title:'직접 입력',startNew:true,condition:'x는 실수',assumptions:['x ≠ 0'],conditions:['x ≠ 0'],bindings:{t:'x+1'},excluded:['0'],pendingCases:[{condition:'x = 0',equation:'x^2=x',previousAssumptions:['x는 실수']}],logicStatements:[{kind:'가정',domain:'x ∈ ℝ',formula:'∀x ∈ ℝ (x² ≥ 0)',meaning:'모든 실수의 제곱은 0 이상입니다.'}],practiceId:'factor-1',practiceAnswer:'old answer',practiceFeedback:{status:'unverified',message:'이전 결과'},note:'기존 설명'});
function notebook(activeAuxId=null){
 const first=richRow();first.origin=originSnapshot(first);
 return {rows:[first,{...richRow(),value:'x = 1',startNew:false,parent:0,origin:originSnapshot(first)},{value:'x+9',title:'직접 입력',startNew:true,parent:0}],active:1,activeAuxId,auxSequence:2,auxiliary:[
  {id:'aux-1',name:'보조 1',sourceIndex:2,sourceValue:'x+9',rows:[richRow()],active:0},
  {id:'aux-2',name:'행렬 2',sourceIndex:0,sourceValue:first.value,rows:[{...richRow(),value:'[1,2]',displayLatex:'\\begin{bmatrix}1&2\\end{bmatrix}',matrix:[['1','2']]}],active:0,entry:{type:'matrix',mode:'transpose',a:[['1','2']],b:[['1','2']]}}
 ]};
}
let sequence=0;
async function setup(book=notebook(),touch=false){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLInputElement.prototype.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
 const entries=new Map([[WORK_KEY,JSON.stringify(book)],['susik-lab.composer.v1','legacy preserved']]);let blocked=false,writes=0;
 const storage={getItem:k=>entries.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');writes++;entries.set(k,v);}};
 window.math=math;window.innerWidth=320;window.innerHeight=640;window.matchMedia=()=>({matches:touch});
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?free-input-test=${sequence++}`)).startWorkspace();
 const $=s=>{const el=document.querySelector(s);assert(el,'Missing '+s);return el;};
 const click=s=>$(s).click(),data=()=>JSON.parse(entries.get(WORK_KEY));
 const type=async value=>{$('[data-work-expression]').value=value;$('[data-work-expression]').dispatchEvent(new window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,140));};
 return {$,click,data,type,document,window,storage,entries,writes:()=>writes,block:value=>{blocked=value;}};
}
function assertClean(row){
 assert.equal(row.startNew,true);assert.equal(row.parent,undefined);assert(isManualRow(row));
 assert.equal(row.condition,'');assert.deepEqual(row.bindings,{});
 for(const key of ['assumptions','conditions','excluded','pendingCases','logicStatements'])assert.deepEqual(row[key],[],key);
 assert.equal(row.practiceId,null);assert.equal(row.practiceAnswer,'');assert.equal(row.practiceFeedback,null);assert.equal(row.note,'');
 assert.equal(row.displayLatex,undefined);assert.equal(row.matrix,undefined);
 assert.deepEqual(row.origin,originSnapshot(row));
}

test('draft hints, accessible errors and inequality keys preserve the existing notebook',async()=>{
 const h=await setup(),before=h.data();h.click('[data-free-input]');
 const field=h.$('[data-work-expression]');
 for(const id of field.getAttribute('aria-describedby').split(' '))assert(h.document.getElementById(id));
 assert.match(h.$('#work-input-draft').textContent,/초안은 저장되지 않습니다/);
 assert.equal(field.getAttribute('aria-invalid'),'false');
 await h.type('(x+1');assert.equal(field.getAttribute('aria-invalid'),'true');
 assert.match(h.$('#work-input-error').textContent,/1번째.*닫는/);
 assert.equal(field.value,'(x+1');assert(h.$('[data-input-save]').disabled);assert.deepEqual(h.data(),before);
 await h.type('');assert.equal(field.getAttribute('aria-invalid'),'false');assert.equal(h.$('#work-input-error').textContent,'');
 await h.type('x');h.click('[data-work-pad-tab="symbol"]');field.setSelectionRange(1,1);
 h.click('[data-work-key="≤"]');h.click('[data-work-pad-tab="number"]');h.click('[data-work-key="3"]');
 assert.equal(field.value,'x≤3');assert.equal(field.getAttribute('aria-invalid'),'false');assert(!h.$('[data-input-save]').disabled);
 assert.deepEqual(h.data(),before);h.click('[data-input-save]');assert.equal(h.data().rows.at(-1).value,'x ≤ 3');
 h.click('[data-direct-undo]');assert.deepEqual(h.data(),before);
});

test('free input is blank, rejects invalid expressions, and cancellation never writes or moves sheets',async()=>{
 const h=await setup(notebook('aux-1')),{$,click,data,type}=h,before=data(),writes=h.writes();
 click('[data-free-input]');assert.equal($('[data-work-expression]').value,'');assert($('[data-input-save]').disabled);
 assert(!h.document.querySelector('.work-task-source'));assert.equal($('[data-input-save]').textContent,'새 풀이 시작');
 click('[data-input-save]');assert.deepEqual(data(),before);
 for(const raw of ['   ','x+','integral(x)','x'.repeat(2001)]){await type(raw);assert($('[data-input-save]').disabled);click('[data-input-save]');assert.deepEqual(data(),before);}
 assert($('.work-task-error').textContent);
 await type('x+7');click('[data-task-close]');assert.deepEqual(data(),before);
 click('[data-free-input]');assert.equal($('[data-work-expression]').value,'');await type('x+8');
 click('.work-task-navigation [data-task-close]');assert.deepEqual(data(),before);
 click('[data-free-input]');await type('x+6');click('[data-free-input]');assert.equal($('[data-work-expression]').value,'x+6');assert.match($('#toast').textContent,/초안은 그대로/);click('[data-task-close]');click('[data-free-input]');assert.equal($('[data-work-expression]').value,'');
 assert.equal(h.writes(),writes);click('[data-task-close]');
});

test('location-specific correction hints preserve the draft and auxiliary work until an explicit save',async()=>{
 const h=await setup(notebook('aux-1')),before=h.data(),writes=h.writes();h.click('[data-free-input]');
 for(const [raw,hint,corrected] of [['sqrt()',/5번째.*비어/,'sqrt(x+1)'],['x+*2',/3번째.*앞/,'x+2'],['(x+)/2',/3번째.*뒤/,'(x+1)/2'],['=3',/1번째.*왼쪽/,'x=3'],['x＋1',/2번째.*입력용 \+/,'x+1'],['√(x)',/1번째.*sqrt/,'sqrt(x)']]){
  await h.type(raw);const field=h.$('[data-work-expression]');field.setSelectionRange(raw.length,raw.length);
  assert.equal(field.value,raw);assert.equal(field.selectionStart,raw.length);assert.equal(field.getAttribute('aria-invalid'),'true');assert(h.$('[data-input-save]').disabled);assert.match(h.$('#work-input-error').textContent,hint);
  assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);assert.equal(h.$('[data-sheet="aux-1"]').getAttribute('aria-selected'),'true');
  await h.type(corrected);assert.equal(field.value,corrected);assert.equal(field.getAttribute('aria-invalid'),'false');assert(!h.$('[data-input-save]').disabled);assert.equal(h.$('#work-input-error').textContent,'');assert.deepEqual(h.data(),before);
 }
 h.click('.work-task-navigation [data-task-close]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
});

test('cancel, close and Escape restore the previous tool expansion state without changing data',async()=>{
 for(const expanded of [false,true])for(const action of ['cancel','close','Escape']){
  const h=await setup({rows:[{value:'(x+2)(x-3)',title:'시작 수식',bindings:{}}],active:0}),before=h.data(),writes=h.writes();
  if(expanded)h.click('[data-direct-toggle]');h.click('[data-free-input]');
  if(action==='Escape'){const event=new h.window.Event('keydown',{bubbles:true,cancelable:true});event.key='Escape';h.document.dispatchEvent(event);}else h.click(action==='cancel'?'.work-task-navigation [data-task-close]':'.work-task header [data-task-close]');
  assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);assert(h.$('[data-work-task]').hidden);assert.equal(h.$('[data-direct-toggle]').getAttribute('aria-expanded'),String(expanded));
 }
});
test('input tab changes and folding keep the original expansion state for cancellation',async()=>{
 for(const expanded of [false,true]){
  const h=await setup(),before=h.data();if(expanded)h.click('[data-direct-toggle]');h.click('[data-free-input]');h.click('[data-input-type="matrix"]');h.click('[data-task-fold]');h.click('[data-direct-toggle]');h.click('[data-input-type="expression"]');h.click('[data-task-close]');
  assert.deepEqual(h.data(),before);assert.equal(h.$('[data-direct-toggle]').getAttribute('aria-expanded'),String(expanded));
 }
});

for(const [label,aux] of [['main history middle',null],['auxiliary','aux-1'],['structured auxiliary','aux-2']])test(`free input starts independently at main history end from ${label} and undo restores exact state`,async()=>{
 const h=await setup(notebook(aux)),{click,data,type,$}=h,before=data();
 click('[data-free-input]');await type('x^2=x');click('[data-input-save]');
 const after=data(),row=after.rows.at(-1);assert.equal(after.rows.length,before.rows.length+1);assert.equal(after.active,after.rows.length-1);assert.equal(after.activeAuxId,null);
 assert.deepEqual(after.rows.slice(0,-1),before.rows);assert.deepEqual(after.auxiliary,before.auxiliary);assert.equal(after.auxSequence,before.auxSequence);assertClean(row);
 assert.equal($('[data-sheet="main"]').getAttribute('aria-selected'),'true');assert($('[data-direct-reset]').disabled);assert(!h.document.querySelector('[data-practice-open]'));
 assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);assert.equal(JSON.parse(serializeBackup(after)).version,1);
 click('[data-direct-undo]');assert.deepEqual(data(),before);assert.equal(h.entries.get('susik-lab.composer.v1'),'legacy preserved');
});

test('input type round trips preserve mode and draft only within the open task',async()=>{
 const {click,type,$,data}=await setup(),before=data();
 click('[data-direct-open-input]');await type('x+7');click('[data-input-type="matrix"]');click('[data-input-type="expression"]');
 assert.equal($('[data-work-expression]').value,'x+7');assert.equal($('[data-input-save]').textContent,'풀이 줄 추가');click('[data-task-close]');
 click('[data-free-input]');assert.equal($('[data-work-expression]').value,'');await type('x+11');
 for(const kind of ['matrix','calculus','system']){click(`[data-input-type="${kind}"]`);click('[data-input-type="expression"]');assert.equal($('[data-input-save]').textContent,'새 풀이 시작');assert.equal($('[data-work-expression]').value,'x+11');}
 click('[data-input-type="matrix"]');click('[data-task-close]');click('[data-free-input]');assert.equal($('[data-work-expression]').value,'');click('[data-task-close]');
 click('[data-new-aux]');await type('x+4');click('[data-input-type="matrix"]');click('[data-input-type="expression"]');assert.equal($('[data-input-save]').textContent,'보조 식 시작');assert.equal($('[data-work-expression]').value,'x+4');
 click('[data-input-type="system"]');click('[data-task-close]');click('[data-direct-open-input]');assert.notEqual($('[data-work-expression]').value,'x+4');click('[data-task-close]');assert.deepEqual(data(),before);
});

test('a free solution can transform, reset its own origin, undo, reload and restore a backup',async()=>{
 let h=await setup(),{click,type,data,$}=h;
 click('[data-free-input]');await type('x^2=x');click('[data-input-save]');const start=data();
 click('[data-direct-open]');click('[data-operation-group="calculate"]');click('[data-equation-mode="divide"]');click('[data-operand-term="1:0"]');click('[data-balance-apply]');
 const transformed=data();assert(transformed.rows.at(-1).pendingCases.length);assert(!$('[data-direct-reset]').disabled);
 click('[data-direct-reset]');const reset=data().rows.at(-1);assert.equal(reset.value,start.rows.at(-1).value);assert.deepEqual(originSnapshot(reset),start.rows.at(-1).origin);assert($('[data-direct-reset]').disabled);
 click('[data-direct-undo]');assert.deepEqual(data(),transformed);
 h=await setup(data());assert.deepEqual(h.data(),transformed);h.click('[data-direct-open]');h.click('[data-direct-reset]');assert.deepEqual(originSnapshot(h.data().rows.at(-1)),start.rows.at(-1).origin);
 const backup=serializeBackup(start);h.click('[data-backup-open]');Object.defineProperty(h.$('[data-backup-file]'),'files',{value:[{size:backup.length,text:async()=>backup}]});h.$('[data-backup-file]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));h.click('[data-backup-restore]');assert.deepEqual(h.data(),start);
});

test('double confirmation adds one row and the main 300-row limit keeps drafts and references intact',async()=>{
 const book=notebook('aux-1');book.rows=Array.from({length:299},(_,i)=>({value:`x+${i}`,title:'직접 입력',startNew:true}));book.active=5;
 const h=await setup(book),{click,type,$,data}=h;
 click('[data-free-input]');await type('x+700');const button=$('[data-input-save]');button.click();button.click();assert.equal(data().rows.length,300);
 const before=data();click('[data-free-input]');await type('x+701');click('[data-input-save]');assert.match($('.work-task-error').textContent,/300줄/);assert.equal($('[data-work-expression]').value,'x+701');assert.deepEqual(data(),before);
 click('[data-task-close]');click('[data-direct-undo]');assert.equal(data().rows.length,299);assert.equal(data().activeAuxId,'aux-1');
});

test('storage failure retains the free solution for retry and backup, without overwriting the saved notebook',async()=>{
 const h=await setup(),{click,type,$,data}=h,before=data();
 click('[data-free-input]');await type('x+777');h.block(true);click('[data-input-save]');
 assert.match($('[data-storage-status]').textContent,/저장하지 못/);assert.deepEqual(data(),before);assert.match($('[data-work-rows]').textContent,/777/);
 click('[data-free-input]');assert.match($('[data-storage-status]').textContent,/저장하지 못/);click('[data-task-close]');h.block(false);click('[data-save-retry]');
 assert.equal(data().rows.length,before.rows.length+1);assertClean(data().rows.at(-1));assert(!h.document.querySelector('.work-storage.is-error'));assert.deepEqual(parseBackup(serializeBackup(data())),data());
});


test('touch formula input starts with only the custom keypad and explicitly switches keyboards without losing selection or saving',async()=>{
 const h=await setup(notebook('aux-1'),true),before=h.data(),writes=h.writes();h.click('[data-free-input]');
 const f=h.$('[data-work-expression]');assert.equal(f.getAttribute('inputmode'),'none');assert(f.hasAttribute('readonly'));assert(!h.$('[data-work-pad]').hidden);
 h.click('[data-work-key="7"]');h.click('[data-work-key="+"]');h.click('[data-work-key="8"]');assert.equal(f.value,'7+8');f.setSelectionRange(2,3);
 h.click('[data-work-pad-tab="function"]');h.click('[data-work-key="⌫"]');assert.equal(f.value,'7+');assert.equal(f.selectionStart,2);
 h.click('[data-work-keyboard]');assert.equal(f.getAttribute('inputmode'),'text');assert(!f.hasAttribute('readonly'));assert(h.$('[data-work-pad]').hidden);assert.equal(f.selectionStart,2);
 await h.type('sqrt(x^2)+sin(theta)');f.setSelectionRange(5,8);h.click('[data-work-keyboard]');assert(f.hasAttribute('readonly'));assert(!h.$('[data-work-pad]').hidden);assert.equal(f.selectionStart,5);assert.equal(f.selectionEnd,8);
 h.click('[data-work-pad-tab="symbol"]');h.click('[data-work-key="x"]');assert.equal(f.value,'sqrt(x)+sin(theta)');
 h.click('[data-task-close]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 h.click('[data-free-input]');assert.equal(h.$('[data-work-expression]').value,'');assert(h.$('[data-work-expression]').hasAttribute('readonly'));assert.equal(h.$('[data-work-keyboard]').getAttribute('aria-pressed'),'false');h.click('[data-task-close]');
});
test('desktop formula input remains editable with the physical keyboard and keeps the draft through type changes',async()=>{
 const h=await setup();h.click('[data-free-input]');assert(!h.$('[data-work-expression]').hasAttribute('readonly'));await h.type('log(x,2)=3');assert(!h.$('[data-input-save]').disabled);
 h.click('[data-input-type="matrix"]');h.click('[data-input-type="expression"]');assert.equal(h.$('[data-work-expression]').value,'log(x,2)=3');assert(!h.$('[data-work-expression]').hasAttribute('readonly'));h.click('[data-task-close]');
});
test('returning from draft tools preserves the selected text for the next keypad edit',async()=>{
 for(const touch of [false,true])for(const destination of ['board','advanced']){
  const h=await setup(notebook('aux-1'),touch),before=h.data(),writes=h.writes();h.click('[data-free-input]');await h.type('7+8');h.click('[data-work-pad-tab="function"]');h.$('[data-work-expression]').setSelectionRange(2,3);
  if(destination==='board'){h.click('[data-draft-context]');h.click('.work-task-navigation [data-task-close]');}
  else {h.click('[data-input-type="matrix"]');h.click('[data-input-type="expression"]');}
  const field=h.$('[data-work-expression]');assert.equal(field.value,'7+8');assert.equal(field.selectionStart,2,`${destination}, touch=${touch}`);assert.equal(field.selectionEnd,3);assert.equal(h.$('[data-work-pad-tab="function"]').getAttribute('aria-selected'),'true');assert.equal(field.hasAttribute('readonly'),touch);assert.equal(field.getAttribute('inputmode'),'none');
  h.click('[data-work-key="sin()"]');assert.equal(field.value,'7+sin()');assert.equal(field.selectionStart,6);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 }
});

test('free input bracket highlighting follows the caret without changing drafts, selection, context or undo',async()=>{
 const h=await setup(notebook('aux-1'),true),before=h.data(),writes=h.writes();h.click('[data-free-input]');await h.type('((x+1)*(y-2))');
 let field=h.$('[data-work-expression]');const marks=()=>[...h.document.querySelectorAll('[data-bracket-index]')].map(e=>+e.dataset.bracketIndex);
 const select=(start,end=start)=>{field.setSelectionRange(start,end);field.dispatchEvent(new h.window.Event('select'));};
 select(2);assert.deepEqual(marks(),[1,5]);assert.equal(field.value,'((x+1)*(y-2))');assert.equal(field.selectionStart,2);assert.equal(h.$('.work-bracket-overlay').getAttribute('aria-hidden'),'true');
 h.click('[data-work-key="←"]');assert.deepEqual(marks(),[0,12]);assert.equal(field.selectionStart,1);
 select(1,6);assert.deepEqual(marks(),[]);assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,6);
 h.click('[data-draft-context]');h.click('[data-task-close]');field=h.$('[data-work-expression]');assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,6);assert.deepEqual(marks(),[]);
 select(2);field.dispatchEvent(new h.window.Event('compositionstart'));assert.deepEqual(marks(),[]);field.dispatchEvent(new h.window.Event('compositionend'));assert.deepEqual(marks(),[1,5]);
 field.scrollLeft=30;field.dispatchEvent(new h.window.Event('scroll'));assert.equal(h.$('[data-bracket-text]').style.transform,'translateX(-30px)');assert.equal(field.selectionStart,2);
 await h.type('(x+1');select(1);assert.deepEqual(marks(),[]);assert(h.$('[data-input-save]').disabled);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 await h.type('((x+1)*(y-2))');select(2);h.click('[data-input-save]');assert.deepEqual(h.data().rows.slice(0,-1),before.rows);assert.deepEqual(h.data().auxiliary,before.auxiliary);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 h.click('[data-free-input]');await h.type('(x+1)');field=h.$('[data-work-expression]');select(1);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});

for(const auxiliary of [false,true])test(`prior-row deletion, cancel and undo preserve a free formula draft on ${auxiliary?'auxiliary':'main'}`,async()=>{
 const book=notebook(auxiliary?'aux-1':null);if(auxiliary){book.auxiliary[0].rows.push({value:'x+8',parent:0});book.auxiliary[0].active=1;}
 const h=await setup(book,true),before=h.data();h.click('[data-free-input]');await h.type('sqrt(x)+77');h.click('[data-work-pad-tab="function"]');h.$('[data-work-expression]').setSelectionRange(5,6);h.click('[data-work-keyboard]');
 const assertDraft=()=>{const f=h.$('[data-work-expression]');assert.equal(f.value,'sqrt(x)+77');assert.equal(f.selectionStart,5);assert.equal(f.selectionEnd,6);assert.equal(h.$('[data-work-pad-tab="function"]').getAttribute('aria-selected'),'true');assert(h.$('[data-work-pad]').hidden);assert.equal(f.getAttribute('inputmode'),'text');};
 h.click('[data-row-remove="0"]');h.click('[data-row-remove="0"]');h.click('[data-task-close]');assertDraft();assert.deepEqual(h.data(),before);
 h.click('[data-row-remove="0"]');h.click('[data-row-remove-confirm]');assertDraft();const after=h.data(),sheet=auxiliary?after.auxiliary[0]:after;assert.equal(sheet.rows[0].archived,true);assert.equal(after.active,before.active);assert.deepEqual(after.auxiliary.map(a=>a.sourceIndex),before.auxiliary.map(a=>a.sourceIndex));
 h.click('[data-history-undo]');assertDraft();assert.deepEqual(h.data(),before);
 h.click('[data-row-remove="0"]');h.block(true);h.click('[data-row-remove-confirm]');assert.deepEqual(h.data(),before);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.click('[data-task-close]');assertDraft();h.block(false);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});
test('touch practice answers explicitly choose a keyboard and keep the answer, selection and fixed keys',async()=>{
 const h=await setup(notebook(),true),before=h.data();h.click('[data-practice-open]');const f=h.$('[data-practice-answer]');assert(f.hasAttribute('readonly'));assert.equal(f.getAttribute('inputmode'),'none');assert(!h.$('[data-practice-pad]').hidden);
 h.click('[data-practice-key="AC"]');h.click('[data-practice-key="7"]');h.click('[data-practice-key="+"]');h.click('[data-practice-key="8"]');f.setSelectionRange(2,3);h.click('[data-practice-pad-tab="function"]');h.click('[data-practice-key="⌫"]');assert.equal(f.value,'7+');assert.equal(f.selectionStart,2);
 h.click('[data-practice-keyboard]');assert(!f.hasAttribute('readonly'));assert.equal(f.getAttribute('inputmode'),'text');assert(h.$('[data-practice-pad]').hidden);assert.equal(f.selectionStart,2);f.value='sqrt(9)+2';f.setSelectionRange(5,6);h.click('[data-practice-keyboard]');assert(f.hasAttribute('readonly'));assert(!h.$('[data-practice-pad]').hidden);assert.equal(f.selectionStart,5);assert.equal(f.selectionEnd,6);h.click('[data-practice-pad-tab="number"]');h.click('[data-practice-key="4"]');assert.equal(f.value,'sqrt(4)+2');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});
test('prior-row deletion leaves row-bound note, line and answer drafts open until they are saved or closed',async()=>{
 for(const [open,field]of [['[data-note-edit="1"]','[data-note-draft]'],['[data-direct-open-input]','[data-work-expression]'],['[data-practice-open]','[data-practice-answer]']]){
  const h=await setup();h.click(open);const f=h.$(field);f.value='미저장 초안';const before=h.data();h.click('[data-row-remove="0"]');assert.equal(h.$(field),f);assert.equal(f.value,'미저장 초안');assert.equal(h.document.querySelector('[data-row-remove-confirm]'),null);assert.match(h.$('#toast').textContent,/초안은 그대로/);assert.deepEqual(h.data(),before);
 }
});
test('checking a practice answer refreshes the history undo button without replacing the answer input',async()=>{
 const book=notebook();book.rows[1]={value:'2x^2-16x+14=0',title:'직접 입력',practiceId:'roots-1'};const h=await setup(book,true),before=h.data();h.click('[data-practice-open]');const f=h.$('[data-practice-answer]');f.value='1,7';assert(h.$('[data-history-undo]').disabled);h.click('[data-practice-check]');assert(!h.$('[data-history-undo]').disabled);assert.equal(h.$('[data-practice-answer]'),f);assert(f.hasAttribute('readonly'));assert.equal(h.data().rows[1].practiceFeedback.status,'correct');h.click('[data-task-close]');h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});
