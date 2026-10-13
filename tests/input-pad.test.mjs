import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {inputPad,pressInputKey} from '../dist/input-pad.js';

test('every keypad tab keeps exactly one copy of common operations in the same right-hand order',()=>{
 const expected=['⌫','AC','/','*','-','+','sqrt()','^()','±','='];
 for(const prefix of ['work','direct','adv','balance','practice'])for(const tab of ['number','symbol','function']){
  const {document}=parseHTML(inputPad(prefix,tab,true));
  assert.deepEqual([...document.querySelectorAll(`.input-pad-fixed [data-${prefix}-key]`)].map(e=>e.getAttribute(`data-${prefix}-key`)),expected);
  for(const key of expected)assert.equal([...document.querySelectorAll(`[data-${prefix}-key]`)].filter(e=>e.getAttribute(`data-${prefix}-key`)===key).length,1,`${prefix} ${tab} ${key}`);
  assert.match(document.querySelector('.input-pad-fixed button').textContent,/지우기/);
 }
});
test('fixed delete erases before the caret or just the selected range without changing the surrounding formula',()=>{
 const f={value:'sqrt(x^2)+sin(theta)',selectionStart:7,selectionEnd:8,focus(){},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}};
 pressInputKey(f,'⌫');assert.equal(f.value,'sqrt(x^)+sin(theta)');assert.equal(f.selectionStart,7);
 pressInputKey(f,'⌫');assert.equal(f.value,'sqrt(x)+sin(theta)');assert.equal(f.selectionStart,6);
 f.setSelectionRange(0,0);pressInputKey(f,'⌫');assert.equal(f.value,'sqrt(x)+sin(theta)');
 f.setSelectionRange(8,f.value.length);pressInputKey(f,'cos()');assert.equal(f.value,'sqrt(x)+cos()');assert.equal(f.selectionStart,12);
 pressInputKey(f,'theta');assert.equal(f.value,'sqrt(x)+cos(theta)');
 pressInputKey(f,'AC');assert.equal(f.value,'');assert.equal(f.selectionStart,0);
 pressInputKey(f,'sqrt()');pressInputKey(f,'9');assert.equal(f.value,'sqrt(9)');
 f.setSelectionRange(f.value.length,f.value.length);pressInputKey(f,'^()');pressInputKey(f,'2');assert.equal(f.value,'sqrt(9)^(2)');
});
