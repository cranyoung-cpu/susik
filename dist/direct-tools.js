import {Q,C,normalize,parse,evaluate,equivalent,checkStep} from './engine.js';
import {complex,sumTermLatex} from './number-tools.js';
import {dividePolynomial,dividePolynomialWithRemainder,polynomialLatex,algebraContext} from './transform-tools.js';

// Preserve explicitly grouped sums. A subtraction sign travels with its term.
export function directTerms(raw){
 const source=normalize(raw);parse(source);
 const terms=[];let start=0,depth=0;
 for(let i=0;i<=source.length;i++){
  const c=source[i];if(c==='(')depth++;if(c===')')depth--;
  if(i===source.length||(i>start&&!depth&&/[+-]/.test(c)&&!/[*/^+-]/.test(source[i-1]))){
   const value=source.slice(start,i).replace(/^\+/,'');
   terms.push({id:terms.length,raw:value,start,end:i});start=i;
  }
 }
 return {source,terms};
}
export function joinTerms(terms){return terms.map((s,i)=>(i&&!s.startsWith('-')?'+':'')+s).join('')||'0';}
function nameOf(raw){const names=[...new Set(raw.match(/[xt]/g)||[])];if(names.length>1)throw Error('한 문자로 된 항들을 선택해 주세요.');return names[0]||'x';}
function poly(raw,name){const v=evaluate(parse(raw),name==='t'?'x':null);if(v.d.length!==1)throw Error('묶기는 다항식인 항에 사용할 수 있습니다.');return v.n.map(c=>c.mul(v.d[0].inv()));}
function verify(source,result,problem={}){if(!equivalent(source,result,(source.includes('t')&&!source.includes('x')?'x':problem.binding??null)))throw Error('원래 식과 같지 않습니다. 입력을 확인해 주세요.');return result;}
export function monomialTerm(raw){
 const name=nameOf(raw),p=poly(raw,name),nonzero=p.map((c,i)=>({value:c,degree:i})).filter(t=>!t.value.zero);
 if(nonzero.length>1)throw Error('나누기는 숫자 또는 단항식을 하나 선택해 주세요.');
 const term=nonzero[0]||{value:new C(0),degree:0};
 return {...term,name,tail:term.degree?name+(term.degree>1?`^{${term.degree}}`:''):''};
}
function chosen(raw,ids){
 const info=directTerms(raw),selected=[...new Set(ids)].sort((a,b)=>a-b);
 if(!selected.length||selected.some(i=>!Number.isInteger(i)||!info.terms[i]))throw Error('변형할 항을 선택해 주세요.');
 return {...info,selected};
}
export function splitDirectTerm(raw,id,first,kind='sum',problem={}){
 const {source,terms}=chosen(raw,[id]),{value,tail}=monomialTerm(terms[id].raw),a=complex(first);
 if(kind!=='sum'&&a.zero)throw Error('첫 인수는 0이 될 수 없습니다.');
 const b=kind==='sum'?value.add(a.neg()):value.mul(a.inv());
 const replacement=kind==='sum'?joinTerms([sumTermLatex(a,tail),sumTermLatex(b,tail)]):`\\left(${sumTermLatex(a)}\\right)\\left(${sumTermLatex(b,tail)}\\right)`;
 const all=terms.map(t=>t.raw);all[id]=replacement;
 return {result:verify(source,joinTerms(all),problem),detail:terms[id].raw+'='+replacement};
}
export function factorDirectTerms(raw,ids,factor,problem={}){
 const {source,terms,selected}=chosen(raw,ids);if(selected.length<2)throw Error('함께 묶을 항을 두 개 이상 선택해 주세요.');
 const name=nameOf(selected.map(i=>terms[i].raw).join('')+normalize(factor)),d=poly(factor,name);
 const quotients=selected.map(i=>polynomialLatex(dividePolynomial(poly(terms[i].raw,name),d),name));
 const nonzero=d.filter(c=>!c.zero);if(!nonzero.length)throw Error('0을 공통인수로 꺼낼 수 없습니다.');
 const f=polynomialLatex(d,name),replacement=(nonzero.length>1?`\\left(${f}\\right)`:f)+`\\left(${joinTerms(quotients)}\\right)`;
 const all=terms.flatMap((t,i)=>i===selected[0]?[replacement]:selected.includes(i)?[]:[t.raw]);
 return {result:verify(source,joinTerms(all),problem),detail:joinTerms(selected.map(i=>terms[i].raw))+'='+replacement};
}
export function reorderDirectTerm(raw,from,to,problem={}){
 const {source,terms}=chosen(raw,[from,to]);const all=terms.map(t=>t.raw),[moving]=all.splice(from,1);all.splice(to,0,moving);
 return verify(source,joinTerms(all),problem);
}
export function replaceDirectTerms(raw,ids,replacement,problem={}){
 const {source,terms,selected}=chosen(raw,ids),old=joinTerms(selected.map(i=>terms[i].raw));
 const check=checkStep(replacement,{topic:'expand',excluded:[],...algebraContext(source,problem),expression:old});
 if(!check.ok)throw Error(check.message);
 const value=normalize(replacement),all=terms.flatMap((t,i)=>i===selected[0]?[`(${value})`]:selected.includes(i)?[]:[t.raw]);
 return {result:verify(source,joinTerms(all),problem),detail:old+'='+value};
}

