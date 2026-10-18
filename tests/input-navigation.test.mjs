import test from 'node:test';
import assert from 'node:assert/strict';
import {functionNameRanges,nextInputPosition} from '../dist/input-navigation.js';
import {CALCULATION_FUNCTION_NAMES} from '../dist/calculation.js';
import {pressInputKey} from '../dist/input-pad.js';

test('all parser functions and inverse aliases move as whole names while arguments remain editable',()=>{
 for(const name of [...CALCULATION_FUNCTION_NAMES,'arcsin','arccos','arctan']){
  const value=`${name}(x+1)`;assert.equal(nextInputPosition(value,0),name.length);assert.equal(nextInputPosition(value,name.length,name.length,-1),0);
  for(let i=1;i<name.length;i++){assert.equal(nextInputPosition(value,i),name.length);assert.equal(nextInputPosition(value,i,i,-1),0);}
  assert.equal(nextInputPosition(value,name.length),name.length+1);assert.equal(nextInputPosition(value,name.length+1),name.length+2);
 }
});
test('nested function movement, LaTeX commands, coefficients and identifier boundaries are distinct',()=>{
 const value='2sin(cos(sqrt(x)))+\\arctan(y)';
 assert.deepEqual(functionNameRanges(value),[{start:1,end:4},{start:5,end:8},{start:9,end:13},{start:19,end:26}]);
 for(const name of ['xsin','sin2','mysqrt','_cos','cosθ','θtan','logarithm','Sin']){assert.deepEqual(functionNameRanges(name+'(x)'),[]);assert.equal(nextInputPosition(name,0),1);}
 assert.equal(nextInputPosition(value,0,0,-1),0);assert.equal(nextInputPosition(value,value.length),value.length);
 assert.equal(nextInputPosition('😀+x',0),2);assert.equal(nextInputPosition('😀+x',2,2,-1),0);
});
test('selection collapses to its direction edge and only interior function-name edges snap',()=>{
 const value='sin(x)+cos(y)';assert.equal(nextInputPosition(value,3,6,-1),3);assert.equal(nextInputPosition(value,0,7,1),7);
 assert.equal(nextInputPosition(value,1,5,-1),0);assert.equal(nextInputPosition(value,4,8,1),10);
});
test('arrow movement followed by input edits the real middle position without changing the function name',()=>{
 const f={value:'sin(cos())',selectionStart:0,selectionEnd:0,focus(){},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}};
 for(const key of ['→','→','→','→','x','^()','2'])pressInputKey(f,key);
 assert.equal(f.value,'sin(cos(x^(2)))');assert.equal(f.selectionStart,12);
});
