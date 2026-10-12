import test from 'node:test';
import assert from 'node:assert/strict';
import {squareDirectTerms,squareSuggestion,remainderDirectTerms,directTerms} from '../dist/direct-tools.js';
import {equivalent} from '../dist/engine.js';
test('chosen square preserves the selected sum exactly and leaves the calculated remainder',()=>{
 assert.equal(squareSuggestion('x^2+12x+29',[0,1,2]).value,'6');
 const r=squareDirectTerms('x^2+12x+29',[0,1,2],'6');assert.equal(r.remainder,'-7');assert(equivalent(r.result,'(x+6)^2-7'));
 const arbitrary=squareDirectTerms('x^2+12x+29',[0,1,2],'5');assert(equivalent(arbitrary.remainder,'2x+4'));assert(equivalent(arbitrary.result,'x^2+12x+29'));
 for(const raw of ['2x^2-16x+14','-x^2+3x-7','(1+i)x^2+2x-1','2/3x^2-x+4'])for(const h of ['0','1/2','-3','1+i']){const change=squareDirectTerms(raw,directTerms(raw).terms.map(t=>t.id),h);assert(equivalent(raw,change.result));}
 const part=squareDirectTerms('x^2+12x+29+5x^3',[0,1,2],'6');assert(part.result.endsWith('+5x^3'));assert(equivalent(part.result,'x^2+12x+29+5x^3'));
 assert.throws(()=>squareDirectTerms('x+1',[0,1],'2'));
});
test('forced polynomial grouping shows quotient and remainder and rejects zero divisor',()=>{
 for(const raw of ['x^2+12x+29','2x^2-16x+14','x^3+2x^2+7'])for(const divisor of ['x+6','x-7','2x','(1+i)x+2']){const r=remainderDirectTerms(raw,directTerms(raw).terms.map(t=>t.id),divisor);assert(equivalent(raw,r.result));}
 assert.throws(()=>remainderDirectTerms('x+1',[0,1],'0'));assert.throws(()=>remainderDirectTerms('x+1',[0,1],'x^2+1'));
 assert(equivalent('t^2+12t+29',squareDirectTerms('t^2+12t+29',[0,1,2],'6',{binding:'sin(theta)'}).result,'x'));
});
