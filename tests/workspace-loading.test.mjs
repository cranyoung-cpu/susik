import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';import math from '../src/math-runtime.js';
import {parseCalculation} from '../dist/calculation.js';import {lawCandidates} from '../dist/exponent-log.js';
test('lean runtime preserves function, complex and LaTeX AST operations',()=>{
 for(const raw of ['2\\sin^2\\theta=\\sin\\theta\\cos\\theta+\\sin\\theta','e^x+pi+log(x,2)+ln(x)','(1+i)*x^2+(2-i)*x','\\frac{2}{3}x^2-\\sqrt{4}']){const p=parseCalculation(raw,math);assert(p.nodes.length);for(const n of p.nodes){assert(n.toTex());assert.equal(n.cloneDeep().toString(),n.toString());}}
 assert(lawCandidates('a^m*a^n',math).length);assert(lawCandidates('log(x-1,2)=3',math).length);
});
test('300 saved rows remain available without initial full-history or closed-example rendering',async()=>{
 const {window,document}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 const rows=Array.from({length:300},(_,i)=>({value:`(x+${i+1})(x-${i+2})`,title:`기록${i+1}`,explanation:`풀이 ${i+1}`,bindings:{},conditions:[]}));
 const storage=new Map([['susik-lab.workspace.v1',JSON.stringify({rows,active:299})]]),copied=[];
 window.math=math;window.innerHeight=800;window.innerWidth=360;window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLElement.prototype.getBoundingClientRect=()=>({height:320});
 Object.assign(globalThis,{window,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>f()});Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async t=>copied.push(t)}},configurable:true});
 (await import('../dist/workspace-app.js')).startWorkspace();
 const $=s=>{const el=document.querySelector(s);assert(el,'Missing '+s);return el;},click=s=>$(s).click();
 assert.equal(document.querySelectorAll('.work-row').length,24);assert.equal(document.querySelectorAll('[data-example]').length,0);assert.equal(JSON.parse(storage.get('susik-lab.workspace.v1')).rows.length,300);
 assert($('[data-work-row="299"]'));click('[data-history-page="252"]');assert($('[data-work-row="252"]'));assert.equal(JSON.parse(storage.get('susik-lab.workspace.v1')).active,299);
 click('[data-direct-previous]');assert.equal(JSON.parse(storage.get('susik-lab.workspace.v1')).active,298);assert($('[data-work-row="298"]'));assert.equal(document.querySelectorAll('.work-row').length,24);
 const examples=$('[data-work-examples]');examples.open=true;examples.dispatchEvent(new window.Event('toggle'));assert.equal(document.querySelectorAll('[data-example]').length,13);
 click('[data-copy-menu]');click('[data-copy-format="steps"]');await Promise.resolve();assert.match(copied[0],/풀이 1\n/);assert.match(copied[0],/풀이 300/);click('[data-task-close]');
 assert.equal(JSON.parse(storage.get('susik-lab.workspace.v1')).rows.length,300);
});
