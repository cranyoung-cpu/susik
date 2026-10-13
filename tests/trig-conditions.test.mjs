import test from 'node:test';import assert from 'node:assert/strict';import math from '../src/math-runtime.js';import {balanceEquation} from '../dist/equation-tools.js';
test('dividing the sine quadratic retains the zero branch and explicitly restricts the transformed equation',()=>{
 const raw='2sin(theta)^2-sin(theta)=0',change=balanceEquation(raw,'divide','sin(theta)',{existingTerm:true,assumptions:['θ ∈ ℝ','도(°) 단위','k ∈ ℤ']},math);assert.equal(change.branch.condition,'sin(theta) = 0');assert.equal(change.branch.equation,raw);assert(change.steps.every(s=>s.conditions.includes('sin(theta) ≠ 0')));assert.match(change.steps[0].explanation,/0이 아닌 범위/);
});
