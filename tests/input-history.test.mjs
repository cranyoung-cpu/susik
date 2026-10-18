import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountInputHistory} from '../dist/input-history.js';
import {pressInputKey} from '../dist/input-pad.js';

function setup(value='',state,limit){
 const {document,window}=parseHTML('<input><textarea></textarea>'),input=document.querySelector('input');
 input.value=value;input.focus=()=>{};input.setSelectionRange=(start,end,direction='none')=>Object.assign(input,{selectionStart:start,selectionEnd:end,selectionDirection:direction});input.setSelectionRange(value.length,value.length);
 let changes=0;const history=mountInputHistory(input,{state,limit,onChange:()=>changes++});
 const event=(type,props={},target=input)=>{const e=new window.Event(type,{bubbles:true,cancelable:props.cancelable??true});for(const [name,value]of Object.entries(props))if(name!=='cancelable')Object.defineProperty(e,name,{value});target.dispatchEvent(e);return e;};
 const edit=(value,start,end=start,inputType='insertText',before=true)=>{if(before)event('beforeinput',{inputType});input.value=value;input.setSelectionRange(start,end);event('input',{inputType});};
 return {input,history,event,edit,document,changes:()=>changes,pad:key=>history.edit(()=>pressInputKey(input,key)),selection:()=>[input.selectionStart,input.selectionEnd,input.selectionDirection]};
}

test('AC and selected keypad replacements undo and redo exact values, ranges and direction',()=>{
 const h=setup('sqrt(x^2)+1');h.input.setSelectionRange(5,8,'backward');h.pad('sin()');
 assert.equal(h.input.value,'sqrt(sin())+1');h.history.undo();assert.equal(h.input.value,'sqrt(x^2)+1');assert.deepEqual(h.selection(),[5,8,'backward']);
 h.history.redo();assert.equal(h.input.value,'sqrt(sin())+1');assert.deepEqual(h.selection().slice(0,2),[9,9]);
 h.pad('AC');assert.equal(h.input.value,'');h.history.undo();assert.equal(h.input.value,'sqrt(sin())+1');assert.deepEqual(h.selection().slice(0,2),[9,9]);h.history.redo();assert.equal(h.input.value,'');
});

test('paste and native selected replacement are separate edits, including input without beforeinput',()=>{
 const h=setup('x+12');h.input.setSelectionRange(2,4,'backward');h.event('paste');h.edit('x+sqrt(9)',9,9,'insertFromPaste',false);
 h.history.undo();assert.equal(h.input.value,'x+12');assert.deepEqual(h.selection(),[2,4,'backward']);h.history.redo();assert.equal(h.input.value,'x+sqrt(9)');
 h.input.setSelectionRange(2,9);h.edit('x+5',3,3,'insertReplacementText');h.history.undo();assert.equal(h.input.value,'x+sqrt(9)');assert.deepEqual(h.selection().slice(0,2),[2,9]);
 h.history.redo();h.edit('x+56',4,4,'insertText',false);h.history.undo();assert.equal(h.input.value,'x+5');assert.deepEqual(h.selection().slice(0,2),[3,3]);
});

test('cursor motion and no-op keys retain redo; new edits discard only the redo branch',()=>{
 const h=setup('x');h.pad('+');h.pad('1');h.history.undo();h.pad('←');assert(h.history.canRedo);h.history.redo();assert.equal(h.input.value,'x+1');
 h.history.undo();h.pad('2');assert.equal(h.input.value,'x+2');assert(!h.history.canRedo);
 const empty=setup();empty.pad('7');empty.history.undo();empty.pad('AC');empty.pad('⌫');assert(empty.history.canRedo);empty.history.redo();assert.equal(empty.input.value,'7');
});

test('keyboard undo stays on the input and handles Ctrl, Command and redo without reaching other fields',()=>{
 const h=setup();h.pad('x');assert(h.event('keydown',{key:'z',ctrlKey:true}).defaultPrevented);assert.equal(h.input.value,'');
 h.event('keydown',{key:'Z',metaKey:true,shiftKey:true});assert.equal(h.input.value,'x');h.event('keydown',{key:'z',metaKey:true});h.event('keydown',{key:'y',ctrlKey:true});assert.equal(h.input.value,'x');
 assert(!h.event('keydown',{key:'z',ctrlKey:true},h.document.querySelector('textarea')).defaultPrevented);assert.equal(h.input.value,'x');
 assert(!h.event('keydown',{key:'z',ctrlKey:true,keyCode:229}).defaultPrevented);assert.equal(h.input.value,'x');
});

test('native history input uses the draft stack even when beforeinput is absent or not cancelable',()=>{
 const h=setup('x');h.pad('+1');assert(h.event('beforeinput',{inputType:'historyUndo'}).defaultPrevented);assert.equal(h.input.value,'x');
 h.event('beforeinput',{inputType:'historyRedo',cancelable:false});h.input.value='unrelated native value';h.event('input',{inputType:'historyRedo'});assert.equal(h.input.value,'x+1');
 h.input.value='stale browser value';h.event('input',{inputType:'historyUndo'});assert.equal(h.input.value,'x');assert(!h.history.canUndo);assert(h.history.canRedo);
});

test('IME is one edit, blocks keypad/undo during composition and leaves cancelled composition unchanged',()=>{
 const h=setup('x+1');h.input.setSelectionRange(0,1,'backward');h.event('compositionstart');
 for(const value of ['ㅎ+1','하+1','한+1']){h.input.value=value;h.input.setSelectionRange(1,1);h.event('input',{inputType:'insertCompositionText',isComposing:true});}
 assert(h.history.composing);assert(!h.history.canUndo);assert(!h.history.undo());assert(!h.pad('AC'));assert.equal(h.input.value,'한+1');assert(!h.event('keydown',{key:'z',ctrlKey:true,isComposing:true}).defaultPrevented);
 h.event('compositionend');h.event('input',{inputType:'insertText'});h.history.undo();assert.equal(h.input.value,'x+1');assert.deepEqual(h.selection(),[0,1,'backward']);assert(!h.history.canUndo);h.history.redo();assert.equal(h.input.value,'한+1');
 h.event('compositionstart');h.input.value='새+1';h.event('input',{isComposing:true});h.input.value='한+1';h.event('compositionend');h.history.undo();assert.equal(h.input.value,'x+1');assert(!h.history.canUndo);
});

test('bounded history resumes with a draft but a new input never inherits another draft history',()=>{
 const h=setup('',undefined,3);for(const key of ['1','2','3','4'])h.pad(key);h.history.undo();
 const restored=setup(h.input.value,h.history.snapshot());restored.history.redo();assert.equal(restored.input.value,'1234');
 for(let i=0;i<3;i++)restored.history.undo();assert.equal(restored.input.value,'1');assert(!restored.history.canUndo);
 const fresh=setup();assert(!fresh.history.canUndo);assert(!fresh.history.canRedo);assert.equal(h.input.value,'123');
});
