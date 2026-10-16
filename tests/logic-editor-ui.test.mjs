import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';import {WORK_KEY} from '../dist/workspace-state.js';import {quantifiedStatement,logicStatement} from '../dist/learning-tools.js';import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
const bindings=[{quantifier:'∀',variable:'x',domain:'R'},{quantifier:'∃',variable:'y',domain:'N'},{quantifier:'∀',variable:'θ',domain:'Q'}];
const source=()=>({...quantifiedStatement(bindings,'P(x, y, θ)','P가 성립합니다.','P는 위 변수들에 관한 술어'),kind:'가정'});
const bookOf=statement=>({rows:[{value:'x+1',title:'직접 입력',logicStatements:[statement],note:'보존할 풀이'}],active:0,activeAuxId:null});
let sequence=0;
async function setup(book){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){const o=this.querySelector('option[selected]')||this.querySelector('option');return o?(o.getAttribute('value')??o.textContent):'';},set(v){for(const o of this.querySelectorAll('option')){o.removeAttribute('selected');if((o.getAttribute('value')??o.textContent)===String(v))o.setAttribute('selected','');}}});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=()=>{};window.math=math;window.innerWidth=320;window.innerHeight=640;
 const memory=new Map([[WORK_KEY,JSON.stringify(book)]]);let blocked=false;
 Object.assign(globalThis,{window,document,requestAnimationFrame:f=>f(),localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');memory.set(k,v);}}});
 (await import(`../dist/workspace-app.js?logic-editor=${sequence++}`)).startWorkspace();
 const $=s=>{const el=document.querySelector(s);assert(el,'Missing '+s);return el;},click=s=>$(s).click(),data=()=>JSON.parse(memory.get(WORK_KEY));
 const input=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));},change=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new window.Event('change',{bubbles:true}));};
 const shownBindings=()=>[0,1,2].map(i=>({quantifier:$(`[data-logic-quantifier="${i}"]`).value,variable:$(`[data-logic-variable="${i}"]`).value,domain:$(`[data-logic-domain="${i}"]`).value}));
 return {$,click,data,input,change,shownBindings,document,window,block:v=>{blocked=v;}};
}
for(const legacy of [false,true])test(`${legacy?'legacy':'current'} builder edits preserve ordered scopes and cancel without changing the notebook`,async()=>{
 const statement=source();if(legacy){delete statement.predicateMeaning;delete statement.parameters;}
 const h=await setup(bookOf(statement)),before=h.data();h.click('[data-logic-edit="0"]');assert.equal(h.$('[data-logic-method]').value,'quantified');assert.deepEqual(h.shownBindings(),bindings);assert.equal(h.$('[data-logic-meaning]').value,'P가 성립합니다.');assert.equal(h.$('[data-logic-parameters]').value,'P는 위 변수들에 관한 술어');assert.deepEqual(h.data(),before);
 h.change('[data-logic-quantifier="0"]','∃');h.change('[data-logic-domain="1"]','C');h.input('[data-logic-variable="1"]','z');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 h.click('[data-logic-edit="0"]');assert.deepEqual(h.shownBindings(),bindings);h.input('[data-logic-predicate]','P(x, y, θ) ∧ Q(x)');h.input('[data-logic-meaning]','P와 Q가 성립합니다.');h.click('[data-logic-save]');
 const saved=h.data(),v=saved.rows[0].logicStatements[0];assert.equal(v.kind,'가정');assert.deepEqual(v.quantifiers,bindings);assert.equal(v.predicate,'P(x, y, θ) ∧ Q(x)');assert.equal(v.predicateMeaning,'P와 Q가 성립합니다.');assert.equal(v.formula,'∀x ∈ ℝ (∃y ∈ ℕ₀ (∀θ ∈ ℚ (P(x, y, θ) ∧ Q(x))))');assert.equal(v.verification,'unverified');assert.equal(saved.rows[0].note,before.rows[0].note);
 const restored=parseBackup(serializeBackup(saved));assert.deepEqual(restored,saved);const reload=await setup(restored);reload.click('[data-logic-edit="0"]');assert.deepEqual(reload.shownBindings(),bindings);assert.equal(reload.$('[data-logic-meaning]').value,'P와 Q가 성립합니다.');reload.click('[data-task-close]');
});
test('direct and inconsistent metadata records retain exact original text even on an unchanged save',async()=>{
 const direct={...logicStatement('x, y ∈ ℝ','¬∀x ∈ ℝ (∃y ∈ ℝ (P(x, y))) ∨ Q','전칭 명제의 부정 또는 Q'),kind:'정의',extraNote:'보존'};direct.formula='  '+direct.formula+'\n';
 const inconsistent={...source(),formula:'∃x ∈ ℝ (P(x))'};
 for(const v of [direct,inconsistent]){const h=await setup(bookOf(v)),before=h.data();h.click('[data-logic-edit="0"]');assert.equal(h.$('[data-logic-method]').value,'direct');assert.equal(h.$('[data-logic-predicate]').value,v.formula);assert.equal(h.$('[data-logic-parameters]').value,v.domain);assert.equal(h.$('[data-logic-meaning]').value,v.meaning);assert.match(h.$('[data-logic-edit-note]').textContent,/구조 편집으로 복원할 수 없어요.*원문.*직접 편집.*수학적 오류를 뜻하지는/);
  h.change('[data-logic-method]','quantified');assert.equal(h.$('[data-logic-method]').value,'direct');assert.equal(h.$('[data-logic-predicate]').value,v.formula);h.click('[data-task-close]');assert.deepEqual(h.data(),before);h.click('[data-logic-edit="0"]');h.click('[data-logic-save]');assert.deepEqual(h.data(),before);
 }
});
test('switching editor modes preserves complete scope and refuses to interpret modified direct text',async()=>{
 const v=source(),h=await setup(bookOf(v)),before=h.data();h.click('[data-logic-edit="0"]');h.change('[data-logic-method]','direct');assert.equal(h.$('[data-logic-predicate]').value,v.formula);assert.equal(h.$('[data-logic-meaning]').value,v.meaning);assert.equal(h.$('[data-logic-parameters]').value,v.domain);
 h.change('[data-logic-method]','quantified');assert.deepEqual(h.shownBindings(),bindings);assert.equal(h.$('[data-logic-meaning]').value,v.predicateMeaning);
 h.change('[data-logic-method]','direct');h.input('[data-logic-predicate]','¬('+v.formula+')');h.change('[data-logic-method]','quantified');assert.equal(h.$('[data-logic-method]').value,'direct');assert.equal(h.$('[data-logic-predicate]').value,'¬('+v.formula+')');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 h.click('[data-logic-open]');h.change('[data-logic-domain="0"]','Z');h.change('[data-logic-method]','direct');assert.equal(h.$('[data-logic-method]').value,'direct');h.change('[data-logic-method]','quantified');assert.equal(h.$('[data-logic-domain="0"]').value,'Z');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});
