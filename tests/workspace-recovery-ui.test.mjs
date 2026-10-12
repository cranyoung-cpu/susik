import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';import runtime from '../src/math-runtime.js';import {serializeBackup} from '../dist/workspace-backup.js';
test('blocked storage stays visible, retries recover, imports preview before replacement and undo restores previous notebook',async()=>{
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLInputElement.prototype.setSelectionRange=()=>{};
 let blocked=true;const entries=new Map();window.math=runtime;window.innerHeight=800;window.innerWidth=360;
 Object.assign(globalThis,{window,document,requestAnimationFrame:f=>f(),localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return entries.get(k);},setItem:(k,v)=>{if(blocked)throw Error('quota');entries.set(k,v);}}});
 (await import('../dist/workspace-app.js')).startWorkspace();
 const $=s=>document.querySelector(s),click=s=>$(s).click(),saved=()=>JSON.parse(entries.get('susik-lab.workspace.v1'));
 assert.match($('[data-storage-status]').textContent,/저장하지 못/);assert($('.work-guide'));assert($('[data-backup-download]'));
 blocked=false;click('[data-save-retry]');assert(!$('.work-storage.is-error'));assert(saved());
 click('[data-direct-open-input]');$('[data-work-expression]').value='x+7';click('[data-input-save]');assert.match($('.work-manual-status').textContent,/동치 미확인/);
 const before=saved();assert.doesNotThrow(()=>serializeBackup(before));
 const file=async text=>{const el=$('[data-backup-file]');Object.defineProperty(el,'files',{value:[{size:text.length,text:async()=>text}],configurable:true});el.dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));};
 click('[data-backup-open]');await file('{broken');assert(!$('[data-backup-restore]'));assert.deepEqual(saved(),before);
 await file(serializeBackup({rows:[{value:'x+3',title:'직접 입력'}],active:0}));assert($('[data-backup-restore]'));assert.deepEqual(saved(),before,'preview must not alter the notebook');
 click('[data-backup-restore]');assert.equal(saved().rows[0].value,'x+3');click('[data-backup-undo]');assert.deepEqual(saved(),before);
 blocked=true;click('[data-work-row="0"]');assert($('.work-storage.is-error'));click('[data-direct-open-input]');assert($('.work-storage.is-error'),'warning remains visible while editing');
});

