import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {WORK_KEY} from '../dist/workspace-state.js';
import {PRACTICE_CRITERIA_VERSION,PRACTICE_PROBLEMS,checkPractice,practiceAnswerGuide} from '../dist/learning-tools.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';

const problem=PRACTICE_PROBLEMS.find(p=>p.id==='log-3');
const notebook=criteriaVersion=>({active:0,activeAuxId:null,practiceScore:7,rows:[{value:'ln(x) = 0',title:'자연로그 방정식',startNew:true,condition:'x > 0',note:'원래 풀이 설명',practiceId:'log-3',practiceAnswer:'0^0',practiceFeedback:{status:'correct',message:'이전 기준으로 저장한 정답',...(criteriaVersion!==undefined?{criteriaVersion}:{})}}]});
let sequence=0;
async function setup(book=notebook()){
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.math=math;window.innerWidth=320;window.innerHeight=640;
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=()=>{};
 const memory=new Map([[WORK_KEY,JSON.stringify(book)]]);let blocked=false;
 const storage={getItem:k=>memory.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');memory.set(k,v);}};
 Object.assign(globalThis,{window,document,localStorage:storage,requestAnimationFrame:f=>f()});
 (await import(`../dist/workspace-app.js?practice-review=${sequence++}`)).startWorkspace();
 const $=s=>{const el=document.querySelector(s);assert(el,'Missing '+s);return el;},click=s=>$(s).click(),data=()=>JSON.parse(memory.get(WORK_KEY));
 const input=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new window.Event('input',{bubbles:true}));};
 const importBackup=async book=>{click('[data-backup-open]');const text=serializeBackup(book);Object.defineProperty($('[data-backup-file]'),'files',{value:[{size:text.length,text:async()=>text}]});$('[data-backup-file]').dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));};
 return {$,click,input,data,document,importBackup,block:value=>{blocked=value;}};
}

for(const [label,version] of [['missing',undefined],['older','older'],['future','future']])test(`${label} criteria only display a review notice on load, open, edit and cancel`,async()=>{
 const before=notebook(version),h=await setup(before);
 assert.deepEqual(h.data(),before);assert.match(h.$('[data-practice-review]').textContent,/재확인 필요/);assert.match(h.$('[data-practice-review] details').textContent,/이전 기준으로 저장한 정답/);
 assert.equal(h.document.querySelector('[data-practice-panel] [data-status="correct"]'),null);
 h.click('[data-practice-open]');assert.equal(h.$('[data-practice-answer]').value,'0^0');assert.equal(h.$('[data-practice-check]').textContent,'다시 확인');assert.equal(h.$('[data-practice-feedback]').dataset.status,'unverified');
 h.input('[data-practice-answer]','1');h.click('[data-task-close]');assert.deepEqual(h.data(),before);
 assert.deepEqual(parseBackup(serializeBackup(h.data())),before);
});

test('only explicit rechecking updates the result and criteria; undo preserves the previous record',async()=>{
 const before=notebook(),h=await setup(before);
 h.click('[data-practice-open]');h.click('[data-practice-check]');
 const next=h.data();assert.equal(next.rows[0].practiceAnswer,'0^0');assert.equal(next.rows[0].practiceFeedback.status,'unverified');assert.equal(next.rows[0].practiceFeedback.criteriaVersion,PRACTICE_CRITERIA_VERSION);
 assert.equal(next.rows[0].note,before.rows[0].note);assert.equal(next.practiceScore,before.practiceScore);assert.equal(h.document.querySelector('[data-practice-review]'),null);assert.equal(h.$('[data-practice-check]').textContent,'답 확인');
 h.click('[data-task-close]');h.click('[data-direct-open]');h.click('[data-direct-undo]');assert.deepEqual(h.data(),before);assert(h.$('[data-practice-review]'));
 h.click('[data-practice-open]');h.input('[data-practice-answer]','1');h.click('[data-practice-check]');assert.equal(h.data().rows[0].practiceFeedback.status,'correct');
 const saved=h.data(),reload=await setup(parseBackup(serializeBackup(saved)));assert.deepEqual(reload.data(),saved);assert.equal(reload.document.querySelector('[data-practice-review]'),null);
 reload.click('[data-practice-open]');assert.equal(reload.$('[data-practice-feedback]').dataset.status,'correct');reload.input('[data-practice-answer]','2');assert.equal(reload.$('[data-practice-feedback]').dataset.status,'unverified');assert.equal(reload.document.querySelector('[data-practice-review]'),null);reload.click('[data-task-close]');assert.deepEqual(reload.data(),saved);
});

