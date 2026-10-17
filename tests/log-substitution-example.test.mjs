import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';
import {LOG_SUBSTITUTION_EXAMPLE as example} from '../dist/log-substitution-example.js';
import {WORK_EXAMPLES,lawCandidates} from '../dist/exponent-log.js';
import {PRACTICE_PROBLEMS} from '../dist/learning-tools.js';
import {parseWorkspaceFormula} from '../dist/inequality-tools.js';
import {definitionBinding} from '../dist/context-board.js';
import {substituteMany} from '../dist/substitutions.js';
import {equivalent} from '../dist/engine.js';

test('the variable-base example is distinct and its complete candidate set respects the original real-log domain',()=>{
 const canonical=value=>{const p=parseWorkspaceFormula(value,math);return p.nodes.map(n=>n.toString({parenthesis:'auto',implicit:'show'})).join(p.relation||'');};
 for(const p of [...WORK_EXAMPLES.filter(p=>p.id!==example.id),...PRACTICE_PROBLEMS])assert.notEqual(canonical(p.value),canonical(example.value));
 const d=definitionBinding('t := x+2',{},math),applied=substituteMany(example.value,d.bindings,d.name,d.definition,'apply',math);
 assert.equal(applied.value,'log(t, x) = 2');
 const law=lawCandidates(applied.value,math).find(c=>c.title==='로그방정식을 지수식으로');
 assert.equal(law.value,'t = x ^ 2');for(const condition of ['x > 0','x ≠ 1','t > 0'])assert(law.conditions.includes(condition));
 assert.equal(substituteMany(law.value,d.bindings,d.name,d.definition,'restore',math).value,'x + 2 = x ^ 2');
 // The polynomial identity gives all candidates, not just sampled successful values.
 assert(equivalent('x^2-x-2','(x-2)*(x+1)'));
 const candidates=[2n,-1n],domain=x=>x>0n&&x!==1n&&x+2n>0n;
 for(const x of candidates)assert.equal(x+2n,x*x);
 assert.deepEqual(candidates.filter(domain),[2n]);assert.equal(2n**2n,2n+2n);
 assert(-1n+2n>0n);assert(!domain(-1n));assert(!domain(0n));assert(!domain(1n));
 assert.equal(lawCandidates('log(1,-1)=2',math).length,0);
});

test('the static logarithm lesson links the same guide with folded answers and an explicit unverified boundary',()=>{
 const {document}=parseHTML(fs.readFileSync(new URL('../dist/learn/log-equation/index.html',import.meta.url),'utf8'));
 assert.equal(document.querySelectorAll('script,iframe').length,0);
 assert(document.querySelector('#variable-base'));assert(document.querySelector(`a[href="/?example=${example.id}"]`));
 const answer=[...document.querySelectorAll('details')].find(n=>n.textContent.includes(example.answers[0]));assert(answer);assert(!answer.hasAttribute('open'));
 for(const text of [...example.hints.slice(1),example.hintNote,example.confirmation,...example.answers,example.comparison,example.answerNote])assert(document.querySelector('article').textContent.includes(text),text);
 assert.match(answer.textContent,/∀x ∈ D/);assert.match(answer.textContent,/자동 채점하지 않습니다/);
 assert(document.querySelector('a[href="/?practice=log-2"]'));assert(document.querySelector('a[href="/?practice=log-4"]'));
});
