import {tidyMath} from './expression-format.js';
import {parseCalculation} from './calculation.js';
import {parse,evaluate,C} from './engine.js';
const un=n=>n.isParenthesisNode?un(n.content):n;
const text=n=>un(n).toString({parenthesis:'auto',implicit:'show'});
function number(n){try{const v=evaluate(parse(text(n)));if(v.n.length===1&&v.d.length===1)return v.n[0].mul(v.d[0].inv());}catch{}return null;}
function power(n){const c=number(n);return c&&c.im.zero&&c.re.d===1n&&c.re.n>=1n&&c.re.n<=6n?Number(c.re.n):null;}
const join=parts=>parts.map((p,i)=>i&&!p.startsWith('-')?'+'+p:p).join('');
export function symbolicExpansion(raw,provided){
 const {nodes}=parseCalculation(raw,provided);if(nodes.length!==1)throw Error('전개할 좌변 또는 우변을 선택하세요.');let expanded=false;
 const multiply=(a,b)=>{if(a.length*b.length>64)throw Error('전개 결과가 너무 깁니다. 괄호를 나누어 전개하세요.');if(a.length>1||b.length>1)expanded=true;return a.flatMap(x=>b.map(y=>({sign:x.sign*y.sign,factors:[...x.factors,...y.factors]})));};
 function dist(raw){const n=un(raw);if(n.isOperatorNode){const a=n.args;
  if(n.op==='+'&&a.length===2)return [...dist(a[0]),...dist(a[1])];
  if(n.op==='-')return a.length===1?dist(a[0]).map(t=>({...t,sign:-t.sign})):[...dist(a[0]),...dist(a[1]).map(t=>({...t,sign:-t.sign}))];
  if(n.op==='*')return multiply(dist(a[0]),dist(a[1]));
  if(n.op==='^'){const k=power(a[1]),base=un(a[0]);if(k&&base.isOperatorNode&&['+','-'].includes(base.op)){expanded=true;let result=[{sign:1,factors:[]}];for(let i=0;i<k;i++)result=multiply(result,dist(a[0]));return result;}}
 }
 return [{sign:1,factors:[n]}];}
 const terms=dist(nodes[0]);if(terms.length>64)throw Error('한 번에 64항까지 전개할 수 있습니다.');
 const intermediate=join(terms.map(t=>(t.sign<0?'-':'')+t.factors.map(n=>`(${text(n)})`).join('*'))),calculated=terms.map(t=>{
  let coefficient=new C(t.sign),factors=new Map();for(const n of t.factors){const c=number(n);if(c){coefficient=coefficient.mul(c);continue;}let name=text(n),k=1;if(un(n).isOperatorNode&&un(n).op==='^'){const p=power(un(n).args[1]);if(p){name=text(un(n).args[0]);k=p;}}factors.set(name,(factors.get(name)||0)+k);}
  return {coefficient,factors:new Map([...factors].sort(([a],[b])=>a.localeCompare(b)))};
 });
 function term(t){if(t.coefficient.zero)return '0';const c=t.coefficient,negative=c.im.zero&&c.re.n<0n,abs=negative?c.neg():c,symbol=[...t.factors].map(([s,k])=>`(${s})${k===1?'':`^${k}`}`).join('*');return (negative?'-':'')+(symbol?(abs.eq(new C(1))?'':`(${abs})*`)+symbol:abs.toString());}
 const products=join(calculated.map(term)),grouped=new Map();for(const t of calculated){const k=JSON.stringify([...t.factors]);if(grouped.has(k))grouped.get(k).coefficient=grouped.get(k).coefficient.add(t.coefficient);else grouped.set(k,{...t});}
 const collected=join([...grouped.values()].filter(t=>!t.coefficient.zero).map(term))||'0';let previous=raw,steps=[];
 const canonical=s=>parseCalculation(s,provided).nodes[0].toString({parenthesis:'auto',implicit:'show'});
 const add=(value,title,explanation)=>{value=tidyMath(value,{},provided);if(canonical(value)===canonical(previous))return;steps.push({value,title,explanation,conditions:[]});previous=value;};
 if(expanded)add(intermediate,'분배법칙으로 전개','괄호의 모든 항을 서로 곱합니다. 문자가 여러 개이거나 함수가 들어 있어도 같은 분배법칙을 적용합니다. 원래 식의 정의역을 유지합니다.');
 if(expanded||calculated.some(t=>t.factors.size>0&&t.factors.size<terms[calculated.indexOf(t)].factors.length))add(products,'각 곱 계산','계수를 곱하고 같은 인수의 정수 지수를 더합니다. 원래 식이 정의되는 범위를 유지합니다.');
 if(calculated.length!==grouped.size||calculated.some(t=>t.coefficient.zero))add(collected,'동류항 모으기','문자와 함수 부분이 같은 항의 계수를 더합니다. 원래 식의 정의역은 그대로 유지합니다.');
 return steps;
}
