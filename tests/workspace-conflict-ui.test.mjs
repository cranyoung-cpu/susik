import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {parseBackup,serializeBackup} from '../dist/workspace-backup.js';
const fixture=()=>({rows:[{value:'x + 1',title:'직접 입력',condition:'x > 0',bindings:{t:'x+1'},note:'본식 설명'},{value:'x + 2',title:'직접 입력'}],active:1,activeAuxId:'aux-1',auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x + 1',rows:[{value:'y + 8',title:'직접 입력',note:'보조 설명'}],active:0}]});
let sequence=0;
async function setup(book=fixture()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.math=math;window.innerWidth=320;window.innerHeight=640;window.matchMedia=()=>({matches:true});
 window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};
 let raw=JSON.stringify(book),writes=0,blocked=false;
 const storage={getItem:k=>k===WORK_KEY?raw:null,setItem(k,v){if(blocked)throw Error('quota');if(k===WORK_KEY){writes++;raw=v;}}};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 const {startWorkspace}=await import(`../dist/workspace-app.js?conflict-ui=${sequence++}`);startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,'Missing '+s);return e;},click=s=>$(s).click();
 const signal=kind=>{const e=new window.Event(kind);if(kind==='storage')e.key=WORK_KEY;else e.persisted=true;window.dispatchEvent(e);};
 const type=async(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,140));};
 return {window,document,$,click,type,signal,startWorkspace,data:()=>JSON.parse(raw),raw:()=>raw,writes:()=>writes,block:v=>{blocked=v;},external:v=>{raw=typeof v==='string'||v===null?v:JSON.stringify(v);}};
}
function nextBook(book){const next=structuredClone(book);next.rows.push({value:'x + 99',title:'직접 입력',startNew:true,note:'새 화면의 기록'});next.active=next.rows.length-1;next.activeAuxId=null;return next;}

for(const signal of ['pageshow','storage','missed event'])test(`a stale ${signal} page keeps its free draft and cannot overwrite or undo newer work`,async()=>{
 const h=await setup();h.click('[data-note-edit="0"]');h.$('[data-note-draft]').value='직전 저장';h.click('[data-note-save]');
 h.click('[data-free-input]');await h.type('[data-work-expression]','(x+7)^2');h.click('[data-draft-context]');await h.type('[data-board-condition]','x ≥ 0');h.click('[data-board-save]');h.click('[data-work-keyboard]');
 const field=h.$('[data-work-expression]');field.setSelectionRange(1,4);const latest=nextBook(h.data());h.external(latest);const writes=h.writes();if(signal!=='missed event')h.signal(signal);
 for(let i=0;i<3;i++){h.click('[data-input-save]');h.click('[data-history-undo]');assert.deepEqual(h.data(),latest);assert.equal(h.writes(),writes);assert.equal(h.$('[data-work-expression]'),field);assert.equal(field.value,'(x+7)^2');assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,4);}
 assert.match(h.$('[data-storage-status]').textContent,/덮어쓰기를 멈췄/);assert(h.$('[data-task-storage-conflict]'));assert.equal(h.$('[data-sheet="aux-1"]').getAttribute('aria-selected'),'true');
 h.startWorkspace();assert.equal(h.$('[data-work-expression]'),field);assert.equal(h.writes(),writes);
 h.click('[data-task-storage-conflict] [data-storage-load]');assert.deepEqual(h.data(),latest);assert.equal(h.writes(),writes);
 assert.equal(h.$('[data-work-expression]').value,'(x+7)^2');assert.equal(h.$('[data-work-expression]').selectionStart,1);assert.equal(h.$('[data-work-expression]').selectionEnd,4);assert.equal(h.$('[data-work-keyboard]').getAttribute('aria-pressed'),'true');assert(h.$('[data-history-undo]').disabled);
 h.click('[data-input-save]');const saved=h.data();assert.equal(saved.rows.length,latest.rows.length+1);assert.deepEqual(saved.rows.slice(0,-1),latest.rows);assert.deepEqual(saved.auxiliary,latest.auxiliary);assert.equal(saved.rows.at(-1).condition,'x ≥ 0');
 h.click('[data-history-undo]');assert.deepEqual(h.data(),latest);
});

