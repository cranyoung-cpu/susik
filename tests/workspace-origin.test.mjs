import test from 'node:test';import assert from 'node:assert/strict';import {originSnapshot,solutionOrigin} from '../dist/workspace-origin.js';
test('solution origin survives reload, restores definitions and conditions, and does not alias saved data',()=>{
 const root={value:'x^2=x',condition:'x는 실수',assumptions:[],bindings:{t:'x+1'},pendingCases:[]};
 const rows=JSON.parse(JSON.stringify([{...root,startNew:true},{value:'x=1',origin:originSnapshot(root),condition:'x ≠ 0',assumptions:['x ≠ 0'],bindings:{t:'x+1',u:'t^2'},pendingCases:[{condition:'x=0'}]}]));
 const origin=solutionOrigin(rows,1);assert.deepEqual(origin,originSnapshot(root));origin.bindings.t='2';assert.equal(rows[1].origin.bindings.t,'x+1');
});
test('legacy solution lookup follows its parent and stops at the selected problem start',()=>{
 const starts=new Set(['문제 A','문제 B','직접 입력']);
 const rows=[{value:'x+1',title:'문제 A'},{value:'x=1',title:'문제 B',parent:0},{value:'x+2=3',parent:1},{value:'2*x+4=6',parent:2}];
 assert.equal(solutionOrigin(rows,3,starts).value,'x=1');assert.equal(solutionOrigin(rows,0,starts).value,'x+1');
});
