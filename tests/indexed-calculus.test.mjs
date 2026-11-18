import test from 'node:test';import assert from 'node:assert/strict';
import * as fullMath from 'mathjs';
import math from '../src/math-runtime.js';
import {calculateCalculus} from '../dist/calculus-tools.js';
import {calculusVariableOptions} from '../dist/advanced-input.js';
import {parseCalculation} from '../dist/calculation.js';

test('indexed variables work as differentiation and integration variables, not only parameters',()=>{
 for(const variable of ['a_1','theta_2','i_1','c']){
  const result=calculateCalculus({expression:`${variable}^3`,variable,mode:'derivative'},math);
  assert.equal(parseCalculation(result.steps.at(-1).value,fullMath).nodes[0].evaluate({[variable]:2}),12);
  if(variable.includes('_'))assert.match(result.steps[0].displayLatex,/_\{[12]\}/);
  const second=calculateCalculus({expression:`${variable}^3`,variable,mode:'derivative',order:2},math);
  assert.equal(parseCalculation(second.steps.at(-1).value,fullMath).nodes[0].evaluate({[variable]:2}),12);
  const integral=calculateCalculus({expression:`${variable}^2`,variable,mode:'integral'},math);
  assert.match(integral.steps.at(-1).value,variable==='c'?/\+ k$/:/\+ c$/);
  const definite=calculateCalculus({expression:`${variable}^2`,variable,mode:'definite',lower:'0',upper:'1'},math);
  assert.equal(parseCalculation(definite.steps.at(-1).value,fullMath).nodes[0].evaluate(),1/3);
 }
 for(const variable of ['e','pi','i','a_{1}','__proto__','a_1_2','foo'])assert.throws(()=>calculateCalculus({expression:'x^2',variable},math),undefined,variable);
});
test('variable choices discover completed indexed symbols and retain selection during incomplete edits',()=>{
 const choices=e=>calculusVariableOptions(e,math).map(([v])=>v);
 assert(choices({expression:'a_{1}^2+theta_2',variable:'x'}).includes('a_1'));
 assert(choices({expression:'a_{1}^2+theta_2',variable:'x'}).includes('theta_2'));
 assert(choices({expression:'a_1+',variable:'a_1'}).includes('a_1'));
 for(const reserved of ['e','pi','i'])assert(!choices({expression:'x',variable:'x'}).includes(reserved));
});
