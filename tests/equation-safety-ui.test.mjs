import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';import {originSnapshot} from '../dist/workspace-origin.js';
const rich=relation=>{const r={value:`2x+1 ${relation} 5`,title:'직접 입력',startNew:true,condition:'x > -10',assumptions:['x ≠ 0'],conditions:['x는 기존 정의역에 속함'],bindings:{a:'x+1'},excluded:['0'],pendingCases:[{condition:'x=0',equation:'x^2=x',previousAssumptions:[]}],logicStatements:[{kind:'가정',domain:'x ∈ ℝ',formula:'∀x ∈ ℝ (P(x))',meaning:'원래 가정을 기록합니다.',verification:'unverified'}],note:'원래 설명'};r.origin=originSnapshot(r);return r;};
const notebook=relation=>({rows:[{value:'x+1',title:'직접 입력'},rich(relation),{value:'x+9',title:'직접 입력',parent:0}],active:1,activeAuxId:null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:2,sourceValue:'x+9',rows:[{value:'x=2'}],active:0}]});
let sequence=0;async function setup(book=notebook('≤')){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.math=math;window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};let blocked=false;const entries=new Map([[WORK_KEY,JSON.stringify(book)]]),storage={getItem:k=>entries.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');entries.set(k,v);}},copied=[];Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>copied.push(text)}}});(await import(`../dist/workspace-app.js?equationSafety=${sequence++}`)).startWorkspace();const $=s=>{const el=document.querySelector(s);assert(el,s);return el;},click=s=>$(s).click(),type=async(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,140));};return {$,click,type,document,window,storage,copied,data:()=>JSON.parse(entries.get(WORK_KEY)),block:v=>blocked=v};
}
const safetyBook=(value,bindings={},auxiliary=false)=>{const book=notebook('≤'),row={...rich('≤'),value,bindings,assumptions:[],conditions:[],pendingCases:[]};row.origin=originSnapshot(row);book.rows[1]=row;if(auxiliary){book.auxiliary[0].rows=[structuredClone(row)];book.activeAuxId='aux-1';}return book;};
const selected=book=>book.activeAuxId?book.auxiliary.find(a=>a.id===book.activeAuxId).rows.at(-1):book.rows[book.active];
for(const auxiliary of [false,true])test(`equation safety errors preserve the ${auxiliary?'auxiliary':'main'} operand and records through fold, correction, undo and cancel`,async()=>{
 const h=await setup(safetyBook('x=1',{t:'0'},auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-equation-mode="divide"]');h.click('[data-balance-manual]');
 for(const raw of ['t','9007199254740993','1e-400']){
  await h.type('[data-balance-input]',raw);assert(h.$('[data-balance-apply]').disabled);assert.match(h.$('.work-task-error').textContent,/0|정밀도/);const field=h.$('[data-balance-input]');field.setSelectionRange(0,1);
  h.click('[data-task-fold]');h.click('[data-direct-toggle]');assert.equal(h.$('[data-balance-input]'),field);assert.equal(field.value,raw);assert.equal(field.selectionEnd,1);assert.deepEqual(h.data(),before);
 }
 await h.type('[data-balance-input]','2');assert(!h.$('[data-balance-apply]').disabled);h.click('[data-balance-apply]');assert.equal(selected(h.data()).bindings.t,'0');assert.deepEqual(parseBackup(serializeBackup(h.data())),h.data());h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 h.click('[data-direct-open]');h.click('[data-equation-mode="divide"]');h.click('[data-balance-manual]');await h.type('[data-balance-input]','t');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});
for(const auxiliary of [false,true])test(`square-root domain persists after cancellation in the ${auxiliary?'auxiliary':'main'} sheet and survives reload and backup`,async()=>{
 const h=await setup(safetyBook('t-t=0',{t:'sqrt(x)'},auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-operation-group="move"]');h.click('[data-equation-mode="simplify"]');
 assert.match(h.$('[data-balance-preview]').textContent,/실수 계산: x ≥ 0/);h.click('[data-balance-apply]');const after=h.data(),row=selected(after);assert.equal(row.value,'0 = 0');assert.match(row.condition,/실수 계산: x ≥ 0/);assert(row.assumptions.some(c=>c.includes('x ≥ 0')));assert.deepEqual(row.bindings,{t:'sqrt(x)'});assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);const reloaded=await setup(after);assert.match(reloaded.$('[data-work-condition]').value,/실수 계산: x ≥ 0/);
});
test('a bound zero denominator is rejected in the preview without applying or rewriting the original row',async()=>{
 const h=await setup(safetyBook('x/t=1',{t:'0'})),before=h.data();h.click('[data-direct-open]');h.click('[data-equation-mode="add"]');h.click('[data-balance-value="1"]');assert(h.$('[data-balance-apply]').disabled);assert.match(h.$('.work-task-error').textContent,/분모가 0/);assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});

for(const auxiliary of [false,true])test(`real log conditions survive cancellation, reload, backup and undo in the ${auxiliary?'auxiliary':'main'} sheet`,async()=>{
 for(const [value,bindings,conditions]of [['ln(x)-ln(x)=0',{},['x > 0']],['t-t=0',{t:'log(u,a)',u:'x-1'},['x - 1 > 0','a > 0','a ≠ 1']]]){
  const h=await setup(safetyBook(value,bindings,auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-operation-group="move"]');h.click('[data-equation-mode="simplify"]');
  assert(!h.$('[data-balance-apply]').disabled);for(const c of conditions)assert(h.$('[data-balance-preview]').textContent.includes(c));assert.deepEqual(h.data(),before);
  h.click('[data-balance-apply]');const after=h.data(),row=selected(after);assert.equal(row.value,'0 = 0');for(const c of conditions){assert(row.condition.includes(c));assert(row.assumptions.includes(c));}assert.deepEqual(row.bindings,bindings);
  if(auxiliary){assert.deepEqual(after.rows,before.rows);assert.deepEqual(after.auxiliary[0].rows.slice(0,-1),before.auxiliary[0].rows);}else{assert.deepEqual(after.rows.filter((_,i)=>i!==after.active),before.rows);assert.deepEqual(after.auxiliary,[{...before.auxiliary[0],sourceIndex:before.auxiliary[0].sourceIndex+1}]);}
  assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
  const reloaded=await setup(after);for(const c of conditions){assert(selected(reloaded.data()).condition.includes(c));assert(reloaded.$('.work-context-body').textContent.includes(c));}
 }
});

for(const auxiliary of [false,true])test(`invalid or unsupported logs leave ${auxiliary?'auxiliary':'main'} records untouched and cannot be applied`,async()=>{
 for(const [value,bindings]of [['ln(0)-ln(0)=0',{}],['ln(-2)-ln(-2)=0',{}],['log(x,1)-log(x,1)=0',{}],['t-t=0',{t:'log(x,a)',a:'-2'}],['t-t=0',{t:'ln(sqrt(-1))'}]]){
  const h=await setup(safetyBook(value,bindings,auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-operation-group="move"]');h.click('[data-equation-mode="simplify"]');
  assert(h.$('[data-balance-apply]').disabled);assert.match(h.$('.work-task-error').textContent,/로그/);assert.equal(h.$('[data-balance-preview]').textContent,'');assert.deepEqual(h.data(),before);
  h.click('[data-balance-apply]');assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 }
});

for(const auxiliary of [false,true])test(`term collection and law previews cannot bypass the real log guard in the ${auxiliary?'auxiliary':'main'} sheet`,async()=>{
 for(const [value,bindings,valid]of [['ln(x)-ln(x)=0',{},true],['ln(0)-ln(0)=0',{},false],['t-t=0',{t:'ln(0)'},false]]){
  const h=await setup(safetyBook(value,bindings,auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-direct-all]');h.click('[data-operation-group="group"]');h.click('[data-expand-all]');
  if(valid){assert(h.$('.work-task').textContent.includes('x > 0'));h.click('[data-expansion-apply]');assert.equal(selected(h.data()).value,'0 = 0');assert(selected(h.data()).assumptions.includes('x > 0'));h.click('[data-history-undo]');assert.deepEqual(h.data(),before);}
  else{assert(!h.document.querySelector('[data-expansion-apply]'));assert.deepEqual(h.data(),before);assert.match(h.$('#toast').textContent,/로그/);}
 }
 for(const [value,bindings,valid]of [['2^3+ln(x)=0',{},true],['2^3+ln(0)=0',{},false],['2^3+t=0',{t:'ln(0)'},false]]){
  const h=await setup(safetyBook(value,bindings,auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-direct-term="0"]');h.click('[data-operation-group="power"]');h.click('[data-law="0"]');
  if(valid){assert(h.$('.work-task').textContent.includes('x > 0'));h.click('[data-law-apply]');assert(selected(h.data()).assumptions.includes('x > 0'));h.click('[data-history-undo]');assert.deepEqual(h.data(),before);}
  else{assert(!h.document.querySelector('[data-law-apply]'));assert.deepEqual(h.data(),before);assert.match(h.$('#toast').textContent,/로그/);}
 }
});

for(const auxiliary of [false,true])test(`term cancellation and replacement retain the original domain in the ${auxiliary?'auxiliary':'main'} sheet`,async()=>{
 for(const [value,bindings,mode,parameter,requirements]of [
  ['7+(x-1)/(x-1)=8',{},'cancel','x-1',['x - 1 ≠ 0']],
  ['t-t=0',{t:'sqrt(u)',u:'1/(x-1)'},'replace','0',['실수 계산: 1 / (x - 1) ≥ 0','x - 1 ≠ 0']],
  ['t-t=0',{t:'log(u,a)',u:'x-2',a:'1/2'},'replace','0',['x - 2 > 0']]
 ]){
  const h=await setup(safetyBook(value,bindings,auxiliary)),before=h.data();h.click('[data-direct-open]');
  h.click(mode==='cancel'?'[data-direct-term="1"]':'[data-direct-all]');h.click(`[data-operation-group="${mode==='cancel'?'fraction':'edit'}"]`);h.click(`[data-transform-mode="${mode}"]`);
  if(mode==='cancel')h.click('[data-direct-manual]');await h.type('[data-direct-input]',parameter);
  assert(!h.$('[data-direct-apply]').disabled);for(const condition of requirements)assert(h.$('[data-direct-conditions]').textContent.includes(condition));assert.deepEqual(h.data(),before);
  h.click('[data-direct-apply]');const after=h.data(),row=selected(after);assert.equal(row.value,mode==='cancel'?'7 + 1 = 8':'0 = 0');
  for(const condition of requirements){assert(row.condition.includes(condition));assert(row.assumptions.some(c=>c.includes(condition)));assert(row.conditions.some(c=>c.includes(condition)));}
  if(mode==='replace')assert.match(row.explanation,/전체 풀이의 동치를 증명한 것은 아닙니다/);
  assert.deepEqual(row.bindings,bindings);assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);
  if(auxiliary)assert.deepEqual(after.rows,before.rows);else assert.deepEqual(after.rows.filter((_,i)=>i!==after.active),before.rows);
  h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 }
});
for(const auxiliary of [false,true])test(`direct algebra edits cannot hide invalid definitions in the ${auxiliary?'auxiliary':'main'} sheet`,async()=>{
 for(const bindings of [{t:'ln(0)'},{t:'log(u,a)',u:'x+1',a:'1'},{t:'u+u',u:'1/(x-x)'},{t:'ln(sqrt(x))'}]){
  const h=await setup(safetyBook('t-t=0',bindings,auxiliary)),before=h.data();h.click('[data-direct-open]');h.click('[data-direct-all]');h.click('[data-operation-group="edit"]');h.click('[data-transform-mode="replace"]');await h.type('[data-direct-input]','0');
  assert(h.$('[data-direct-apply]').disabled);assert.match(h.$('.direct-error').textContent,/로그|분모가 0/);assert.equal(h.document.querySelector('.direct-result'),null);
  h.click('[data-direct-apply]');assert.deepEqual(h.data(),before);h.click('[data-direct-cancel]');assert.deepEqual(h.data(),before);
 }
});
for(const auxiliary of [false,true])test(`expanding or completing a square keeps chained square-root definitions in the ${auxiliary?'auxiliary':'main'} sheet`,async()=>{
 for(const mode of ['expansion','square']){
  const h=await setup(safetyBook(mode==='expansion'?'t-t=0':'t^2+2t+1=0',{t:'sqrt(u)',u:'x-1'},auxiliary)),before=h.data();
  h.click('[data-direct-open]');h.click('[data-direct-all]');h.click('[data-operation-group="group"]');
  if(mode==='expansion'){h.click('[data-expand-all]');assert.match(h.$('.balance-preview').textContent,/x - 1 ≥ 0/);h.click('[data-expansion-apply]');}
  else{h.click('[data-transform-mode="square"]');h.click('[data-direct-square="1"]');assert.match(h.$('[data-direct-conditions]').textContent,/x - 1 ≥ 0/);h.click('[data-direct-apply]');}
  const after=h.data(),row=selected(after);assert.match(row.condition,/x - 1 ≥ 0/);assert(row.assumptions.some(c=>c.includes('x - 1 ≥ 0')));assert.deepEqual(row.bindings,{t:'sqrt(u)',u:'x-1'});
  h.click('[data-copy-menu]');h.click('[data-copy-format="steps"]');await Promise.resolve();assert.match(h.copied.at(-1),/x - 1 ≥ 0/);h.click('[data-task-close]');
  assert.deepEqual(parseBackup(serializeBackup(after)),after);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 }
});
test('log conversion and zero branches keep definitions and user conditions without treating the notes as proofs',async()=>{
 let h=await setup(safetyBook('log(t,a)=-2',{t:'x-2',a:'1/2'})),before=h.data();h.click('[data-direct-open]');h.click('[data-operation-group="laws"]');
 const law=[...h.document.querySelectorAll('[data-law]')].find(b=>b.textContent.includes('로그방정식을 지수식으로'));assert(law);law.click();assert.match(h.$('.work-law-preview').textContent,/x - 2 > 0/);assert.deepEqual(h.data(),before);h.click('[data-law-apply]');
 assert.match(selected(h.data()).condition,/x > -10/);assert.match(selected(h.data()).condition,/x - 2 > 0/);assert.deepEqual(selected(h.data()).bindings,before.rows[before.active].bindings);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 for(const operation of ['multiply','divide']){
  h=await setup(safetyBook('x^2=x',{t:'u-1',u:'x'}));before=h.data();h.click('[data-direct-open]');h.click(`[data-equation-mode="${operation}"]`);h.click('[data-balance-manual]');await h.type('[data-balance-input]','t');
  assert.match(h.$('[data-balance-preview]').textContent,/t = 0/);h.click('[data-balance-apply]');let row=selected(h.data());assert(row.assumptions.includes('t ≠ 0'));assert.equal(row.pendingCases.at(-1).condition,'t = 0');assert.deepEqual(row.pendingCases.at(-1).bindings,{t:'u-1',u:'x'});
  h.click('[data-equation-case="0"]');h.click('[data-case-continue]');row=selected(h.data());assert(row.assumptions.includes('t = 0'));assert(!row.assumptions.includes('t ≠ 0'));assert.match(row.condition,/x > -10/);assert.deepEqual(row.bindings,{t:'u-1',u:'x'});
 }
});
