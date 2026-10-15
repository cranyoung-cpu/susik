import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingBrackets} from '../dist/input-brackets.js';

test('matches the bracket before or after the caret at its own nesting level',()=>{
 const raw='((x+1)*(y-2))';
 for(const [caret,pair] of [[0,[0,12]],[1,[0,12]],[2,[1,5]],[5,[1,5]],[6,[1,5]],[7,[7,11]],[8,[7,11]],[12,[7,11]],[13,[0,12]]])assert.deepEqual(matchingBrackets(raw,caret),pair,`caret ${caret}`);
 assert.deepEqual(matchingBrackets('x+()',3),[2,3]);
 assert.deepEqual(matchingBrackets('x+(y)',0),[]);
 assert.deepEqual(matchingBrackets(raw,1,5),[]);
 assert.deepEqual(matchingBrackets('',0),[]);
});
test('unmatched and crossed brackets never acquire an invented partner',()=>{
 for(const raw of ['(x','x)','([)]','(x+1}','{x)'])for(let caret=0;caret<=raw.length;caret++)assert.deepEqual(matchingBrackets(raw,caret),[],`${raw} at ${caret}`);
 assert.deepEqual(matchingBrackets('((x)',1),[]);
 assert.deepEqual(matchingBrackets('((x)',2),[1,3]);
 assert.deepEqual(matchingBrackets('(x)+(y',1),[0,2]);
});
test('handles nested LaTeX argument braces and literal escapes without interpreting mathematics',()=>{
 const raw=String.raw`\frac{1}{(x+1)}`;
 assert.deepEqual(matchingBrackets(raw,6),[5,7]);assert.deepEqual(matchingBrackets(raw,9),[8,14]);assert.deepEqual(matchingBrackets(raw,10),[9,13]);
 assert.deepEqual(matchingBrackets(String.raw`\(x\)`,2),[]);
 assert.deepEqual(matchingBrackets('[x+{y}]',4),[3,5]);
 const deep='('.repeat(900)+'x'+')'.repeat(900);assert.deepEqual(matchingBrackets(deep,900),[899,901]);
});
