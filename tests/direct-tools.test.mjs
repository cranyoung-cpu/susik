import test from 'node:test';
import assert from 'node:assert/strict';
import {equivalent,checkStep} from '../dist/engine.js';
import {directTerms,splitDirectTerm,factorDirectTerms,reorderDirectTerm,replaceDirectTerms} from '../dist/direct-tools.js';

test('direct term selection preserves groups and carries subtraction with the chosen term',()=>{
 assert.deepEqual(directTerms('2x^2-16x+14').terms.map(t=>t.raw),['2x^2','-16x','14']);
 assert.deepEqual(directTerms('(x+2)(x-3)-x^(-2)+1/2').terms.map(t=>t.raw),['(x+2)(x-3)','-x^(-2)','1/2']);
 assert.equal(reorderDirectTerm('2x^2-16x+14',1,2),'2x^2+14-16x');
 assert.equal(reorderDirectTerm('2x^2-16x+14',1,0),'-16x+2x^2+14');
 assert.throws(()=>reorderDirectTerm('x+1',0,2));
});
test('one short coefficient input splits signed, fractional and complex monomials exactly',()=>{
 assert.equal(splitDirectTerm('2x^2-16x+14',1,'-14').result,'2x^2-14x-2x+14');
 for(const raw of ['x^2+5x+6','-x+2','(1+i)x^2-2x+1','2/3x+1','t^2-16t+14'])for(let id=0;id<directTerms(raw).terms.length;id++)for(const first of ['0','-14','1/2','1+i']){
  const p=raw.includes('t')?{binding:'x+1'}:{};
  const result=splitDirectTerm(raw,id,first,'sum',p).result;
  assert(equivalent(raw,result,p.binding));
 }
 assert.throws(()=>splitDirectTerm('x/x+1',0,'1'));
 assert.throws(()=>splitDirectTerm('24x',0,'0','product'));
 assert(equivalent('24x',splitDirectTerm('24x',0,'1+i','product').result));
});
test('the split/group/group/group workflow reaches a factorized answer without rewriting a line',()=>{
 const original='2x^2-16x+14';
 let raw=splitDirectTerm(original,1,'-14').result;
 raw=factorDirectTerms(raw,[0,1],'2x').result;
 assert(equivalent(raw,'2x(x-7)-2x+14'));assert.equal(directTerms(raw).terms.length,3);
 raw=factorDirectTerms(raw,[1,2],'-2').result;
 assert(equivalent(raw,'2x(x-7)-2(x-7)'));assert.equal(directTerms(raw).terms.length,2);
 raw=factorDirectTerms(raw,[0,1],'x-7').result;
 assert.equal(checkStep(raw,{topic:'factor',expression:original,excluded:[]}).ok,true);
});
test('grouping validates every selected term and leaves unselected terms intact',()=>{
 assert.throws(()=>factorDirectTerms('2x^2-14x+3',[0,1],'x-7'));
 assert.throws(()=>factorDirectTerms('2x+4',[0,1],'0'));
 assert.throws(()=>factorDirectTerms('2x+4',[0],'2'));
 const raw='2x^2+5-14x+7';const result=factorDirectTerms(raw,[0,2],'2x').result;
 assert(equivalent(raw,result));assert(result.endsWith('+5+7'));
 assert(equivalent('(1+i)x+(1+i)',factorDirectTerms('(1+i)x+(1+i)',[0,1],'1+i').result));
});
test('direct replacement checks equality and rejects new domain holes',()=>{
 const raw='2x^2-16x+14';assert(equivalent(raw,replaceDirectTerms(raw,[1],'-14x-2x').result));
 assert.throws(()=>replaceDirectTerms(raw,[1],'-14x+2x'));
 assert.throws(()=>replaceDirectTerms('x+1',[0],'x^2/x'));
 assert(equivalent('x+1',replaceDirectTerms('x+1',[0],'x^2/x',{excluded:[0]}).result));
});

test('touch suggestions contain useful signed, rational, complex and visible bracket factors',async()=>{
 const {commonFactorChoices}=await import('../dist/direct-tools.js');
 const contains=(raw,ids,f)=>commonFactorChoices(raw,ids).some(c=>equivalent(c.value,f));
 assert(contains('2x^2-14x-2x+14',[0,1],'2x'));
 assert(contains('2x(x-7)-2x+14',[1,2],'-2'));
 assert(contains('2x(x-7)-2(x-7)',[0,1],'x-7'));
 assert(contains('2/3x+4/9',[0,1],'2/9'));
 assert(contains('(1+i)x+(1+i)',[0,1],'1+i'));
 assert(!contains('x^2-1+x^2-2x+1',[0,1],'x-1'));
 for(const raw of ['2x^2-14x+7','2x(x-7)-2(x-7)','(1+i)x+(1+i)','0+2x+4','2/3x+4/9']){
  const ids=directTerms(raw).terms.map(t=>t.id);
  for(const c of commonFactorChoices(raw,ids))assert(equivalent(raw,factorDirectTerms(raw,ids,c.value).result));
 }
});
test('parenthesis grouping preserves signed and non-adjacent terms',async()=>{
 const {groupDirectTerms}=await import('../dist/direct-tools.js');
 assert.equal(groupDirectTerms('2x^2-14x-2x+14',[0,1]).result,'(2x^2-14x)-2x+14');
 assert.equal(groupDirectTerms('x-3+2x-5',[1,3]).result,'x+(-3-5)+2x');
 assert.throws(()=>groupDirectTerms('x+1',[0]));
});
test('scope edits retain outer signs, powers, denominators and repeated occurrences',async()=>{
 const {parenthesisScopes,replaceDirectScope,groupDirectTerms}=await import('../dist/direct-tools.js');
 const raw='-2(2x^2-14x)+(2x^2-14x)^2/(x+1)';
 const scopes=parenthesisScopes(raw);assert.equal(scopes.length,3);
 const change=factorDirectTerms(scopes[1].inner,[0,1],'2x').result;
 const result=replaceDirectScope(raw,scopes[1],change);
 assert(result.startsWith('-2(2x^2-14x)+'));assert(result.endsWith('^2/(x+1)'));
 assert(equivalent(raw,result));
 assert.throws(()=>replaceDirectScope(raw,scopes[1],'x+1'));
 assert.equal(parenthesisScopes('x^(-2)+(x-2)').length,1);
 const parent=parenthesisScopes('3(2(x+1)+4)')[0];
 const child=parenthesisScopes(parent.inner)[0];
 const absolute={...child,innerStart:child.innerStart+parent.innerStart,innerEnd:child.innerEnd+parent.innerStart};
 assert.equal(replaceDirectScope('3(2(x+1)+4)',absolute,groupDirectTerms(child.inner,[0,1]).result),'3(2((x+1))+4)');
});
