import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from 'mathjs';
import {normalizeMathText,parseCalculation,evaluateCalculation,applySubstitution} from '../dist/calculation.js';
const equation=String.raw`2\sin^2\theta=\sin\theta\cos\theta+\sin\theta`;
const value=(s,options={})=>evaluateCalculation(s,options,math).values[0];
test('typed and LaTeX trigonometric equations preserve both sides',()=>{const p=parseCalculation(equation,math);assert.equal(p.parts.length,2);assert.deepEqual(p.variables,['theta']);});
test('calculator respects radians, degrees, constants, complex values, and equation sides',()=>{
 assert(Math.abs(value('sin(30)',{unit:'deg'})-.5)<1e-14);assert(Math.abs(value('sin(pi/2)')-1)<1e-14);
 assert(Math.abs(value(String.raw`\sin^2\theta`,{unit:'deg',values:{theta:30}})-.25)<1e-14);
 assert(Math.abs(value('ln(e)+log(100)+log(8,2)')-6)<1e-12);
 assert.equal(value(String.raw`\frac{1}{2}+\sqrt{9}`),3.5);assert.equal(value('i^2').re,-1);
 assert.equal(value('sqrt(-1)').im,1);assert.equal(value('exp(0)'),1);
 const result=evaluateCalculation(equation,{unit:'deg',values:{theta:30}},math);assert.equal(result.texts.length,2);assert(result.difference.startsWith('-0.433'));assert(!('correct' in result));
 assert.throws(()=>value('1/0'));assert.throws(()=>value('tan(90)',{unit:'deg'}));assert.throws(()=>value('0^0'));assert.throws(()=>value('x+1'));assert.throws(()=>value('x+1',{values:{x:'pi'}}));
});
test('calculator only visits bounded arithmetic nodes and supported functions',()=>{
 for(const s of ['unknown=2','random()','import(2)','evaluate(2)','x[1]','x.constructor','[1,2]','1;2','1==1','sin(x)=2=3','1e999'])assert.throws(()=>parseCalculation(s,math),s);
 assert.throws(()=>parseCalculation('('.repeat(80)+'x'+')'.repeat(80),math));
});
test('substitution and reversal use complete structural expressions on both sides',()=>{
 const first=applySubstitution(equation,'sin(theta)','apply',math);assert.equal(first.count,3);assert.match(first.result,/t.*cos\(theta\).*t/);
 const restored=applySubstitution(first.result,'sin(theta)','restore',math).result;
 for(const theta of [0,30,90,180,300]){const a=evaluateCalculation(equation,{unit:'deg',values:{theta}},math).values,b=evaluateCalculation(restored,{unit:'deg',values:{theta}},math).values;assert.deepEqual(a,b);}
 assert.equal(applySubstitution('(x+6)^2-7','x+6','apply',math).result,'t ^ 2 - 7');
 const implicit=applySubstitution(String.raw`x(x+6)+6\left(x+6\right)`,'x+6','apply',math);
 assert.equal(implicit.count,2);assert.equal(value(implicit.result,{binding:'x+6',values:{x:2}}),64);
 assert.equal(value('2x(x+6)',{values:{x:2}}),32);
 assert.throws(()=>applySubstitution('x+6','x+5','apply',math));assert.throws(()=>applySubstitution('x+6','t+1','apply',math));
 assert(Math.abs(value('t^2',{binding:'sin(theta)',unit:'deg',values:{theta:30}})-.25)<1e-14);
});
test('exponents and variable-base logarithms accept keyboard and LaTeX forms with valid bases',()=>{
 assert.equal(value('16^(1/2)'),4);assert.equal(value('2^(-3)'),.125);assert(Math.abs(value('e^(ln(5))')-5)<1e-12);
 assert.equal(value(String.raw`\log_{2}\left(8\right)`),3);assert.equal(value('log_2(8)'),3);assert.equal(value(String.raw`\log_{\frac{1}{2}}{8}`),-3);
 for(const s of ['log(8,1)','log(8,0)','log(8,-2)','log(8,i)'])assert.throws(()=>value(s));
 assert.equal(value('ln(-1)').im,Math.PI);
});