export function groupDirectTerms(raw,ids,problem={}){
 const {source,terms,selected}=chosen(raw,ids);
 if(selected.length<2)throw Error('괄호로 묶을 항을 두 개 이상 선택해 주세요.');
 const part=joinTerms(selected.map(i=>terms[i].raw)),replacement=`(${part})`;
 const all=terms.flatMap((t,i)=>i===selected[0]?[replacement]:selected.includes(i)?[]:[t.raw]);
 return {result:verify(source,joinTerms(all),problem),detail:part+'='+replacement};
}

function selectedPolynomial(raw,ids){
 const info=chosen(raw,ids),part=joinTerms(info.selected.map(i=>info.terms[i].raw)),name=nameOf(part);
 return {...info,part,name,p:poly(part,name)};
}
function replaceSelected(info,replacement,problem){
 const {source,terms,selected}=info,all=terms.flatMap((t,i)=>i===selected[0]?[replacement]:selected.includes(i)?[]:[t.raw]);
 return verify(source,joinTerms(all),problem);
}
const wrap=s=>`\\left(${s}\\right)`;
export function squareSuggestion(raw,ids){
 const {p,name}=selectedPolynomial(raw,ids);
 if(p.length!==3||p[2].zero)throw Error('완전제곱 모양으로 바꿀 이차식을 선택해 주세요.');
 const shift=(p[1]||new C(0)).mul(p[2].mul(2).inv()),base=polynomialLatex([shift,new C(1)],name);
 const a=p[2],coefficient=polynomialLatex([a],name);
 return {value:shift.toString(),base,leading:a,label:(a.eq(1)?'':a.eq(-1)?'-':(a.im.zero?coefficient:wrap(coefficient)))+wrap(base)+'^{2}'};
}
export function squareDirectTerms(raw,ids,shift,problem={}){
 const info=selectedPolynomial(raw,ids),{p,name,part}=info;
 if(p.length!==3||p[2].zero)throw Error('완전제곱 모양으로 바꿀 이차식을 선택해 주세요.');
 const h=complex(shift),a=p[2],b=p[1]||new C(0),c=p[0]||new C(0);
 const remainder=[c.add(a.mul(h).mul(h).neg()),b.add(a.mul(h).mul(2).neg())];
 const base=polynomialLatex([h,new C(1)],name),coefficient=polynomialLatex([a],name);
 const square=(a.eq(1)?'':a.eq(-1)?'-':(a.im.zero?coefficient:wrap(coefficient)))+wrap(base)+'^{2}';
 const rest=polynomialLatex(remainder,name),replacement=rest==='0'?square:joinTerms([square,rest]);
 const expanded=polynomialLatex([a.mul(h).mul(h),a.mul(h).mul(2),a],name);
 return {result:replaceSelected(info,replacement,problem),detail:part+'='+replacement,formed:square,remainder:rest,explanation:part+'-'+wrap(expanded)+'='+rest};
}
export function remainderDirectTerms(raw,ids,factor,problem={}){
 const info=selectedPolynomial(raw,ids),{p,name,part}=info;
 nameOf(part+normalize(factor));const divisor=poly(factor,name);
 const {quotient,remainder}=dividePolynomialWithRemainder(p,divisor);
 if(quotient.every(c=>c.zero))throw Error('선택한 식보다 차수가 낮거나 같은 묶을 식을 골라 주세요.');
 const d=polynomialLatex(divisor,name),q=polynomialLatex(quotient,name),r=polynomialLatex(remainder,name);
 const formed=wrap(d)+wrap(q),replacement=r==='0'?formed:joinTerms([formed,r]);
 return {result:replaceSelected(info,replacement,problem),detail:part+'='+replacement,formed,remainder:r,explanation:part+'-'+formed+'='+r};
}

