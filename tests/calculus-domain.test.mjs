import test from 'node:test';
import assert from 'node:assert/strict';
import math from '../src/math-runtime.js';
import {calculateCalculus} from '../dist/calculus-tools.js';

test('original domains survive differentiation of constant parameters and eliminated terms',()=>{
 for(const [expression,condition] of [
  ['y^(-1)','y ≠ 0'],['y^0','y ≠ 0'],['y^(1/2)','y ≥ 0'],['y^(-1/2)','y > 0'],
  ['y^a','y > 0'],['asin(y)','-1 ≤ y ≤ 1'],['acos(y)+x','-1 ≤ y ≤ 1'],
  ['0*y^(-1)+x','y ≠ 0'],['0*asin(y)+x','-1 ≤ y ≤ 1']
 ]){
  const result=calculateCalculus({expression,variable:'x',mode:'derivative'},math);
  assert(result.steps.every(s=>s.conditions.includes(condition)),expression);
 }
 const value=e=>calculateCalculus({expression:e,variable:'x',mode:'derivative'},math).steps.at(-1).value;
 assert.equal(value('y^(-1)'),'0');assert.equal(value('asin(y)'),'0');assert.equal(value('acos(y)+x'),'1');
 assert(!calculateCalculus({expression:'y^2',variable:'x'},math).steps.at(-1).conditions.includes('y ≠ 0'));
});

test('constant-parameter antiderivatives preserve domains and inverse-trig derivatives stay stricter',()=>{
 for(const [expression,condition] of [['y^(-1)','y ≠ 0'],['asin(y)','-1 ≤ y ≤ 1']]){
  assert(calculateCalculus({expression,variable:'x',mode:'integral'},math).steps.every(s=>s.conditions.includes(condition)));
 }
 const derivative=calculateCalculus({expression:'asin(x)',mode:'derivative'},math).steps.at(-1);
 assert(derivative.conditions.includes('-1 ≤ x ≤ 1'));
 assert(derivative.conditions.includes('-1 < x < 1'));
 for(const expression of ['asin(2)+x','acos(-2)+x','0^0+x','0^(-1)+x'])assert.throws(()=>calculateCalculus({expression},math));
});
