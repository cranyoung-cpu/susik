import test from 'node:test';
import assert from 'node:assert/strict';
import math from '../src/math-runtime.js';
import {parseWorkspaceFormula} from '../dist/inequality-tools.js';
import {inputFeedback} from '../dist/input-feedback.js';

test('rejected drafts get actionable feedback without rewriting their text',()=>{
 for(const [raw,expected] of [['(x+1',/1번째.*닫는 \)/],['x+1)',/4번째.*여는 괄호/],['(x+1}',/5번째.*대신 \)/],['\\frac{1}{2',/9번째.*닫는 \}/],['x^()',/지수가 비어/],['x/',/분모/],['x+',/연산 기호 뒤/],['x=',/오른쪽/]]){
  let failure;try{parseWorkspaceFormula(raw,math);}catch(err){failure=err;}
  assert(failure,raw);assert.match(inputFeedback(raw,failure),expected,raw);
 }
});
test('specific safety and support explanations stay intact; empty input is neutral',()=>{
 for(const raw of ['1/x<2','sin(x)<2','x<y<3','1.0000000000000001*x<2']){
  let failure;try{parseWorkspaceFormula(raw,math);}catch(err){failure=err;}
  assert(failure);assert.equal(inputFeedback(raw,failure),failure.message);
 }
 assert.equal(inputFeedback('  ',Error('empty')),'');
 assert.match(inputFeedback('x',Error('Unexpected token')),/입력한 수식/);
});