test('stale note and inline condition edits stay visible and do not change latest records',async()=>{
 const h=await setup();h.click('[data-note-edit="0"]');h.$('[data-note-draft]').value='미저장 설명';const latest=nextBook(h.data());h.external(latest);h.signal('storage');const writes=h.writes();
 h.click('[data-note-save]');h.click('[data-storage-load]');assert.equal(h.$('[data-note-draft]').value,'미저장 설명');assert.match(h.$('.work-task-error').textContent,/복사해 보관/);assert.deepEqual(h.data(),latest);assert.equal(h.writes(),writes);
 h.click('[data-task-close]');const condition=h.$('[data-work-condition]');condition.value='y > 3';condition.dispatchEvent(new h.window.Event('change',{bubbles:true}));h.click('[data-storage-load]');assert.equal(condition.value,'y > 3');assert.deepEqual(h.data(),latest);
 condition.value='';h.click('[data-storage-load]');assert.deepEqual(h.data(),latest);assert.equal(h.writes(),writes);assert.equal(h.document.querySelector('[data-task-storage-conflict]'),null);
});

test('backup restore cannot replace changes made while its confirmation is open',async()=>{
 const h=await setup(),backup=serializeBackup(h.data());h.click('[data-backup-open]');Object.defineProperty(h.$('[data-backup-file]'),'files',{value:[{size:backup.length,text:async()=>backup}]});h.$('[data-backup-file]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));
 const latest=nextBook(h.data());h.external(latest);h.signal('pageshow');h.click('[data-backup-restore]');assert.deepEqual(h.data(),latest);assert(h.$('[data-backup-restore]'));h.click('[data-task-close]');h.click('[data-storage-load]');assert.deepEqual(h.data(),latest);assert(h.$('[data-history-undo]').disabled);
});

test('newer full notebooks, malformed storage and removed storage never clear the retained draft',async()=>{
 const h=await setup();h.click('[data-free-input]');await h.type('[data-work-expression]','x+7');const latest=nextBook(h.data());latest.rows=Array.from({length:300},(_,i)=>({value:`x + ${i}`,title:'직접 입력'}));latest.active=299;h.external(latest);h.signal('storage');
 h.click('[data-storage-load]');h.click('[data-input-save]');assert.match(h.$('.work-task-error').textContent,/300줄/);assert.equal(h.$('[data-work-expression]').value,'x+7');assert.deepEqual(h.data(),latest);
 for(const raw of ['not json',null]){h.external(raw);h.signal('storage');h.click('[data-storage-load]');h.click('[data-input-save]');assert.equal(h.raw(),raw);assert.equal(h.$('[data-work-expression]').value,'x+7');}
});

test('a local save failure requires a backup before adopting another page and keeps the free draft',async()=>{
 const h=await setup(),before=h.data();h.click('[data-free-input]');await h.type('[data-work-expression]','x+77');h.block(true);h.click('[data-input-save]');assert.deepEqual(h.data(),before);
 h.click('[data-free-input]');await h.type('[data-work-expression]','x+88');const latest=nextBook(before);h.block(false);h.external(latest);h.signal('storage');h.click('[data-storage-load]');assert.match(h.$('#toast').textContent,/백업을 먼저/);assert.equal(h.$('[data-work-expression]').value,'x+88');
 const original=URL.createObjectURL;let blob;URL.createObjectURL=value=>{blob=value;return 'blob:test';};
 try{h.click('[data-backup-download]');}finally{URL.createObjectURL=original;}
 const backedUp=parseBackup(await blob.text());assert.equal(backedUp.rows.at(-1).value.replace(/\s/g,''),'x+77');
 h.click('[data-storage-load]');assert.deepEqual(h.data(),latest);assert.equal(h.$('[data-work-expression]').value,'x+88');h.click('[data-input-save]');assert.equal(h.data().rows.length,latest.rows.length+1);assert.deepEqual(h.data().rows.slice(0,-1),latest.rows);
});
