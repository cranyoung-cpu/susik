import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';
import {originSnapshot} from '../dist/workspace-origin.js';
import {serializeBackup,parseBackup,isManualRow} from '../dist/workspace-backup.js';

function practice(id){const p=PRACTICE_PROBLEMS.find(p=>p.id===id),row={value:p.value,title:p.title,startNew:true,practiceId:id,condition:p.condition,conditions:['기록된 조건'],bindings:{t:'x+1'},note:'이전 풀이',practiceAnswer:'128',practiceFeedback:checkPractice(p,'128')};row.origin=originSnapshot(row);return row;}
const notebook=()=>({rows:[practice('power-1'),practice('log-2'),{value:'x+1',title:'직접 입력',startNew:true,practiceId:null}],active:0,activeAuxId:null,auxSequence:1,auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'2^3*2^4',active:0,rows:[practice('power-1')]}]});
let sequence=0;
async function setup(book=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.math=math;window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLInputElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b;};window.HTMLTextAreaElement.prototype.setSelectionRange=window.HTMLInputElement.prototype.setSelectionRange;
 let saved=JSON.stringify(book),blocked=false;Object.assign(globalThis,{window,document,requestAnimationFrame:f=>f(),localStorage:{getItem:k=>k===WORK_KEY?saved:null,setItem:(k,v)=>{if(blocked)throw Error('quota');if(k===WORK_KEY)saved=v;}}});
 (await import(`../dist/workspace-app.js?practice-continuation=${sequence++}`)).startWorkspace();
 const $=s=>{const e=document.querySelector(s);assert(e,s);return e;},click=s=>$(s).click(),type=async(s,v)=>{$(s).value=v;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));if(s==='[data-work-expression]')await new Promise(r=>setTimeout(r,140));};
 const line=async value=>{click('[data-direct-open-input]');await type('[data-work-expression]',value);click('[data-input-save]');};
 const picker=()=>{const p=$('[data-practice-picker]');p.open=true;p.dispatchEvent(new window.Event('toggle'));};
 return {window,document,$,click,type,line,picker,data:()=>JSON.parse(saved),block:v=>blocked=v};
}

test('a manually written practice step keeps its problem and origin without inheriting an answer or claiming equivalence',async()=>{
 const h=await setup(),before=h.data();assert.equal(h.$('[data-direct-open-input]').getAttribute('aria-label'),'이 문제의 풀이 줄 추가');
 h.click('[data-direct-open-input]');assert.match(h.$('.work-task header').textContent,/이 문제의 풀이 줄 추가/);assert.match(h.$('#work-input-draft').textContent,/풀이 줄 추가.*이 문제의 계산을 이어/);assert.match(h.$('.work-expression-options').textContent,/앞줄과 동치인지 확인하지 않습니다/);await h.type('[data-work-expression]','128');const button=h.$('[data-input-save]');button.click();button.click();
 const after=h.data(),row=after.rows[1];assert.equal(after.active,1);assert.equal(after.rows.length,4);assert.deepEqual(after.rows[0],before.rows[0]);assert.deepEqual(after.rows.slice(2),before.rows.slice(1));assert.deepEqual(after.auxiliary,before.auxiliary);
 assert.equal(row.practiceId,'power-1');assert.equal(row.startNew,false);assert.equal(row.parent,0);assert.deepEqual(row.origin,before.rows[0].origin);assert.deepEqual(row.conditions,before.rows[0].conditions);assert.deepEqual(row.bindings,before.rows[0].bindings);assert.equal(row.practiceAnswer,'');assert.equal(row.practiceFeedback,null);assert.equal(row.note,'');assert(isManualRow(row));assert.match(h.$('[data-practice-panel]').textContent,/같은 밑의 곱/);
 h.click('[data-practice-open]');await h.type('[data-practice-answer]','128');h.click('[data-practice-check]');assert.equal(h.data().rows[1].practiceFeedback.status,'correct');assert.deepEqual(h.data().rows[0],before.rows[0]);h.click('[data-task-close]');h.click('[data-history-undo]');assert.deepEqual(h.data(),after);
 h.click('[data-direct-reset]');assert.equal(h.data().rows[2].practiceId,'power-1');assert.equal(h.data().rows[2].value.replace(/\s/g,''),'2^3*2^4');h.click('[data-history-undo]');assert.deepEqual(h.data(),after);h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
});

