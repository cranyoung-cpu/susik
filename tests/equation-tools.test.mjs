import test from 'node:test';import assert from 'node:assert/strict';import * as math from 'mathjs';
import {balanceEquation,transposeTerms,equationTerms,balanceSuggestions} from '../dist/equation-tools.js';
import {equivalent} from '../dist/engine.js';
const change=(raw,op,v,options={})=>balanceEquation(raw,op,v,options,math),last=c=>c.steps.at(-1).value;
const difference=value=>{const p=value.split('=');return `(${p[0]})-(${p[1]})`;};
test('same operation reaches both sides and preserves the exact equation relation',()=>{for(const [op,value,scale]of [['add','-3','1'],['subtract','x+1','1'],['multiply','2','2'],['divide','2','1/2']]){const raw='2x^2-16x+14=0',c=change(raw,op,value);for(const step of c.steps)assert(equivalent(difference(step.value),`(${difference(raw)})*(${scale})`));assert.equal(c.branch,null);}});
test('quadratic path supports dividing coefficient, transposing and completing square',()=>{const a=change('2x^2-16x+14=0','divide','2');assert.equal(last(a),'x^{2}-8x+7 = 0');const b=transposeTerms(last(a),0,[2],{},math);assert.equal(last(b),'x^{2}-8x = -7');const suggestions=balanceSuggestions(last(b),math);assert.deepEqual(suggestions,[{operation:'add',operand:'16',label:'완전제곱에 필요한 수 더하기'}]);assert.equal(last(change(last(b),'add','16')),'x^{2}-8x+16 = 9');});
test('a variable divisor retains the zero case and never silently loses a root',()=>{const c=change('x^2=x','divide','x');assert.equal(last(c),'x = 1');assert.deepEqual(c.steps.at(-1).conditions,['x ≠ 0']);assert.equal(c.branch.equation,'x^2=x');assert.equal(c.branch.condition,'x = 0');assert.equal(c.branch.candidate,'x = 0');assert.match(c.branch.note,/양변이 같습니다/);assert.equal(change('x^2=x','divide','x',{assumptions:['x ≠ 0']}).branch,null);});
test('multiplication by a variable also keeps an equivalence branch and rejects zero multipliers',()=>{const c=change('x=1','multiply','x');assert(c.branch);assert(c.steps[0].conditions.includes('x ≠ 0'));assert.match(c.branch.note,/해가 아닙니다/);for(const op of ['multiply','divide'])for(const v of ['0','x-x','a-a'])assert.throws(()=>change('x^2=1',op,v),/0/);});
test('transposition preserves signs, simultaneous terms, parentheses and selected side',()=>{for(const [raw,side,ids]of [['x^2-5x+6=0',0,[1]],['x^2=3x-2',1,[0,1]],['x+(x+1)=2',0,[1]],['-(x+1)+x=2',0,[0]]]){const c=transposeTerms(raw,side,ids,{},math);assert(equivalent(difference(last(c)),difference(raw)));}assert.equal(equationTerms('x+(x+1)=2',math)[0].length,2);assert.throws(()=>transposeTerms('x=2',0,[],{},math));});
test('original denominator conditions survive simplification and redundant branches are avoided',()=>{const c=change('(x^2-1)/(x-1)=2','simplify');assert.equal(last(c),'x+1 = 2');assert(c.steps[0].conditions.includes('x - 1 ≠ 0'));assert.equal(change('1/x=2','divide','x').branch,null);assert.throws(()=>change('x/0=1','add','1'),/분모가 0/);assert.throws(()=>change('x=1','add','1/x'),/다항식/);});
test('polynomial operands and per-side simplification work with user variable names',()=>{assert.equal(last(change('2a^2+4a=6','divide','2')),'a^{2}+2a = 3');const c=change('a+b=2','subtract','a');assert.equal(math.simplify(c.steps.at(-1).value.split('=')[0]).toString(),'b');assert.equal(change('x=2','swap').steps[0].value,'2 = x');assert.equal(change('x^2=2','add','1',{simplify:false}).steps.length,1);});

test('saved definitions cannot hide a zero divisor or introduce a new variable denominator',()=>{
 for(const bindings of [{t:'0'},{t:'x-x'},{t:'u-u',u:'x+1'},{t:'u',u:'0'}])for(const op of ['multiply','divide'])assert.throws(()=>change('x=1',op,'t',{bindings}),/0/);
 for(const op of ['add','subtract','multiply','divide','simplify','swap'])assert.throws(()=>change('x/t=1',op,'1',{bindings:{t:'0'}}),/분모가 0/);
 assert.throws(()=>change('x=1','add','t',{bindings:{t:'1/x'}}),/다항식/);
 for(const t of ['2','-2','1/2']){const c=change('x=1','divide','t',{bindings:{t}});assert.equal(c.branch,null);assert(c.steps[0].value.includes('t'));}
 const unknown=change('x=1','divide','t',{bindings:{t:'x+1'}});assert(unknown.branch);assert(unknown.steps[0].conditions.includes('t ≠ 0'));
 const restoredDomain=change('t-t=0','simplify','',{bindings:{t:'1/x'}});assert.equal(last(restoredDomain),'0 = 0');assert(restoredDomain.steps[0].conditions.includes('x ≠ 0'));
});
test('removing square-root terms retains their original domain, including through definitions',()=>{
 for(const c of [change('sqrt(x)-sqrt(x)=0','simplify'),transposeTerms('sqrt(x)=sqrt(x)',0,[0],{},math),change('t-t=0','simplify','',{bindings:{t:'sqrt(x)'}})]){assert.equal(last(c),'0 = 0');assert(c.steps.at(-1).conditions.some(s=>/sqrt\(x\).*실수 계산: x ≥ 0/.test(s)));}
 const complex=change('sqrt(-1)-sqrt(-1)=0','simplify');assert.equal(last(complex),'0 = 0');assert(complex.steps[0].conditions.every(s=>s.includes('실수 계산:')));
 for(const raw of ['x/0=1','x/sqrt(0)=1'])assert.throws(()=>change(raw,'add','1'),/분모가 0/);
 for(const op of ['multiply','divide'])assert.throws(()=>change('sqrt(0)=x',op,'sqrt(0)',{existingTerm:true}),/0/);
});
test('equation operations do not round source, operand or saved-definition numeric literals',()=>{
 for(const value of ['9007199254740993','1.0000000000000001','1e-400']){
  assert.throws(()=>change(`x=${value}`,'subtract','x'),/정밀도/);
  assert.throws(()=>change('x=1','divide',value),/정밀도/);
  assert.throws(()=>change('t=1','simplify','',{bindings:{t:value}}),/정밀도/);
 }
 for(const value of ['0','9007199254740992','0.1','1e-10','1/3'])assert.doesNotThrow(()=>change(`x=${value}`,'swap'));
 assert.throws(()=>change('x=0x10','simplify'),/십진수/);
});
