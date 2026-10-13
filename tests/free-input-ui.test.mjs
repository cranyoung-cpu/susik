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
async function setup(book=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLInputElement.prototype.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
 const entries=new Map([[WORK_KEY,JSON.stringify(book)],['susik-lab.composer.v1','legacy preserved']]);let blocked=false,writes=0;
 const storage={getItem:k=>entries.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');writes++;entries.set(k,v);}};
 window.math=math;window.innerWidth=320;window.innerHeight=640;
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
 click('[data-free-input]');await type('x+6');click('[data-free-input]');assert.equal($('[data-work-expression]').value,'');
 assert.equal(h.writes(),writes);click('[data-task-close]');
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
 assert.equal($('[data-work-expression]').value,'x+7');assert.equal($('[data-input-save]').textContent,'수식 기록');click('[data-task-close]');
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