test('current feedback stays current after note edits, while new calculation rows have no inherited judgement',async()=>{
 const book=notebook();book.rows[0].practiceAnswer='1';book.rows[0].practiceFeedback=checkPractice(problem,'1');const h=await setup(book);
 h.click('[data-note-edit="0"]');h.input('[data-note-draft]','수정한 풀이 설명');h.click('[data-note-save]');assert.deepEqual(h.data().rows[0].practiceFeedback,book.rows[0].practiceFeedback);assert.equal(h.document.querySelector('[data-practice-review]'),null);
 const before=h.data();h.click('[data-direct-open]');h.click('[data-operation-group="calculate"]');h.click('[data-equation-mode="add"]');h.click('[data-balance-value="1"]');h.click('[data-balance-apply]');
 const after=h.data();assert(after.rows.length>before.rows.length);assert.deepEqual(after.rows[0],before.rows[0]);assert.equal(after.rows.at(-1).practiceId,'log-3');assert.equal(after.rows.at(-1).practiceFeedback,null);assert.equal(after.rows.at(-1).practiceAnswer,'');assert.equal(h.document.querySelector('[data-practice-review]'),null);
 h.click('[data-direct-undo]');assert.deepEqual(h.data(),before);
});

test('restoring an old backup keeps its judgement and notice without changing a current result during preview',async()=>{
 const book=notebook();book.rows[0].practiceAnswer='1';book.rows[0].practiceFeedback=checkPractice(problem,'1');const h=await setup(book),before=h.data(),old=notebook('older');
 await h.importBackup(old);assert.deepEqual(h.data(),before);h.click('[data-backup-restore]');assert.deepEqual(h.data(),old);assert(h.$('[data-practice-review]'));h.click('[data-backup-undo]');assert.deepEqual(h.data(),before);assert.equal(h.document.querySelector('[data-practice-review]'),null);
});

test('a failed explicit recheck retains the old result and version until the user checks again',async()=>{
 const h=await setup(),before=h.data();h.click('[data-practice-open]');h.block(true);h.click('[data-practice-check]');assert.deepEqual(h.data(),before);assert(h.$('[data-practice-review]'));assert.match(h.$('.work-task-error').textContent,/저장하지 못/);
 h.block(false);h.click('[data-practice-check]');assert.equal(h.data().rows[0].practiceFeedback.criteriaVersion,PRACTICE_CRITERIA_VERSION);assert.equal(h.data().rows[0].practiceFeedback.status,'unverified');assert.equal(h.document.querySelector('[data-practice-review]'),null);assert.equal(h.$('.work-task-error').textContent,'');
});

