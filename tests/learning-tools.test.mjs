import test from 'node:test';
import assert from 'node:assert/strict';
import {PRACTICE_PROBLEMS,checkPractice,quantifiedStatement,logicStatement,LOGIC_TEMPLATES,PRACTICE_CRITERIA_VERSION,practiceNeedsReview} from '../dist/learning-tools.js';
import {equivalent} from '../dist/engine.js';
import {lawCandidates} from '../dist/exponent-log.js';
import {balanceEquation} from '../dist/equation-tools.js';
import math from '../src/math-runtime.js';
const p=id=>PRACTICE_PROBLEMS.find(p=>p.id===id);
test('criteria versions label explicit checks without regrading stored feedback',()=>{
 for(const answer of ['1','2','0^0']){const result=checkPractice(p('log-3'),answer);assert.equal(result.criteriaVersion,PRACTICE_CRITERIA_VERSION);assert.equal(practiceNeedsReview(result),false);}
 assert.equal(practiceNeedsReview(null),false);assert.equal(practiceNeedsReview(undefined),false);
 for(const criteriaVersion of [undefined,null,'older','future']){
  const feedback={status:'correct',message:'이전 판정',...(criteriaVersion!==undefined?{criteriaVersion}:{})},before=structuredClone(feedback);
  assert.equal(practiceNeedsReview(feedback),true);assert.deepEqual(feedback,before);
 }
});
test('all 13 practice answers match exact values and required forms',()=>{
 assert.equal(PRACTICE_PROBLEMS.length,13);
 for(const p of PRACTICE_PROBLEMS)assert.equal(checkPractice(p,Array.isArray(p.answer)?p.answer.join(','):p.answer).status,'correct',p.id);
});
test('the 13 reference answers agree with original polynomials, complete root factorizations and log definitions',()=>{
 for(const problem of PRACTICE_PROBLEMS.filter(p=>['factor','expand'].includes(p.kind)))assert(equivalent(problem.value,problem.answer),problem.id);
 for(const id of ['power-1','power-2','power-3'])assert(equivalent(p(id).value,p(id).answer),id);
 // Factoring the entire quadratic proves completeness, including the repeated root.
 assert(equivalent(p('roots-1').value.split('=')[0],'2*(x-1)*(x-7)'));
 assert(equivalent(p('roots-2').value.split('=')[0],'(x+3)*(x+3)'));
 assert.deepEqual(p('roots-1').answer,['1','7']);assert.deepEqual(p('roots-2').answer,['-3']);
 assert.equal(2n**BigInt(p('log-1').answer),8n);
 assert.equal(BigInt(p('log-2').answer[0])-1n,2n**3n);
 const natural=lawCandidates(p('log-3').value,math).find(l=>l.title==='로그방정식을 지수식으로');
 assert.equal(natural.value,'x = e ^ 0');assert(natural.conditions.includes('x > 0'));
 assert.equal(lawCandidates(natural.value,math).find(l=>l.title==='0제곱').value,'x = 1');assert.deepEqual(p('log-3').answer,['1']);
});
test('undefined constants never become correct scalar or root answers through cancellation',()=>{
 for(const [id,answer]of [['log-3','0^0'],['log-3','(1-1)^0'],['log-2','9+(0^0-1)'],['power-1','128*0^0'],['power-2','1/(9*0^0)'],['roots-1','1,7,1/0']])assert.equal(checkPractice(p(id),answer).status,'unverified',answer);
 for(const answer of ['1/0','0/0','0^(-1)','(1/0)^0'])assert.equal(checkPractice(p('log-3'),answer).status,'unverified',answer);
 assert.match(checkPractice(p('log-3'),'0^0').message,/0의 0제곱/);
 assert.equal(checkPractice(p('log-3'),'2^0').status,'correct');
});
test('negative exponent exercise requires a fraction, while equivalent integer fractions remain valid',()=>{
 for(const answer of ['1/9','2/18','(-1)/(-9)','-(-1/9)',String.raw`\frac{2}{18}`])assert.equal(checkPractice(p('power-2'),answer).status,'correct',answer);
 for(const answer of ['3^(-2)','9^(-1)','1/(3^2)']){const r=checkPractice(p('power-2'),answer);assert.equal(r.status,'incorrect');assert.match(r.message,/값은 같지만.*분수/);}
 assert.equal(checkPractice(p('power-2'),'1/8').status,'incorrect');
 assert.equal(checkPractice(p('power-2'),'sqrt(1/81)').status,'unverified');
});
test('root feedback distinguishes domain boundaries, missing roots and extraneous candidates exactly',()=>{
 for(const [id,values]of [['log-2',['1','0','-9','9,1']],['log-3',['0','-1','1,0']]])for(const answer of values){const r=checkPractice(p(id),answer);assert.equal(r.status,'incorrect');assert.match(r.message,/정의역.*진수/);}
 assert.match(checkPractice(p('log-2'),'1+1/1000000000').message,/해가 아닌/);
 assert.match(checkPractice(p('roots-1'),'1').message,/입력한 값은 해이지만 다른 해가 빠져/);
 assert.match(checkPractice(p('roots-1'),'1,7,2').message,/해가 아닌 값/);
 assert.equal(checkPractice(p('roots-1'),'7,2/2,1').status,'correct');
 assert.equal(checkPractice(p('roots-1'),String.raw`{\frac{2}{2}, 7}`).status,'correct');
 assert.equal(checkPractice(p('log-2'),String.raw`x=\frac{18}{2}`).status,'correct');
 assert.equal(checkPractice(p('log-2'),'9{}').status,'unverified');
 assert.equal(checkPractice(p('roots-2'),'-3,-3').status,'correct');
});
test('known unfinished factoring and expansion are form errors, not unsupported inputs',()=>{
 for(const [id,answer]of [['factor-1','x^2-2x-3'],['factor-2','2*(x^2-8*x+7)'],['expand-1','(x+2)(x-3)'],['expand-2','4*x^2-2*x-2*x+1']]){const r=checkPractice(p(id),answer);assert.equal(r.status,'incorrect');assert.match(r.message,/값은 같지만.*답 형식/);}
 assert.equal(checkPractice(p('factor-1'),'(x-3)*(x+1)*x/x').status,'unverified');
});
test('logarithmic equivalences keep domains and quadratic division keeps a possible lost root',()=>{
 const logarithm=lawCandidates(p('log-2').value,math).find(l=>l.title==='로그방정식을 지수식으로');
 assert(logarithm.conditions.includes('x - 1 > 0'));
 for(const expression of ['log(8,0)','log(8,1)','log(8,-2)','log(0,2)','log(-8,2)','log(0^0,2)','(0^0)^2','log(1/(1-1),2)','log(0^(-1),2)','2^3/(1-1)'])assert.deepEqual(lawCandidates(expression,math),[],expression);
 const divided=balanceEquation(p('roots-1').value,'divide','x-1',{},math);
 assert(divided.steps[0].conditions.includes('x-1 ≠ 0'));assert.equal(divided.branch.candidate,'x = 1');assert.match(divided.branch.note,/양변이 같습니다/);
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
