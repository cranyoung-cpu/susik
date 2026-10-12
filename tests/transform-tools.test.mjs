import test from 'node:test';
import assert from 'node:assert/strict';
import {equivalent,checkStep,C,Q,parse,normalize} from '../dist/engine.js';
import {complex,factorPair,expressionTargets,splitExpression,splitSumExpression} from '../dist/number-tools.js';
import {transformationTargets,commonDenominator,commonSuggestions,cancelSuggestions,cancelFraction,expandPart,splitPower} from '../dist/transform-tools.js';
const id=(raw,mode,index=0)=>transformationTargets(raw,mode).targets[index].id;

test('complex arithmetic uses exact rational real and imaginary parts',()=>{
 assert.deepEqual(factorPair('24','1+i').map(String),['1+i','12-12i']);
 assert.equal(String(complex('1/2+3/4i').inv()),'8/13-12/13i');
 assert.equal(String(complex('i').mul(complex('i'))),'-1');
 assert.equal(String(complex('i').inv()),'-i');
 assert(equivalent('(x+i)(x-i)','x^2+1'));
 assert.equal(checkStep('(x+i)(x-i)',{topic:'factor',expression:'x^2+1',excluded:[]}).ok,true);
 assert(!equivalent('(x+i)^2','x^2+1'));
 assert.throws(()=>complex('x+i'));
 assert.throws(()=>factorPair('24','i-i'));
 assert.throws(()=>new C(0).inv());
 for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)if(a||b){const z=new C(new Q(a,3),new Q(b,7));assert(z.mul(z.inv()).eq(new C(1)));assert(z.add(z.neg()).zero);}
});
test('complex coefficients are selected as whole values and repeated occurrences remain separate',()=>{
 const raw='(1+i)x^2+3ix+(1/2-2/3i)';
 assert.deepEqual(expressionTargets(raw).targets.map(t=>String(t.value)),['1+i','3i','1/2-2/3i']);
 for(const value of ['1+i','i','-2/3+3/4i'])for(let i=0;i<3;i++)assert(equivalent(raw,splitExpression(raw,i,value)));
 const repeated='24x+24';assert(equivalent(splitExpression(repeated,1,'1+i'),repeated));
});
test('splitting a term preserves signs, powers, complex coefficients and all other terms',()=>{
 for(const raw of ['x^2+5x+6','-5x^2+6','5x-5x','(1+i)x+6','x/2+1','x^2','0'])for(let i=0;i<expressionTargets(raw).targets.length;i++)for(const first of ['0','2','-3','1/2','1+i']){
  const result=splitSumExpression(raw,i,first);assert(equivalent(raw,result),`${raw} -> ${result}`);
 }
 const split=normalize(splitSumExpression('x^2+5x+6',1,'2'));assert.equal(split,'x^2+2x+3x+6');
});
test('sum splitting includes the subtraction sign and retains two separate signed terms',()=>{
 const raw='2x^2-16x+14';
 assert.equal(splitSumExpression(raw,1,'-14'),'2x^2-14x-2x+14');
 assert.equal(splitSumExpression(raw,1,'-2'),'2x^2-2x-14x+14');
 assert.equal(splitSumExpression(raw,1,'2'),'2x^2+2x-18x+14');
 assert.equal(splitSumExpression('-16x+14',0,'-14'),'-14x-2x+14');
 assert.equal(splitSumExpression('x-x+7',1,'-2'),'x-2x+x+7');
 assert.equal(splitSumExpression('2x^2-16*x+14',1,'-14'),'2x^2-14x-2x+14');
 assert.equal(splitSumExpression('2x^2-16x-16x+14',2,'-14'),'2x^2-16x-14x-2x+14');
 const fractional=splitSumExpression('2x^2-\\frac{3}{2}x+14',1,'-1');
 assert.equal(normalize(fractional),'2x^2-x-((1)/(2))x+14');
 assert(equivalent(fractional,'2x^2-3/2x+14'));
 const imaginary=splitSumExpression('2x^2-(1+i)x+14',1,'-i');
 assert(equivalent(imaginary,'2x^2-(1+i)x+14'));
 assert.match(imaginary,/-ix-x/);
});
test('source positions include groups and select the requested nested expression only',()=>{
 const raw='7+(x+2)(x+3)';const result=expandPart(raw,id(raw,'expand'));assert(result.startsWith('7+'));assert(equivalent(raw,result));
 const source=normalize('x/2+(x+1)/3');const ast=parse(source);assert.equal(source.slice(ast.b.start,ast.b.end),'(x+1)/3');
});
test('common denominator retains separate steps and rejects wrong or newly zero denominators',()=>{
 for(const raw of ['x/2+1/3','x/2-1/3+2/5','-x/2+1/3']){
  const target=id(raw,'common'),result=commonDenominator(raw,target,'30');assert(equivalent(raw,result));assert.match(result,/\\frac/);
 }
 assert.deepEqual(commonSuggestions('x/2+1/3','root'),['6','12','18']);
 assert.throws(()=>commonDenominator('x/2+x/3','root','6x'));
 assert.throws(()=>commonDenominator('x/2+x/3','root','0'));
 const raw='1/(x-1)+1/(x+1)',result=commonDenominator(raw,'root','(x-1)(x+1)',{excluded:[1,-1]});assert(equivalent(raw,result));
 assert.throws(()=>commonDenominator(raw,'root','x-1',{excluded:[1,-1]}));
 assert(equivalent('x/2+1/3',commonDenominator('x/2+1/3','root','1+i')));
});
test('cancellation divides both polynomials exactly, retaining the original problem restrictions',()=>{
 const p={topic:'fraction',expression:'(x^2-9)/(x-3)',excluded:[3]},result=cancelFraction(p.expression,'root','x-3',p);
 assert(equivalent(result,'x+3'));assert.deepEqual(p.excluded,[3]);assert.equal(checkStep(result,p).ok,true);
 assert.throws(()=>cancelFraction(p.expression,'root','x+2',p));
 assert.throws(()=>cancelFraction(p.expression,'root','0',p));
 const raw='((1+i)x+(1+i))/(1+i)';assert(equivalent(cancelFraction(raw,'root','1+i'),'x+1'));
 assert(cancelSuggestions('(12x)/(18x)','root').includes('6'));
 assert(cancelSuggestions('(12x)/(18x)','root').includes('x'));
 assert(equivalent(cancelFraction('2t/2','root','2',{binding:'x+1'}),'t', 'x+1'));
});
test('partial distribution preserves the chosen scope and leaves term collection to the learner',()=>{
 for(const raw of ['2(x+3)','(x-2)(x+3)','(x+1)^2','3+(x+1)^2','(1+i)(x-2)','(t+1)(t-2)']){
  const result=expandPart(raw,id(raw,'expand'),{binding:raw.includes('t')?'x+2':null});assert(equivalent(raw,result,raw.includes('t')?'x+2':null));
 }
 const result=expandPart('(x+1)^2','root');assert.match(result,/\\cdot/);
});
test('splitting exponents respects zero-domain restrictions and integer limits',()=>{
 assert(equivalent('x^7',splitPower('x^7','root','3')));
 assert.throws(()=>splitPower('x^7','root','0'));
 assert.throws(()=>splitPower('x^7','root','-1'));
 assert(equivalent('x^7',splitPower('x^7','root','-1',{excluded:[0]})));
 for(const n of ['','1/2','3.5','20'])assert.throws(()=>splitPower('x^7','root',n,{excluded:[0]}));
});
