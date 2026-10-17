import test from 'node:test';
import assert from 'node:assert/strict';
import math from '../src/math-runtime.js';
import {balanceEquation} from '../dist/equation-tools.js';
import {captureZeroCase,zeroCaseStart,caseWorkInfo} from '../dist/case-work.js';
import {createAuxiliary} from '../dist/auxiliary-tools.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';

test('a later zero case keeps earlier branch restrictions and original domains without importing the new nonzero restriction',()=>{
 const previous={value:'x-1=0',condition:'x는 실수; x ≠ 0',assumptions:['x ≠ 0'],conditions:['x ≠ 0'],bindings:{},excluded:['0'],logicStatements:[],pendingCases:[{id:'earlier',condition:'x = 0',equation:'x*(x-1)=0'}]};
 const branch=captureZeroCase(balanceEquation(previous.value,'divide','x-1',{},math).branch,previous);
 previous.assumptions.push('x-1 ≠ 0');previous.conditions.push('x-1 ≠ 0');previous.excluded.push('1');
 const start=zeroCaseStart(branch,math);assert(start.assumptions.includes('x ≠ 0'));assert(start.assumptions.includes(branch.condition));assert(!start.assumptions.includes('x-1 ≠ 0'));assert.deepEqual(start.excluded,['0']);assert.equal(start.pendingCases[0].id,'earlier');
 const domain=zeroCaseStart({condition:'x = 0',equation:'x/(x-1)=0',previousCondition:'x는 실수',previousAssumptions:[],bindings:{}},math);assert(domain.assumptions.includes('x - 1 ≠ 0'));
});

test('version-one backups validate optional case links and conclusions while allowing a removed source sheet',()=>{
 const branch={id:'case-test',condition:'x = 0',equation:'x^2=x',previousConditions:['x는 실수'],previousLogicStatements:[],previousExcluded:[],bindings:{}};
 const aux=createAuxiliary(zeroCaseStart(branch,math),0,branch.equation,'aux-1','별도 경우 1',math);aux.caseWork=caseWorkInfo(branch,null,0);aux.caseWork.result={conclusion:'x=0',reason:'원식에서 0²=0'};
 const book={rows:[{value:'x=1',pendingCases:[branch]}],active:0,auxSequence:1,activeAuxId:'aux-1',auxiliary:[aux]};assert.deepEqual(parseBackup(serializeBackup(book)),book);
 for(const change of [b=>b.auxiliary[0].caseWork.result.reason='',b=>b.auxiliary[0].caseWork.result.conclusion=1,b=>b.auxiliary[0].caseWork.sourceSheet='aux-1',b=>{b.auxiliary[0].caseWork.sourceSheet='aux-9';b.auxiliary[0].caseWork.sourceRow=-1;},b=>b.rows[0].pendingCases[0].previousExcluded={},b=>b.rows[0].pendingCases[0].previousLogicStatements=[{}]]){const bad=structuredClone(book);change(bad);assert.throws(()=>serializeBackup(bad));}
 const removed=structuredClone(book);Object.assign(removed.auxiliary[0].caseWork,{sourceSheet:'aux-9',sourceRow:2});assert.deepEqual(parseBackup(serializeBackup(removed)),removed);
});
