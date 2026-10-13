// Exact Gaussian-rational polynomial arithmetic. No eval, sampled equality, or remote solver.
import {Q,C} from './scalars.js';
import {CalculationError,calculationFailure} from './calculation-errors.js';
export {Q,C} from './scalars.js';
const q=n=>new C(n), trim=p=>{while(p.length>1&&p.at(-1).zero)p.pop();return p;};
const add=(a,b)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||q(0)).add(b[i]||q(0))));
const neg=a=>a.map(x=>x.neg());
function mul(a,b){if(a.length+b.length>28)throw new CalculationError('unsupported','이 버전에서는 24차 이하의 계산을 지원합니다.');const r=Array.from({length:a.length+b.length-1},()=>q(0));a.forEach((x,i)=>b.forEach((y,j)=>r[i+j]=r[i+j].add(x.mul(y))));return trim(r);}
const eqPoly=(a,b)=>trim([...a]).length===trim([...b]).length&&a.every((x,i)=>x.eq(b[i]||q(0)));
const zero=p=>p.every(v=>v.zero);
const rat=(n,d=[q(1)])=>{if(zero(d))throw new CalculationError('undefined','분모가 0인 식입니다.');return {n:trim(n),d:trim(d)}};
const radd=(a,b)=>rat(add(mul(a.n,b.d),mul(b.n,a.d)),mul(a.d,b.d));
const rneg=a=>rat(neg(a.n),a.d);
const rmul=(a,b)=>rat(mul(a.n,b.n),mul(a.d,b.d));
const rinv=a=>rat(a.d,a.n);
function rpow(a,n){if(n<0){a=rinv(a);n=-n;}let r=rat([q(1)]);while(n){if(n%2)r=rmul(r,a);n=Math.floor(n/2);if(n)a=rmul(a,a);}return r;}