// Suggestions expose coefficient/variable factors and factors already written.
// They do not solve an un-factored polynomial for the learner.
export function commonFactorChoices(raw,ids){
 const {terms,selected}=chosen(raw,ids);if(selected.length<2)return [];
 const raws=selected.map(i=>terms[i].raw),name=nameOf(raws.join('')),ps=raws.map(s=>poly(s,name));
 const nonzero=ps.flat().filter(c=>!c.zero);if(!nonzero.length)return [];
 const abs=n=>n<0n?-n:n,gcd=(a,b)=>{a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a;};
 const lcm=(a,b)=>a/gcd(a,b)*b;
 const realParts=nonzero.flatMap(c=>[c.re,c.im]).filter(q=>!q.zero);
 const scalar=new C(new Q(realParts.reduce((n,q)=>gcd(n,q.n),0n),realParts.reduce((d,q)=>lcm(d,q.d),1n)));
 const degree=Math.min(...ps.filter(p=>p.some(c=>!c.zero)).map(p=>p.findIndex(c=>!c.zero)));
 const candidates=[],addMono=(z,d)=>candidates.push(sumTermLatex(z,d?name+(d>1?`^{${d}}`:''):''));
 const first=nonzero[0],sign=first.im.zero&&first.re.n<0n?-1:1;
 addMono(scalar.mul(sign),degree);addMono(scalar.mul(-sign),degree);
 if(degree){addMono(new C(1),degree);addMono(new C(-1),degree);}
 addMono(scalar.mul(sign),0);addMono(scalar.mul(-sign),0);
 function visible(n,source){
  if(n.op==='neg'){visible(n.a,source);return;}
  if(n.op==='mul'){visible(n.a,source);visible(n.b,source);return;}
  if(n.op==='div'){visible(n.a,source);return;}
  if(n.op==='pow'){candidates.push(source.slice(n.start,n.end));visible(n.a,source);return;}
  candidates.push(source.slice(n.start,n.end));
 }
 for(const raw of raws){const source=normalize(raw);visible(parse(source),source);}
 // Complex/rational coefficients can also be extracted directly.
 for(const p of ps)if(p.filter(c=>!c.zero).length===1)addMono(p.find(c=>!c.zero),0);
 candidates.push('-1');
 const seen=new Set(),out=[];
 for(const candidate of candidates)try{
  const p=poly(candidate,name),key=p.map(c=>c.toString()).join('|');
  if(seen.has(key)||p.every(c=>c.zero)||p.length===1&&p[0].eq(1))continue;
  ps.forEach(n=>dividePolynomial(n,p));seen.add(key);
  const latex=polynomialLatex(p,name);out.push({value:latex,label:p.filter(c=>!c.zero).length>1?`\\left(${latex}\\right)`:latex});
 }catch{}
 return out.slice(0,12);
}

// Position-based scopes distinguish repeated parentheses. Exponents are not
// editable sum scopes: the engine deliberately accepts integer exponents only.
export function parenthesisScopes(raw){
 const source=normalize(raw);parse(source);const out=[];let depth=0,start=-1,skip=false;
 for(let i=0;i<source.length;i++){
  if(source[i]==='('){if(depth++===0){start=i;skip=/\^[+-]*$/.test(source.slice(0,i));}}
  else if(source[i]===')'&&--depth===0&&!skip){
   const inner=source.slice(start+1,i);
   if(directTerms(inner).terms.length>1||inner.includes('('))out.push({id:String(start),start,end:i+1,innerStart:start+1,innerEnd:i,inner,raw:source.slice(start,i+1)});
  }
 }
 return out;
}
export function replaceDirectScope(raw,scope,replacement,problem={}){
 const source=normalize(raw);
 if(!scope||source[scope.innerStart-1]!=='('||source[scope.innerEnd]!==')'||source.slice(scope.innerStart,scope.innerEnd)!==scope.inner)throw Error('괄호 위치가 바뀌었습니다. 다시 선택해 주세요.');
 verify(scope.inner,replacement,problem);
 return verify(source,source.slice(0,scope.innerStart)+normalize(replacement)+source.slice(scope.innerEnd),problem);
}
