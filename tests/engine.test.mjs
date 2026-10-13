import {TOPICS,makeProblem} from './fixtures/exact-problems.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkStep,equivalent,parse,normalize} from '../dist/engine.js';
test('all generated answers and worked steps remain exactly equivalent',()=>{for(const t of TOPICS)for(const level of ['basic','standard'])for(let seed=1;seed<=100;seed++){
 const p=makeProblem(t.id,0,seed,level);const r=checkStep(p.answer,p);assert.equal(r.ok,true,JSON.stringify({p,r}));for(const st of p.steps){if(st[0]!=='도입-정의')assert.equal(equivalent(st[1],p.expression,p.binding),true,JSON.stringify({p,st}));}
}});
test('equivalence uses coefficients and rational arithmetic, not point sampling',()=>{
 assert(equivalent('(x+2)(x+3)','x^2+5x+6'));
 assert(!equivalent('(x+2)(x-3)','x^2+5x+6'));
 assert(equivalent('1/3+1/6','1/2'));
 assert(equivalent('-x^2','-(x*x)'));
 assert(!equivalent('-x^2','(-x)^2'));
 assert(equivalent('0.1+0.2','0.3'));
});
test('undefined zero powers cannot become equivalent to a value through cancellation',()=>{
 for(const raw of ['0^0','(1-1)^0','(x-x)^0','0^(-1)','(1/0)^0','1+0*(0^0)'])assert.throws(()=>equivalent(raw,'1'),/0/,raw);
 assert(equivalent('2^0','1'));assert(equivalent('0^2','0'));
 assert.equal(checkStep('x^0',{expression:'1',excluded:[]}).status,'domain');
 assert.equal(checkStep('x^0',{expression:'1',excluded:[0]}).ok,true);
});
test('equivalent rewrites cannot introduce denominator holes',()=>{
 const p={topic:'factor',expression:'x^2+5x+6',excluded:[]};
 assert.equal(checkStep('(x+2)(x+3)*(x-1)/(x-1)',p).status,'domain');
});
test('original denominator restriction is retained and new holes are rejected',()=>{
 const p={topic:'fraction',expression:'(x^2-9)/(x-3)',excluded:[3]};
 assert.equal(checkStep('(x+3)*(x-2)/(x-2)',p).status,'domain');
 assert.equal(checkStep('(x+3)*(x-3)/(x-3)',p).ok,true);
 assert.equal(checkStep('1/0',p).ok,false);
});
test('latex fractions, superscripts, fenced expressions and mixed inputs',()=>{
 assert(equivalent('\\frac{x^{2}-9}{x-3}','x+3'));
 assert(equivalent('\\left(x+2\\right)\\left(x+3\\right)','x^2+5x+6'));
 assert(equivalent('x²+5x+6','(x+2)(x+3)'));
 assert.throws(()=>parse('fetch(1)'));
 assert.throws(()=>parse('x++'));
 assert.throws(()=>parse('2..3'));
 assert.throws(()=>parse('x=(x+2)'));
});
test('invalid mixed substitution is rejected',()=>{
 const p={topic:'substitute',expression:'(x+1)^2+3(x+1)+2',binding:'x+1',excluded:[]};
 assert.equal(checkStep('t^2+3x+2',p).ok,false);
});
