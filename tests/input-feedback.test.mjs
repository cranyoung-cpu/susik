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
 for(const raw of ['1/x<2','sin(x)<2','x<y<3','1.0000000000000001*x<2','integral()','foo(x)']){
  let failure;try{parseWorkspaceFormula(raw,math);}catch(err){failure=err;}
  assert(failure);assert.equal(inputFeedback(raw,failure),failure.message);
 }
 assert.equal(inputFeedback('  ',Error('empty')),'');
 assert.match(inputFeedback('x',Error('Unexpected token')),/입력한 수식/);
});

test('missing operands and empty supported functions identify the original character and a manual correction',()=>{
 for(const [raw,expected] of [['=3',/1번째.*= 왼쪽.*x\+1=3/],[' ≤ 4',/2번째.*≤ 왼쪽/],['x+*2',/3번째.*\* 앞.*식이 없습니다/],['x/ /2',/4번째.*\/ 앞/],['x**2',/3번째.*\* 앞/],['(x+)/2',/3번째.*\+ 뒤/],['sqrt()',/5번째.*sqrt.*비어.*sqrt\(x\+1\)/],[' sin( )',/5번째.*sin.*비어/]]){
  let failure;try{parseWorkspaceFormula(raw,math);}catch(err){failure=err;}
  assert(failure,raw);assert.match(inputFeedback(raw,failure),expected,raw);
 }
 // Unary signs are valid operands, including after multiplication or division.
 for(const raw of ['x+-2','x*-2','x/+2','x--2','sqrt(x+1)','sin(theta)'])assert.doesNotThrow(()=>parseWorkspaceFormula(raw,math));
});

test('rejected full-width operators and a pasted root sign explain how to type them without accepting or rewriting them',()=>{
 for(const [raw,position,symbol,replacement] of [['x＋1',2,'＋','+'],[' x＝1',3,'＝','='],['x－1',2,'－','-'],['x＊2',2,'＊','*'],['x／2',2,'／','/'],['x＾2',2,'＾','^'],['√(x)',1,'√','sqrt(식)']]){
  let failure;try{parseWorkspaceFormula(raw,math);}catch(err){failure=err;}
  assert(failure,raw);const feedback=inputFeedback(raw,failure);assert(feedback.includes(`${position}번째 글자의 ${symbol}`));assert(feedback.includes(replacement));assert.match(feedback,/수식 키패드/);
  assert.throws(()=>parseWorkspaceFormula(raw,math));
 }
});
