import test from 'node:test';
import assert from 'node:assert/strict';
import {directChoices} from '../dist/direct-choices.js';
import {splitDirectTerm} from '../dist/direct-tools.js';
import {equivalent} from '../dist/engine.js';
import {transformationTargets,commonDenominator,cancelFraction} from '../dist/transform-tools.js';
import {pressInputKey} from '../dist/input-pad.js';
test('tap split candidates retain exact coefficients and unselected terms',()=>{
 for(const [raw,id] of [['2x^2-16x+14',1],['(2/3)x+7',0],['(2+3i)x^2+7',0]])for(const mode of ['sum','product']){
  const choices=directChoices(raw,[id],mode,null);assert(choices.length>0&&choices.length<=16);
  for(const c of choices){const result=splitDirectTerm(raw,id,c.value,mode).result;assert(equivalent(raw,result));assert(result.endsWith(raw.endsWith('14')?'+14':'+7'));}
 }
 assert(directChoices('2x^2-16x+14',[1],'sum',null).some(c=>c.value==='-14'));
 assert.equal(directChoices('24',[0],'product',null).filter(c=>['1','2','3','4'].includes(c.value)).length,4);
});
test('tap fraction choices are accepted by the original exact transformation engine',()=>{
 for(const [raw,mode,fn] of [['x/2+1/3','common',commonDenominator],['(x^2-9)/(x-3)','cancel',cancelFraction]]){
  const target=transformationTargets(raw,mode).targets[0],problem={excluded:[3]};
  const choices=directChoices(raw,[],mode,target.id,problem);assert(choices.length);for(const c of choices)assert(equivalent(raw,fn(raw,target.id,c.value,problem)));
 }
});
test('calculator buttons replace selected text, preserve cursor and enforce the input bound',()=>{
 const field={value:'12+34',selectionStart:3,selectionEnd:5,focus(){},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}};
 pressInputKey(field,'7');assert.equal(field.value,'12+7');assert.equal(field.selectionStart,4);
 pressInputKey(field,'⌫');assert.equal(field.value,'12+');pressInputKey(field,'sin()');assert.equal(field.value,'12+sin()');assert.equal(field.selectionStart,7);
 pressInputKey(field,'2');assert.equal(field.value,'12+sin(2)');pressInputKey(field,'AC');assert.equal(field.value,'');
 pressInputKey(field,'123',2);assert.equal(field.value,'');pressInputKey(field,'1');pressInputKey(field,'±');assert.equal(field.value,'-(1)');pressInputKey(field,'±');assert.equal(field.value,'1');
});
