import test from 'node:test';
import assert from 'node:assert/strict';
import {PRACTICE_PROBLEMS,checkPractice} from '../dist/learning-tools.js';
import {equivalent,parse,evaluate} from '../dist/engine.js';
import {lawCandidates} from '../dist/exponent-log.js';
import math from '../src/math-runtime.js';
import {practiceAdditions} from './fixtures/practice-additions.mjs';
const problem=id=>PRACTICE_PROBLEMS.find(p=>p.id===id);

for(const cases of practiceAdditions)test(`${cases.id}: equivalent answers, common mistakes and domain counterexamples use existing grading`,()=>{
 const p=problem(cases.id);assert(p.learning.level);assert(p.learning.prerequisites);assert(p.learning.hint);assert(p.condition);assert.equal(p.learning.steps.length,3);assert(p.learning.check);
 for(const answer of cases.correct)assert.equal(checkPractice(p,answer).status,'correct',answer);
 for(const answer of cases.wrong)assert.equal(checkPractice(p,answer).status,'incorrect',answer);
 for(const [answer,reason]of cases.unverified){const result=checkPractice(p,answer);assert.equal(result.status,'unverified',answer);assert.equal(result.reason,reason,answer);}
 for(const [answer,reason]of [['','empty'],['2+','invalid']])assert.equal(checkPractice(p,answer).reason,reason);
});

test('new polynomial and power explanations follow exact identities, including allowed zero points',()=>{
 for(const id of ['factor-4','expand-3','power-4']){
  const p=problem(id);for(const step of p.learning.steps)assert(equivalent(p.value,step.value),`${id}: ${step.value}`);
 }
 // These explicit counterexamples supplement the algebraic identities; sampling is not the proof.
 for(const x of [-2,0,2])assert(equivalent(problem('factor-4').value.replaceAll('x',`(${x})`),'0'));
 assert(equivalent(problem('expand-3').value.replaceAll('x','(0)'),'-8'));
 assert(equivalent(problem('expand-3').value.replaceAll('x','(2)'),'0'));
 assert(equivalent('(-2)^3/(-2)^5','(-8)/(-32)'));
 assert.throws(()=>evaluate(parse('0^3/0^5')));
 assert.throws(()=>evaluate(parse('0^(-2)')));
});

test('fraction-base logarithm has exactly the stated solution under its original domain',()=>{
 const p=problem('log-4');assert.deepEqual(p.answer,['6']);assert.equal(p.domainMinimum,'2');
 const conversion=lawCandidates(p.value,math).find(l=>l.title==='로그방정식을 지수식으로');assert(conversion);assert(conversion.conditions.includes('x - 2 > 0'));
 const residual=value=>{const [a,b]=value.split('=');return `(${a})-(${b})`;};
 assert(equivalent(residual(conversion.value),'x-6'));
 for(const step of p.learning.steps)assert(equivalent(residual(step.value),'x-6'));
 // log_(1/2)(x-2)=-2 iff x-2=(1/2)^(-2)=4 on x>2, hence the unique x=6.
 assert(equivalent('(1/2)^(-2)','4'));assert(equivalent('(1/2)^2','1/4'));
 for(const answer of ['2','1','6,2'])assert.match(checkPractice(p,answer).message,/정의역.*진수/);
 assert.match(checkPractice(p,'9/4').message,/해가 아닌/);
});

test('new IDs are distinct and stay in the existing five topics',()=>{
 assert.equal(new Set(PRACTICE_PROBLEMS.map(p=>p.id)).size,17);
 assert.deepEqual([...new Set(PRACTICE_PROBLEMS.map(p=>p.topic))],['인수분해','전개','지수','로그','방정식']);
 assert.deepEqual(PRACTICE_PROBLEMS.filter(p=>!p.learning).map(p=>p.id),['factor-1','factor-2','factor-3','expand-1','expand-2','power-1','power-2','power-3','log-1','log-2','log-3','roots-1','roots-2']);
});
