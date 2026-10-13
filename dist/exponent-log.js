import {TRIG_EXAMPLES} from './trig-examples.js';
import {formatMathNode} from './expression-format.js';
import {parseCalculation} from './calculation.js';
import {parse,evaluate,C,Q} from './engine.js';
import {polynomialLatex} from './transform-tools.js';
const un=n=>n?.isParenthesisNode?un(n.content):n;
const str=n=>un(n).toString({parenthesis:'auto',implicit:'show'});
const op=(n,o)=>un(n)?.isOperatorNode&&un(n).op===o&&un(n).args.length===2;
const pow=n=>op(n,'^')?un(n).args.map(un):null;
function constant(n){try{const v=evaluate(parse(str(n)));if(v.n.length!==1||v.d.length!==1)return null;const c=v.n[0].mul(v.d[0].inv());return c.im.zero?c.re:null;}catch{return null;}}
const integer=n=>{const q=constant(n);return q&&q.d===1n&&q.n>=-12n&&q.n<=12n?Number(q.n):null;};
function log(n){n=un(n);if(!n?.isFunctionNode||!['ln','log'].includes(n.fn.name))return null;return {arg:n.args[0],base:n.fn.name==='ln'?'e':n.args.length===1?'10':str(n.args[1])};}
function positive(text,requirements,math,base=false){if(text==='e'||text==='pi')return true;const q=constant(math.parse(text));if(q)return q.n>0n&&(!base||q.n!==q.d);if(/\bi\b/.test(text))return false;requirements.push(`${text} > 0`);if(base)requirements.push(`${text} ≠ 1`);return true;}
const qpow=(b,n)=>{if(n<0){b=b.inv();n=-n;}return new Q(b.n**BigInt(n),b.d**BigInt(n));};
function exactLog(b,q){if(!b||!q||b.n<=0n||b.n===b.d||q.n<=0n)return null;for(let n=-12;n<=12;n++){const power=qpow(b,n);if(power.eq(q))return n;}return null;}
function simplifyExponent(text){try{const v=evaluate(parse(text));if(v.d.length!==1)return text;return polynomialLatex(v.n.map(c=>c.mul(v.d[0].inv())));}catch{return text;}}
export function lawCandidates(raw,provided){
 const {nodes,math,variables}=parseCalculation(raw,provided),out=[];
 let invalid=false;for(const root of nodes)root.traverse(n=>{const l=log(n);if(l){const b=constant(math.parse(l.base)),a=constant(l.arg);if(b&&(b.n<=0n||b.n===b.d)||a&&a.n<=0n)invalid=true;}if(op(n,'/')&&constant(un(n).args[1])?.n===0n)invalid=true;const p=pow(n);if(p&&constant(p[0])?.n===0n){const exponent=constant(p[1]);if(exponent&&exponent.n<=0n)invalid=true;}});if(invalid)return [];
 const real=variables.length?variables.map(v=>`${v==='theta'?'θ':v}는 실수`):[];
 function emit(node,side,replacement,title,explanation,requirements=[],rule=''){
  try{const changed=nodes[side].transform(n=>n===node?new math.ParenthesisNode(math.parse(replacement)):n),result=nodes.map((n,i)=>i===side?formatMathNode(changed):str(n)).join(' = ');
   if(out.some(c=>c.value===result))return;out.push({value:result,title,explanation,conditions:[...new Set([...real,...requirements])],rule});}catch{}
 }
 function at(node,side){
  const n=un(node);if(node!==n)return;let req=[];
  if(op(n,'*')||op(n,'/')){
   const a=pow(n.args[0]),b=pow(n.args[1]);if(a&&b&&str(a[0])===str(b[0])&&positive(str(a[0]),req,math)){
    const sign=n.op==='*'?'+':'-',exponent=simplifyExponent(`(${str(a[1])})${sign}(${str(b[1])})`);
    emit(n,side,`(${str(a[0])})^(${exponent})`,n.op==='*'?'같은 밑의 곱':'같은 밑의 몫',n.op==='*'?'밑은 그대로 두고 지수를 더합니다.':'밑은 그대로 두고 분자의 지수에서 분모의 지수를 뺍니다.',req,'exponent');
   }
  }
  const p=pow(n);
  if(p){const inner=pow(p[0]);req=[];
   if(inner&&positive(str(inner[0]),req,math))emit(n,side,`(${str(inner[0])})^(${simplifyExponent(`(${str(inner[1])})*(${str(p[1])})`)})`,'거듭제곱의 거듭제곱','양의 밑에서 거듭제곱을 다시 거듭제곱하면 지수를 곱합니다.',req,'exponent');
   const l=log(p[1]);req=[];if(l&&l.base===str(p[0])&&positive(l.base,req,math,true)&&positive(str(l.arg),req,math))emit(n,side,str(l.arg),'지수와 로그의 역관계','같은 밑의 지수함수와 로그함수는 서로 역함수입니다. 진수의 양수 조건을 유지합니다.',req,'inverse');
   const b=constant(p[0]),exp=constant(p[1]);if(b&&exp&&b.n>0n&&exp.d===1n&&exp.n>=-12n&&exp.n<=12n){const z=qpow(b,Number(exp.n));emit(n,side,z.toString(),'거듭제곱 계산','정수 지수의 정의에 따라 정확한 유리수 값으로 계산합니다. 음의 지수는 역수를 취합니다.',[],'numeric');}
   if(str(p[0])==='e'&&integer(p[1])===0)emit(n,side,'1','0제곱','0이 아닌 수의 0제곱은 1입니다.',[],'numeric');
  }
  if(op(n,'+')||op(n,'-')){const a=log(n.args[0]),b=log(n.args[1]);req=[];
   if(a&&b&&a.base===b.base&&positive(a.base,req,math,true)&&positive(str(a.arg),req,math)&&positive(str(b.arg),req,math))emit(n,side,`log((${str(a.arg)})${n.op==='+'?'*':'/'}(${str(b.arg)}),${a.base})`,n.op==='+'?'로그의 합':'로그의 차',n.op==='+'?'같은 밑의 로그를 더하면 진수의 곱에 대한 로그가 됩니다. 각각의 진수는 양수여야 합니다.':'같은 밑의 로그를 빼면 진수의 몫에 대한 로그가 됩니다. 각각의 진수는 양수여야 합니다.',req,'log');
  }
  const l=log(n);if(l){req=[];if(!positive(l.base,req,math,true))return;
   const p=pow(l.arg);if(p&&str(p[0])===l.base)emit(n,side,str(p[1]),'로그의 정의','밑을 몇 제곱했는지를 읽습니다. logₐ(aᵘ) = u입니다.',req,'inverse');
   else if(p&&positive(str(p[0]),req,math))emit(n,side,`(${str(p[1])})*log(${str(p[0])},${l.base})`,'로그의 지수 내리기','양의 진수의 거듭제곱에서 지수를 로그 앞의 계수로 옮깁니다.',req,'log');
   req=[];const arg=un(l.arg);if((op(arg,'*')||op(arg,'/'))&&positive(l.base,req,math,true)&&positive(str(arg.args[0]),req,math)&&positive(str(arg.args[1]),req,math))emit(n,side,`log(${str(arg.args[0])},${l.base})${arg.op==='*'?'+':'-'}log(${str(arg.args[1])},${l.base})`,'로그 펼치기','각 인수가 양수일 때 곱의 로그는 합으로, 몫의 로그는 차로 펼칩니다.',req,'log-expand');
   const exponent=exactLog(constant(math.parse(l.base)),constant(l.arg));if(exponent!==null)emit(n,side,String(exponent),'로그 값 계산',`${l.base}의 ${exponent}제곱이 진수이므로 로그 값은 ${exponent}입니다.`,[],'numeric');
   req=[];if(l.base!=='e'&&positive(l.base,req,math,true)&&positive(str(l.arg),req,math))emit(n,side,`ln(${str(l.arg)})/ln(${l.base})`,'밑 바꾸기','같은 밑의 로그로 진수와 원래 밑의 로그를 나눕니다. 여기서는 자연로그를 사용합니다.',req,'base-change');
  }
 }
 for(let side=0;side<nodes.length;side++)nodes[side].traverse(n=>at(n,side));
 if(nodes.length===2){
  let left=un(nodes[0]),right=un(nodes[1]),p=pow(left),l=log(left),req=[];
  const eq=(value,title,explanation,conditions=[])=>out.unshift({value,title,explanation,conditions:[...new Set([...real,...conditions])],rule:'equation'});
  if(p&&positive(str(p[0]),req,math,true)){
   const rp=pow(right),k=exactLog(constant(p[0]),constant(right));
   if(rp&&str(rp[0])===str(p[0]))eq(`${str(p[1])} = ${str(rp[1])}`,'같은 밑의 지수 비교','밑이 양수이고 1이 아니면 지수함수는 일대일입니다. 두 지수가 같은 방정식으로 바꿉니다.',req);
   else if(k!==null)eq(`${str(p[1])} = ${k}`,'밑 통일 후 지수 비교',`우변을 같은 밑의 ${k}제곱으로 나타냅니다. 밑이 양수이고 1이 아니므로 지수가 같아야 합니다.`,req);
  }
  // The definition applies to either side, symbolic bases and natural logs too.
  for(const side of [0,1]){
   const a=un(nodes[side]),other=un(nodes[1-side]),lg=log(a),power=pow(a);req=[];
   if(/\bi\b/.test(str(a)+' '+str(other)))continue;
   if(lg&&positive(lg.base,req,math,true)&&positive(str(lg.arg),req,math)){
    if(!constant(other))req.push(`${str(other)}는 실수`);
    const exponential=formatMathNode(lg.arg);
    const value=`${exponential} = ${formatMathNode(math.parse(`(${lg.base})^(${str(other)})`))}`;
    eq(value,'로그방정식을 지수식으로','로그의 정의 logₐ(U) = c ⇔ U = aᶜ를 적용합니다. 지수식으로 바꾼 과정을 먼저 남기고, 다음 단계에서 거듭제곱을 계산합니다.',req);
   }
   if(power&&positive(str(power[0]),req,math,true)&&positive(str(other),req,math)){
    if(!constant(power[1]))req.push(`${str(power[1])}는 실수`);
    out.push({value:`${str(power[1])} = log(${str(other)},${str(power[0])})`,title:'지수방정식을 로그식으로',explanation:'지수와 로그의 정의 aᶜ = U ⇔ c = logₐ(U)를 적용합니다. 밑과 진수의 조건을 유지합니다.',conditions:[...new Set([...real,...req])],rule:'equation'});
   }
  }
  try{const diff=evaluate(parse(`(${str(left)})-(${str(right)})`));if(diff.d.length===1&&diff.n.length===2&&!diff.n[1].zero&&diff.n.every(c=>c.im.zero)){
   const answer=diff.n[0].neg().mul(diff.n[1].inv()).toString();if(!(left.isSymbolNode&&left.name==='x'&&str(right)===answer))eq(`x = ${answer}`,'일차방정식 정리','상수항을 이항한 뒤 x의 0이 아닌 계수로 나눕니다. 앞 단계의 조건은 계속 유지합니다.');
  }}catch{}
 }
 return out.slice(0,30);
}
export const WORK_EXAMPLES=[
 ...TRIG_EXAMPLES,
 {id:'quadratic-balance',group:'이차방정식',title:'양변 조작으로 완전제곱',value:'2x^2-16x+14 = 0',condition:'x는 실수',goal:'양변을 2로 나누고 상수항을 이항한 뒤 완전제곱식을 만드세요.'},
 {id:'expand',group:'전개',title:'두 괄호의 곱',value:'(x+2)(x-3)',condition:'x는 실수',goal:'괄호를 펼치고 동류항을 정리하세요.'},
 {id:'cube',group:'전개',title:'세제곱 전개',value:'(x+1)^3',condition:'x는 실수',goal:'거듭제곱을 곱으로 바꾸어 전개하세요.'},
 {id:'split',group:'인수분해',title:'중간항 나누기',value:'2x^2-16x+14',condition:'x는 실수',goal:'−16x를 두 항으로 나누어 공통인수를 찾으세요.'},
 {id:'power-product',group:'지수',title:'같은 밑의 곱',value:'2^(x+1)*2^(2x-3)',condition:'x는 실수',goal:'하나의 거듭제곱으로 나타내세요.'},
 {id:'power-quotient',group:'지수',title:'몫과 음의 지수',value:'3^(x-2)/3^(x+1)',condition:'x는 실수',goal:'지수법칙을 적용하고 정확한 값을 구하세요.'},
 {id:'power-power',group:'지수',title:'거듭제곱의 거듭제곱',value:'(2^(x+1))^3',condition:'x는 실수',goal:'지수를 곱해 정리하세요.'},
 {id:'power-equation',group:'지수',title:'지수방정식',value:'2^(2x-1) = 8',condition:'x는 실수',goal:'밑을 통일하고 방정식의 해를 구하세요.'},
 {id:'log-add',group:'로그',title:'로그의 합',value:'log(x,2)+log(4,2)',condition:'x는 실수, x > 0',assumptions:['x > 0'],goal:'하나의 로그로 나타내세요.'},
 {id:'log-expand',group:'로그',title:'곱의 로그 전개',value:'ln(3*x^2)',condition:'x는 실수, x > 0',assumptions:['x > 0','x ^ 2 > 0'],goal:'로그의 곱·거듭제곱 법칙으로 펼치세요.'},
 {id:'log-change',group:'로그',title:'밑 바꾸기',value:'log(x,2)',condition:'x는 실수, x > 0',assumptions:['x > 0'],goal:'자연로그를 이용해 나타내세요.'},
 {id:'log-equation',group:'로그',title:'로그방정식',value:'log(x-1,2) = 3',condition:'x는 실수, x > 1',assumptions:['x - 1 > 0'],goal:'진수 조건을 유지하며 해를 구하세요.'},
 {id:'natural',group:'지수·로그',title:'자연지수와 자연로그',value:'e^ln(x)',condition:'x는 실수, x > 0',assumptions:['x > 0'],goal:'역함수 관계를 이용해 정리하세요.'}
];
