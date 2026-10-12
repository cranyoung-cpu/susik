import {powerFormChoices} from './power-forms.js';
import {C,Q} from './scalars.js';
import {integerPairs,sumTermLatex} from './number-tools.js';
import {directTerms,monomialTerm,splitDirectTerm,remainderDirectTerms} from './direct-tools.js';
import {commonSuggestions,cancelSuggestions,splitPower,transformationTargets} from './transform-tools.js';
// A small menu of valid operations, not an exhaustive list over Q or C.
export function directChoices(raw,ids,mode,targetId,problem={}){
 const out=[],seen=new Set(),add=(value,label)=>{value=String(value);if(!seen.has(value)){seen.add(value);out.push({value,label:label||value});}};
 if(mode==='sum'||mode==='product'){
  const {terms}=directTerms(raw),term=monomialTerm(terms[ids[0]].raw),z=term.value,candidates=[];
  if(mode==='sum'){
   if(z.im.zero&&z.re.d===1n&&z.re.n!==0n){const n=z.re.n<0n?-z.re.n:z.re.n,sign=z.re.n<0n?-1n:1n;for(let i=1n;i<n&&i<=12n;i++)candidates.push(z.add(new C(-sign*i)));}
   candidates.push(z.mul(new Q(1,2)),new C(1),new C(-1));if(!z.im.zero)candidates.push(new C(z.re),new C(0,z.im));
  }else{
   for(const [a] of integerPairs(z))candidates.push(C.from(a));
   candidates.push(new C(-1),new C(new Q(1,2)));if(!z.im.zero)candidates.push(new C(0,1),z);
  }
  for(const first of candidates)try{splitDirectTerm(raw,ids[0],first.toString(),mode,problem);const second=mode==='sum'?z.add(first.neg()):z.mul(first.inv());const a=sumTermLatex(first,mode==='sum'?term.tail:''),b=sumTermLatex(second,term.tail);add(first.toString(),mode==='sum'?a+(b.startsWith('-')?'':'+')+b:`\\left(${a}\\right)\\left(${b}\\right)`);}catch{}
 }else if(mode==='common'||mode==='cancel'){
  for(const value of (mode==='common'?commonSuggestions:cancelSuggestions)(raw,targetId))add(value);
 }else if(mode==='powerForm'){
  return powerFormChoices(raw,ids[0],problem);
 }else if(mode==='power'){
  const t=transformationTargets(raw,'power').targets.find(t=>t.id===targetId);if(t)for(let first=1;first<=12;first++)try{const changed=splitPower(raw,targetId,String(first),problem);add(first,changed);}catch{}
 }else if(mode==='remainder'){
  const {terms}=directTerms(raw),name=raw.includes('t')?'t':'x',candidates=[name,name+'+1',name+'-1',...terms.filter(t=>!ids.includes(t.id)).map(t=>t.raw)];
  for(const value of candidates)try{remainderDirectTerms(raw,ids,value,problem);add(value);}catch{}
 }
 return out.slice(0,16);
}
