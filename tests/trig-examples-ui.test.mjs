import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {TRIG_EXAMPLES} from '../dist/trig-examples.js';
import {INEQUALITY_EXAMPLES} from '../dist/inequality-examples.js';
import {SUBSTITUTION_EXAMPLE} from '../dist/substitution-example.js';
import {LOG_SUBSTITUTION_EXAMPLE} from '../dist/log-substitution-example.js';
import {parseWorkspaceFormula} from '../dist/inequality-tools.js';
const guidedExamples=[...TRIG_EXAMPLES,...INEQUALITY_EXAMPLES,SUBSTITUTION_EXAMPLE,LOG_SUBSTITUTION_EXAMPLE];
import {WORK_EXAMPLES} from '../dist/exponent-log.js';
import {PRACTICE_PROBLEMS} from '../dist/learning-tools.js';
import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';
import {originSnapshot} from '../dist/workspace-origin.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
import {parseCalculation} from '../dist/calculation.js';
const rich=()=>({value:'x^2=x',title:'직접 입력',condition:'x > 0',bindings:{t:'x+1'},assumptions:['x ≠ 0'],conditions:['x ≠ 0'],excluded:['0'],pendingCases:[{condition:'x=0',equation:'x^2=x'}],logicStatements:[{domain:'x ∈ ℝ',formula:'P(x)',meaning:'기존 주장'}],practiceId:'factor-1',practiceAnswer:'old answer',practiceFeedback:{status:'unverified',message:'old feedback'},note:'이전 풀이 설명'});
const notebook=activeAuxId=>({rows:[rich(),{...rich(),value:'x=1',parent:0},{value:'x+9',title:'직접 입력'}],active:1,activeAuxId,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:2,sourceValue:'x+9',rows:[rich()],active:0}]});
let sequence=0;async function setup(book=notebook(null),search=''){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.location={search};window.math=math;window.innerWidth=320;window.innerHeight=640;window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};window.HTMLTextAreaElement.prototype.setSelectionRange=window.HTMLInputElement.prototype.setSelectionRange;
 const memory=new Map([[WORK_KEY,JSON.stringify(book)]]);let blocked=false,writes=0;const storage={getItem:k=>memory.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');writes++;memory.set(k,v);}};Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});(await import(`../dist/workspace-app.js?trig-example=${sequence++}`)).startWorkspace();const $=s=>{const e=document.querySelector(s);assert(e,s);return e;},click=s=>$(s).click();const examples=$('[data-work-examples]');examples.open=true;examples.dispatchEvent(new window.Event('toggle'));
 return {$,click,document,window,storage,data:()=>JSON.parse(memory.get(WORK_KEY)),block:v=>blocked=v,writes:()=>writes,type:(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));}};
}
test('guided examples are listed once, separate from the unchanged seventeen graded exercises',()=>{
 assert.equal(WORK_EXAMPLES.length,20);assert.equal(PRACTICE_PROBLEMS.length,17);assert.equal(new Set(WORK_EXAMPLES.map(p=>p.id)).size,20);
 const canonical=value=>parseCalculation(value,math).nodes.map(n=>n.toString({parenthesis:'auto',implicit:'show'})).join('=');const earlier=[...WORK_EXAMPLES.filter(p=>!p.guided),...PRACTICE_PROBLEMS].map(p=>canonical(p.value));
 assert.equal(new Set(TRIG_EXAMPLES.map(p=>canonical(p.value))).size,4);for(const p of TRIG_EXAMPLES){assert(!earlier.includes(canonical(p.value)));assert.match(p.condition,/θ ∈ ℝ/);assert.match(p.condition,/도\(°\)/);assert.match(p.condition,/k ∈ ℤ/);assert.equal(p.guided,true);}
 const [first,second,third,fourth]=TRIG_EXAMPLES;assert.match(first.confirmation,/sinθ=0 또는 sinθ=1\/2/);assert(second.answers.includes('θ = 120°k'));assert.match(second.comparison,/모두 올바른 일반해/);assert.match(third.answers.join(' '),/150° \+ 360°k/);assert.match(third.comparison,/누락/);assert.match(fourth.answers.join(' '),/15° \+ 180°k.*75° \+ 180°k/);assert.match(fourth.hints.join(' '),/a²\+b²=1/);assert.match(fourth.hints.join(' '),/각 항을 각각 0으로 놓을 수 없습니다/);
});

