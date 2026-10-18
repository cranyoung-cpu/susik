import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';import math from '../src/math-runtime.js';import {WORK_KEY} from '../dist/workspace-state.js';import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
const notebook=()=>({rows:[{value:'sin(theta)+1',title:'직접 입력',startNew:true,condition:'θ ∈ ℝ',bindings:{},logicStatements:[]},{value:'sin(theta)+2',parent:0,condition:'θ > 0',bindings:{},logicStatements:[]}],active:1,activeAuxId:null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'sin(theta)+1',rows:[{value:'sin(theta)+1',condition:'θ ∈ ℝ',bindings:{},logicStatements:[]}],active:0}]});
let sequence=0;async function setup(book=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){const o=this.querySelector('option[selected]')||this.querySelector('option');return o?(o.getAttribute('value')??o.textContent):'';},set(v){for(const o of this.querySelectorAll('option')){o.removeAttribute('selected');if((o.getAttribute('value')??o.textContent)===String(v))o.setAttribute('selected','');}}});const checked=new WeakMap();Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return checked.has(this)?checked.get(this):this.hasAttribute('checked');},set(value){checked.set(this,Boolean(value));}});window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b,direction='none'){this.selectionStart=a;this.selectionEnd=b;this.selectionDirection=direction;};window.HTMLTextAreaElement.prototype.setSelectionRange=window.HTMLInputElement.prototype.setSelectionRange;window.math=math;window.matchMedia=()=>({matches:true});const entries=new Map([[WORK_KEY,JSON.stringify(book)]]);let blocked=false;Object.assign(globalThis,{window,document,localStorage:{getItem:k=>entries.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');entries.set(k,v);}},requestAnimationFrame:f=>f()});(await import(`../dist/workspace-app.js?board=${sequence++}`)).startWorkspace();const $=s=>{const e=document.querySelector(s);assert(e,s);return e;},click=s=>$(s).click(),type=async(s,value)=>{$(s).value=value;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));if(s==='[data-work-expression]')await new Promise(r=>setTimeout(r,140));};return {$,click,type,document,window,data:()=>JSON.parse(entries.get(WORK_KEY)),block:v=>blocked=v};
}
test('condition board saves inequalities and quantifiers only on the named auxiliary row and undo restores all data',async()=>{
 const book=notebook();book.activeAuxId='aux-1';const h=await setup(book),before=h.data();h.click('[data-context-board]');assert.match(h.$('.work-board-scope').textContent,/보조 1 · 1번째 줄/);assert(h.$('[data-board-condition]').hasAttribute('readonly'));h.click('[data-board-keyboard]');assert(!h.$('[data-board-condition]').hasAttribute('readonly'));assert(h.$('[data-board-pad]').hidden);await h.type('[data-board-condition]','∀θ ∈ ℝ, 0 ≤ θ < π');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a := sin θ');h.click('[data-board-save]');const after=h.data();assert.deepEqual(after.rows,before.rows);assert.equal(after.auxiliary[0].rows[0].value,before.auxiliary[0].rows[0].value);assert.equal(after.auxiliary[0].rows[0].condition,'∀θ ∈ ℝ, 0 ≤ θ < π');assert.deepEqual(after.auxiliary[0].rows[0].bindings,{a:'sin(theta)'});assert.deepEqual(parseBackup(serializeBackup(after)),after);h.click('[data-binding-apply="a"]');assert.equal(h.data().auxiliary[0].rows.at(-1).value.replace(/\s/g,''),'a+1');assert.equal(h.data().auxiliary[0].rows.at(-1).condition,'∀θ ∈ ℝ, 0 ≤ θ < π');h.click('[data-history-undo]');h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});
test('draft board cancellation and confirmation preserve the expression and only a saved new auxiliary receives its context',async()=>{
 const h=await setup(),before=h.data();h.click('[data-new-aux]');await h.type('[data-work-expression]','sin(theta)+3');h.click('[data-draft-context]');await h.type('[data-board-condition]','θ ≥ 0');h.click('[data-task-close]');assert.equal(h.$('[data-work-expression]').value,'sin(theta)+3');assert.deepEqual(h.data(),before);h.click('[data-draft-context]');assert.equal(h.$('[data-board-condition]').value,before.rows[1].condition);await h.type('[data-board-condition]','θ ≥ 0');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a := sin θ');h.click('[data-board-save]');assert.deepEqual(h.data(),before);assert.equal(h.$('[data-work-expression]').value,'sin(theta)+3');h.click('[data-input-type="matrix"]');h.click('[data-input-type="expression"]');h.click('[data-input-save]');const after=h.data();assert.deepEqual(after.rows,before.rows);assert.deepEqual(after.auxiliary[0],before.auxiliary[0]);const row=after.auxiliary.at(-1).rows[0];assert.equal(row.condition,'θ ≥ 0');assert.deepEqual(row.bindings,{a:'sin(theta)'});assert.equal(row.origin.condition,row.condition);assert.deepEqual(row.origin.bindings,row.bindings);
});
test('free formula context is explicitly entered, canceled drafts do not leak, and invalid definitions do not save',async()=>{
 const h=await setup(),before=h.data();h.click('[data-free-input]');await h.type('[data-work-expression]','x+1');h.click('[data-draft-context]');assert.equal(h.$('[data-board-condition]').value,'');await h.type('[data-board-condition]','x > 0');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a = sin θ');assert(h.$('[data-board-save]').disabled);await h.type('[data-board-definition]','a := sin θ');h.click('[data-board-save]');h.click('[data-task-close]');assert.deepEqual(h.data(),before);h.click('[data-free-input]');h.click('[data-draft-context]');assert.equal(h.$('[data-board-condition]').value,'');await h.type('[data-board-condition]','x ≥ 0');h.click('[data-board-save]');await h.type('[data-work-expression]','x+2');h.click('[data-input-save]');assert.equal(h.data().rows.at(-1).condition,'x ≥ 0');assert.deepEqual(h.data().rows.at(-1).bindings,{});assert.deepEqual(h.data().rows.slice(0,-1),before.rows);
});
test('unsupported definitions can only become explicit unverified symbolic records with a domain and meaning',async()=>{
 const h=await setup(),before=h.data();h.click('[data-context-board]');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','F := integral(x)');assert(h.$('[data-board-save]').disabled);h.$('[data-board-record-only]').checked=true;h.$('[data-board-record-only]').dispatchEvent(new h.window.Event('change',{bubbles:true}));assert(h.$('[data-board-save]').disabled);await h.type('[data-board-domain]','x ∈ ℝ');await h.type('[data-board-meaning]','F는 x의 적분을 나타내는 사용자 기호입니다.');h.click('[data-board-save]');const after=h.data();assert.equal(after.rows[1].value,before.rows[1].value);assert.deepEqual(after.rows[1].bindings,{});assert.equal(after.rows[1].logicStatements[0].formula,'F := integral(x)');assert.equal(after.rows[1].logicStatements[0].verification,'unverified');assert.deepEqual(parseBackup(serializeBackup(after)),after);
});

for(const activeAuxId of [null,'aux-1'])test(`board-to-logic editing preserves the ${activeAuxId?'auxiliary':'main'} draft, caret and keyboard until explicit board save`,async()=>{
 const book=notebook();book.activeAuxId=activeAuxId;const h=await setup(book),before=h.data();h.click('[data-context-board]');await h.type('[data-board-condition]','∀x∈R, x²≥0');h.$('[data-board-condition]').setSelectionRange(2,5);h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a :=');h.click('[data-board-mode="condition"]');h.click('[data-board-keyboard]');const field=h.$('[data-board-condition]');
 const fill=async(quantifier,predicate,meaning)=>{h.$('[data-logic-quantifier="0"]').value=quantifier;h.$('[data-logic-quantifier="0"]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await h.type('[data-logic-predicate]',predicate);await h.type('[data-logic-meaning]',meaning);};
 for(let i=0;i<2;i++){h.click('[data-board-logic-open]');await fill('∃','x² = 2','x의 제곱은 2입니다.');if(i){const e=new h.window.Event('keydown',{bubbles:true});Object.defineProperty(e,'key',{value:'Escape'});h.document.dispatchEvent(e);}else h.click('[data-task-close]');assert.equal(h.$('[data-board-condition]'),field);assert.equal(field.value,'∀x∈R, x²≥0');assert.equal(field.selectionStart,2);assert.equal(field.selectionEnd,5);assert.equal(h.$('[data-board-keyboard]').getAttribute('aria-pressed'),'true');assert(h.$('[data-board-save]').disabled);assert.equal(h.$('[data-board-definition]').value,'a :=');assert.deepEqual(h.data(),before);}
 h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a := sin θ');h.click('[data-board-mode="condition"]');h.click('[data-board-logic-open]');await fill('∀','x² < 0','x의 제곱은 0보다 작습니다.');assert.match(h.$('[data-logic-preview]').textContent,/미검증.*주장하는 표기/);const add=h.$('[data-logic-save]');add.click();add.click();assert.deepEqual(h.data(),before);assert.match(h.$('[data-board-logic-records]').textContent,/기호 기록 1개/);
 h.click('[data-board-logic-edit="0"]');await fill('∃','x² = 2','x의 제곱은 2입니다.');h.click('[data-task-close]');h.click('[data-board-logic-edit="0"]');assert.equal(h.$('[data-logic-predicate]').value,'x² < 0');await fill('∃','x² = 2','x의 제곱은 2입니다.');h.click('[data-logic-save]');assert.deepEqual(h.data(),before);
 h.block(true);h.click('[data-board-save]');assert.deepEqual(h.data(),before);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);assert.match(h.$('[data-board-logic-records]').textContent,/∃x ∈ ℝ \(x² = 2\)/);h.block(false);h.click('[data-board-save]');const saved=h.data(),row=activeAuxId?saved.auxiliary[0].rows[0]:saved.rows[saved.active],prior=activeAuxId?before.auxiliary[0].rows[0]:before.rows[before.active];assert.equal(row.value,prior.value);assert.equal(row.condition,'∀x∈R, x²≥0');assert.deepEqual(row.bindings,{a:'sin(theta)'});assert.equal(row.logicStatements.length,1);assert.equal(row.logicStatements[0].formula,'∃x ∈ ℝ (x² = 2)');assert.equal(row.logicStatements[0].verification,'unverified');if(activeAuxId)assert.deepEqual(saved.rows,before.rows);else assert.deepEqual(saved.auxiliary,before.auxiliary);assert.deepEqual(parseBackup(serializeBackup(saved)),saved);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 const reload=await setup(saved);reload.click('[data-context-board]');reload.click('[data-board-logic-edit="0"]');assert.equal(reload.$('[data-logic-predicate]').value,'x² = 2');assert.equal(reload.$('[data-logic-quantifier="0"]').value,'∃');reload.click('[data-task-close]');reload.click('[data-task-close]');assert.deepEqual(reload.data(),saved);
});

test('logic added through a free-input board stays in that draft until the formula is saved',async()=>{
 const h=await setup(),before=h.data();
 for(const cancel of [true,false]){
  h.click('[data-free-input]');await h.type('[data-work-expression]','x+7');h.$('[data-work-expression]').setSelectionRange(1,3);h.click('[data-draft-context]');await h.type('[data-board-condition]','x ∈ ℝ');h.click('[data-board-logic-open]');await h.type('[data-logic-predicate]','x² ≥ 0');await h.type('[data-logic-meaning]','x의 제곱은 0 이상입니다.');h.click('[data-logic-save]');assert.deepEqual(h.data(),before);h.click('[data-board-save]');assert.equal(h.$('[data-work-expression]').value,'x+7');assert.equal(h.$('[data-work-expression]').selectionStart,1);assert.equal(h.$('[data-work-expression]').selectionEnd,3);assert.deepEqual(h.data(),before);
  if(cancel){h.click('[data-task-close]');assert.deepEqual(h.data(),before);}else{h.click('[data-input-save]');const after=h.data();assert.deepEqual(after.rows.slice(0,-1),before.rows);assert.equal(after.rows.at(-1).logicStatements.length,1);assert.equal(after.rows.at(-1).logicStatements[0].formula,'∀x ∈ ℝ (x² ≥ 0)');assert.deepEqual(after.rows.at(-1).origin.logicStatements,after.rows.at(-1).logicStatements);}
 }
});
test('failed context save keeps the draft, previous row and backup data intact',async()=>{
 const h=await setup(),before=h.data();h.click('[data-context-board]');await h.type('[data-board-condition]','x ≠ 0');h.block(true);h.click('[data-board-save]');assert.deepEqual(h.data(),before);assert.equal(h.$('[data-board-condition]').value,'x ≠ 0');assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.block(false);h.click('[data-board-save]');assert.equal(h.data().rows[1].condition,'x ≠ 0');h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

for(const failure of ['invalid definition','quota'])test(`a new ${failure} error dismisses the previous success without losing the retry draft`,async()=>{
 const h=await setup();h.click('[data-context-board]');await h.type('[data-board-condition]','x > 0');h.click('[data-board-save]');const saved=h.data();assert.equal(h.$('#toast').hidden,false);assert.match(h.$('#toast').textContent,/조건·정의를 기록/);
 h.click('[data-context-board]');await h.type('[data-board-condition]','x > 1');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]',failure==='quota'?'a := x+1':'a = x+1');const field=h.$('[data-board-definition]');field.setSelectionRange(5,7);
 if(failure==='quota'){h.block(true);h.click('[data-board-save]');assert.match(h.$('.work-task-error').textContent,/저장하지 못/);assert.equal(h.$('[data-storage-status]').dataset.noticeState,'failed');}else{assert(h.$('[data-board-save]').disabled);assert.match(h.$('.work-task-error').textContent,/정의는 등호와 구분/);}
 assert.equal(h.$('#toast').hidden,true);assert.equal(h.$('#toast').textContent,'');assert.equal(h.$('[data-board-definition]'),field);assert.equal(field.selectionStart,5);assert.equal(field.selectionEnd,7);assert.equal(h.$('[data-board-condition]').value,'x > 1');assert.deepEqual(h.data(),saved);
 h.block(false);await h.type('[data-board-definition]','a := x+2');if(failure==='quota')assert.match(h.$('.work-task-error').textContent,/다시 저장 시도/);else assert.equal(h.$('.work-task-error').textContent,'');assert(!h.$('[data-board-save]').disabled);assert.deepEqual(h.data(),saved);h.click('[data-board-save]');assert.equal(h.data().rows[1].condition,'x > 1');assert.equal(h.data().rows[1].bindings.a,'x + 2');assert.equal(h.$('[data-storage-status]').dataset.noticeState,'saved');assert.equal(h.$('#toast').hidden,false);assert.match(h.$('#toast').textContent,/조건·정의를 기록/);
});

test('saving a definition without applying it never creates a restore row from spacing or explicit groups',async()=>{
 for(const activeAuxId of [null,'aux-1'])for(const value of ['x+1','(x+1)']){
  const book=notebook();book.activeAuxId=activeAuxId;const target=activeAuxId?book.auxiliary[0].rows[0]:book.rows[book.active];Object.assign(target,{value,keepGroups:true,note:'보존할 풀이'});
  const h=await setup(book),before=h.data();h.click('[data-context-board]');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','t := x+1');
  const save=h.$('[data-board-save]');save.click();save.click();const saved=h.data(),row=activeAuxId?saved.auxiliary[0].rows[0]:saved.rows[saved.active];
  assert.equal(row.value,(activeAuxId?before.auxiliary[0].rows[0]:before.rows[before.active]).value);assert.deepEqual(row.bindings,{t:'x + 1'});
  for(let i=0;i<3;i++){h.click('[data-restore-all]');assert.deepEqual(h.data(),saved);assert.match(h.$('#toast').textContent,/복원할 치환 문자가 없습니다/);}
  assert.deepEqual(parseBackup(serializeBackup(h.data())),saved);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 }
});

test('trigonometric solution records keep degree units, integer periods, alternative paths and unverified completeness claims',async()=>{
 const h=await setup();h.click('[data-context-board]');await h.type('[data-board-condition]','θ ∈ ℝ, 도(°) 단위, k ∈ ℤ, −1 ≤ a ≤ 1, −1 ≤ b ≤ 1, a²+b²=1');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a := sinθ');h.click('[data-board-save]');h.click('[data-context-board]');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','b := cosθ');h.click('[data-board-save]');
 for(const [formula,meaning]of [['θ=120°k','일반해 후보를 기록합니다. 360°k, 120°+360°k, 240°+360°k와 같은 집합인지 사람이 확인합니다.'],['θ=30°+360°k ∨ θ=90°+360°k','대입 확인과 모든 해를 찾았다는 주장을 구분하고, 150°+360°k의 누락을 확인합니다.'],['θ=15°+180°k ∨ θ=75°+180°k','u=2θ에서 돌아오며 각도와 주기를 함께 나눴는지 확인합니다.'],['a(a−2b)+b(b−2a)=0','합의 각 항을 각각 0으로 놓을 수는 없습니다. a²+b²=1 관계를 함께 유지합니다.']]){
  h.click('[data-logic-open]');h.$('[data-logic-kind]').value='주장';h.$('[data-logic-method]').value='direct';h.$('[data-logic-method]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await h.type('[data-logic-parameters]','θ ∈ ℝ, k ∈ ℤ, 도(°) 단위');await h.type('[data-logic-predicate]',formula);await h.type('[data-logic-meaning]',meaning);h.click('[data-logic-save]');
 }
 const before=h.data();h.click('[data-new-aux]');await h.type('[data-work-expression]','a^2-4*a*b+b^2=0');assert(!h.$('[data-input-save]').disabled);h.click('[data-input-save]');const row=h.data().auxiliary.at(-1).rows[0];assert.deepEqual(row.bindings,{a:'sin(theta)',b:'cos(theta)'});assert.equal(row.condition,before.rows[1].condition);assert.deepEqual(row.logicStatements,before.rows[1].logicStatements);assert(row.logicStatements.every(v=>v.verification==='unverified'));assert.equal(row.practiceFeedback,undefined);assert.deepEqual(parseBackup(serializeBackup(h.data())),h.data());
});

test('auxiliary application rejects definition capture in either sheet without changing any records',async()=>{
 for(const [main,auxiliary] of [[{b:'a + 1'},{a:'x + 1'}],[{a:'x + 1'},{b:'a + 1'}]]){
  const h=await setup({rows:[{value:'x+1',title:'직접 입력',condition:'x ∈ ℝ',bindings:{},logicStatements:[]}],active:0,auxiliary:[]});
  h.click('[data-new-aux]');await h.type('[data-work-expression]','x=2');h.click('[data-input-save]');
  const define=async bindings=>{h.click('[data-context-board]');h.click('[data-board-mode="definition"]');const [name,value]=Object.entries(bindings)[0];await h.type('[data-board-definition]',`${name} := ${value}`);h.click('[data-board-save]');};
  await define(auxiliary);h.click('[data-sheet="main"]');await define(main);h.click('[data-sheet="aux-1"]');const before=h.data();
  assert.deepEqual(before.rows[0].bindings,main);assert.deepEqual(before.auxiliary[0].rows[0].bindings,auxiliary);h.click('[data-aux-apply]');
  assert.match(h.$('#toast').textContent,/기존 정의에서 쓰는 문자와 겹칩니다/);assert(!h.document.querySelector('[data-aux-confirm]'));assert.deepEqual(h.data(),before);
 }
});

test('independent auxiliary definitions still merge and undo restores both scopes exactly',async()=>{
 const book=notebook();book.rows[0].bindings={b:'x + 1'};book.auxiliary[0].rows[0].value='sin(theta)=0';book.auxiliary[0].rows[0].bindings={a:'cos(theta)'};book.activeAuxId='aux-1';
 const h=await setup(book),before=h.data();h.click('[data-aux-apply]');h.click('[data-aux-confirm]');const after=h.data();assert.equal(after.rows[1].value,'0 + 1');assert.deepEqual(after.rows[1].bindings,{b:'x + 1',a:'cos(theta)'});assert.equal(after.rows[1].condition,before.rows[0].condition);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

test('board mode round trips retain each field selection and the next edit stays at that selection',async()=>{
 for(const activeAuxId of [null,'aux-1']){
  const book=notebook();book.activeAuxId=activeAuxId;const h=await setup(book),before=h.data();h.click('[data-context-board]');
  await h.type('[data-board-condition]','x > 0');h.$('[data-board-condition]').setSelectionRange(0,1);h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a:=x+1');h.$('[data-board-definition]').setSelectionRange(3,4);
  h.click('[data-board-mode="condition"]');assert.equal(h.$('[data-board-condition]').selectionStart,0);assert.equal(h.$('[data-board-condition]').selectionEnd,1);h.click('[data-board-key="θ"]');assert.equal(h.$('[data-board-condition]').value,'θ > 0');
  h.click('[data-board-mode="definition"]');const field=h.$('[data-board-definition]');assert.equal(field.selectionStart,3);assert.equal(field.selectionEnd,4);assert(field.hasAttribute('readonly'));assert.equal(field.getAttribute('inputmode'),'none');h.click('[data-board-pad-tab="function"]');h.click('[data-board-key="sin()"]');assert.equal(field.value,'a:=sin()+1');h.click('[data-board-pad-tab="symbol"]');h.click('[data-board-key="x"]');assert.equal(field.value,'a:=sin(x)+1');assert(!h.$('[data-board-save]').disabled);
  assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 }
});

test('condition equality and definition keys insert at the caret and save only the selected sheet context',async()=>{
 for(const activeAuxId of [null,'aux-1']){
  const book=notebook();book.activeAuxId=activeAuxId;const row=activeAuxId?book.auxiliary[0].rows[0]:book.rows[1];row.bindings={t:'x+1'};
  const h=await setup(book),before=h.data();h.click('[data-context-board]');
  await h.type('[data-board-condition]','x  1');h.$('[data-board-condition]').setSelectionRange(2,2);h.click('.work-board-tabs [data-board-key="="]');
  assert.equal(h.$('[data-board-condition]').value,'x = 1');assert.equal(h.$('[data-board-condition]').selectionStart,3);assert(h.$('[data-board-condition]').hasAttribute('readonly'));
  h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a  x+1');h.$('[data-board-definition]').setSelectionRange(2,2);h.click('.work-board-tabs [data-board-key=":="]');
  assert.equal(h.$('[data-board-definition]').value,'a := x+1');assert.equal(h.$('[data-board-definition]').selectionStart,4);assert(h.$('[data-board-definition]').hasAttribute('readonly'));
  h.click('[data-board-mode="condition"]');assert.equal(h.$('[data-board-condition]').value,'x = 1');assert.equal(h.$('[data-board-condition]').selectionStart,3);assert.deepEqual(h.data(),before);
  h.click('[data-board-save]');const expected=structuredClone(before),target=activeAuxId?expected.auxiliary[0].rows[0]:expected.rows[1];target.condition='x = 1';target.bindings={t:'x+1',a:'x + 1'};assert.deepEqual(h.data(),expected);assert.deepEqual(parseBackup(serializeBackup(h.data())),expected);
  h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 }
});

for(const activeAuxId of [null,'aux-1'])for(const kind of ['formula','definition','note'])test(`inspecting current bindings preserves the ${kind} draft and selection on ${activeAuxId?'auxiliary':'main'}`,async()=>{
 const book=notebook();book.activeAuxId=activeAuxId;const row=activeAuxId?book.auxiliary[0].rows[0]:book.rows[book.active];row.bindings={t:'x + 1',u:'t ^ 2'};
 const h=await setup(book);assert.equal(h.$('.work-context').hasAttribute('open'),false);
 assert.equal(h.$('.work-context-body').children[1],h.$('.work-binding-list'));
 const labels=[...h.document.querySelectorAll('.work-binding-value')].map(e=>e.getAttribute('aria-label'));assert.deepEqual(labels,['치환 정의 t := x + 1','치환 정의 u := t ^ 2']);
 for(const value of h.document.querySelectorAll('.work-binding-value'))assert.equal(value.getAttribute('tabindex'),'0');
 if(kind==='formula')h.click('[data-free-input]');else if(kind==='definition'){h.click('[data-context-board]');h.click('[data-board-mode="definition"]');}else h.click(`[data-note-edit="${activeAuxId?0:book.active}"]`);
 const selector=kind==='formula'?'[data-work-expression]':kind==='definition'?'[data-board-definition]':'[data-note-draft]',text=kind==='formula'?'x+77':kind==='definition'?'v := x+2':'보존할 설명 초안';
 await h.type(selector,text);const field=h.$(selector);field.setSelectionRange(1,3);
 const before=h.data(),markup=h.$('[data-work-task]').innerHTML,storage=globalThis.localStorage,write=storage.setItem;let writes=0;storage.setItem=(...args)=>{writes++;return write(...args);};
 for(const open of [true,false,true]){
  h.$('.work-context > summary').click();h.$('.work-context').open=open;h.$('.work-context').dispatchEvent(new h.window.Event('toggle'));
  h.$('.work-binding-value').click();h.$('.work-binding-value').dispatchEvent(new h.window.Event('keydown',{bubbles:true}));
  assert.equal(h.$(selector),field);assert.equal(field.value,text);assert.deepEqual([field.selectionStart,field.selectionEnd],[1,3]);assert.equal(h.$('[data-work-task]').innerHTML,markup);
  assert.deepEqual(h.data(),before);assert.equal(writes,0);assert.equal(h.$(`[data-sheet="${activeAuxId||'main'}"]`).getAttribute('aria-selected'),'true');
  assert.deepEqual([...h.document.querySelectorAll('.work-binding-value')].map(e=>e.getAttribute('aria-label')),labels);
 }
});

test('binding lookup refreshes on row/sheet changes and undo removes a newly saved definition',async()=>{
 const book=notebook();book.rows[0].bindings={t:'x + 1'};book.rows[1].bindings={t:'x + 2'};book.auxiliary[0].rows[0].bindings={t:'x + 3'};
 const h=await setup(book),label=()=>h.$('.work-binding-value').getAttribute('aria-label');
 assert.equal(label(),'치환 정의 t := x + 2');h.click('[data-work-row="0"]');assert.equal(label(),'치환 정의 t := x + 1');
 h.click('[data-sheet="aux-1"]');assert.equal(label(),'치환 정의 t := x + 3');h.click('[data-sheet="main"]');assert.equal(label(),'치환 정의 t := x + 1');
 const before=h.data();h.click('[data-context-board]');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','u := x+9');h.click('[data-board-save]');
 assert.match(h.$('.work-binding-list').textContent,/u :=/);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);assert.equal(h.document.querySelectorAll('.work-binding-value').length,1);assert(!h.$('.work-binding-list').textContent.includes('x + 9'));
});

test('edited and deleted symbolic definitions leave no stale text and are not promoted to calculation bindings',async()=>{
 const book=notebook();book.rows[1].bindings={t:'x + 1'};book.rows[1].logicStatements=[{kind:'정의',domain:'x, y ∈ ℝ',formula:'A := x+y',meaning:'A는 x와 y의 합입니다.',verification:'unverified'}];
 const h=await setup(book);h.click('[data-logic-edit="0"]');await h.type('[data-logic-predicate]','A := x-y');await h.type('[data-logic-meaning]','A는 x와 y의 차입니다.');h.click('[data-logic-save]');
 assert(h.$('[data-work-context]').textContent.includes('A := x-y'));assert(!h.$('[data-work-context]').textContent.includes('A := x+y'));assert.deepEqual(h.data().rows[1].bindings,{t:'x + 1'});
 h.click('[data-logic-remove="0"]');assert(!h.$('[data-work-context]').textContent.includes('A :='));assert.equal(h.document.querySelectorAll('.work-binding-value').length,1);assert.deepEqual(h.data().rows[1].bindings,{t:'x + 1'});
});

test('backup replacement updates and removes current binding lookup content',async()=>{
 const book=notebook();book.rows[1].bindings={t:'x + 1'};const h=await setup(book);
 for(const bindings of [{t:'x + 8'},{}]){
  const next=structuredClone(h.data());next.rows[next.active].bindings=bindings;const text=serializeBackup(next);h.click('[data-backup-open]');
  Object.defineProperty(h.$('[data-backup-file]'),'files',{value:[{size:text.length,text:async()=>text}]});h.$('[data-backup-file]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));h.click('[data-backup-restore]');
  assert.deepEqual(h.data(),next);assert.equal(h.document.querySelectorAll('.work-binding-value').length,Object.keys(bindings).length);assert(!h.$('[data-work-context]').textContent.includes('x + 1'));
  if(bindings.t)assert.equal(h.$('.work-binding-value').getAttribute('aria-label'),'치환 정의 t := x + 8');else assert(!h.$('[data-work-context]').textContent.includes('x + 8'));
 }
});

for(const activeAuxId of [null,'aux-1'])test(`folding the definition board for lookup restores its input and caret on ${activeAuxId?'auxiliary':'main'}`,async()=>{
 const book=notebook();book.activeAuxId=activeAuxId;(activeAuxId?book.auxiliary[0].rows[0]:book.rows[1]).bindings={t:'x + 1'};
 const h=await setup(book),before=h.data();h.click('[data-context-board]');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','u := x+8');h.click('[data-board-keyboard]');
 const field=h.$('[data-board-definition]');field.setSelectionRange(5,8);const mode=h.$('[data-board-keyboard]').getAttribute('aria-pressed');
 h.click('[data-show-bindings]');assert(h.$('[data-work-task]').hidden);assert(h.$('.work-context').open);assert.equal(h.$('[data-board-definition]'),field);assert.equal(h.$('[data-direct-toggle]').textContent,'초안으로 ↑');assert.deepEqual(h.data(),before);
 h.click('[data-direct-toggle]');assert(!h.$('[data-work-task]').hidden);assert.equal(h.$('[data-board-definition]'),field);assert.equal(field.value,'u := x+8');assert.deepEqual([field.selectionStart,field.selectionEnd],[5,8]);assert.equal(h.$('[data-board-keyboard]').getAttribute('aria-pressed'),mode);assert.deepEqual(h.data(),before);
 h.click('[data-board-save]');assert.equal((activeAuxId?h.data().auxiliary[0]:h.data()).rows[activeAuxId?0:1].bindings.u,'x + 8');h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 h.click('[data-free-input]');h.click('[data-draft-context]');assert.equal(h.document.querySelector('[data-show-bindings]'),null);assert.equal(h.$('[data-board-definition]').value,'');
});

for(const activeAuxId of [null,'aux-1'])test(`board tabs and reopening retain keyboard, selection and draft on ${activeAuxId?'auxiliary':'main'}`,async()=>{
 const book=notebook();book.activeAuxId=activeAuxId;(activeAuxId?book.auxiliary[0].rows[0]:book.rows[1]).bindings={t:'x+1'};
 const h=await setup(book),before=h.data();h.click('[data-context-board]');h.click('[data-board-keyboard]');await h.type('[data-board-condition]','∀x ∈ ℝ, x ≥ 0');h.$('[data-board-condition]').setSelectionRange(2,4);
 h.click('[data-board-mode="definition"]');assert.equal(h.$('[data-board-keyboard]').getAttribute('aria-pressed'),'true');assert(!h.$('[data-board-definition]').hasAttribute('readonly'));assert(h.$('[data-board-pad]').hidden);
 await h.type('[data-board-definition]','u := x+8');h.$('[data-board-definition]').setSelectionRange(5,8);h.click('[data-board-mode="condition"]');assert.deepEqual([h.$('[data-board-condition]').selectionStart,h.$('[data-board-condition]').selectionEnd],[2,4]);assert.match(h.$('#work-board-guide').textContent,/참·거짓을 검증/);
 h.click('[data-board-mode="definition"]');const field=h.$('[data-board-definition]');h.click('[data-context-board]');assert.equal(h.$('[data-board-definition]'),field);assert.equal(field.value,'u := x+8');
 h.click('[data-show-bindings]');h.click('[data-new-aux]');h.click('[data-binding-apply="t"]');assert(h.$('[data-work-task]').hidden);assert.equal(h.$('[data-board-definition]'),field);assert.deepEqual(h.data(),before);
 h.click('[data-context-board]');assert(!h.$('[data-work-task]').hidden);assert.equal(h.$('[data-board-definition]'),field);assert.deepEqual([field.value,field.selectionStart,field.selectionEnd],['u := x+8',5,8]);assert.equal(h.$('[data-board-keyboard]').getAttribute('aria-pressed'),'true');
 h.click('[data-board-save]');const saved=h.data(),row=(activeAuxId?saved.auxiliary[0]:saved).rows[activeAuxId?0:1];assert.equal(row.condition,'∀x ∈ ℝ, x ≥ 0');assert.deepEqual(row.bindings,{t:'x+1',u:'x + 8'});assert(h.$('.work-context').open);assert(h.$('.direct-dock').classList.contains('is-collapsed'));assert.deepEqual(parseBackup(serializeBackup(saved)),saved);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

for(const mode of ['free','auxiliary'])test(`board save and cancel return to the ${mode} input with its selected keyboard and caret`,async()=>{
 for(const save of [false,true]){
  const h=await setup(),before=h.data();h.click(mode==='free'?'[data-free-input]':'[data-new-aux]');h.click('[data-work-keyboard]');await h.type('[data-work-expression]','x+7');h.$('[data-work-expression]').setSelectionRange(1,2);
  h.click('[data-draft-context]');await h.type('[data-board-condition]','x > 0');h.click(save?'[data-board-save]':'[data-task-close]');const field=h.$('[data-work-expression]');assert.deepEqual([field.value,field.selectionStart,field.selectionEnd],['x+7',1,2]);assert.equal(h.$('[data-work-keyboard]').getAttribute('aria-pressed'),'true');assert(!field.hasAttribute('readonly'));assert(h.$('[data-work-pad]').hidden);assert.deepEqual(h.data(),before);
  h.click('[data-context-board]');h.click('[data-new-aux]');assert.equal(h.$('[data-work-expression]'),field);assert.deepEqual(h.data(),before);
  h.click('[data-input-save]');const data=h.data(),row=mode==='free'?data.rows.at(-1):data.auxiliary.at(-1).rows[0];assert.equal(row.condition,save?'x > 0':mode==='free'?'':before.rows[before.active].condition);assert.deepEqual(data.rows.slice(0,before.rows.length),before.rows);assert.deepEqual(data.auxiliary.slice(0,before.auxiliary.length),before.auxiliary);
 }
});

for(const action of ['header','footer','Escape'])test(`${action} explicitly cancels board changes, unlike folding, and reopening uses saved context`,async()=>{
 for(const activeAuxId of [null,'aux-1']){
  const book=notebook();book.activeAuxId=activeAuxId;const row=activeAuxId?book.auxiliary[0].rows[0]:book.rows[1];row.condition='x는 실수';row.bindings={t:'x+1'};
  const h=await setup(book),before=h.data();h.click('[data-context-board]');
  assert.equal(h.$('.work-task>header [data-task-close]').textContent,'취소');assert.match(h.$('.work-task>header [data-task-close]').getAttribute('aria-label'),/변경 취소/);assert.match(h.$('#work-board-cancel-guide').textContent,/이번 보드 변경을 반영하지 않고/);assert.match(h.$('[data-show-bindings]').textContent,/초안 유지/);
  for(const button of h.document.querySelectorAll('.work-context-board [data-task-close]'))assert.equal(button.getAttribute('aria-describedby'),'work-board-cancel-guide');
  h.click('[data-board-keyboard]');await h.type('[data-board-condition]','x > 12');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','u := x+8');
  if(action==='Escape'){const event=new h.window.Event('keydown',{bubbles:true});Object.defineProperty(event,'key',{value:'Escape'});h.document.dispatchEvent(event);}else h.click(action==='header'?'.work-task>header [data-task-close]':'.work-task-navigation [data-task-close]');
  assert(h.$('[data-work-task]').hidden);assert.deepEqual(h.data(),before);h.click('[data-context-board]');assert.equal(h.$('[data-board-condition]').value,'x는 실수');assert.equal(h.$('[data-board-definition]').value,'');assert.equal(h.$('[data-board-keyboard]').getAttribute('aria-pressed'),'false');assert.deepEqual(h.data(),before);
 }
});

for(const activeAuxId of [null,'aux-1'])test(`hidden definition errors guide correction without losing the ${activeAuxId?'auxiliary':'main'} draft`,async()=>{
 const book=notebook();book.activeAuxId=activeAuxId;const h=await setup(book),before=h.data();h.click('[data-context-board]');h.click('[data-board-keyboard]');await h.type('[data-board-condition]','x > 12');h.$('[data-board-condition]').setSelectionRange(0,1);h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','a :=');h.$('[data-board-definition]').setSelectionRange(4,4);h.click('[data-board-mode="condition"]');
 assert(h.$('[data-board-save]').disabled);assert.equal(h.$('[data-board-definition]').getAttribute('aria-invalid'),'true');assert.equal(h.$('[data-board-mode="definition"]').textContent,'정의 확인');assert.match(h.$('.work-task-error').textContent,/오른쪽/);assert(!h.$('[data-board-fix]').hidden);
 h.click('[data-board-fix]');assert.equal(h.$('[data-board-mode="definition"]').getAttribute('aria-selected'),'true');assert.deepEqual([h.$('[data-board-definition]').value,h.$('[data-board-definition]').selectionStart,h.$('[data-board-definition]').selectionEnd],['a :=',4,4]);assert.equal(h.$('[data-board-keyboard]').getAttribute('aria-pressed'),'true');assert.equal(h.$('[data-board-condition]').value,'x > 12');assert.deepEqual(h.data(),before);
 await h.type('[data-board-definition]','a := x+1');assert(h.$('[data-board-fix]').hidden);assert.equal(h.$('[data-board-definition]').getAttribute('aria-invalid'),'false');assert(!h.$('[data-board-save]').disabled);h.click('[data-board-mode="condition"]');assert.deepEqual([h.$('[data-board-condition]').selectionStart,h.$('[data-board-condition]').selectionEnd],[0,1]);h.click('[data-board-save]');const after=h.data(),row=(activeAuxId?after.auxiliary[0]:after).rows[activeAuxId?0:1];assert.equal(row.condition,'x > 12');assert.deepEqual(row.bindings,{a:'x + 1'});assert.deepEqual(parseBackup(serializeBackup(after)),after);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

test('symbolic records require each field and retain incomplete text until explicitly completed',async()=>{
 const h=await setup(),before=h.data();h.click('[data-context-board]');h.click('[data-board-mode="definition"]');h.$('[data-board-record-only]').checked=true;h.$('[data-board-record-only]').dispatchEvent(new h.window.Event('change',{bubbles:true}));
 await h.type('[data-board-domain]','x ∈ ℝ');await h.type('[data-board-meaning]','F는 적분을 나타내는 기호입니다.');h.click('[data-board-mode="condition"]');assert(h.$('[data-board-save]').disabled);assert.equal(h.$('[data-board-definition]').getAttribute('aria-invalid'),'true');h.click('[data-board-fix]');assert.equal(h.$('[data-board-domain]').value,'x ∈ ℝ');assert.match(h.$('[data-board-meaning]').value,/적분/);
 await h.type('[data-board-definition]','F := integral(x)');await h.type('[data-board-domain]','');h.click('[data-board-fix]');assert(h.$('.work-board-options').open);assert.equal(h.$('[data-board-domain]').getAttribute('aria-invalid'),'true');assert.match(h.$('[data-board-fix]').textContent,/정의역/);
 await h.type('[data-board-domain]','x ∈ ℝ');await h.type('[data-board-meaning]','');assert.equal(h.$('[data-board-meaning]').getAttribute('aria-invalid'),'true');assert(h.$('[data-board-save]').disabled);assert.deepEqual(h.data(),before);await h.type('[data-board-meaning]','F는 적분을 나타내는 기호입니다.');assert(h.$('[data-board-fix]').hidden);h.click('[data-board-save]');const saved=h.data();assert.deepEqual(saved.rows[1].bindings,{});assert.equal(saved.rows[1].logicStatements[0].verification,'unverified');assert.equal(saved.rows[1].logicStatements[0].formula,'F := integral(x)');assert.deepEqual(parseBackup(serializeBackup(saved)),saved);
});

test('save failure remains distinct from input errors across tabs until a successful retry',async()=>{
 const h=await setup(),before=h.data();h.click('[data-context-board]');await h.type('[data-board-condition]','x > 12');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','u := x+8');h.$('[data-board-definition]').setSelectionRange(5,8);h.block(true);h.click('[data-board-save]');
 assert.equal(h.$('[data-board-save]').textContent,'다시 저장 시도');assert(h.$('[data-board-fix]').hidden);assert.equal(h.$('[data-board-definition]').getAttribute('aria-invalid'),'false');assert.deepEqual(h.data(),before);
 h.click('[data-board-mode="condition"]');assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.click('[data-board-mode="definition"]');assert.deepEqual([h.$('[data-board-definition]').value,h.$('[data-board-definition]').selectionStart,h.$('[data-board-definition]').selectionEnd],['u := x+8',5,8]);
 await h.type('[data-board-definition]','u :=');assert(h.$('[data-board-save]').disabled);assert.match(h.$('.work-task-error').textContent,/오른쪽/);await h.type('[data-board-definition]','u := x+9');assert(!h.$('[data-board-save]').disabled);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);assert.deepEqual(h.data(),before);h.block(false);h.click('[data-board-save]');assert.equal(h.data().rows[1].condition,'x > 12');assert.equal(h.data().rows[1].bindings.u,'x + 9');h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

test('an empty optional definition preserves existing definitions and permits an explicitly blank condition',async()=>{
 const book=notebook();book.rows[1].bindings={t:'x+1'};const h=await setup(book),before=h.data();h.click('[data-context-board]');await h.type('[data-board-condition]','');h.click('[data-board-mode="definition"]');await h.type('[data-board-definition]','  ');assert(!h.$('[data-board-save]').disabled);assert(h.$('[data-board-fix]').hidden);assert.match(h.$('[data-board-preview]').textContent,/기존 정의는 유지/);h.click('[data-board-save]');const after=h.data();assert.equal(after.rows[1].condition,'');assert.deepEqual(after.rows[1].bindings,before.rows[1].bindings);assert.deepEqual(after.rows[0],before.rows[0]);assert.deepEqual(after.auxiliary,before.auxiliary);
});


test('board keyboard changes retain focus and backward selections through condition and definition tabs',async()=>{
 const h=await setup(),before=h.data();h.click('[data-context-board]');
 for(const mode of ['condition','definition']){
  h.click(`[data-board-mode="${mode}"]`);const f=h.$(`[data-board-${mode}]`);await h.type(`[data-board-${mode}]`,mode==='condition'?'x > 0\nsin(x)':'a := sin(x)');f.setSelectionRange(5,8,'backward');let focus=0;f.focus=()=>{focus++;};
  for(let i=0;i<2;i++){h.click('[data-board-keyboard]');assert.deepEqual([f.selectionStart,f.selectionEnd,f.selectionDirection],[5,8,'backward']);}assert.equal(focus,2);assert(f.hasAttribute('readonly'));assert(f.parentElement.querySelector('[data-input-caret]'));
 }
 h.click('[data-board-mode="condition"]');assert.deepEqual([h.$('[data-board-condition]').selectionStart,h.$('[data-board-condition]').selectionEnd,h.$('[data-board-condition]').selectionDirection],[5,8,'backward']);assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});
