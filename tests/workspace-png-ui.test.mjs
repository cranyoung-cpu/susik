import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
const fixture=()=>({active:1,rows:[{value:'x+1',title:'직접 입력',note:'이전 설명'},{value:'x+2',title:'직접 입력',condition:'x > 0',bindings:{t:'x+1'},note:'보존할 메모',practiceId:'power-1'}],auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x+1',active:0,rows:[{value:'x+3',title:'직접 입력'}]}],auxSequence:1});
let sequence=0;
async function setup(initial=fixture()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.math=math;window.innerWidth=320;window.innerHeight=420;window.matchMedia=()=>({matches:true});
 const select=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value');Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get:select.get,set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.value===String(v));}});
 let focused=document.body;const scrolled=[];Object.defineProperty(document,'activeElement',{get:()=>focused});window.HTMLElement.prototype.focus=function(){focused=this;};
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this);};window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};
 let saved=JSON.stringify(initial),writes=0,copied=[];Object.assign(globalThis,{window,document,localStorage:{getItem:k=>k===WORK_KEY?saved:null,setItem:(k,v)=>{saved=v;writes++;}},requestAnimationFrame:f=>f()});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>copied.push(text)}}});
 (await import(`../dist/workspace-app.js?png=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,s);return e;},click=s=>$(s).click();
 return {$,click,window,document,copied,scrolled,data:()=>JSON.parse(saved),writes:()=>writes,input:(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));}};
}
test('copy and PNG focus their controls and reveal the original trigger when closed',async()=>{
 const h=await setup(),trigger=h.$('[data-copy-menu]');trigger.focus();h.click('[data-copy-menu]');assert.equal(h.document.activeElement,h.$('[data-copy-format]'));
 h.click('[data-png-open]');assert.equal(h.document.activeElement,h.$('[data-png-scope]'));h.click('[data-task-close]');assert.equal(h.document.activeElement,trigger);assert.equal(h.scrolled.at(-1),trigger);
});
test('failed PNG creation restores a blurred trigger without taking focus from another control',async()=>{
 const h=await setup(),originalFetch=globalThis.fetch;
 try{
  let reject;globalThis.fetch=()=>new Promise((_,r)=>{reject=r;});h.click('[data-copy-menu]');h.click('[data-png-open]');const prepare=h.$('[data-png-prepare]');
  prepare.focus();h.click('[data-png-prepare]');h.document.body.focus();reject(Error('offline'));await new Promise(r=>setTimeout(r,20));assert.equal(h.document.activeElement,prepare);assert(!prepare.disabled);
  h.click('[data-png-prepare]');const cancel=h.$('.work-task-navigation [data-task-close]');cancel.focus();reject(Error('offline'));await new Promise(r=>setTimeout(r,20));assert.equal(h.document.activeElement,cancel);assert(!prepare.disabled);
 }finally{globalThis.fetch=originalFetch;}
});
test('PNG opens with explicit single-row scope; close and option changes never write or move the selection',async()=>{
 for(const auxiliary of [false,true]){
  const initial=fixture();if(auxiliary)initial.activeAuxId='aux-1';const h=await setup(initial),before=h.data(),writes=h.writes();h.click('[data-copy-menu]');h.click('[data-png-open]');
  assert.equal(h.$('[data-png-scope]').value,'current');assert(h.$('[data-png-range]').hidden);assert(h.$('[data-png-download]').disabled);assert(h.$('[data-png-context]').hasAttribute('checked'));assert(!h.$('[data-png-notes]').hasAttribute('checked'));assert.match(h.$('.work-png-options').textContent,/전체 기록·복원 코드/);
  h.$('[data-png-scope]').value='range';h.$('[data-png-scope]').dispatchEvent(new h.window.Event('change',{bubbles:true}));assert(!h.$('[data-png-range]').hidden);h.click('[data-task-close]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 }
});
test('free formula, note, condition and answer drafts are kept when copy/export is opened from the background',async()=>{
 for(const [trigger,field,value]of [['[data-free-input]','[data-work-expression]','x+99'],['[data-note-edit="1"]','[data-note-draft]','내 초안'],['[data-context-board]','[data-board-condition]','x > 8'],['[data-practice-open]','[data-practice-answer]','128']]){
  const h=await setup();h.click(trigger);h.input(field,value);if(field==='[data-work-expression]')await new Promise(r=>setTimeout(r,140));const input=h.$(field);input.selectionStart=1;input.selectionEnd=2;const before=h.data(),writes=h.writes(),markup=h.$('[data-work-task]').innerHTML;
  h.click('[data-copy-menu]');h.click('[data-copy-menu]');assert.equal(h.$(field),input);assert.deepEqual([input.value,input.selectionStart,input.selectionEnd],[value,1,2]);assert.equal(h.$('[data-work-task]').innerHTML,markup);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);assert.match(h.$('#toast').textContent,/초안은 그대로/);
 }
});
test('existing text, LaTeX and full reasoning copy remain available and read-only',async()=>{
 const h=await setup(),before=h.data(),writes=h.writes();h.click('[data-copy-menu]');for(const type of ['text','latex','steps']){h.click(`[data-copy-format="${type}"]`);await Promise.resolve();}assert.equal(h.copied.length,3);assert.match(h.copied[0],/x/);assert.match(h.copied[1],/x/);assert.match(h.copied[2],/보조 1/);assert.match(h.copied[2],/보존할 메모/);h.click('[data-task-close]');assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
});
test('an inline term-edit draft and selection are not redrawn by opening copy or PNG',async()=>{
 const h=await setup();h.click('[data-direct-open]');h.click('[data-direct-all]');h.click('[data-operation-group="edit"]');h.click('[data-transform-mode="replace"]');h.input('[data-direct-input]','x+1+1');
 const field=h.$('[data-direct-input]');field.setSelectionRange(2,4);const before=h.data(),writes=h.writes();h.click('[data-copy-menu]');assert.equal(h.$('[data-direct-input]'),field);assert.deepEqual([field.value,field.selectionStart,field.selectionEnd],['x+1+1',2,4]);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);assert.equal(h.document.querySelector('[data-png-open]'),null);
});
test('asset failure and cancellation leave the notebook untouched and do not activate download later',async()=>{
 const h=await setup(),before=h.data(),writes=h.writes(),originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{throw Error('offline')};h.click('[data-copy-menu]');h.click('[data-png-open]');h.click('[data-png-prepare]');await new Promise(r=>setTimeout(r,20));assert.match(h.$('[data-png-status]').textContent,/만들지 못/);assert(h.$('[data-png-download]').disabled);assert(!h.$('[data-png-prepare]').disabled);assert.deepEqual(h.data(),before);
  globalThis.fetch=()=>new Promise(()=>{});h.click('[data-png-prepare]');h.click('[data-task-close]');await new Promise(r=>setTimeout(r,20));assert(h.$('[data-work-task]').hidden);assert.deepEqual(h.data(),before);assert.equal(h.writes(),writes);
 }finally{globalThis.fetch=originalFetch;}
});
