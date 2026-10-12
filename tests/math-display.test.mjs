import test from 'node:test';import assert from 'node:assert/strict';import * as MathLive from '../dist/vendor/mathlive-ssr.min.mjs';import math from '../src/math-runtime.js';import {mathInput} from '../dist/direct-editor.js';import {equivalent} from '../dist/engine.js';import {parseCalculation} from '../dist/calculation.js';
test('juxtaposition removes algebraic product dots without merging numeric operands',()=>{
 const previous=globalThis.window;globalThis.window={MathLive,math};try{
  for(const raw of ['2*x','(x-1)*(2*x-14)','\\left(x-1\\right)\\cdot\\left(2\\cdot x-14\\right)']){const latex=mathInput(raw);assert(!/\\cdot|\\times/.test(latex));assert(equivalent(raw,latex));}
  for(const raw of ['2*3','x*2','2.5*3.1'])assert.match(mathInput(raw),/\\times/);
  for(const raw of ['pi*x','sin(theta)*cos(theta)','x*y']){const latex=mathInput(raw);assert(!/\\cdot/.test(latex));assert.equal(parseCalculation(latex,math).nodes[0].op,'*');}
 }finally{globalThis.window=previous;}
});
