import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY,loadWorkspace} from '../dist/workspace-state.js';
import {parseBackup,serializeBackup} from '../dist/workspace-backup.js';
import {exportWorkspace} from '../dist/workspace-export.js';
import {rowRemovalInfo,adjacentRowIndex} from '../dist/workspace-history.js';
const notebook=()=>({rows:[{value:'x+1',title:'직접 입력',bindings:{t:'x+1'},condition:'x는 실수'},{value:'x+2',parent:0},{value:'x+3',parent:1}],active:2,activeAuxId:null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x+1',rows:[{value:'x+1'},{value:'x+2',parent:0}],active:1}]});
let sequence=0;
async function setup(book=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.math=math;let blocked=false;const entries=new Map([[WORK_KEY,JSON.stringify(book)]]),storage={getItem:k=>entries.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');entries.set(k,v);}};Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});(await import(`../dist/workspace-app.js?cleanup=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,s);return e;};return {$,document,click:s=>$(s).click(),data:()=>JSON.parse(entries.get(WORK_KEY)),storage,block:v=>blocked=v};
}
test('selected prior row deletion preserves original data, all parent and auxiliary references, and undo restores exactly',async()=>{
 const h=await setup(),before=h.data();assert.deepEqual(rowRemovalInfo(before,before,0),{children:1,auxiliary:1});h.click('[data-row-remove="0"]');assert.deepEqual(h.data(),before);h.click('[data-task-close]');assert.deepEqual(h.data(),before);h.click('[data-row-remove="0"]');h.click('[data-row-remove-confirm]');const after=h.data();assert.deepEqual(after,{...before,rows:before.rows.map((r,i)=>i===0?{...r,archived:true}:r)});assert(!h.document.querySelector('[data-work-row="0"]'));assert.equal(h.$('[data-row-remove="2"]').disabled,true);assert(!exportWorkspace(after.rows).includes('x+1'));assert.equal(after.active,2);assert.deepEqual(after.auxiliary,before.auxiliary);assert.deepEqual(parseBackup(serializeBackup(after)),after);assert.deepEqual(loadWorkspace(h.storage),after);assert.equal(adjacentRowIndex(after,-1),1);
 h.click('[data-history-undo]');assert.deepEqual(h.data(),before);assert(h.$('[data-work-row="0"]'));
});
test('deleted rows can be restored after reload without moving the active row or changing a reference',async()=>{
 let h=await setup();const before=h.data();h.click('[data-row-remove="1"]');h.click('[data-row-remove-confirm]');assert.equal(adjacentRowIndex(h.data(),-1),0);h=await setup(h.data());assert(!h.document.querySelector('[data-work-row="1"]'));h.click('[data-deleted-open]');h.click('[data-row-restore="1"]');assert.deepEqual(h.data(),before);h.click('[data-history-undo]');assert.equal(h.data().rows[1].archived,true);
});
test('auxiliary cleanup is isolated, protects its current row, and does not change the main sheet',async()=>{
 const book=notebook();book.activeAuxId='aux-1';const h=await setup(book),before=h.data();h.click('[data-row-remove="0"]');h.click('[data-row-remove-confirm]');assert.deepEqual(h.data().rows,before.rows);assert.equal(h.data().auxiliary[0].rows[0].archived,true);assert.equal(h.data().auxiliary[0].sourceIndex,0);assert.equal(h.data().auxiliary[0].active,1);assert.throws(()=>rowRemovalInfo(before,before.auxiliary[0],1),/현재 식/);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});
test('failed deletion and restoration retain recoverable data and the modal reports failure',async()=>{
 const h=await setup(),before=h.data();h.click('[data-row-remove="0"]');h.block(true);h.click('[data-row-remove-confirm]');assert.deepEqual(h.data(),before);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.block(false);h.click('[data-row-remove-confirm]');const removed=h.data();h.click('[data-deleted-open]');h.block(true);h.click('[data-row-restore="0"]');assert.deepEqual(h.data(),removed);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.block(false);h.click('[data-row-restore="0"]');assert.deepEqual(h.data(),before);
});


test('returning from an auxiliary whose source was deleted keeps the visible main selection and original reference',async()=>{
 const h=await setup();h.click('[data-row-remove="0"]');h.click('[data-row-remove-confirm]');h.click('[data-sheet="aux-1"]');h.click('[data-sheet="main"]');assert.equal(h.data().active,2);assert.equal(h.data().rows[0].archived,true);assert.equal(h.data().auxiliary[0].sourceIndex,0);assert.deepEqual(parseBackup(serializeBackup(h.data())),h.data());
});

test('deleting the last displayed row preserves a browsed page outside the active row and undo restores that page',async()=>{
 const rows=Array.from({length:40},(_,i)=>({value:`x+${i}`,condition:`x > ${i}`})),h=await setup({rows,active:35,auxiliary:[]});
 const indices=()=>[...h.document.querySelectorAll('[data-work-row]')].map(el=>+el.dataset.workRow);
 h.click('[data-history-page="0"]');const before=h.data(),page=indices(),condition=h.$('[data-work-condition]').value;assert.deepEqual(page,Array.from({length:24},(_,i)=>i));
 h.click('[data-row-remove="23"]');h.click('[data-row-remove-confirm]');assert.deepEqual(indices(),[...page.slice(0,-1),24]);assert.equal(h.data().active,35);assert.equal(h.$('[data-work-condition]').value,condition);
 h.click('[data-history-undo]');assert.deepEqual(indices(),page);assert.deepEqual(h.data(),before);
});

test('deleting the only row on the last page returns to a full previous page and undo restores the last page',async()=>{
 const rows=Array.from({length:25},(_,i)=>({value:`x+${i}`})),h=await setup({rows,active:0,auxiliary:[]});
 const indices=()=>[...h.document.querySelectorAll('[data-work-row]')].map(el=>+el.dataset.workRow);
 h.click('[data-history-page="24"]');assert.deepEqual(indices(),[24]);const before=h.data();
 h.click('[data-row-remove="24"]');h.click('[data-row-remove-confirm]');assert.deepEqual(indices(),Array.from({length:24},(_,i)=>i));assert.equal(h.data().active,0);
 h.click('[data-history-undo]');assert.deepEqual(indices(),[24]);assert.deepEqual(h.data(),before);
});
