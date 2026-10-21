import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeDraftStore,PRACTICE_DRAFT_KEY} from '../dist/practice-draft.js';
const draft={value:'sin(x+',tab:'function',selection:{start:2,end:5,direction:'backward'}};
test('tab draft accepts unfinished syntax and only returns minimal state for the same source',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},store=createPracticeDraftStore(storage,()=>1000);
 assert(store.write('source',draft));assert.deepEqual(store.read('source'),draft);assert.equal(store.read('different problem'),null);
 assert.deepEqual([...values.keys()],[PRACTICE_DRAFT_KEY]);assert(store.clear());assert.equal(store.read('source'),null);
});
test('empty, malformed, excessive, wrong version, stale or invalid selection data is ignored',()=>{
 let value=null;const store=createPracticeDraftStore({getItem:()=>value,setItem:(k,v)=>value=v,removeItem:()=>value=null},()=>100000000);
 store.write('source',draft);const base=JSON.parse(value);
 for(const bad of ['', '{', 'x'.repeat(110001),JSON.stringify({...base,value:''}),JSON.stringify({...base,value:'x'.repeat(2001)}),JSON.stringify({...base,version:2}),JSON.stringify({...base,start:-1}),JSON.stringify({...base,end:200}),JSON.stringify({...base,direction:'bad'}),JSON.stringify({...base,tab:'bad'}),JSON.stringify({...base,at:1}),JSON.stringify({...base,at:100000001})]){value=bad;assert.equal(store.read('source'),null);}
 store.write('source',draft);assert(store.write('source',{...draft,value:' '}));assert.equal(value,null);
});
test('unavailable session storage does not throw on read, write or clear',()=>{
 const store=createPracticeDraftStore({getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}});
 assert.equal(store.read('source'),null);assert.equal(store.write('source',draft),false);assert.equal(store.clear(),true); // No successfully read or written draft to discard.
});

test('failed removal falls back to a tombstone so a discarded draft cannot revive',()=>{
 let value=null;const store=createPracticeDraftStore({getItem:()=>value,setItem:(k,v)=>value=v,removeItem(){throw Error('remove denied');}});
 assert(store.write('source',draft));assert(store.clear());assert.equal(value,'');assert.equal(store.read('source'),null);
});