function latexGroup(s,start){if(s[start]!=='{')throw new CalculationError('invalid','분수 또는 지수의 괄호를 확인해 주세요.');let depth=1,i=start+1;for(;i<s.length&&depth;i++){if(s[i]==='{')depth++;else if(s[i]==='}')depth--;}if(depth)throw new CalculationError('invalid','괄호가 닫히지 않았습니다.');return [s.slice(start+1,i-1),i];}
export function normalize(raw){
 if(typeof raw!=='string')throw new TypeError('Expression must be a string');
 if(raw.length>600)throw new CalculationError('unsupported','풀이 한 줄은 600자 이내로 적어 주세요.');
 let s=raw.trim().replace(/^\s*=\s*/,'').replace(/\\(?:left|right|displaystyle|textstyle)/g,'').replace(/\\(?:cdot|times)/g,'*').replace(/\\div/g,'/').replace(/\\[,;! ]/g,'').replace(/\\(?:dfrac|tfrac)/g,'\\frac').replace(/\\mathrm\{i\}|\\imaginaryI/g,'i').replace(/\s/g,'');
 let out='';for(let i=0;i<s.length;){if(s.startsWith('\\frac',i)){const [a,j]=latexGroup(s,i+5);const [b,k]=latexGroup(s,j);out+='(('+normalize(a)+')/('+normalize(b)+'))';i=k;}else out+=s[i++];}
 out=out.replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/⁴/g,'^4').replace(/[\[{]/g,'(').replace(/[\]}]/g,')');
 if(!out)throw new CalculationError('invalid','먼저 풀이를 입력해 주세요.');
 if(/[^0-9.xti+\-*/^()]/.test(out))throw new CalculationError('unsupported','이 버전에서는 x, t, i, 숫자, 사칙연산, 괄호와 정수 지수를 입력할 수 있습니다.');
 return out;
}
export function parse(raw){
 const s=normalize(raw), matches=[...s.matchAll(/\d+(?:\.\d+)?|[xti+\-*/^()]/g)],tokens=matches.map(m=>m[0]);if(tokens.join('')!==s)throw new CalculationError('invalid','숫자 표기를 확인해 주세요.');if(tokens.length>200)throw new CalculationError('unsupported','식이 너무 깁니다. 여러 줄로 나눠 주세요.');let i=0,depth=0;
 const position=()=>matches[i]?.index??s.length;
 const binary=(op,a,b)=>({op,a,b,start:a.start,end:b.end});
 function atom(){if(++depth>30)throw new CalculationError('unsupported','괄호가 너무 깊습니다.');let r;const start=position(),t=tokens[i++];if(t==='('){r=sum();if(tokens[i++]!==')')throw new CalculationError('invalid','괄호 짝을 확인해 주세요.');}else if(t==='x'||t==='t')r={op:'var',name:t};else if(t==='i')r={op:'imag'};else if(t&&/^\d/.test(t)){if(t.length>12)throw new CalculationError('unsupported','숫자는 12자리 이내로 입력해 주세요.');const [a,b='']=t.split('.');r={op:'num',v:new Q(BigInt(a+b),10n**BigInt(b.length))};}else throw new CalculationError('invalid','빠진 숫자나 괄호가 있는지 확인해 주세요.');depth--;return {...r,start,end:position()};}
 function power(){let a=atom();if(tokens[i]==='^'){i++;a=binary('pow',a,unary());}return a;}
 function unary(){const start=position();if(tokens[i]==='+'){i++;return {...unary(),start};}if(tokens[i]==='-'){i++;const a=unary();return {op:'neg',a,start,end:a.end};}return power();}
 function product(){let a=unary();while(i<tokens.length){const t=tokens[i];if(t==='*'||t==='/'){i++;a=binary(t==='*'?'mul':'div',a,unary());}else if(t==='('||t==='x'||t==='t'||t==='i'||/^\d/.test(t)){a=binary('mul',a,unary());}else break;}return a;}
 function sum(){let a=product();while(tokens[i]==='+'||tokens[i]==='-'){const t=tokens[i++];a=binary(t==='+'?'add':'sub',a,product());}return a;}
 const ast=sum();if(i!==tokens.length)throw new CalculationError('invalid','괄호나 연산 기호의 위치를 확인해 주세요.');return ast;
}
function integer(ast){if(ast.op==='num'&&ast.v.d===1n)return Number(ast.v.n);if(ast.op==='neg')return -integer(ast.a);throw new CalculationError('unsupported','이 연습에서는 지수를 정수로 입력해 주세요.');}
export function evaluate(ast,binding=null,divisors=[]){
 if(ast.op==='num')return rat([C.from(ast.v)]);
 if(ast.op==='imag')return rat([new C(0,1)]);
 if(ast.op==='var'){if(ast.name==='t'){if(!binding)throw new CalculationError('unsupported','이 문제에서는 문자 x를 사용해 주세요.');return evaluate(parse(binding),null,divisors);}return rat([q(0),q(1)]);}
 const a=evaluate(ast.a,binding,divisors);if(ast.op==='neg')return rneg(a);
 if(ast.op==='pow'){const n=integer(ast.b);if(!Number.isSafeInteger(n)||Math.abs(n)>12)throw new CalculationError('unsupported','지수는 −12부터 12까지 지원합니다.');if(n===0&&zero(a.n))throw new CalculationError('undefined','이 연습에서는 0의 0제곱을 정의하지 않습니다.');if(n<=0)divisors.push(a.n);return rpow(a,n);}
 const b=evaluate(ast.b,binding,divisors);
 if(ast.op==='add')return radd(a,b);if(ast.op==='sub')return radd(a,rneg(b));if(ast.op==='mul')return rmul(a,b);if(ast.op==='div'){divisors.push(b.n);return rmul(a,rinv(b));}throw Error('처리할 수 없는 식입니다.');
}
export function equivalent(a,b,binding=null){const x=evaluate(typeof a==='string'?parse(a):a,binding),y=evaluate(typeof b==='string'?parse(b):b,binding);return eqPoly(mul(x.n,y.d),mul(y.n,x.d));}
function divideByRoot(p,root){if(p.length<2)return null;let carry=p.at(-1);const out=[carry];for(let i=p.length-2;i>0;i--){carry=p[i].add(carry.mul(q(root)));out.unshift(carry);}return p[0].add(carry.mul(q(root))).zero?trim(out):null;}
function domainSafe(p,roots){let rest=trim([...p]);if(zero(rest))return false;for(const root of roots){let next;while((next=divideByRoot(rest,root)))rest=next;}return rest.length===1&&!rest[0].zero;}
export function checkStep(raw,problem){
 try{const ast=parse(raw),divisors=[];evaluate(ast,problem.binding,divisors);if(!equivalent(ast,problem.expression,problem.binding))return {ok:false,status:'different',message:'원래 식과 같지 않습니다. 부호와 계수, 괄호를 확인해 보세요.'};
 if(divisors.some(p=>!domainSafe(p,problem.excluded||[])))return {ok:false,status:'domain',message:'원래 허용 범위에서 분모가 0이 될 수 있거나, 이 버전에서 추가 조건을 확인할 수 없는 식입니다. 나눈 식을 확인해 주세요.'};
 return {ok:true,status:'equivalent',message:'원래 식과 같은 식입니다.'};
 }catch(e){const failure=calculationFailure(e);return {ok:false,status:failure.reason,...failure};}
}
