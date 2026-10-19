import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';

const notebook=auxiliary=>({
 rows:[
  {value:'3*x^3-12*x',title:'직접 입력',condition:'x는 실수',bindings:{t:'x+1'},practiceId:'factor-4'},
  {value:'3*x*(x^2-4)',title:'현재 풀이',condition:'x는 실수',bindings:{t:'x+1'},practiceId:'factor-4',parent:0}
 ],active:1,activeAuxId:auxiliary?'aux-1':null,auxSequence:1,
 auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'3*x^3-12*x',rows:[
  {value:'x=1+1',condition:'x는 실수',bindings:{t:'x+1'}},
  {value:'x=2',condition:'x는 실수',bindings:{t:'x+1'},parent:0}
 ],active:1}]
});
let sequence=0;
async function setup(auxiliary=false){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.math=math;window.matchMedia=()=>({matches:true});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLInputElement.prototype.setSelectionRange=function(start,end,direction='none'){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;};
 window.HTMLTextAreaElement.prototype.setSelectionRange=window.HTMLInputElement.prototype.setSelectionRange;
 let raw=JSON.stringify(notebook(auxiliary)),writes=0;
 Object.assign(globalThis,{window,document,requestAnimationFrame:f=>f(),localStorage:{getItem:key=>key===WORK_KEY?raw:null,setItem:(key,value)=>{if(key===WORK_KEY){raw=value;writes++;}}}});
 (await import(`../dist/workspace-app.js?draft-guards=${sequence++}`)).startWorkspace();
 const $=selector=>{const el=document.querySelector(selector);assert(el,selector);return el;};
 return {window,document,$,click:selector=>$(selector).click(),type:(selector,value)=>{const el=$(selector);el.value=value;el.dispatchEvent(new window.Event('input',{bubbles:true}));},stored:()=>raw,writes:()=>writes};
}

for(const action of ['aux-apply','practice-open','sheet'])for(const kind of ['free','line','aux-input','board','folded-board','draft-board'])test(`${action} preserves a ${kind} draft, selection and active sheet`,async()=>{
 const h=await setup(action!=='practice-open'),board=kind.includes('board');
 h.click(kind==='board'||kind==='folded-board'?'[data-context-board]':kind==='aux-input'?'[data-new-aux]':kind==='line'?'[data-direct-open-input]':'[data-free-input]');
 if(kind==='draft-board'){
  h.type('[data-work-expression]','cos(x)+7');h.$('[data-work-expression]').setSelectionRange(1,4,'backward');h.click('[data-work-keyboard]');h.click('[data-draft-context]');
 }
 if(board){h.type('[data-board-condition]','x > 17');h.click('[data-board-mode="definition"]');h.click('[data-board-keyboard]');}else h.click('[data-work-keyboard]');
 const selector=board?'[data-board-definition]':'[data-work-expression]',value=board?'u := x+77':'cos(x)+77';
 h.type(selector,value);h.$(selector).setSelectionRange(2,5,'backward');
 if(!board)await new Promise(r=>setTimeout(r,140));
 if(kind==='folded-board')h.click('[data-show-bindings]');
 const field=h.$(selector),host=h.$('[data-work-task]'),before=h.stored(),writes=h.writes(),markup=host.innerHTML,hidden=host.hidden;
 h.click(action==='sheet'?'[data-sheet="main"]':`[data-${action}]`);
 assert.equal(h.$(selector),field);assert.equal(field.value,value);assert.deepEqual([field.selectionStart,field.selectionEnd,field.selectionDirection],[2,5,'backward']);
 assert.equal(h.$('[data-work-task]').innerHTML,markup);assert.equal(host.hidden,hidden);assert.equal(h.stored(),before);assert.equal(h.writes(),writes);
 assert.equal(h.$(`[data-sheet="${action==='practice-open'?'main':'aux-1'}"]`).getAttribute('aria-selected'),'true');
 assert.equal(h.$(board?'[data-board-keyboard]':'[data-work-keyboard]').getAttribute('aria-pressed'),'true');
 assert.match(h.$('#toast').textContent,/작성 중인 내용을 먼저 기록하거나 닫아/);
 if(board)assert.equal(h.$('[data-board-condition]').value,'x > 17');
 if(kind==='folded-board'){h.click('[data-context-board]');assert(!host.hidden);assert.equal(h.$(selector),field);}
 h.click('[data-task-close]');
 if(kind==='draft-board'){
  const input=h.$('[data-work-expression]');assert.equal(input.value,'cos(x)+7');assert.deepEqual([input.selectionStart,input.selectionEnd,input.selectionDirection],[1,4,'backward']);assert.equal(h.$('[data-work-keyboard]').getAttribute('aria-pressed'),'true');h.click('[data-task-close]');
 }
 assert.equal(h.stored(),before);
 h.click(action==='sheet'?'[data-sheet="main"]':`[data-${action}]`);
 if(action==='sheet'){assert.equal(h.$('[data-sheet="main"]').getAttribute('aria-selected'),'true');assert.equal(JSON.parse(h.stored()).activeAuxId,null);}
 else{assert.match(h.$('.work-task>header strong').textContent,action==='aux-apply'?/보조 식 결과 대입/:/최종 답 확인/);if(action==='aux-apply')assert(!h.$('[data-aux-confirm]').disabled);assert.equal(h.stored(),before);h.click('[data-task-close]');}
});

test('reopening the current answer task preserves its unsaved answer, keyboard and selection, including after folding',async()=>{
 const h=await setup();h.click('[data-practice-open]');h.click('[data-practice-keyboard]');h.type('[data-practice-answer]','3x(x-2)(x+2)');
 const field=h.$('[data-practice-answer]');field.setSelectionRange(2,7,'backward');const before=h.stored(),writes=h.writes();
 for(const fold of [false,true]){
  if(fold)h.click('[data-task-fold]');h.click('[data-practice-open]');
  assert(!h.$('[data-work-task]').hidden);assert.equal(h.$('[data-practice-answer]'),field);assert.equal(field.value,'3x(x-2)(x+2)');assert.deepEqual([field.selectionStart,field.selectionEnd,field.selectionDirection],[2,7,'backward']);
  assert.equal(h.$('[data-practice-keyboard]').getAttribute('aria-pressed'),'true');assert.equal(h.stored(),before);assert.equal(h.writes(),writes);
 }
 h.click('[data-task-close]');
});

test('an auxiliary preview may be reopened and sheet navigation remains available when there is no text draft',async()=>{
 const h=await setup(true),before=h.stored();h.click('[data-aux-apply]');h.click('[data-aux-apply]');assert(!h.$('[data-aux-confirm]').disabled);assert.equal(h.stored(),before);
 h.click('[data-sheet="main"]');assert.equal(h.$('[data-sheet="main"]').getAttribute('aria-selected'),'true');assert(h.$('[data-work-task]').hidden);
});
