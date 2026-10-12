import test from 'node:test';
import assert from 'node:assert/strict';
import {powerFormDirectTerm,powerFormChoices} from '../dist/power-forms.js';
import {equivalent} from '../dist/engine.js';
import {directChoices} from '../dist/direct-choices.js';
import {mathInput} from '../dist/direct-editor.js';
test('power form preserves a selected negative sign and every unselected term',()=>{
 const squared=powerFormDirectTerm('t^2-4',1,'2',{binding:'x-1'});
 assert.equal(squared.formed,String.raw`-\left(2\right)^{2}`);assert(squared.result.startsWith('t^2'));assert(equivalent('t^2-4',squared.result,'x-1'));
 const cubed=powerFormDirectTerm('-8+x',0,3);assert.equal(cubed.formed,String.raw`\left(-2\right)^{3}`);assert(cubed.result.endsWith('+x'));assert(equivalent('-8+x',cubed.result));
});
test('power forms use exact rational and complex roots, including monomial degrees',()=>{
 for(const [raw,id,n] of [['(9/16)x^4+1',0,2],['(3+4i)x^2+7',0,2],['2ix^2-1',0,2],['64x^6+2',0,3],['0+x',0,2]]){
  const change=powerFormDirectTerm(raw,id,n);assert(equivalent(raw,change.result));
 }
 assert(directChoices('t^2-4',[1],'powerForm',null,{binding:'x'}).some(c=>c.value==='2'));
 assert(powerFormChoices('64',0).some(c=>c.value==='6'));
});
test('power forms reject unsupported exponents and roots instead of approximating identities',()=>{
 for(const n of ['0','-2','1','2.5','13','2x'])assert.throws(()=>powerFormDirectTerm('4',0,n));
 assert.throws(()=>powerFormDirectTerm('x^3',0,2));assert.throws(()=>powerFormDirectTerm('2',0,2));assert.throws(()=>powerFormDirectTerm('i',0,2));
});
test('braced exponents are already LaTeX and never reinterpreted as literal braces',()=>{
 globalThis.window={MathLive:{convertAsciiMathToLatex:raw=>'ascii:'+raw}};
 assert.equal(mathInput('t^{2}-4'),'t^{2}-4');assert.equal(mathInput('x^2+1'),'ascii:x^2+1');delete globalThis.window;
});
