import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';

const statement=n=>({kind:'가정',domain:'x ∈ ℝ',formula:`P${n}(x)`,meaning:`직접 기록 ${n}`,verification:'unverified'});
const fixture=(value='ln(x)+1',relation='ln(x)=2')=>({rows:[{value,title:'직접 입력',startNew:true,condition:'x는 실수',excluded:['-1'],logicStatements:[statement(0)]}],active:0,activeAuxId:'aux-1',auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:value,rows:[{value:relation,title:'보조 식 시작',startNew:true,condition:'추가 조건 기록',excluded:['0'],logicStatements:[statement(0),statement(1)]}],active:0}]});
let sequence=0;
async function setup(book){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};window.math=math;window.matchMedia=()=>({matches:true});
 const entries=new Map([[WORK_KEY,JSON.stringify(book)]]);let blocked=false,writes=0;const storage={getItem:k=>entries.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');writes++;entries.set(k,v);}};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});(await import(`../dist/workspace-app.js?aux-context=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,'Missing '+s);return e;};return {$,document,storage,click:s=>$(s).click(),data:()=>JSON.parse(entries.get(WORK_KEY)),writes:()=>writes,block:value=>{blocked=value;}};
}

test('auxiliary application previews and retains domain, exclusions and symbolic records through cancel, undo, reload and backup',async()=>{
 for(const [value,relation,requirement]of [['ln(x)+1','ln(x)=2','x > 0'],['sqrt(x)+1','sqrt(x)=2','실수 계산: x ≥ 0'],['1/x+1','1/x=2','x ≠ 0']]){
  const h=await setup(fixture(value,relation)),before=h.data(),writes=h.writes();h.click('[data-aux-apply]');assert(h.$('.work-task').textContent.includes(requirement));assert.match(h.$('.work-task').textContent,/미검증|자동 검증하지/);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
  h.click('[data-aux-apply]');h.click('[data-aux-confirm]');const after=h.data(),row=after.rows[after.active];assert.equal(row.value,'2 + 1');assert(row.conditions.some(c=>c.includes(requirement)));assert(row.assumptions.some(c=>c.includes(requirement)));assert(row.condition.includes(requirement));assert.deepEqual(row.excluded,['-1','0']);assert.deepEqual(row.logicStatements,[statement(0),statement(1)]);assert.match(row.explanation,/미검증|자동 검증하지/);assert.deepEqual(after.rows[0],before.rows[0]);assert.deepEqual(after.auxiliary,before.auxiliary);assert.equal(after.activeAuxId,null);
  assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);assert.equal(h.$('[data-sheet="aux-1"]').getAttribute('aria-selected'),'true');
  const reloaded=await setup(after);assert.deepEqual(reloaded.data(),after);assert(reloaded.$('.work-context-body').textContent.includes(requirement));
 }
});

test('auxiliary preview blocks invalid or unsupported log domains before a replacement can hide or create them',async()=>{
 for(const [value,relation,bindings]of [['ln(0)+1','ln(0)=2',{}],['t+1','t=2',{t:'ln(0)'}],['ln(x)+1','x=0',{}],['ln(sin(x))+1','ln(sin(x))=2',{}]]){
  const book=fixture(value,relation);book.rows[0].bindings=bindings;book.auxiliary[0].rows[0].bindings=bindings;const h=await setup(book),before=h.data();h.click('[data-aux-apply]');const button=h.document.querySelector('[data-aux-confirm]');assert(!button||button.disabled);assert.match((h.document.querySelector('.work-task-error')?.textContent||'')+h.$('#toast').textContent,/로그|정의역/);assert.deepEqual(h.data(),before);if(button)h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 }
});

