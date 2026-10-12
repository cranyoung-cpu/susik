import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import math from '../src/math-runtime.js';

test('unconfigured footer ad stays hidden and separate through math editing', async () => {
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 const slot=document.querySelector('#footer-ad-slot');
 assert(slot?.hidden);
 assert.equal(document.querySelectorAll('#footer-ad-slot').length,1);
 assert.equal(document.querySelector('.site-footer').nextElementSibling,slot);
 assert.equal(slot.parentElement,document.body);
 assert.equal(slot.querySelector('#footer-ad-content').children.length,0);
 assert.equal(slot.querySelectorAll('a,button,input,iframe,script').length,0);
 assert.equal(slot.getAttribute('aria-label'),'광고');
 window.math=math;window.innerWidth=360;window.innerHeight=640;
 window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 const storage=new Map();
 Object.assign(globalThis,{window,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>f()});
 (await import('../dist/workspace-app.js')).startWorkspace();
 document.querySelector('[data-direct-open]').click();
 assert(document.querySelector('.direct-dock'));
 assert(!document.querySelector('.direct-dock').contains(slot));
 assert.equal(document.querySelector('#footer-ad-slot'),slot);
 assert(slot.hidden,'opening math controls must not activate advertising');
 assert.equal(document.querySelector('.site-footer').nextElementSibling,slot);
});
