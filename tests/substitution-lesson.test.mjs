import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {SUBSTITUTION_EXAMPLE as example} from '../dist/substitution-example.js';
import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';
import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';
import {definitionBinding} from '../dist/context-board.js';
import {substituteMany} from '../dist/substitutions.js';
import {equivalent} from '../dist/engine.js';

const read=path=>fs.readFileSync(new URL(`../dist/${path}`,import.meta.url),'utf8');
test('substitution lesson has readable static explanations, distinct notation and valid discovery/app/exercise links',()=>{
 const {document}=parseHTML(read('learn/substitute/index.html'));
 assert.equal(document.querySelectorAll('script,iframe').length,0);
 assert.match(document.title,/조건과 치환: =와 :=를 구분하며 풀기/);
 assert.equal(document.querySelector('link[rel=canonical]').href,'https://susik.app/learn/substitute/');
 assert.equal(document.querySelector('meta[name=robots]').content,'index,follow');
 assert.match(document.querySelector('meta[name=description]').content,/정의 저장과 적용/);
 const text=document.querySelector('article').textContent;
 assert.match(text,/t를 x\+1로 정의한다/);assert.match(text,/문제에서 주어진 범위/);assert.match(text,/∀x ∈ D/);
 assert.deepEqual([...document.querySelectorAll('h3 code')].map(n=>n.textContent),['=',':=']);
 assert.equal(document.querySelectorAll('details').length,2);assert.equal(document.querySelectorAll('details[open]').length,0);
 assert(document.querySelector(`a[href="/?example=${example.id}"]`));
 const practiceHref=document.querySelector('a[href*="practice="]').href;
 const problem=PRACTICE_PROBLEMS.find(p=>p.id===new URL(practiceHref,'https://susik.app').searchParams.get('practice'));
 assert.equal(problem.id,'roots-2');assert.equal(checkPractice(problem,'-3').status,'correct');assert.equal(checkPractice(problem,'3, -3').status,'incorrect');
 assert.match(text,/모든 실수 x/);
 assert(parseHTML(read('learn/index.html')).document.querySelector('a[href="/learn/substitute/"]'));
 assert(read('sitemap.xml').includes('<loc>https://susik.app/learn/substitute/</loc>'));
 for(const a of document.querySelectorAll('a[href^="/"]')){const path=new URL(a.href,'https://susik.app').pathname;assert(fs.existsSync(new URL(`../dist/${path.slice(1)}${path.endsWith('/')?'index.html':''}`,import.meta.url)),path);}
});

test('worked substitution, inverse and self-check factorization agree with exact mathematics',()=>{
 const definition=definitionBinding('t := x+1',{},math);
 const applied=substituteMany(example.value,definition.bindings,'t',definition.definition,'apply',math);
 assert.equal(applied.value,'t ^ 2 = 4');
 const restored=substituteMany(applied.value,definition.bindings,'t',definition.definition,'restore',math);
 assert.equal(restored.value,'(x + 1) ^ 2 = 4');
 // Polynomial identities cover every real t/u; exact candidate checks are additional checks.
 assert(equivalent('(x-2)*(x+2)','x^2-4'));
 assert(equivalent('(x-3)*(x+3)','x^2-9'));
 for(const [offset,square,lower,roots] of [[1n,4n,0n,[1n,-3n]],[2n,9n,-2n,[1n,-5n]]]){
  for(const x of roots)assert.equal((x+offset)**2n,square);
  assert.deepEqual(roots.filter(x=>x>lower),[1n]);
 }
});

let sequence=0;
const fixture=activeAuxId=>({active:0,activeAuxId,auxSequence:1,rows:[{value:'x+1',title:'직접 입력',condition:'x < 0',bindings:{a:'x+2'},note:'이전 설명',conditions:['x ≠ 0'],logicStatements:[{domain:'x ∈ ℝ',formula:'x < 0',meaning:'기존 조건'}]},{value:'x+2',title:'다음 줄',parent:0}],auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:1,sourceValue:'x+2',active:0,rows:[{value:'8',title:'보조 식 시작',note:'보조 설명'}]}]});
async function setup(initial,search){
 const {window,document}=parseHTML(read('index.html'));window.location={search};window.math=math;window.innerWidth=320;window.innerHeight=640;
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLTextAreaElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};
 const memory=new Map([[WORK_KEY,JSON.stringify(initial)]]),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const before=loadWorkspace(storage);
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 const {startWorkspace}=await import(`../dist/workspace-app.js?substitution-lesson=${sequence++}`);startWorkspace();
 const $=s=>{const el=document.querySelector(s);assert(el,s);return el;};
 return {document,window,$,click:s=>$(s).click(),data:()=>JSON.parse(memory.get(WORK_KEY)),before,startWorkspace};
}
test('lesson example link requires confirmation, preserves main/auxiliary selection on close and is consumed once',async()=>{
 for(const activeAuxId of [null,'aux-1']){
  const h=await setup(fixture(activeAuxId),`?example=${example.id}`);
  assert(h.$('[data-guided-start]'));assert(!h.$('[data-example-hints]').open);assert.deepEqual(h.data(),h.before);
  h.click('[data-task-close]');assert.deepEqual(h.data(),h.before);
  h.startWorkspace();assert.equal(h.document.querySelector('[data-guided-start]'),null);assert.deepEqual(h.data(),h.before);
 }
 const h=await setup(fixture(null),'?example=unrecognized');assert.equal(h.document.querySelector('[data-guided-start]'),null);assert.deepEqual(h.data(),h.before);
});
test('linked example uses independent start and actual definition save/apply/restore; undo returns to prior auxiliary work',async()=>{
 const h=await setup(fixture('aux-1'),`?example=${example.id}`),button=h.$('[data-guided-start]');button.click();button.click();
 const started=h.data();assert.equal(started.rows.length,3);assert.equal(started.active,2);assert.equal(started.activeAuxId,null);
 assert.deepEqual(started.rows.slice(0,-1),h.before.rows);assert.deepEqual(started.auxiliary,h.before.auxiliary);
 assert.equal(started.rows.at(-1).condition,example.condition);assert.deepEqual(started.rows.at(-1).bindings,{});
 h.click('[data-example-panel] [data-context-board]');h.click('[data-board-mode="definition"]');
 const field=h.$('[data-board-definition]');field.value='t := x+1';field.dispatchEvent(new h.window.Event('input',{bubbles:true}));h.click('[data-board-save]');
 assert.equal(h.data().rows.at(-1).value,started.rows.at(-1).value);assert.deepEqual(h.data().rows.at(-1).bindings,{t:'x + 1'});
 h.click('[data-binding-apply="t"]');assert.equal(h.data().rows.at(-1).value,'t ^ 2 = 4');assert.equal(h.data().rows.at(-1).condition,example.condition);
 h.click('[data-binding-restore="t"]');assert.equal(h.data().rows.at(-1).value,'(x + 1) ^ 2 = 4');
 for(let i=0;i<4;i++)h.click('[data-history-undo]');assert.deepEqual(h.data(),h.before);
});