test('failed saves retain the assembled draft and legacy backups restore without migration',async()=>{
 const old=source();delete old.predicateMeaning;delete old.parameters;const h=await setup(bookOf(old)),before=h.data();h.click('[data-logic-edit="0"]');h.change('[data-logic-domain="1"]','Z');h.block(true);h.click('[data-logic-save]');assert.deepEqual(h.data(),before);assert.equal(h.$('[data-logic-domain="1"]').value,'Z');assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.block(false);h.click('[data-logic-save]');assert.equal(h.data().rows[0].logicStatements[0].quantifiers[1].domain,'Z');
 h.click('[data-backup-open]');const text=serializeBackup(before);Object.defineProperty(h.$('[data-backup-file]'),'files',{value:[{size:text.length,text:async()=>text}]});h.$('[data-backup-file]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));h.click('[data-backup-restore]');assert.deepEqual(h.data(),before);h.click('[data-logic-edit="0"]');assert.equal(h.$('[data-logic-method]').value,'quantified');assert.deepEqual(h.shownBindings(),bindings);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
});

test('saving a complete-notation view retains the builder metadata for new and edited statements',async()=>{
 for(const editing of [false,true]){
  const h=await setup(bookOf(source())),before=h.data();h.click(editing?'[data-logic-edit="0"]':'[data-logic-open]');
  const updated=[{quantifier:'∀',variable:'x',domain:'R'},{quantifier:'∃',variable:'y',domain:'Z'},{quantifier:'∀',variable:'θ',domain:'positive'}];
  for(let i=0;i<3;i++){h.change(`[data-logic-quantifier="${i}"]`,updated[i].quantifier);h.input(`[data-logic-variable="${i}"]`,updated[i].variable);h.change(`[data-logic-domain="${i}"]`,updated[i].domain);}
  h.input('[data-logic-predicate]','P(x, y, θ) ∧ Q(x)');h.input('[data-logic-meaning]','P와 Q가 성립합니다.');h.input('[data-logic-parameters]','P, Q는 위 변수들에 관한 술어');
  h.change('[data-logic-method]','direct');const complete={domain:h.$('[data-logic-parameters]').value,formula:h.$('[data-logic-predicate]').value,meaning:h.$('[data-logic-meaning]').value};h.click('[data-logic-save]');
  const index=editing?0:1,saved=h.data(),statement=saved.rows[0].logicStatements[index];assert.deepEqual(statement.quantifiers,updated);assert.equal(statement.predicateMeaning,'P와 Q가 성립합니다.');assert.equal(statement.predicate,'P(x, y, θ) ∧ Q(x)');assert.equal(statement.parameters,'P, Q는 위 변수들에 관한 술어');assert.equal(statement.verification,'unverified');for(const key of ['domain','formula','meaning'])assert.equal(statement[key],complete[key]);if(!editing)assert.deepEqual(saved.rows[0].logicStatements[0],before.rows[0].logicStatements[0]);
  const reload=await setup(parseBackup(serializeBackup(saved)));reload.click(`[data-logic-edit="${index}"]`);assert.equal(reload.$('[data-logic-method]').value,'quantified');assert.deepEqual(reload.shownBindings(),updated);assert.equal(reload.$('[data-logic-meaning]').value,'P와 Q가 성립합니다.');reload.click('[data-task-close]');assert.deepEqual(reload.data(),saved);
 }
});

test('editing the complete-notation text discards the stale builder metadata instead of inferring structure',async()=>{
 const h=await setup(bookOf(source()));h.click('[data-logic-edit="0"]');h.change('[data-logic-domain="1"]','Z');h.change('[data-logic-method]','direct');const formula='¬('+h.$('[data-logic-predicate]').value+')';h.input('[data-logic-predicate]',formula);h.input('[data-logic-meaning]','앞서 쓴 명제의 부정입니다.');h.click('[data-logic-save]');
 const statement=h.data().rows[0].logicStatements[0];assert.equal(statement.formula,formula);assert.equal(statement.quantifiers,undefined);assert.equal(statement.verification,'unverified');h.click('[data-logic-edit="0"]');assert.equal(h.$('[data-logic-method]').value,'direct');assert.equal(h.$('[data-logic-predicate]').value,formula);h.click('[data-task-close]');
});

test('binder edits leave predicate and meaning untouched, announce the scope check and reject theta aliases',async()=>{
 const old=source();old.meaning='모든 실수 x에 대해 다음이 성립합니다: 다음을 만족하는 0 이상의 정수 y가 적어도 하나 존재합니다: 모든 유리수 θ에 대해 다음이 성립합니다: P가 성립합니다.';
 const h=await setup(bookOf(old)),before=h.data();h.click('[data-logic-edit="0"]');assert.equal(h.$('[data-logic-method]').value,'quantified');assert.deepEqual(h.data(),before);
 h.change('[data-logic-quantifier="1"]','');h.change('[data-logic-quantifier="2"]','');h.input('[data-logic-predicate]','x² < 0');h.input('[data-logic-meaning]','x의 제곱은 0보다 작습니다.');h.input('[data-logic-variable="0"]','y');
 assert.equal(h.$('[data-logic-predicate]').value,'x² < 0');assert.equal(h.$('[data-logic-meaning]').value,'x의 제곱은 0보다 작습니다.');assert.match(h.$('[data-logic-binding-guide]').textContent,/변수 표기를 바꿨습니다.*명제·자연어 뜻은 그대로/);assert.equal(h.$('[data-logic-variable="0"]').getAttribute('aria-describedby'),'logic-binding-guide');assert.match(h.$('[data-logic-preview]').textContent,/참·거짓 미검증.*∀y ∈ ℝ \(x² < 0\).*주장하는 표기/);assert.doesNotMatch(h.$('[data-logic-preview]').textContent,/성립합니다/);
 h.input('[data-logic-variable="0"]','theta');h.change('[data-logic-quantifier="1"]','∃');h.input('[data-logic-variable="1"]','θ');assert(h.$('[data-logic-save]').disabled);assert.match(h.$('[data-logic-preview]').textContent,/theta와 θ는 같은 변수/);h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 h.click('[data-logic-edit="0"]');assert.equal(h.$('[data-logic-predicate]').value,old.predicate);h.change('[data-logic-quantifier="1"]','');h.change('[data-logic-quantifier="2"]','');h.input('[data-logic-predicate]','x² < 0');h.input('[data-logic-meaning]','x의 제곱은 0보다 작습니다.');h.click('[data-logic-save]');const saved=h.data();assert.equal(saved.rows[0].logicStatements[0].predicate,'x² < 0');assert.match(saved.rows[0].logicStatements[0].meaning,/^다음을 주장하는 표기입니다:/);assert.equal(saved.rows[0].logicStatements[0].verification,'unverified');assert.match(h.$('.work-logic').textContent,/기록된 뜻 · 미검증/);
 const reload=await setup(parseBackup(serializeBackup(saved)));reload.click('[data-logic-edit="0"]');assert.equal(reload.$('[data-logic-predicate]').value,'x² < 0');assert.equal(reload.$('[data-logic-meaning]').value,'x의 제곱은 0보다 작습니다.');reload.click('[data-task-close]');assert.deepEqual(reload.data(),saved);
});
