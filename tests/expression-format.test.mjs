import test from 'node:test';import assert from 'node:assert/strict';
import math from '../src/math-runtime.js';import {tidyMath} from '../dist/expression-format.js';
import {equivalent} from '../dist/engine.js';import {balanceEquation} from '../dist/equation-tools.js';import {substituteMany,restoreAll} from '../dist/substitutions.js';
const tidy=(s,options)=>tidyMath(s,options,math),compact=s=>s.replace(/\s/g,'');
test('formatting removes repeated wrappers but preserves subtraction, fractions, powers and functions',()=>{
 const pairs=[['(((x+1)))','x+1'],['x-(x-1)','x-(x-1)'],['1/(x/(x+1))','1/(x/(x+1))'],['(x^2)^3','(x^2)^3'],['(x+1)^2','(x+1)^2'],['sin(((theta)))','sin(theta)'],['log(((x+1)),2)','log(x+1,2)'],['(-2)^2','(-2)^2'],['-(x+1)','-(x+1)'],['x/(x-1)','x/(x-1)']];
 for(const [raw,expected]of pairs){const result=tidy(raw);assert.equal(compact(result),expected);assert.equal(tidy(result),result);if(!/sin|log/.test(raw))assert(equivalent(raw,result),raw);}
 assert.equal(compact(tidy('((x+1))+(x+2)',{keepGroups:true})),'(x+1)+(x+2)');
 assert.equal(compact(tidy('\\frac{1}{(x+1)}')),'1/(x+1)');
});
test('repeated both-side operations and substitution cycles do not accumulate wrappers or cancel domains',()=>{
 let value='x + 1 = 3';for(let i=0;i<10;i++)value=balanceEquation(value,'add','1',{simplify:false},math).steps[0].value;
 assert(!/[()]/.test(value));assert(equivalent(value.split('=')[0],'x+11'));assert(equivalent(value.split('=')[1],'13'));
 let raw='(x+1)^2+3*(x+1)';for(let i=0;i<8;i++){const applied=substituteMany(raw,{},'t','x+1','apply',math);raw=restoreAll(applied.value,applied.bindings,math);}assert(equivalent(raw,'(x+1)^2+3*(x+1)'));assert(!raw.includes('(('));
 assert.equal(compact(tidy('((x))/(x)')),'x/x','formatting cannot cancel a denominator or remove its domain');
});
