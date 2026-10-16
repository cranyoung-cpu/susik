import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {startWorkspaceLoading,workspaceLoadingMarkup} from '../dist/workspace-loader.js';

function setup(){
 const {document}=parseHTML(`<html><body><main id="app">${workspaceLoadingMarkup}</main></body></html>`);
 let resolve,reject,timeout,timeoutMs,reloads=0,cleared=0;
 const loading=new Promise((yes,no)=>{resolve=yes;reject=no;});
 const done=startWorkspaceLoading({document,load:()=>loading,reload:()=>reloads++,setTimer:(fn,ms)=>{timeout=fn;timeoutMs=ms;return 12;},clearTimer:id=>{assert.equal(id,12);cleared++;}});
 const panel=document.querySelector('[data-workspace-loading]'),retry=document.querySelector('[data-loading-retry]');
 return {document,panel,retry,done,resolve,reject,slow:()=>timeout(),timeoutMs,reloads:()=>reloads,cleared:()=>cleared,render:()=>{document.querySelector('#app').innerHTML='<input data-draft value="x+99">';}};
}

test('failed required module gives a manual retry without an automatic reload',async()=>{
 const h=setup();assert(h.retry.hidden);h.retry.click();assert.equal(h.reloads(),0);
 h.reject(Error('module unavailable'));await h.done;
 assert.equal(h.panel.dataset.loadingState,'failed');assert.equal(h.panel.getAttribute('aria-busy'),'false');
 assert.match(h.panel.textContent,/불러오지 못했습니다/);assert.match(h.panel.textContent,/저장한 기록은 삭제하지 않습니다/);
 assert.equal(h.retry.hidden,false);assert.equal(h.reloads(),0);assert(h.cleared());
 h.retry.click();h.retry.click();assert.equal(h.reloads(),1);assert(h.retry.disabled);
});

test('slow loading is not failure and can finish without any reload',async()=>{
 const h=setup();assert.equal(h.timeoutMs,6000);h.slow();
 assert.equal(h.panel.dataset.loadingState,'slow');assert.match(h.panel.textContent,/시간이 걸리고/);assert.equal(h.reloads(),0);
 h.render();h.resolve({ready:Promise.resolve()});await h.done;
 assert.equal(h.document.querySelector('[data-loading-retry]'),null);
 h.retry.click();h.slow();assert.equal(h.reloads(),0);assert.equal(h.document.querySelector('[data-draft]').value,'x+99');
});

test('late startup failure after rendering cannot expose reload or discard a draft',async()=>{
 const h=setup();h.slow();h.render();h.reject(Error('late failure'));await h.done;
 h.retry.click();h.slow();assert.equal(h.reloads(),0);assert.equal(h.document.querySelector('[data-draft]').value,'x+99');
 assert.equal(h.document.querySelector('[data-loading-retry]'),null);
});

test('module arrival waits for asynchronous workspace initialization',async()=>{
 const h=setup();let ready;h.resolve({ready:new Promise(resolve=>{ready=resolve;})});
 await Promise.resolve();await Promise.resolve();h.slow();assert.equal(h.panel.dataset.loadingState,'slow');
 h.render();h.retry.click();assert.equal(h.reloads(),0);ready();await h.done;assert(h.cleared());
});

test('an entry that finishes without rendering remains recoverable',async()=>{
 const h=setup();h.resolve({ready:Promise.resolve()});await h.done;
 assert.equal(h.panel.dataset.loadingState,'failed');h.retry.click();assert.equal(h.reloads(),1);
});
