import test from 'node:test';
import assert from 'node:assert/strict';
import {substitutionCandidates} from '../dist/calculation.js';
import * as math from 'mathjs';
test('touch substitution choices preserve repeated functions and separate parentheses',()=>{
 assert.deepEqual(substitutionCandidates('2sin(theta)^2=sin(theta)cos(theta)+sin(theta)',math)[0],{expression:'sin(theta)',count:3});
 assert.equal(substitutionCandidates('(x+6)^2+3(x+6)',math)[0].count,2);
 assert.equal(substitutionCandidates('(t+1)^2',math).length,0);
});