test('the selected row alone owns continuation across different exercises, free rows and auxiliary sheets',async()=>{
 for(const target of ['power-1','log-2','free','auxiliary','unknown']){
  const book=notebook();book.active=target==='log-2'?1:target==='free'||target==='unknown'?2:0;if(target==='unknown')book.rows[2].practiceId='unknown-practice';if(target==='auxiliary')book.activeAuxId='aux-1';
  const h=await setup(book),before=h.data(),index=book.activeAuxId?0:before.active;await h.line(target==='log-2'?'9':'128');const after=h.data(),sheet=book.activeAuxId?after.auxiliary[0]:after,row=sheet.rows[index+1],expected=['power-1','log-2'].includes(target)?target:null;
  assert.equal(row.practiceId,expected);assert.equal(Boolean(h.document.querySelector('[data-practice-open]')),Boolean(expected));assert.equal(sheet.rows[index].practiceId,(book.activeAuxId?before.auxiliary[0]:before).rows[index].practiceId);if(book.activeAuxId)assert.deepEqual(after.rows,before.rows);else assert.deepEqual(after.rows.filter((_,i)=>i!==index+1),before.rows);
  h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 }
 const h=await setup();h.click('[data-free-input]');await h.type('[data-work-expression]','128');h.click('[data-input-save]');assert.equal(h.data().rows.at(-1).practiceId,null);assert.equal(h.data().rows.at(-1).origin.practiceId,null);assert.equal(h.document.querySelector('[data-practice-open]'),null);
});

test('cancel, context and input-type round trips preserve practice drafts; choosing another problem cannot discard them',async()=>{
 const h=await setup(),before=h.data();h.picker();h.click('[data-direct-open-input]');await h.type('[data-work-expression]','128');h.$('[data-work-expression]').setSelectionRange(1,2);h.click('[data-free-input]');assert.equal(h.$('[data-input-save]').textContent,'풀이 줄 추가');assert.equal(h.$('[data-work-expression]').value,'128');assert.deepEqual(h.data(),before);
 for(const id of ['log-2','roots-1']){h.click(`[data-practice-preview="${id}"]`);assert.deepEqual(h.data(),before);assert.equal(h.$('[data-work-expression]').value,'128');assert.equal(h.$('[data-work-expression]').selectionStart,1);assert.match(h.$('#toast').textContent,/초안은 그대로/);}
 h.click('[data-draft-context]');await h.type('[data-board-condition]','직접 기록한 조건');h.click('[data-board-save]');h.click('[data-input-type="matrix"]');h.click('[data-input-type="expression"]');assert.equal(h.$('[data-work-expression]').value,'128');assert.equal(h.$('[data-input-save]').textContent,'풀이 줄 추가');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 h.click('[data-direct-open-input]');assert.equal(h.$('[data-work-expression]').value,before.rows[0].value);h.click('[data-task-close]');
 h.click('[data-free-input]');await h.type('[data-work-expression]','x+7');h.click('[data-practice-preview="log-2"]');assert.equal(h.$('[data-work-expression]').value,'x+7');assert.deepEqual(h.data(),before);h.click('[data-task-close]');h.click('[data-practice-preview="log-2"]');h.click('[data-practice-start="log-2"]');assert.equal(h.data().rows[h.data().active].practiceId,'log-2');
});

test('archive, editing, reload and actual backup restore retain each practice ID without repairing unlinked old rows',async()=>{
 let h=await setup();await h.line('128');const continued=h.data();h.click('[data-row-remove="0"]');h.click('[data-row-remove-confirm]');assert.equal(h.data().rows[0].archived,true);assert.equal(h.data().rows[1].practiceId,'power-1');const archived=h.data();
 const roundTrip=parseBackup(serializeBackup(archived));assert.deepEqual(roundTrip,archived);h=await setup(roundTrip);assert.match(h.$('[data-practice-panel]').textContent,/같은 밑의 곱/);h.click('[data-note-edit="1"]');h.$('[data-note-draft]').value='다시 편집한 설명';h.click('[data-note-save]');assert.equal(h.data().rows[1].practiceId,'power-1');
 h.click('[data-backup-open]');const text=serializeBackup(archived);Object.defineProperty(h.$('[data-backup-file]'),'files',{value:[{size:text.length,text:async()=>text}]});h.$('[data-backup-file]').dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));h.click('[data-backup-restore]');assert.deepEqual(h.data(),archived);
 h.click('[data-deleted-open]');h.click('[data-row-restore="0"]');assert.deepEqual(h.data(),continued);await h.line('127+1');assert.equal(h.data().rows[2].practiceId,'power-1');assert.equal(h.data().rows[2].origin.practiceId,'power-1');assert.equal(h.data().rows[3].practiceId,'log-2');assert.equal(h.data().rows[4].practiceId,null);
});

test('quota failure and the 300-row limit preserve the practice and previous saved records',async()=>{
 const h=await setup(),before=h.data();h.block(true);await h.line('128');assert.deepEqual(h.data(),before);assert(h.$('[data-storage-status]').classList.contains('is-error'));assert.match(h.$('[data-practice-panel]').textContent,/같은 밑의 곱/);h.block(false);h.click('[data-save-retry]');assert.equal(h.data().rows[1].practiceId,'power-1');assert.equal(h.data().rows[1].value,'128');assert.deepEqual(h.data().rows[0],before.rows[0]);
 const book=notebook();book.rows=Array.from({length:300},()=>practice('power-1'));const full=await setup(book),saved=full.data();await full.line('128');assert.deepEqual(full.data(),saved);assert.equal(full.$('[data-work-expression]').value,'128');assert.match(full.$('#toast').textContent,/300줄/);
});