test('auxiliary replacement retains computed-power domains through save, reload, backup and undo',async()=>{
 for(const [raw,bindings,requirement]of [['x^(1-2)*x=1',{},'x ≠ 0'],['x^(1-1)=1',{},'x ≠ 0'],['t*(x-1)=1',{t:'u^(1-2)',u:'x-1'},'x - 1 ≠ 0']]){
  const book=fixture(raw,raw);for(const row of [book.rows[0],book.auxiliary[0].rows[0]]){row.bindings=bindings;row.excluded=[];}
  const h=await setup(book),before=h.data();h.click('[data-aux-apply]');assert(h.$('.work-task').textContent.includes(requirement));assert.deepEqual(h.data(),before);
  h.click('[data-aux-confirm]');const after=h.data(),row=after.rows[after.active];assert.equal(row.value,'1 = 1');assert(row.conditions.includes(requirement));assert(row.assumptions.includes(requirement));assert(row.condition.includes(requirement));
  assert.deepEqual(row.bindings,bindings);assert.deepEqual(after.rows[0],before.rows[0]);assert.deepEqual(after.auxiliary,before.auxiliary);assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);
  h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 }
});

test('auxiliary replacement blocks undefined zero powers without changing either sheet',async()=>{
 for(const [raw,bindings]of [['0^(-1)=1',{}],['0^(1-2)=1',{}],['(x-x)^(1-1)=1',{}],['t=1',{t:'u^0',u:'0'}]]){
  const book=fixture(raw,raw);for(const row of [book.rows[0],book.auxiliary[0].rows[0]])row.bindings=bindings;
  const h=await setup(book),before=h.data();h.click('[data-aux-apply]');const confirm=h.document.querySelector('[data-aux-confirm]');assert(!confirm||confirm.disabled);assert.match(h.$('.work-task-error').textContent,/거듭제곱/);assert.deepEqual(h.data(),before);
 }
});

test('auxiliary symbolic record limits block merging without dropping records or producing an unrestorable backup',async()=>{
 const book=fixture('x+1','x=2');book.rows[0].logicStatements=Array.from({length:20},(_,i)=>statement(i));book.auxiliary[0].rows[0].logicStatements=[statement(20)];const h=await setup(book),before=h.data();h.click('[data-aux-apply]');const button=h.document.querySelector('[data-aux-confirm]');assert(!button||button.disabled);assert.match(h.$('.work-task-error').textContent,/20/);assert.deepEqual(h.data(),before);assert.deepEqual(parseBackup(serializeBackup(before)),before);
});

test('auxiliary application keeps pending cases and bound domains when storage fails, then retries and undoes exactly',async()=>{
 const book=fixture('t+1','t=2');book.rows[0].bindings={t:'ln(x)'};book.auxiliary[0].rows[0].bindings={t:'ln(x)'};
 const mainCase={condition:'x = 0',equation:'x^2=x'},auxCase={condition:'y = 0',equation:'y^2=y'};book.rows[0].pendingCases=[mainCase];book.auxiliary[0].rows[0].pendingCases=[mainCase,auxCase];
 const h=await setup(book),before=h.data();h.click('[data-aux-apply]');assert(h.$('.work-task').textContent.includes('x > 0'));h.block(true);h.click('[data-aux-confirm]');assert.deepEqual(h.data(),before);assert.match(h.$('[data-storage-status]').textContent,/저장하지 못/);
 h.block(false);h.click('[data-save-retry]');const after=h.data(),row=after.rows[after.active];assert.deepEqual(row.bindings,{t:'ln(x)'});assert.deepEqual(row.pendingCases,[mainCase,auxCase]);assert.deepEqual(row.excluded,['-1','0']);assert.deepEqual(row.logicStatements,[statement(0),statement(1)]);assert(row.conditions.includes('x > 0'));assert.deepEqual(parseBackup(serializeBackup(after)),after);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

test('domain rejection belongs to the selected replacement and never changes either sheet',async()=>{
 const h=await setup(fixture('ln(x)+(y-y)','x=y-y')),before=h.data();h.click('[data-aux-apply]');assert(h.$('[data-aux-confirm]').disabled);assert.deepEqual(h.data(),before);h.click('[data-aux-replacement="1"]');assert(!h.$('[data-aux-confirm]').disabled);assert.match(h.$('.work-task').textContent,/자동 검증하지/);assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});
