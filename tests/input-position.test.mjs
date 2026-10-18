import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountInputPosition,updateInputPosition} from '../dist/input-position.js';
import {mountInputHistory} from '../dist/input-history.js';
import {setInputKeyboard,pressInputKey} from '../dist/input-pad.js';

function setup(tag='input'){
 const {document,window}=parseHTML(`<${tag} inputmode="none"></${tag}>`),input=document.querySelector(tag);let active=null;
 Object.defineProperty(document,'activeElement',{get:()=>active});
 const event=(type,props={})=>{const e=new window.Event(type,{cancelable:true});Object.assign(e,props);input.dispatchEvent(e);return e;};
 input.focus=()=>{active=input;event('focus');};input.blur=()=>{active=null;event('blur');};
 input.setSelectionRange=(start,end,direction='none')=>Object.assign(input,{selectionStart:start,selectionEnd:end,selectionDirection:direction});
 input.value='sin(cos(x))';input.setSelectionRange(0,0);setInputKeyboard(input,false,true);input.focus();
 const layer=document.querySelector('.input-position-layer'),caret=document.querySelector('[data-input-caret]');
 return {document,input,event,layer,caret};
}

test('readonly custom input displays the actual selection focus and yields to system keyboard, IME and blur',()=>{
 const h=setup(),{input,layer,caret}=h;assert(input.hasAttribute('readonly'));assert(!layer.hidden);assert.equal(caret.dataset.position,'0');assert.equal(layer.getAttribute('aria-hidden'),'true');
 input.setSelectionRange(4,7,'backward');h.event('select');assert.equal(caret.dataset.position,'4');
 input.setSelectionRange(4,7,'forward');h.event('select');assert.equal(caret.dataset.position,'7');
 h.event('compositionstart');assert(layer.hidden);assert(!input.classList.contains('has-input-position'));h.event('compositionend');assert(!layer.hidden);
 setInputKeyboard(input,true,true);assert(layer.hidden);assert(!input.hasAttribute('readonly'));setInputKeyboard(input,false,true);assert(!layer.hidden);
 input.blur();assert(layer.hidden);input.focus();mountInputPosition(input);assert.equal(h.document.querySelectorAll('.input-position-wrap').length,1);
});

test('physical arrows share function boundaries and undo restores the visible insertion position',()=>{
 const {input,event,caret}=setup(),history=mountInputHistory(input);
 assert(event('keydown',{key:'ArrowRight'}).defaultPrevented);assert.equal(input.selectionStart,3);assert.equal(caret.dataset.position,'3');assert(!history.canUndo);
 for(const modifiers of [{shiftKey:true},{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{keyCode:229}])assert(!event('keydown',{key:'ArrowLeft',...modifiers}).defaultPrevented);
 input.setSelectionRange(8,9,'backward');updateInputPosition(input);history.edit(()=>pressInputKey(input,'7'));assert.equal(input.value,'sin(cos(7))');assert.equal(caret.dataset.position,'9');
 history.undo();assert.equal(input.value,'sin(cos(x))');assert.equal(caret.dataset.position,'8');assert.equal(input.selectionEnd,9);
 history.redo();assert.equal(input.value,'sin(cos(7))');assert.equal(caret.dataset.position,'9');
});

test('multiline condition input keeps real newline positions, selection direction and IME ownership',()=>{
 const {input,event,caret,layer}=setup('textarea');input.value='x > 0\nsin(cos(x))\n';input.setSelectionRange(6,6);event('select');assert.equal(caret.dataset.position,'6');assert(!layer.hidden);
 event('keydown',{key:'ArrowRight'});assert.equal(input.selectionStart,9);assert.equal(caret.dataset.position,'9');
 input.setSelectionRange(6,9,'backward');event('select');assert.equal(caret.dataset.position,'6');pressInputKey(input,'sqrt');assert.equal(input.value,'x > 0\nsqrt(cos(x))\n');assert.equal(caret.dataset.position,'10');
 input.setSelectionRange(input.value.length,input.value.length);event('select');assert.equal(caret.dataset.position,String(input.value.length));
 event('compositionstart');assert(layer.hidden);assert(!event('keydown',{key:'ArrowLeft'}).defaultPrevented);event('compositionend');assert(!layer.hidden);
});
