import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {PRACTICE_DRAFT_KEY} from '../dist/practice-draft.js';
let seq=0;
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
async function setup(local=memory(),session=memory()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.math=math;window.innerWidth=320;window.innerHeight=568;window.location={search:''};window.sessionStorage=session;
 window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 window.HTMLInputElement.prototype.setSelectionRange=function(start,end,direction='none'){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction});};
 Object.assign(globalThis,{window,document,localStorage:local,requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?draft=${seq++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,'Missing '+s);return e;},click=s=>$(s).click();
 const start=()=>{const picker=$('[data-practice-picker]');picker.open=true;picker.dispatchEvent(new window.Event('toggle'));click('[data-practice-preview="power-2"]');click('[data-practice-start="power-2"]');};
 const type=value=>{const f=$('[data-work-expression]');f.value=value;f.setSelectionRange(value.length,value.length);f.dispatchEvent(new window.Event('input',{bubbles:true}));};
 return {$,click,start,type,local,session,window,document,data:()=>JSON.parse(local.getItem(WORK_KEY))};
}
test('unfinished practice line survives reload with selection and tab; recovery is explicit and leaves notebook unchanged',async()=>{
 let h=await setup();h.start();const before=h.data();h.click('[data-direct-open-input]');h.type('sin(x+');h.click('[data-work-pad-tab="function"]');const f=h.$('[data-work-expression]');f.setSelectionRange(2,5,'backward');f.dispatchEvent(new h.window.Event('select'));
 assert(h.session.getItem(PRACTICE_DRAFT_KEY));h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-work-expression]'));assert(h.$('[data-draft-recovery]'));assert.deepEqual(h.data(),before);
 h.click('[data-draft-recover]');assert.equal(h.$('[data-work-expression]').value,'sin(x+');assert.equal(h.$('[data-work-expression]').selectionStart,2);assert.equal(h.$('[data-work-expression]').selectionEnd,5);assert.equal(h.$('[data-work-expression]').selectionDirection,'backward');assert.equal(h.$('[data-work-pad-tab="function"]').getAttribute('aria-selected'),'true');assert(h.$('[data-input-save]').disabled);assert.deepEqual(h.data(),before);
 h.type('1/9');await new Promise(r=>setTimeout(r,150));h.click('[data-input-save]');assert.equal(h.data().rows.length,before.rows.length+1);assert.equal(h.session.getItem(PRACTICE_DRAFT_KEY),null);h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-draft-recovery]'));
});
test('cancel, blank, discard and explicit new problem cannot revive the old draft',async()=>{
 for(const action of ['cancel','blank','discard','new-problem']){
  let h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+123');
  if(action==='cancel')h.click('.work-task-navigation [data-task-close]');
  if(action==='blank')h.type('');
  if(action==='discard'||action==='new-problem'){h=await setup(h.local,h.session);if(action==='discard')h.click('[data-draft-discard]');else h.start();}
  h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-draft-recovery]'),action);
 }
});
test('changed source, corrupt values and session storage failures never stop the workspace',async()=>{
 let h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+123');const book=h.data();book.rows[book.active].condition='x > 0';h.local.setItem(WORK_KEY,JSON.stringify(book));h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-draft-recovery]'));assert.equal(h.session.getItem(PRACTICE_DRAFT_KEY),null);
 for(const session of [{getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}},memory()]){
  session.values?.set(PRACTICE_DRAFT_KEY,'{');h=await setup(memory(),session);h.start();h.click('[data-direct-open-input]');h.type('x+2');await new Promise(r=>setTimeout(r,150));assert.equal(h.$('[data-work-expression]').value,'x+2');assert(!h.$('[data-input-save]').disabled);h.click('[data-input-save]');assert.equal(h.data().rows.at(-1).value,'x+2');
 }
});
test('condition board excludes its draft rather than restoring text without new conditions',async()=>{
 let h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+2');h.click('[data-draft-context]');assert.equal(h.session.getItem(PRACTICE_DRAFT_KEY),null);h.click('.work-task-navigation [data-task-close]');assert.match(h.$('[data-draft-save-status]').textContent,/복구 대상이 아닙니다/);h.type('x+3');h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-draft-recovery]'));
});

test('discard failure stays visible and cannot pretend the draft was removed',async()=>{
 let h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+123');h=await setup(h.local,h.session);
 const original=h.session.removeItem,write=h.session.setItem;h.session.removeItem=()=>{throw Error('denied');};h.session.setItem=()=>{throw Error('denied');};
 h.click('[data-draft-discard]');assert(h.$('[data-draft-recovery]'));assert.match(h.$('#toast').textContent,/지우지 못/);
 h.session.removeItem=original;h.session.setItem=write;h.click('[data-draft-discard]');h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-draft-recovery]'));
});

test('a new problem remains editable when invalidating a different draft is denied',async()=>{
 let h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+123');h=await setup(h.local,h.session);
 h.session.removeItem=()=>{throw Error('denied');};h.session.setItem=()=>{throw Error('denied');};h.start();h.click('[data-direct-open-input]');h.type('x+9');assert.equal(h.$('[data-work-expression]').value,'x+9');assert.match(h.$('[data-draft-save-status]').textContent,/보관하지 못/);
});

test('a failed notebook save keeps the previous-source draft recoverable',async()=>{
 let h=await setup();h.start();const before=h.data();h.click('[data-direct-open-input]');h.type('x+23');await new Promise(r=>setTimeout(r,150));const write=h.local.setItem;h.local.setItem=()=>{throw Error('quota');};h.click('[data-input-save]');assert.deepEqual(h.data(),before);assert(h.session.getItem(PRACTICE_DRAFT_KEY));h.local.setItem=write;
 h=await setup(h.local,h.session);h.click('[data-draft-recover]');assert.equal(h.$('[data-work-expression]').value,'x+23');assert.deepEqual(h.data(),before);
});

test('reset then undo does not bring an invalidated draft back',async()=>{
 let h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+23');await new Promise(r=>setTimeout(r,150));h.click('[data-input-save]');h.click('[data-direct-open-input]');h.type('x+24');h=await setup(h.local,h.session);
 h.click('[data-direct-open]');h.click('[data-direct-reset]');assert(!h.document.querySelector('[data-draft-recovery]'));h.click('[data-history-undo]');h=await setup(h.local,h.session);assert(!h.document.querySelector('[data-draft-recovery]'));
});

test('board transition stays on the formula if its old recovery draft cannot be invalidated',async()=>{
 const h=await setup();h.start();h.click('[data-direct-open-input]');h.type('x+2');h.session.removeItem=()=>{throw Error('denied');};h.session.setItem=()=>{throw Error('denied');};h.click('[data-draft-context]');assert.equal(h.$('[data-work-expression]').value,'x+2');assert.match(h.$('#toast').textContent,/입력 종류를 바꾸지 않았습니다/);assert(!h.document.querySelector('[data-board-condition]'));
});
