import test from 'node:test';import assert from 'node:assert/strict';
import math from '../src/math-runtime.js';
import {parseCalculation} from '../dist/calculation.js';
import {parseWorkspaceFormula,balanceInequality,REAL_INEQUALITY_SCOPE} from '../dist/inequality-tools.js';
import {equivalent} from '../dist/engine.js';
const read=raw=>parseWorkspaceFormula(raw,math),change=(raw,op,operand,options={})=>balanceInequality(raw,op,operand,options,math);
const diff=value=>{const p=read(value);return `(${p.parts[0]})-(${p.parts[1]})`;};
test('single inequality relations and aliases survive parsing while the existing equation parser stays strict',()=>{
 for(const [raw,relation] of [['x<3','<'],['x<=3','≤'],['x>3','>'],['x>=3','≥'],['x≤3','≤'],['x≥3','≥'],['x\\leq 3','≤'],['x\\ge 3','≥'],['x\\lt 3','<']]){assert.equal(read(raw).relation,relation);assert.equal(read(read(raw).value).relation,relation);assert.throws(()=>parseCalculation(raw,math));}
 assert.equal(read('x=3').value,'x = 3');assert.equal(read('x+1').relation,null);
 for(const raw of ['0<x<3','x<y=2','x<>2','x==2','x≤','<3','sin(x)<2','i*x>1','1/x>0','x^0<1','x^(-1)<1','sqrt(x)>1','x^(1/2)>2','x/0>1'])assert.throws(()=>read(raw),raw);
});
test('four relations preserve exact side differences and reverse only under a negative rational multiplier or divisor',()=>{
 const reverse={'<':'>','>':'<','≤':'≥','≥':'≤'};
 for(const relation of Object.keys(reverse))for(const [op,operand,scale,negative] of [['add','x+1','1',false],['subtract','x-2','1',false],['multiply','1/2','1/2',false],['divide','0.5','2',false],['multiply','-2','-2',true],['divide','-1/2','-2',true]]){
  const raw=`2x+1 ${relation} 5`,result=change(raw,op,operand);assert.equal(result.branch,null);
  for(const step of result.steps){assert.equal(read(step.value).relation,negative?reverse[relation]:relation);assert(equivalent(diff(step.value),`(${diff(raw)})*(${scale})`),step.value);assert(step.conditions.includes(REAL_INEQUALITY_SCOPE));}
  if(negative)assert.match(result.steps[0].explanation,/음수.*뒤집히므로/);
 }
 assert.equal(change('x<3','multiply','-2',{simplify:false}).steps.length,1);
});
test('zero, undefined, complex and symbolic scale factors remain blocked even with a positive condition note',()=>{
 for(const op of ['multiply','divide'])for(const operand of ['0','-0','1-1','x','x-x','x+1','i','0/0','0^0','sin(x)'])assert.throws(()=>change('x≤3',op,operand,{assumptions:['x > 0'],condition:'∀x ∈ ℝ (x > 0)',bindings:{a:'2'}}),`${op} ${operand}`);
 assert.throws(()=>change('x<3','add','1/x'));
 assert.throws(()=>change('x<3','swap',''));
});
test('polynomial real scope includes explicit definitions without treating an unverified note as a proof',()=>{
 assert(change('a+x≤3','add','y',{bindings:{a:'x+1'}}).steps.length);
 for(const bindings of [{a:'i'},{a:'1/x'},{a:'sin(x)'},{a:'b+1',b:'i'}])assert.throws(()=>change('a+x≤3','subtract','1',{bindings}),JSON.stringify(bindings));
 assert.throws(()=>change('x<3','add','a',{bindings:{a:'i'}}));
});

test('numeric literals are never silently rounded by the Number-based display AST',()=>{
 for(const literal of ['9007199254740993','1.0000000000000001','1e-400']){
  assert.throws(()=>read(`${literal}*x<2`),/정밀도/);
  assert.throws(()=>change('x<3','multiply',literal),/정밀도/);
 }
 assert.equal(read('0.10*x≤2').relation,'≤');assert(change('x≤3','multiply','0.5').steps.length);
 assert.throws(()=>read('0x20000000000001*x<2'),/진법/);
 assert.throws(()=>change('a<3','add','1',{bindings:{a:'x^1.0000000000000001'}}),/정밀도/);
});
