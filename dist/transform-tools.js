import {C,Q,normalize,parse,evaluate,checkStep} from './engine.js';
import {scalarLatex,integerDivisors} from './number-tools.js';

const trim=p=>{while(p.length>1&&p.at(-1).zero)p.pop();return p;};
const isZero=p=>p.every(c=>c.zero);
const text=(source,node)=>source.slice(node.start,node.end);
const wrap=s=>`\\left(${s}\\right)`;
function signedTerms(node,sign=1){
 if(node.op==='add')return [...signedTerms(node.a,sign),...signedTerms(node.b,sign)];
 if(node.op==='sub')return [...signedTerms(node.a,sign),...signedTerms(node.b,-sign)];
 if(node.op==='neg')return signedTerms(node.a,-sign);
 return [{node,sign}];
}
function exponent(node){
 if(node.op==='num'&&node.v.d===1n)return Number(node.v.n);
 if(node.op==='neg')return -exponent(node.a);
 return NaN;
}
export function transformationTargets(raw,mode){
 let source,ast;try{source=normalize(raw);ast=parse(source);}catch{return {source:'',targets:[]};}
 const targets=[];
 function visit(node,path='root'){
  const terms=signedTerms(node);
  const matches=mode==='cancel'?node.op==='div':mode==='common'?
   ['add','sub','neg'].includes(node.op)&&terms.length>=2&&terms.length<=8&&terms.every(t=>t.node.op==='div'):
   mode==='expand'?node.op==='mul'&&[node.a,node.b].some(n=>['add','sub'].includes(n.op))||node.op==='pow'&&['add','sub'].includes(node.a.op)&&exponent(node.b)===2:
   mode==='power'?node.op==='pow'&&node.a.op==='var'&&Number.isInteger(exponent(node.b)):false;
  if(matches)targets.push({id:path,node,label:text(source,node)});
  if(node.a)visit(node.a,path+'.a');if(node.b&&node.op!=='pow')visit(node.b,path+'.b');
 }
 visit(ast);return {source,targets};
}
function selection(raw,mode,id){
 const {source,targets}=transformationTargets(raw,mode),target=targets.find(t=>t.id===id);
 if(!target)throw Error('변형할 부분을 다시 골라 주세요.');
 return {source,...target};
}
function variable(raw){const names=[...new Set(raw.match(/[xt]/g)||[])];if(names.length>1)throw Error('이 도구에서는 x와 t 중 한 문자로 된 부분을 골라 주세요.');return names[0]||'x';}
function polynomial(ast,name){const v=evaluate(ast,name==='t'?'x':null);if(v.d.length!==1)throw Error('분자·분모와 나눌 식을 각각 다항식으로 적어 주세요.');return trim(v.n.map(c=>c.mul(v.d[0].inv())));}
export function dividePolynomialWithRemainder(numerator,divisor){
 let rest=trim([...numerator]),d=trim([...divisor]);if(isZero(d))throw Error('0인 식으로 나눌 수 없습니다.');
 const quotient=Array.from({length:Math.max(1,rest.length-d.length+1)},()=>new C(0));
 while(!isZero(rest)&&rest.length>=d.length){
  const shift=rest.length-d.length,k=rest.at(-1).mul(d.at(-1).inv());quotient[shift]=quotient[shift].add(k);
  d.forEach((c,i)=>rest[i+shift]=rest[i+shift].add(c.mul(k).neg()));trim(rest);
 }
 return {quotient:trim(quotient),remainder:rest};
}
export function dividePolynomial(numerator,divisor){
 const {quotient,remainder}=dividePolynomialWithRemainder(numerator,divisor);
 if(!isZero(remainder))throw Error('선택한 식으로 나누어떨어지지 않습니다. 공통인수나 공통분모를 다시 확인해 주세요.');
 return quotient;
}
export function polynomialLatex(coefficients,name='x'){
 let result='';
 for(let degree=coefficients.length-1;degree>=0;degree--){
  let c=coefficients[degree];if(c.zero)continue;
  const neg=c.im.zero&&c.re.n<0n;if(neg)c=c.neg();
  const symbol=degree?name+(degree>1?`^{${degree}}`:''):'';
  const coefficient=degree&&c.eq(new C(1))?'':c.im.zero?scalarLatex(c):wrap(scalarLatex(c));
  result+=(neg?'-':result?'+':'')+coefficient+symbol;
 }
 return result||'0';
}
export function algebraContext(source,problem={}){
 const context={...problem,binding:problem.binding??(source.includes('t')?'x':null)};
 if(source.includes('t')&&!source.includes('x')&&context.binding){try{evaluate(parse(context.binding));}catch{context.binding='x';context.excluded=[];}}
 return context;
}
function replace(source,node,replacement,problem={}){
 const result=source.slice(0,node.start)+wrap(replacement)+source.slice(node.end);
 const check=checkStep(result,{topic:'expand',excluded:[],...algebraContext(source,problem),expression:source});
 if(!check.ok)throw Error(check.message);
 return result;
}
export function cancelFraction(raw,id,factor,problem={}){
 const {source,node}=selection(raw,'cancel',id),name=variable(text(source,node)+normalize(factor));
 const d=polynomial(parse(factor),name),a=dividePolynomial(polynomial(node.a,name),d),b=dividePolynomial(polynomial(node.b,name),d);
 const replacement=b.length===1&&b[0].eq(new C(1))?polynomialLatex(a,name):`\\frac{${polynomialLatex(a,name)}}{${polynomialLatex(b,name)}}`;
 return replace(source,node,replacement,problem);
}
export function commonDenominator(raw,id,denominator,problem={}){
 const {source,node}=selection(raw,'common',id),name=variable(text(source,node)+normalize(denominator));
 const d=polynomial(parse(denominator),name);if(isZero(d))throw Error('공통분모는 0인 식이 될 수 없습니다.');
 const den=polynomialLatex(d,name),terms=signedTerms(node);
 const parts=terms.map(({node:n,sign},i)=>{
  const multiplier=dividePolynomial(d,polynomial(n.b,name));
  let numerator=text(source,n.a);
  if(!(multiplier.length===1&&multiplier[0].eq(new C(1))))numerator=wrap(numerator)+'\\cdot '+wrap(polynomialLatex(multiplier,name));
  return (sign<0?'-':i?'+':'')+`\\frac{${numerator}}{${den}}`;
 });
 return replace(source,node,parts.join(''),problem);
}
export function commonSuggestions(raw,id){
 const {source,node}=selection(raw,'common',id),terms=signedTerms(node),name=variable(text(source,node));
 const denominators=terms.map(t=>polynomial(t.node.b,name));
 if(denominators.every(p=>p.length===1&&p[0].im.zero&&p[0].re.d===1n&&!p[0].zero)){
  const gcd=(a,b)=>{while(b)[a,b]=[b,a%b];return a;};let lcm=1n;
  for(const p of denominators){const n=p[0].re.n<0n?-p[0].re.n:p[0].re.n;lcm=lcm/gcd(lcm,n)*n;}
  return [1n,2n,3n].map(n=>String(lcm*n));
 }
 return ['('+terms.map(t=>'('+text(source,t.node.b)+')').join('*')+')'];
}
export function cancelSuggestions(raw,id){
 const {source,node}=selection(raw,'cancel',id),name=variable(text(source,node));
 const a=polynomial(node.a,name),b=polynomial(node.b,name),out=[];
 if([...a,...b].every(c=>c.im.zero&&c.re.d===1n)){
  const gcd=(x,y)=>{x=x<0n?-x:x;y=y<0n?-y:y;while(y)[x,y]=[y,x%y];return x;};
  const g=[...a,...b].reduce((v,c)=>gcd(v,c.re.n),0n);
  if(g>1n)out.push(...integerDivisors(new Q(g)).filter(q=>q.n!==1n).map(String));
 }
 function factors(n){return n.op==='mul'?[...factors(n.a),...factors(n.b)]:n.op==='neg'?factors(n.a):[n];}
 for(const n of [...factors(node.a),...factors(node.b)])try{
  const p=polynomial(n,name);if(p.length<2)continue;dividePolynomial(a,p);dividePolynomial(b,p);out.push(text(source,n));
 }catch{}
 return [...new Set(out)].slice(0,8);
}
export function expandPart(raw,id,problem={}){
 const {source,node}=selection(raw,'expand',id);
 const left=signedTerms(node.a),right=signedTerms(node.op==='pow'?node.a:node.b);
 const parts=[];for(const a of left)for(const b of right){const sign=a.sign*b.sign;parts.push((sign<0?'-':parts.length?'+':'')+wrap(text(source,a.node))+'\\cdot '+wrap(text(source,b.node)));}
 return replace(source,node,parts.join(''),problem);
}
export function splitPower(raw,id,first,problem={}){
 const {source,node}=selection(raw,'power',id),a=Number(first),b=exponent(node.b)-a;
 if(String(first).trim()===''||!Number.isInteger(a)||Math.abs(a)>12||Math.abs(b)>12)throw Error('두 지수 모두 −12부터 12 사이의 정수가 되도록 골라 주세요.');
 const base=text(source,node.a),result=`${wrap(base)}^{${a}}\\cdot ${wrap(base)}^{${b}}`;
 return replace(source,node,result,problem);
}