test('the logarithm guide saves, applies and restores a definition while retaining the original domain',async()=>{
 const p=LOG_SUBSTITUTION_EXAMPLE,h=await setup(notebook('aux-1'),`?example=${LOG_SUBSTITUTION_EXAMPLE.id}`),before=h.data();
 assert(h.$('[data-guided-start]'));h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 h.click(`[data-example="${p.id}"]`);h.click('[data-guided-start]');const started=h.data();
 h.click('[data-example-panel] [data-context-board]');h.type('[data-board-condition]',p.condition+', t > 2');h.click('[data-board-mode="definition"]');h.type('[data-board-definition]','t := x+2');h.click('[data-board-save]');
 const defined=h.data();assert.equal(defined.rows.at(-1).value,started.rows.at(-1).value);assert.deepEqual(defined.rows.at(-1).bindings,{t:'x + 2'});
 h.click('[data-binding-apply="t"]');assert.equal(h.data().rows.at(-1).value,'log(t, x) = 2');
 h.click('[data-direct-open]');h.click('[data-operation-group="laws"]');h.click('[data-law="0"]');assert.match(h.$('.work-law-preview').textContent,/x > 0/);h.click('[data-law-apply]');
 assert.equal(h.data().rows.at(-1).value,'t = x ^ 2');
 h.click('[data-binding-restore="t"]');const restored=h.data(),row=restored.rows.at(-1);
 assert.equal(row.value,'x + 2 = x ^ 2');assert(row.condition.startsWith(p.condition+', t > 2'));
 for(const condition of ['x > 0','x ≠ 1','x + 2 > 0']){assert(row.assumptions.includes(condition),JSON.stringify(row.assumptions));assert(row.condition.includes(condition));}
 assert.equal(row.exampleId,p.id);assert.equal(row.practiceFeedback,null);assert.deepEqual(row.excluded,[]);assert.deepEqual(row.logicStatements,[]);
 assert.deepEqual(restored.rows.slice(0,before.rows.length),before.rows);assert.deepEqual(restored.auxiliary,before.auxiliary);assert.deepEqual(parseBackup(serializeBackup(restored)),restored);
 h.click('[data-history-undo]');assert.equal(h.data().rows.at(-1).value,'t = x ^ 2');
 for(let i=0;i<3;i++)h.click('[data-history-undo]');assert.deepEqual(h.data(),started);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 const reload=await setup(restored);assert.match(reload.$('[data-example-answers]').textContent,/밑 −1은 양수가 아닙니다/);assert(!reload.$('[data-example-answers]').open);
 reload.click('[data-direct-open]');reload.click('[data-direct-reset]');assert.equal(reload.data().rows.at(-1).value,started.rows.at(-1).value);assert.equal(reload.data().rows.at(-1).condition,p.condition);assert.deepEqual(reload.data().rows.at(-1).bindings,{});
});

