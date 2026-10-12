import {TOPICS,makeProblem} from './fixtures/exact-problems.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {equivalent,checkStep} from '../dist/engine.js';
import {rational,factorPair,integerPairs,integerDivisors,multiples,expressionTargets,splitExpression} from '../dist/number-tools.js';

test('24 lists its four unordered positive integer pairs; signs are explicit',()=>{
 assert.deepEqual(integerPairs('24').map(p=>p.map(String)),[['1','24'],['2','12'],['3','8'],['4','6']]);
 assert.deepEqual(integerPairs('-24',true).map(p=>p.map(String)),[['-1','24'],['-2','12'],['-3','8'],['-4','6']]);
 assert.deepEqual(integerDivisors('24').map(String),['1','2','3','4','6','8','12','24']);
 assert.deepEqual(integerDivisors('1',true).map(String),['-1']);
 assert.deepEqual(integerPairs('2/3'),[]);
 assert.deepEqual(integerPairs('0'),[]);
});
test('rational factors and multiples stay exact, including negatives and zero',()=>{
 assert.deepEqual(factorPair('24','2/3').map(String),['2/3','36']);
 assert.deepEqual(factorPair('2/3','-5/7').map(String),['-5/7','-14/15']);
 assert.deepEqual(factorPair('0','1/2').map(String),['1/2','0']);
 assert.deepEqual(multiples('2/3',4).map(String),['2/3','4/3','2','8/3']);
 assert.equal(String(rational('-0.125')),'-1/8');
 assert.equal(String(rational('2/-3')),'-2/3');
 assert.throws(()=>factorPair('24','0'));
 for(const raw of ['1/0','NaN','1//2','1/2x','1e2',''])assert.throws(()=>rational(raw));
});
test('selection includes full coefficients and fractions without swallowing exponents',()=>{
 const {targets}=expressionTargets('x^2+24x+24');
 assert.deepEqual(targets.map(t=>[t.label,String(t.value)]),[['x^2','1'],['+24x','24'],['+24','24']]);
 assert.equal(String(expressionTargets('\\frac{2}{3}x^2+1').targets[0].value),'2/3');
 assert.deepEqual(expressionTargets('x/2/3').targets.map(t=>String(t.value)),['2','3']);
 assert.deepEqual(expressionTargets('x^(-12)+2').targets.map(t=>String(t.value)),['1','2']);
 assert.deepEqual(expressionTargets('x+').targets,[]);
});
test('every selected occurrence transforms in place and preserves the full expression',()=>{
 for(const raw of ['x^2+24x-24','-24x^2+24','24x+24','x/2/3','x/0.5','x^(-12)+2','(2+3)x+1','0','\\frac{2}{3}x^2+24','(x^2+24)/(x+2)']) {
  const {targets}=expressionTargets(raw);
  for(let i=0;i<targets.length;i++)for(const first of ['1/2','2/3','-3/7','4']) {
   const result=splitExpression(raw,i,first);
   assert(equivalent(raw,result),`${raw} -> ${result}`);
  }
 }
 const p={topic:'factor',expression:'x^2+24x+24',excluded:[]};
 const result=splitExpression(p.expression,1,'2/3');
 assert.equal(checkStep(result,p).ok,true);
 assert.equal(expressionTargets(result).targets.at(-1).value.toString(),'24');
 assert.throws(()=>splitExpression('24x',2,'1/2'));
});
test('all practice types accept the rational tool steps without new domain holes',()=>{
 for(const topic of TOPICS)for(let seed=1;seed<=25;seed++){
  const p=makeProblem(topic.id,0,seed,'standard'),{targets}=expressionTargets(p.expression);
  for(let i=0;i<targets.length;i++)for(const first of ['2/3','-5/7']) {
   const result=splitExpression(p.expression,i,first);
   assert.equal(checkStep(result,p).ok,true,JSON.stringify({p,result}));
  }
 }
});
