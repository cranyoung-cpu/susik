import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeBackup,parseBackup,BACKUP_LIMIT,isManualRow} from '../dist/workspace-backup.js';
import {exportWorkspace} from '../dist/workspace-export.js';
import {calculateMatrix,solveLinearSystem} from '../dist/matrix-tools.js';
import {calculateCalculus} from '../dist/calculus-tools.js';
import * as math from 'mathjs';
const original=()=>({rows:[{value:'x^2=x',title:'직접 입력',condition:'x는 실수',bindings:{t:'x+1'},pendingCases:[{condition:'x = 0',equation:'x^2=x',previousAssumptions:[],previousCases:[]}]}],active:0,auxSequence:1,activeAuxId:'aux-1',auxiliary:[{id:'aux-1',name:'보조 1',sourceIndex:0,sourceValue:'x^2=x',rows:[{value:'t=2',title:'보조 식 시작'}],active:0}]});
test('backup preserves notebook, current sheets, conditions and unresolved cases without aliases',()=>{
 const book=original(),restored=parseBackup(serializeBackup(book));assert.deepEqual(restored,book);restored.rows[0].bindings.t='3';assert.equal(book.rows[0].bindings.t,'x+1');
 book.rows[0].displayLatex=undefined;book.rows[0].matrix=undefined;assert.deepEqual(parseBackup(serializeBackup(book)),JSON.parse(JSON.stringify(book)));
 Object.assign(book.rows[0],{note:'양변을 정리했다',logicStatements:[{domain:'x ∈ ℝ',formula:'∀x ∈ ℝ (x² ≥ 0)',meaning:'실수의 제곱은 음수가 아니다'}],practiceId:'roots-1',practiceAnswer:'1,7',practiceFeedback:{status:'correct',message:'최종 답만 확인'}});assert.deepEqual(parseBackup(serializeBackup(book)),JSON.parse(JSON.stringify(book)));
});
test('advanced matrix, calculus and system steps survive backup',()=>{
 for(const entry of [{type:'matrix',mode:'inverse',a:[['1','2'],['3','4']],b:[['0']]},{type:'calculus',mode:'derivative',expression:'x^3',variable:'x',order:1,lower:'0',upper:'1'},{type:'system',variables:['x','y'],equations:['x+y=3','x-y=1']}]){
 const result=entry.type==='matrix'?calculateMatrix(entry):entry.type==='system'?solveLinearSystem(entry,math):calculateCalculus(entry,math),book=original();Object.assign(book.auxiliary[0],{entry,rows:result.steps,active:result.steps.length-1});assert.deepEqual(parseBackup(serializeBackup(book)),book);
 }
});
test('reject unsupported, malformed, oversized and unsafe backup data before replacement',()=>{
 for(const text of ['{}','{','{"format":"susik-workspace","version":2}', ' '.repeat(BACKUP_LIMIT+1)])assert.throws(()=>parseBackup(text));
 for(const change of [b=>b.active=99,b=>b.rows=[],b=>b.rows[0].conditions={},b=>b.rows[0].bindings=[],b=>b.rows[0].origin={value:3},b=>b.rows[0].pendingCases=[{}],b=>b.auxiliary[0].sourceIndex=4,b=>b.auxiliary.push(b.auxiliary[0]),b=>b.auxiliary[0].entry={type:'matrix',mode:'inverse',a:[['1'],['2','3']],b:[['1']]},b=>b.rows[0].parent=0]){const b=original();change(b);assert.throws(()=>parseBackup(JSON.stringify({format:'susik-workspace',version:1,workspace:b})));}
 assert.throws(()=>parseBackup('{"format":"susik-workspace","version":1,"workspace":{"rows":[{"value":"x","__proto__":{}}],"active":0}}'));
});
test('manual entry warning survives text export without labelling exact direct transformations unverified',()=>{
 assert(isManualRow({title:'직접 입력'}));assert(!isManualRow({title:'직접 변형'}));assert.match(exportWorkspace(original().rows),/동치 미확인/);
});
