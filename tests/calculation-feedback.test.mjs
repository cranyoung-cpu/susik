import test from 'node:test';import assert from 'node:assert/strict';
import {checkStep,Q} from '../dist/engine.js';
import {checkPractice,PRACTICE_PROBLEMS,PRACTICE_CRITERIA_VERSION} from '../dist/learning-tools.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';
const p=id=>PRACTICE_PROBLEMS.find(p=>p.id===id);

test('known input errors carry their actual cause through engine and practice feedback',()=>{
 for(const [answer,reason,wording] of [['sqrt(16384)','unsupported',/자동 확인 범위 밖.*직접 확인/],['2^13','unsupported',/−12부터 12/],['999999999999^12*999999999999^12','unsupported',/계산 가능한 수/],['2+','invalid',/표기를 확인/],['(2','invalid',/괄호/],['1/0','undefined',/분모가 0/],['0^0','undefined',/0의 0제곱/]]){
  const step=checkStep(answer,{expression:'128',excluded:[]});assert.equal(step.ok,false);assert.equal(step.status,reason,answer);assert.equal(step.reason,reason);assert.match(step.message,wording);
  const feedback=checkPractice(p('power-1'),answer);assert.equal(feedback.status,'unverified');assert.equal(feedback.reason,reason,answer);assert.match(feedback.message,wording);assert.equal(feedback.criteriaVersion,PRACTICE_CRITERIA_VERSION);
  if(reason!=='unsupported')assert.doesNotMatch(feedback.message,/자동 확인 범위 밖/);
 }
 assert.equal(checkPractice(p('power-1'),'').reason,'empty');
 assert.equal(checkPractice(p('factor-1'),'(x-3)*(x+1)*x/x').reason,'domain');
});
test('incorrect values, domains and answer forms remain incorrect instead of being called unsupported',()=>{
 for(const [id,answer]of [['power-1','127'],['log-2','1'],['roots-1','1'],['power-2','3^(-2)'],['expand-1','x^2-x-7']]){
  const feedback=checkPractice(p(id),answer);assert.equal(feedback.status,'incorrect');assert.doesNotMatch(feedback.message,/자동 확인 범위 밖|처리.*실패|문제가 발생/);
 }
 for(const problem of PRACTICE_PROBLEMS)assert.equal(checkPractice(problem,Array.isArray(problem.answer)?problem.answer.join(','):problem.answer).status,'correct');
});
test('unexpected evaluator failures are not inferred from their message or labelled unsupported',t=>{
 t.mock.method(Q.prototype,'mul',()=>{throw Error('이 버전에서는 계산을 지원하지 않습니다.');});
 const step=checkStep('128',{expression:'128',excluded:[]});assert.equal(step.status,'error');assert.equal(step.ok,false);assert.match(step.message,/문제가 발생.*다시 시도/);assert.doesNotMatch(step.message,/지원하지|범위 밖/);
 const feedback=checkPractice(p('power-1'),'128');assert.equal(feedback.status,'unverified');assert.equal(feedback.reason,'error');assert.match(feedback.message,/정답·오답은 판정하지 않았/);
});
test('missing problem data reports a processing failure, while optional reason survives backup v1',()=>{
 assert.equal(checkPractice(null,'128').reason,'error');
 assert.equal(checkPractice({...p('power-1'),answer:undefined},'128').reason,'error');
 const old={status:'unverified',message:'이전 미검증',criteriaVersion:PRACTICE_CRITERIA_VERSION};
 for(const feedback of [old,checkPractice(p('power-1'),'sqrt(16384)'),checkPractice(p('power-1'),'2+'),checkPractice(null,'128')]){
  const book={rows:[{value:'128',practiceAnswer:'128',practiceFeedback:feedback}],active:0},text=serializeBackup(book);assert.equal(JSON.parse(text).version,1);assert.deepEqual(parseBackup(text),book);
 }
 assert.throws(()=>serializeBackup({rows:[{value:'128',practiceFeedback:{...old,reason:{bad:true}}}],active:0}));
});
