import test from 'node:test';import assert from 'node:assert/strict';import * as math from 'mathjs';
import runtime from '../src/math-runtime.js';import {calculateMatrix,solveLinearSystem} from '../dist/matrix-tools.js';import {calculateCalculus} from '../dist/calculus-tools.js';import {importMatrix} from '../dist/advanced-input.js';import {createAuxiliary,auxiliaryReplacements} from '../dist/auxiliary-tools.js';import {lawCandidates} from '../dist/exponent-log.js';import {parseCalculation} from '../dist/calculation.js';import {loadWorkspace,WORK_KEY} from '../dist/workspace-state.js';
const final=e=>calculateCalculus(e,runtime).steps.at(-1).value;
const evalOur=(s,scope)=>parseCalculation(s,math).nodes[0].transform(n=>{if(n.isFunctionNode&&n.fn.name==='ln')return new math.FunctionNode(new math.SymbolNode('log'),n.args);if(n.isFunctionNode&&n.fn.name==='log'&&n.args.length===1)return new math.FunctionNode(new math.SymbolNode('log'),[...n.args,new math.ConstantNode(10)]);return n;}).evaluate(scope);
test('matrix inverse, product, determinant, transpose and row-reduction retain exact fractions and complex numbers',()=>{
 const a=[['1','2'],['3','4']],inverse=calculateMatrix({a,mode:'inverse'});assert.deepEqual(inverse.result,[['-2','1'],['3/2','-1/2']]);assert.equal(inverse.steps[1].matrix[0].length,4);assert(inverse.steps.some(s=>s.title.includes('R2')));
 assert.deepEqual(calculateMatrix({a,b:inverse.result,mode:'multiply'}).result,[['1','0'],['0','1']]);assert.equal(calculateMatrix({a,mode:'determinant'}).steps.at(-1).value,'-2');
 assert.deepEqual(calculateMatrix({a:[['1','2','3']],mode:'transpose'}).result,[['1'],['2'],['3']]);assert.deepEqual(calculateMatrix({a:[['i','1/3']],b:[['i','2/3']],mode:'add'}).result,[['2i','1']]);
 assert.deepEqual(calculateMatrix({a:[['0','1'],['0','2']],mode:'rref'}).result,[['0','1'],['0','0']]);
 assert.throws(()=>calculateMatrix({a:[['1','2'],['2','4']],mode:'inverse'}),/역행렬이 없습니다/);assert.throws(()=>calculateMatrix({a:[['1','2']],b:[['1','2']],mode:'multiply'}),/열 수/);assert.throws(()=>calculateMatrix({a:[['1/0']],mode:'determinant'}),/0/);
});
test('linear systems classify unique, none and infinite solutions and reject nonlinear equations',()=>{
 const solve=equations=>solveLinearSystem({variables:['x','y'],equations},runtime);
 const unique=solve(['2(x+y)=6','x-y=1']);assert.equal(unique.status,'unique');assert.deepEqual(unique.steps.slice(-2).map(s=>s.value),['x = 2','y = 1']);
 assert.equal(solve(['x+y=1','x+y=2']).status,'none');const infinite=solve(['x+y=2','2x+2y=4']);assert.equal(infinite.status,'infinite');assert.deepEqual(infinite.free,['y']);assert.equal(evalOur(infinite.steps.at(-1).value.split('=')[1],{y:3}),-1);
 assert.equal(solve(['x-x=0','y-y=0']).status,'infinite');assert.throws(()=>solve(['x*y=1','x+y=2']),/비선형/);assert.throws(()=>solve(['x/y=1','x+y=2']),/분모/);assert.throws(()=>solve(['a*x=1','x+y=2']),/미지수/);
});
test('derivative rules agree with independent expected formulas and preserve domains',()=>{
 const pairs=[['x^3+sin(2x)','3*x^2+2*cos(2*x)'],['(x+1)/(x-2)','-3/(x-2)^2'],['ln(x)','1/x'],['log(x)','1/(x*log(10))'],['log(x,2)','1/(x*log(2))'],['x^x','x^x*(log(x)+1)'],['sqrt(x)','1/(2*sqrt(x))'],['arcsin(x)','1/sqrt(1-x^2)']];
 for(const [expression,expected]of pairs){const result=calculateCalculus({expression,mode:'derivative'},runtime);for(const x of [0.25,0.5,0.75])assert(Math.abs(evalOur(result.steps.at(-1).value,{x})-math.evaluate(expected,{x}))<1e-8,expression);assert(result.steps.every(s=>s.conditions.length));}
 assert.equal(evalOur(final({expression:'x^3',mode:'derivative',order:3}),{}),6);assert.equal(evalOur(final({expression:'x^2*y',mode:'derivative',variable:'y'}),{x:3}),9);
 assert(calculateCalculus({expression:'ln(x)',mode:'derivative'},runtime).steps.at(-1).conditions.includes('x > 0'));
 for(const expression of ['ln(-1)+x','log(x,1)','x/0','1/sin(0)','0^0','(-2)^x'])assert.throws(()=>final({expression,mode:'derivative'}),undefined,expression);
});
test('supported antiderivatives differentiate back to the integrand',()=>{
 for(const expression of ['2x+3','x^3','sin(2x+1)','cos(3x)','exp(2x)','e^(3x)','2^(2x)','1/(2x+1)','(2x+1)^(-2)','sqrt(2x+1)','ln(3x+1)']){
  const primitive=final({expression,mode:'integral'}),normalized=parseCalculation(primitive,math).nodes[0].transform(n=>n.isFunctionNode&&n.fn.name==='ln'?new math.FunctionNode(new math.SymbolNode('log'),n.args):n),d=math.derivative(normalized,'x');
  for(const x of [.2,1,2])assert(Math.abs(d.evaluate({x,c:0})-evalOur(expression,{x}))<1e-7,expression+' => '+primitive);assert.match(primitive,/\+ c$/);
 }
 assert.throws(()=>final({expression:'sin(x^2)',mode:'integral'}),/지원 범위/);assert.throws(()=>final({expression:'sin(x)*cos(x)',mode:'integral'}),/지원/);
});
test('definite integrals keep exact results, orientation, and reject poles rather than subtract across them',()=>{
 assert.equal(evalOur(final({expression:'x^2',mode:'definite',lower:'0',upper:'1'}),{}),1/3);
 assert.equal(evalOur(final({expression:'x^2',mode:'definite',lower:'1',upper:'0'}),{}),-1/3);
 assert.equal(final({expression:'sin(x)',mode:'definite',lower:'0',upper:'pi'}),'2');
 assert.throws(()=>final({expression:'1/x',mode:'definite',lower:'-1',upper:'1'}),/정의되지|유한/);
 assert.throws(()=>final({expression:'x^(-2)',mode:'definite',lower:'-2',upper:'1'}),/이상적분/);
 assert.throws(()=>final({expression:'ln(x)',mode:'definite',lower:'0',upper:'1'}),/이상적분/);
 assert.throws(()=>final({expression:'x+y',mode:'definite',lower:'0',upper:'1'}),/선택한 변수/);
});
test('auxiliary replacement matches whole nodes, preserves unrelated variables and source context',()=>{
 const source={value:'log(8,2)+x=5',condition:'x는 실수',bindings:{t:'x+1'},assumptions:['x는 실수']},sheet=createAuxiliary(source,4,'log(8,2)','a','보조',runtime);sheet.rows[0].bindings.t='different';assert.equal(source.bindings.t,'x+1');
 const options=auxiliaryReplacements(source.value,'log(8,2)=3',runtime);assert.equal(options.length,1);assert.equal(options[0].value,'3 + x = 5');assert.equal(auxiliaryReplacements('x+exp(x)','x=2',runtime)[0].count,2);
 assert.equal(auxiliaryReplacements('x+1','u=3',runtime).length,0);assert.equal(auxiliaryReplacements('x+1','3',runtime).length,0);
 const saved={rows:[source],active:0,auxiliary:[{...sheet,sourceIndex:0}],activeAuxId:'a'};const loaded=loadWorkspace({getItem:k=>k===WORK_KEY?JSON.stringify(saved):null});assert.equal(loaded.activeAuxId,'a');assert.equal(loaded.auxiliary[0].rows[0].value,'log(8,2)');
});
test('log equations expose exponent steps with symbolic bases, natural logs and reversed sides',()=>{
 for(const [raw,want]of [['log(x,2)=3','x = 2 ^ 3'],['3=log(x,2)','x = 2 ^ 3'],['ln(x)=y','x = e ^ y'],['log(x,a)=b','x = a ^ b']])assert.equal(lawCandidates(raw,runtime).find(l=>l.title==='로그방정식을 지수식으로').value,want);
 const law=lawCandidates('log(x,a)=b',runtime).find(l=>l.title==='로그방정식을 지수식으로');assert(law.conditions.includes('a ≠ 1'));assert(law.conditions.includes('x > 0'));assert(lawCandidates('e^x=y',runtime).some(l=>l.title==='지수방정식을 로그식으로'));
});
test('matrix paste supports TSV, rectangular arrays and LaTeX without accepting ragged rows',()=>{
 assert.deepEqual(importMatrix('1\t2\n3\t4'),[['1','2'],['3','4']]);assert.deepEqual(importMatrix('[[1,2],[3,4]]'),[['1','2'],['3','4']]);assert.deepEqual(importMatrix('\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}'),[['1','2'],['3','4']]);assert.throws(()=>importMatrix('1,2\n3'),/같은 열/);
});
