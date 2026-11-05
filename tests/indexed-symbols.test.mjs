import test from 'node:test';
import assert from 'node:assert/strict';
import * as fullMath from 'mathjs';
import math from '../src/math-runtime.js';
import * as MathLive from '../dist/vendor/mathlive-ssr.min.mjs';
import {parseCalculation,evaluateCalculation,normalizeMathText} from '../dist/calculation.js';
import {parseWorkspaceFormula} from '../dist/inequality-tools.js';
import {mathInput,directMath} from '../dist/direct-editor.js';
import {substituteMany,restoreAll} from '../dist/substitutions.js';
import {balanceEquation,simplifyEquationSide} from '../dist/equation-tools.js';
import {calculateCalculus} from '../dist/calculus-tools.js';
import {symbolicExpansion} from '../dist/symbolic-steps.js';
import {inputPad,pressInputKey} from '../dist/input-pad.js';
import {parseHTML} from 'linkedom';

test('numeric and letter subscripts stay atomic and distinct from bases and superscripts',()=>{
 const p=parseCalculation('a_1+a_{2}+a_n+a^1+a_1^2',math);
 assert.deepEqual(p.variables,['a_1','a_2','a_n','a']);
 assert.equal(p.parts[0],'a_1+a_2+a_n+a^1+a_1^2');
 assert.equal(evaluateCalculation('a_1+a_2+a^1+a_1^2',{values:{a_1:2,a_2:5,a:7}},fullMath).values[0],18);
 for(const raw of ['a_12','a_{12}','a _ { 12 }'])assert.equal(normalizeMathText(raw),'a_12');
 assert.deepEqual(parseCalculation('\\theta_{1}+i_1+e_n+pi_2',math).variables,['theta_1','i_1','e_n','pi_2']);
 assert.equal(normalizeMathText('a_1(x+1)'),'a_1*(x+1)');
 assert.deepEqual(parseCalculation('a_1*a_2',math).variables,['a_1','a_2']);
 assert.deepEqual(parseCalculation('a_{1}a_{2}',math).variables,['a_1','a_2']);
 assert.equal(evaluateCalculation('a_{1}2',{values:{a_1:3}},fullMath).values[0],6);
 assert.deepEqual(parseCalculation('2a_1(x+1)',math).variables,['a_1','x']);
 // Existing powers, function notation and logarithmic bases remain unchanged.
 for(const raw of ['a^1','a^{1}','a^(1)','x²','log_2(x)','\\log_{2}(x)','sin(theta)^2'])assert.doesNotThrow(()=>parseCalculation(raw,math));
});

test('unfinished, unsupported and unsafe subscripts are rejected without guessing their meaning',()=>{
 for(const raw of ['a_','a_{}','a_(1)','a_{n+1}','a_{1_2}','a_1_2','a_1a_2','a^1_2','a_{1234567890123}','a_{foo}','foo_1','a[1]','__proto__','a_1=import(1)'])assert.throws(()=>parseCalculation(raw,math),undefined,raw);
 assert.throws(()=>parseCalculation('a_{n+1}',math),/아래첨자.*아직 지원하지/);
});

test('indexed variables survive exact algebra, substitutions and polynomial inequalities',()=>{
 const change=substituteMany('a_1+a_2',{},'t','a_1','apply',math);
 assert.deepEqual(parseCalculation(change.value,math).variables,['t','a_2']);
 assert.deepEqual(parseCalculation(restoreAll(change.value,change.bindings,math),math).variables,['a_1','a_2']);
 assert.equal(simplifyEquationSide('a_1+a_1',math),'2a_1');
 const balanced=balanceEquation('a_1+1=3','subtract','1',{},math);
 assert.deepEqual(parseCalculation(balanced.steps.at(-1).value,math).variables,['a_1']);
 const expanded=symbolicExpansion('(a_1+a_2)^2',math).at(-1).value;
 assert.equal(evaluateCalculation(expanded,{values:{a_1:2,a_2:3}},fullMath).values[0],25);
 assert.deepEqual(parseWorkspaceFormula('a_{1}+a_2≤4',math).variables,['a_1','a_2']);
});

test('LaTeX, rendered formulas and calculus displays show real subscripts and round-trip the same variables',()=>{
 const previous=globalThis.window;globalThis.window={math,MathLive};try{
  for(const raw of ['a_1+a^1','a_12^2+a_n','sin(a_1)+log(a_2,2)','\\frac{a_{1}}{a_{2}}','theta_1+a_2≤4','a_1*a_2','2a_1','a_1 a_2','2a_1(x+1)']){
   const latex=mathInput(raw),original=parseWorkspaceFormula(raw,math),restored=parseWorkspaceFormula(latex,math);
   assert.deepEqual(restored.variables,original.variables,latex);
   assert(!latex.includes('\\_'),latex);assert.match(latex,/_\{/);
   assert.match(directMath(raw),/ML__/);assert(!directMath(raw).includes('ML__error'));
  }
  const result=calculateCalculus({expression:'a_1*x^2',variable:'x',mode:'derivative'},math);
  assert.match(result.steps[0].displayLatex,/a_\{1\}/);
  assert.deepEqual(parseCalculation(result.steps.at(-1).value,math).variables.sort(),['a_1','x']);
 }finally{globalThis.window=previous;}
});

test('the symbol keypad inserts an editable subscript slot beside existing exponent input',()=>{
 for(const prefix of ['work','direct','adv','balance','practice','board']){
  const {document}=parseHTML(inputPad(prefix,'symbol',true));
  assert.equal(document.querySelectorAll(`[data-${prefix}-key="_{}"]`).length,1);
  assert.equal(document.querySelector(`[data-${prefix}-key="_{}"]`).getAttribute('aria-label'),'아래첨자');
  assert.equal(document.querySelectorAll(`[data-${prefix}-key="^()"]`).length,1);
 }
 const f={value:'a',selectionStart:1,selectionEnd:1,focus(){},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
 pressInputKey(f,'_{}');assert.equal(f.value,'a_{}');assert.equal(f.selectionStart,3);
 pressInputKey(f,'1');pressInputKey(f,'→');pressInputKey(f,'^()');pressInputKey(f,'2');
 assert.equal(f.value,'a_{1}^(2)');assert.deepEqual(parseCalculation(f.value,math).variables,['a_1']);
 f.setSelectionRange(3,4);pressInputKey(f,'n');assert.equal(f.value,'a_{n}^(2)');
});