for(const id of ['power-1','power-3'])test(`${id} keeps previous records and distinguishes unfinished calculation before accepting a signed integer`,async()=>{
 const p=PRACTICE_PROBLEMS.find(p=>p.id===id),rows=PRACTICE_PROBLEMS.map(q=>({value:q.value,title:q.title,practiceId:q.id,practiceAnswer:Array.isArray(q.answer)?q.answer.join(','):q.answer,practiceFeedback:{...checkPractice(q,Array.isArray(q.answer)?q.answer.join(','):q.answer),criteriaVersion:'2026-10-13.1'},note:'보존할 설명'})),active=rows.findIndex(r=>r.practiceId===id);
 rows[active].practiceAnswer=p.value;rows[active].practiceFeedback={status:'correct',message:'이전 기준의 정답',criteriaVersion:'2026-10-13.1'};
 const h=await setup({rows,active,activeAuxId:null}),before=h.data();assert.match(h.$('[data-practice-review]').textContent,/재확인 필요/);assert.deepEqual(h.data(),before);
 h.click('[data-practice-open]');assert.match(h.$('[data-practice-answer-guide]').textContent,/정수 하나.*부호·괄호.*계산 미완료.*함수식.*자동 확인은 지원하지/);assert.equal(h.$('[data-practice-answer]').getAttribute('aria-describedby'),'practice-answer-guide');assert.deepEqual(h.data(),before);
 h.block(true);h.click('[data-practice-check]');assert.deepEqual(h.data(),before);assert.equal(h.$('[data-practice-answer]').value,p.value);assert.match(h.$('.work-task-error').textContent,/저장하지 못/);h.block(false);
 h.click('[data-practice-check]');const unfinished=h.data();assert.equal(unfinished.rows[active].practiceFeedback.status,'unverified');assert.equal(unfinished.rows[active].practiceFeedback.reason,'unfinished');assert.match(h.$('[data-practice-feedback]').textContent,/값은 같.*계산 미완료/);assert.equal(h.$('[data-practice-feedback]').dataset.status,'unverified');assert.equal(unfinished.rows[active].practiceFeedback.criteriaVersion,PRACTICE_CRITERIA_VERSION);
 assert.deepEqual(unfinished.rows.filter((_,i)=>i!==active),before.rows.filter((_,i)=>i!==active));assert.deepEqual(parseBackup(serializeBackup(unfinished)),unfinished);
 h.click('[data-task-close]');assert.equal(h.$('[data-practice-panel] [data-status]').dataset.reason,'unfinished');h.click('[data-history-undo]');assert.deepEqual(h.data(),before);
 h.click('[data-practice-open]');h.input('[data-practice-answer]',`+(-(-(${p.answer})))`);h.click('[data-practice-check]');assert.equal(h.data().rows[active].practiceFeedback.status,'correct');assert.equal(h.data().rows[active].note,before.rows[active].note);h.click('[data-task-close]');
 const reload=await setup(parseBackup(serializeBackup(unfinished)));assert.deepEqual(reload.data(),unfinished);reload.click('[data-practice-open]');assert.equal(reload.$('[data-practice-feedback]').dataset.reason,'unfinished');assert.match(reload.$('[data-practice-feedback]').textContent,/계산 미완료/);reload.click('[data-task-close]');assert.deepEqual(reload.data(),unfinished);
});

test('every practice shows its answer format and the function-checking limit before a check',async()=>{
 for(const p of PRACTICE_PROBLEMS){
  const h=await setup({rows:[{value:p.value,title:p.title,practiceId:p.id}],active:0}),before=h.data();h.click('[data-practice-open]');const guide=h.$('[data-practice-answer-guide]');assert(guide.textContent.startsWith(practiceAnswerGuide(p)));assert.match(guide.textContent,/sqrt·log·ln·sin.*입력.*자동 확인은 지원하지/);assert(guide.compareDocumentPosition(h.$('[data-practice-answer]'))&4);assert.deepEqual(h.data(),before);
  h.input('[data-practice-answer]',p.id==='log-1'?'log(8,2)':'sqrt(16384)');assert.equal(h.$('[data-practice-feedback]').dataset.reason,'unchecked');h.click('[data-practice-check]');assert.equal(h.data().rows[0].practiceFeedback.status,'unverified');assert.equal(h.data().rows[0].practiceFeedback.reason,'unsupported');assert.match(h.$('[data-practice-feedback]').textContent,/자동 확인 범위 밖/);
 }
});
