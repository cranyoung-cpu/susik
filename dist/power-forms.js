import {C,Q} from './scalars.js';
import {directTerms,monomialTerm,replaceDirectTerms} from './direct-tools.js';
import {sumTermLatex} from './number-tools.js';
function integerRoot(value,n){
 if(value<0n)return null;if(value<2n)return value;
 let low=0n,high=1n<<BigInt(Math.ceil(value.toString(2).length/n)+1),power=BigInt(n);
 while(low+1n<high){const mid=(low+high)/2n;if(mid**power<=value)low=mid;else high=mid;}
 return low**power===value?low:null;
}
function rationalRoot(q,n){const a=integerRoot(q.n,n),b=integerRoot(q.d,n);return a===null||b===null?null:new Q(a,b);}
function coefficientRoot(z,n){
 if(z.im.zero){const negative=z.re.n<0n,q=rationalRoot(negative?z.re.neg():z.re,n);if(!q)return null;return {value:new C(negative&&n%2?q.neg():q),minus:negative&&n%2===0};}
 if(n!==2)return null;
 const norm=rationalRoot(z.re.mul(z.re).add(z.im.mul(z.im)),2);if(!norm)return null;
 const a=rationalRoot(norm.add(z.re).mul(new Q(1,2)),2),b=rationalRoot(norm.add(z.re.neg()).mul(new Q(1,2)),2);if(!a||!b)return null;
 return {value:new C(a,z.im.n<0n?b.neg():b),minus:false};
}
// Only exact rational/Gaussian-rational roots; no approximate equality or branch assumptions.
export function powerFormDirectTerm(raw,id,exponent,problem={}){
 const text=String(exponent).trim(),n=Number(text);if(!/^\d+$/.test(text)||!Number.isInteger(n)||n<2||n>12)throw Error('지수는 2부터 12까지의 정수로 골라 주세요.');
 const term=directTerms(raw).terms[id];if(!term)throw Error('거듭제곱으로 바꿀 항 하나를 선택해 주세요.');
 const {value,degree,name}=monomialTerm(term.raw);if(degree%n)throw Error('문자 지수가 나누어떨어지는 지수를 골라 주세요.');
 const root=coefficientRoot(value,n);if(!root)throw Error('이 지수에서는 정확한 유리수·복소수 밑을 만들 수 없습니다. 다른 지수를 골라 주세요.');
 const d=degree/n,base=sumTermLatex(root.value,d?name+(d>1?`^{${d}}`:''):''),formed=(root.minus?'-':'')+`\\left(${base}\\right)^{${n}}`;
 const change=replaceDirectTerms(raw,[id],formed,problem);return {...change,formed};
}
export function powerFormChoices(raw,id,problem={}){
 const choices=[];for(let n=2;n<=12;n++)try{const change=powerFormDirectTerm(raw,id,n,problem);choices.push({value:String(n),label:change.formed});}catch{}
 return choices;
}
