import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from 'mathjs';
import math from '../src/math-runtime.js';
import {calculateCalculus} from '../dist/calculus-tools.js';

test('exact trigonometric zeros and tangent poles are rejected before constant terms disappear',()=>{
 for(const expression of ['1/sin(pi)+x','1/cos(pi/2)+x','ln(sin(pi))+x','tan(pi/2)+x','tan(-pi/2)+x','tan(3*pi/2)+x','0*tan(pi/2)+x']){
  for(const mode of ['derivative','integral','definite'])assert.throws(()=>calculateCalculus({expression,mode,lower:'0',upper:'1'},math),undefined,`${mode}: ${expression}`);
 }
});
test('exact trig bounds work and singular bounds cannot enter a definite integral',()=>{
 const result=calculateCalculus({expression:'x',mode:'definite',lower:'sin(pi)',upper:'cos(2*pi)'},math);
 assert.equal(evaluate(result.steps.at(-1).value),0.5);
 for(const lower of ['tan(pi/2)','1/sin(pi)','ln(sin(pi))'])assert.throws(()=>calculateCalculus({expression:'x',mode:'definite',lower,upper:'1'},math));
});
test('nearby nonsingular angles are not rejected by a floating-point tolerance',()=>{
 for(const expression of ['1/sin(pi+0.001)+x','tan(pi/2+0.001)+x','tan(pi)+x','cos(pi/2)+x','sin(-pi)+x']){
  const result=calculateCalculus({expression,mode:'derivative'},math);
  assert.equal(result.steps.at(-1).value,'1',expression);
 }
 assert.equal(calculateCalculus({expression:'sin(x)',mode:'definite',lower:'0',upper:'pi'},math).steps.at(-1).value,'2');
});