test('choosing a guided example preserves open formula, definition and term-edit drafts',async()=>{
 for(const mode of ['formula','definition','term']){
  const h=await setup({...notebook(null),active:mode==='term'?2:1}),before=h.data();let field;
  if(mode==='formula'){h.click('[data-free-input]');field='[data-work-expression]';h.type(field,'x+77');}
  else if(mode==='definition'){h.click('[data-context-board]');h.click('[data-board-mode="definition"]');field='[data-board-definition]';h.type(field,'u := x+77');}
  else{h.click('[data-direct-open]');h.click('[data-direct-term="0"]');h.click('[data-operation-group="edit"]');h.click('[data-transform-mode="replace"]');field='[data-direct-input]';h.type(field,'x+77');}
  const element=h.$(field);element.setSelectionRange(1,3);
  for(const p of guidedExamples){h.click(`[data-example="${p.id}"]`);assert.equal(h.$(field),element);assert.equal(element.selectionStart,1);assert.equal(element.selectionEnd,3);assert.match(element.value,/77/);assert.equal(h.document.querySelector('[data-guided-start]'),null);assert.deepEqual(h.data(),before);}
 }
});
test('opening, revealing guidance and cancelling never writes, changes the active sheet, or starts a solution',async()=>{
 const h=await setup(notebook('aux-1')),before=h.data(),writes=h.writes();for(const p of guidedExamples){h.click(`[data-example="${p.id}"]`);assert(!h.$('[data-example-hints]').hasAttribute('open'));assert(!h.$('[data-example-final-hint]').hasAttribute('open'));assert(!h.$('[data-example-answers]').hasAttribute('open'));assert.equal(h.$('[data-guided-start]').textContent,'이 예제로 새 풀이 시작');h.$('[data-example-hints]').open=true;h.$('[data-example-answers]').open=true;assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);}
});
for(const activeAuxId of [null,'aux-1'])test(`guided examples start independently at the main end from ${activeAuxId||'history middle'}, with clean context and undo`,async()=>{
 for(const p of guidedExamples){const h=await setup(notebook(activeAuxId)),before=h.data();h.click(`[data-example="${p.id}"]`);h.click('[data-guided-start]');const after=h.data(),row=after.rows.at(-1);assert.equal(after.active,3);assert.equal(after.activeAuxId,null);assert.deepEqual(after.rows.slice(0,-1),before.rows);assert.deepEqual(after.auxiliary,before.auxiliary);assert.equal(row.parent,undefined);assert.equal(row.startNew,true);assert.equal(row.exampleId,p.id);assert.equal(row.condition,p.condition);assert.deepEqual(row.bindings,{});for(const key of ['assumptions','conditions','excluded','pendingCases','logicStatements'])assert.deepEqual(row[key],[]);assert.equal(row.practiceId,null);assert.equal(row.practiceAnswer,'');assert.equal(row.practiceFeedback,null);assert.equal(row.note,'');assert.deepEqual(row.origin,originSnapshot(row));assert(!h.document.querySelector('[data-practice-open]'));assert(h.$('[data-example-panel] [data-context-board]'));assert(!h.$('[data-example-panel] [data-example-answers]').open);assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);}
});
test('the example panel reaches the scoped condition board without silently adding a suggested substitution',async()=>{
 const h=await setup();h.click('[data-example="trig-cosine-quadratic"]');h.click('[data-guided-start]');const before=h.data();h.click('[data-example-panel] [data-context-board]');assert.match(h.$('.work-board-scope').textContent,/본식 · 4번째 줄/);assert.equal(h.$('[data-board-condition]').value,TRIG_EXAMPLES[1].condition);h.click('[data-board-mode="definition"]');assert.equal(h.$('[data-board-definition]').value,'');h.type('[data-board-definition]','a := cosθ');h.click('[data-task-close]');assert.deepEqual(h.data(),before);h.click('[data-example-panel] [data-context-board]');h.click('[data-board-mode="definition"]');h.type('[data-board-definition]','a := cosθ');h.click('[data-board-save]');assert.deepEqual(h.data().rows.at(-1).bindings,{a:'cos(theta)'});assert.equal(h.data().rows.at(-1).value,before.rows.at(-1).value);h.click('[data-binding-apply="a"]');assert.match(h.data().rows.at(-1).value,/a \^ 2/);assert.equal(h.data().rows.at(-1).exampleId,'trig-cosine-quadratic');assert(h.$('[data-example-panel] [data-context-board]'));h.click('[data-binding-restore="a"]');assert.match(h.data().rows.at(-1).value,/cos\(theta\)/);assert.equal(h.data().rows.at(-1).condition,TRIG_EXAMPLES[1].condition);
});
test('guide association survives reload and auxiliary work, while a new free solution clears it',async()=>{
 let h=await setup();h.click('[data-example="trig-double-angle"]');h.click('[data-guided-start]');h=await setup(h.data());assert(h.$('[data-example-panel] [data-example-answers]'));h.click('[data-new-aux]');h.type('[data-work-expression]','2sin(2theta)-1=0');await new Promise(r=>setTimeout(r,140));h.click('[data-input-save]');assert.equal(h.data().auxiliary.at(-1).rows[0].exampleId,'trig-double-angle');assert(h.$('[data-example-panel] [data-context-board]'));h.click('[data-free-input]');h.type('[data-work-expression]','x+4');await new Promise(r=>setTimeout(r,140));h.click('[data-input-save]');assert.equal(h.data().rows.at(-1).exampleId,undefined);assert.equal(h.$('[data-example-panel]').textContent,'');
});
test('confirmation is single-use, the row limit prevents mutation, and storage failure retains the new solution for retry',async()=>{
 let book=notebook('aux-1');book.rows=Array.from({length:299},(_,i)=>({value:`x+${i}`,title:'직접 입력'}));book.active=2;let h=await setup(book);h.click('[data-example="trig-sine-zero"]');const button=h.$('[data-guided-start]');button.click();button.click();assert.equal(h.data().rows.length,300);h.$('[data-work-examples]').open=true;h.$('[data-work-examples]').dispatchEvent(new h.window.Event('toggle'));const before=h.data();h.click('[data-example="trig-sine-zero"]');h.click('[data-guided-start]');assert.deepEqual(h.data(),before);assert.match(h.$('.work-task-error').textContent,/300줄/);h.click('[data-task-close]');
 h=await setup();const saved=h.data();h.click('[data-example="trig-sine-zero"]');h.block(true);h.click('[data-guided-start]');assert.deepEqual(h.data(),saved);assert.match(h.$('[data-storage-status]').textContent,/저장하지 못/);assert(h.$('[data-example-panel] [data-example-answers]'));h.block(false);h.click('[data-save-retry]');assert.equal(h.data().rows.at(-1).exampleId,'trig-sine-zero');
});

