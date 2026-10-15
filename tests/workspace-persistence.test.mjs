import test from 'node:test';
import assert from 'node:assert/strict';
import {WORK_KEY} from '../dist/workspace-state.js';
import {createWorkspacePersistence} from '../dist/workspace-persistence.js';
const fixture=()=>({rows:[{value:'x + 1',title:'직접 입력',note:'보존할 설명'}],active:0,activeAuxId:null});

test('two pages cannot save an old snapshot over newer rows or same-length edits',()=>{
 const memory=new Map([[WORK_KEY,JSON.stringify(fixture())]]),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const a=createWorkspacePersistence(storage),b=createWorkspacePersistence(storage),first=a.load(),stale=b.load();
 first.rows.push({value:'x + 2',title:'직접 입력'});first.active=1;assert.equal(a.save(first),'saved');
 const latest=memory.get(WORK_KEY);assert.equal(a.status(),'current');assert.equal(b.save(stale),'conflict');assert.equal(memory.get(WORK_KEY),latest);
 const refreshed=b.latest();refreshed.rows[1].note='다른 화면의 설명';assert.equal(b.save(refreshed),'saved');assert.equal(a.save(first),'conflict');
 assert.equal(JSON.parse(memory.get(WORK_KEY)).rows[1].note,'다른 화면의 설명');
});

test('unreadable, removed or malformed storage is never overwritten by a default or cached book',()=>{
 let value=JSON.stringify(fixture()),blocked=true,writes=0;
 const storage={getItem(){if(blocked)throw Error('denied');return value;},setItem(k,v){writes++;value=v;}};
 const page=createWorkspacePersistence(storage),fallback=page.load();assert.equal(page.save(fallback),'unavailable');assert.equal(writes,0);
 blocked=false;assert.equal(page.save(fallback),'conflict');assert.equal(writes,0);page.latest();
 for(const invalid of [null,'not json','{"rows":[]}']){value=invalid;assert.equal(page.status(),'conflict');assert.throws(()=>page.latest());assert.equal(page.save(fallback),'conflict');assert.equal(value,invalid);}
});

test('failed writes keep their baseline for retry; unrelated keys do not create a conflict',()=>{
 const memory=new Map([[WORK_KEY,JSON.stringify(fixture())]]);let blocked=false;
 const storage={getItem:k=>memory.get(k),setItem(k,v){if(blocked)throw Error('quota');memory.set(k,v);}};
 const page=createWorkspacePersistence(storage),book=page.load();book.rows[0].note='저장 대기';blocked=true;
 assert.equal(page.save(book),'unavailable');assert(page.changed(book));assert.equal(page.status(),'current');
 memory.set('unrelated','anything');blocked=false;assert.equal(page.save(book),'saved');assert(!page.changed(book));assert.equal(page.status(),'current');
});
