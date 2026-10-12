import test from 'node:test';
import assert from 'node:assert/strict';
import {PRACTICE_PROBLEMS,checkPractice,quantifiedStatement,logicStatement,LOGIC_TEMPLATES} from '../dist/learning-tools.js';
const p=id=>PRACTICE_PROBLEMS.find(p=>p.id===id);
test('all 13 practice answers match exact values and required forms',()=>{
 assert.equal(PRACTICE_PROBLEMS.length,13);
 for(const p of PRACTICE_PROBLEMS)assert.equal(checkPractice(p,Array.isArray(p.answer)?p.answer.join(','):p.answer).status,'correct',p.id);
});
test('all roots required, order and repeated roots do not change the solution set',()=>{
 assert.equal(checkPractice(p('roots-1'),'7, 1, 7').status,'correct');
 for(const answer of ['1','1, 7, 0','-1, 7'])assert.equal(checkPractice(p('roots-1'),answer).status,'incorrect');
 assert.equal(checkPractice(p('log-2'),'-9').status,'incorrect');
 assert.equal(checkPractice(p('log-2'),'x-x+9').status,'unverified');
});
test('equivalence alone does not complete factoring or expansion, and poles are not ignored',()=>{
 for(const [id,answer] of [['factor-1','x^2-2x-3'],['factor-1','(x^2-2x-3)*x/x'],['expand-1','(x+2)(x-3)'],['expand-1','x^2-2x+x-6']])assert.notEqual(checkPractice(p(id),answer).status,'correct',answer);
 assert.equal(checkPractice(p('factor-1'),'(x-3)(x+1)').status,'correct');
 assert.equal(checkPractice(p('expand-1'),'x^2-x-7').status,'incorrect');
 assert.equal(checkPractice(p('power-1'),'sqrt(16384)').status,'unverified');
 assert.equal(checkPractice(p('power-1'),'1/0').status,'unverified');
});
test('quantifier order and nested scope are preserved with declared domains',()=>{
 const a={quantifier:'∀',variable:'x',domain:'R'},b={quantifier:'∃',variable:'y',domain:'Z'};
 const s=quantifiedStatement([a,b],'y > x','y는 x보다 큽니다.');
 assert.equal(s.formula,'∀x ∈ ℝ (∃y ∈ ℤ (y > x))');
 assert.match(s.meaning,/모든 실수 x/);assert.match(s.meaning,/정수 y가 적어도 하나/);
 assert.equal(s.verification,'unverified');
 assert.notEqual(quantifiedStatement([b,a],'y > x','y는 x보다 큽니다.').formula,s.formula);
 assert.throws(()=>quantifiedStatement([a,{...b,variable:'x'}],'x>0','양수'),/서로 다른/);
 assert.throws(()=>quantifiedStatement([a],'x>0',''),/자연어/);
});
test('custom claims require domain and natural language and remain unverified',()=>{
 assert.throws(()=>logicStatement('','∀x P(x)','모든 x'),/모두/);
 assert.equal(logicStatement('x∈ℝ','∀x∈ℝ (x<0)','모든 실수는 음수').verification,'unverified');
 assert.match(LOGIC_TEMPLATES.find(x=>x.id==='factor').formula,/∃q ∈ ℤ/);
 assert.match(LOGIC_TEMPLATES.find(x=>x.id==='log').domain,/∖ \{1\}/);
});