test('the inequality guide hides hints and solutions, keeps the real scope visible, and reaches x > -3 through existing division',async()=>{
 assert.equal(INEQUALITY_EXAMPLES.length,1);const p=INEQUALITY_EXAMPLES[0];assert.equal(WORK_EXAMPLES.filter(e=>e.id===p.id).length,1);
 const h=await setup();h.click(`[data-example="${p.id}"]`);assert.match(h.$('.work-example-condition').textContent,/x는 실수/);assert.match(h.$('.work-guided-example').textContent,/x만 남도록 정리해 보세요. x는 실수예요/);assert.match(h.$('[data-example-support]').textContent,/정수나 분수.*0이나 문자가 든 식.*조건 메모.*정밀도|정수나 분수.*0이나 문자가 든 식.*조건 메모.*정확히 읽지 못하면/);assert(!h.$('.work-guided-example').textContent.includes('일반해'));
 h.click('[data-guided-start]');const started=h.data();h.click('[data-direct-open]');h.click('[data-equation-mode="divide"]');h.click('[data-balance-value="-2"]');assert.match(h.$('[data-balance-preview]').textContent,/음수로 나누면.*<를 >로/);assert.deepEqual(h.data(),started);h.click('[data-balance-apply]');const solved=h.data(),last=solved.rows.at(-1),parsed=parseWorkspaceFormula(last.value,math);assert.equal(parsed.relation,'>');assert.equal(parsed.parts[0],'x');assert.equal(parsed.parts[1],'-3');assert.equal(last.exampleId,p.id);assert.match(h.$('[data-example-answers]').textContent,/x > −3/);assert(!h.$('[data-example-answers]').hasAttribute('open'));assert.deepEqual(solved.rows.slice(0,started.rows.length),started.rows);assert.deepEqual(solved.auxiliary,started.auxiliary);assert.deepEqual(parseBackup(serializeBackup(solved)),solved);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),started);const reload=await setup(solved);assert(!reload.$('[data-example-answers]').hasAttribute('open'));reload.click('[data-direct-open]');reload.click('[data-direct-reset]');const reset=reload.data().rows.at(-1);assert.equal(reset.value,p.value);assert.equal(reset.condition,p.condition);assert.equal(reset.exampleId,p.id);
});
