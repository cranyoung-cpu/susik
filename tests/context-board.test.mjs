import test from 'node:test';
import assert from 'node:assert/strict';
import math from '../src/math-runtime.js';
import {definitionBinding} from '../dist/context-board.js';
import {substituteMany,restoreAll} from '../dist/substitutions.js';
test('definition notation is distinct from equality and records sin theta without changing a formula',()=>{
 const result=definitionBinding('a := sin θ',{},math);assert.equal(result.name,'a');assert.equal(result.definition,'sin(theta)');assert.deepEqual(result.bindings,{a:'sin(theta)'});
 const step=substituteMany('sin(theta)+1',result.bindings,'a',result.definition,'apply',math);assert.equal(step.value.replace(/\s/g,''),'a+1');assert.equal(restoreAll(step.value,step.bindings,math).replace(/\s/g,''),'sin(theta)+1');
 for(const raw of ['a = sin θ','a := x=2','i := x','a := a+1','a := integral(x)'])assert.throws(()=>definitionBinding(raw,{},math));
});
test('definitions preserve earlier meanings, reject dependency capture and cycles, and allow explicit dependencies',()=>{
 assert.throws(()=>definitionBinding('a := x+2',{a:'x+1'},math),/이미 저장한/);assert.throws(()=>definitionBinding('a := x',{t:'a+1'},math),/이미 쓰는/);
 assert.deepEqual(definitionBinding('b := a^2',{a:'sin(theta)'},math).bindings,{a:'sin(theta)',b:'a ^ 2'});assert.deepEqual(definitionBinding('a := sin θ',{a:'sin(theta)'},math).bindings,{a:'sin(theta)'});
});

test('sin squared and sin of twice the angle stay distinct while u := 2theta restores exactly',()=>{
 const doubled=definitionBinding('u := 2θ',{},math),step=substituteMany('2sin(2theta)-1=0',doubled.bindings,'u',doubled.definition,'apply',math);assert.match(step.value,/sin\(u\)/);assert.equal(restoreAll(step.value,step.bindings,math).replace(/\s/g,''),'2*sin(2*theta)-1=0');
 const sine=definitionBinding('a := sinθ',{},math),square=substituteMany('2sin^2θ-sinθ=0',sine.bindings,'a',sine.definition,'apply',math);assert.equal(square.value.replace(/\s/g,''),'2*a^2-a=0');assert.throws(()=>substituteMany('2sin(2theta)-1=0',sine.bindings,'a',sine.definition,'apply',math),/같은 모양/);
});
