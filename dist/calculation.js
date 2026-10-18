export const CALCULATION_FUNCTION_NAMES=Object.freeze(['sin','cos','tan','asin','acos','atan','sqrt','abs','ln','log','exp']);
const functions=new Set(CALCULATION_FUNCTION_NAMES);
const symbols=new Set(['a','b','c','d','h','k','m','n','p','q','r','s','x','t','u','v','w','y','z','theta','e','pi','i']);
const mathAPI=provided=>provided||globalThis.window?.math||globalThis.math;
function group(s,start){
 if(s[start]!=='{')throw Error('수식의 중괄호를 확인해 주세요.');let depth=1,i=start+1;
 for(;i<s.length&&depth;i++){if(s[i]==='{')depth++;if(s[i]==='}')depth--;}
 if(depth)throw Error('수식의 괄호가 닫히지 않았습니다.');return [s.slice(start+1,i-1),i];
}
export function normalizeMathText(raw){
 let s=String(raw||'').trim();if(!s||s.length>2000)throw Error('수식은 1~2,000자 이내로 입력해 주세요.');
 s=s.replace(/\\\\(?=[a-zA-Z()[\]])/g,'\\').replace(/^\$\$?([\s\S]*?)\$\$?$/,'$1').replace(/^\\[[(]([\s\S]*?)\\[\])]$/,'$1');
 s=s.replace(/\\(?:left|right|displaystyle|textstyle)/g,'').replace(/\\(?:dfrac|tfrac)/g,'\\frac').replace(/\\(?:mathrm|operatorname)\{(e|i|sin|cos|tan|ln|log|exp|abs)\}/g,'$1');
 // Check before converting LaTeX braces to parentheses: (x+1} is not (x+1).
 const delimiters=[];
 for(const c of s){
  if(c==='('||c==='{')delimiters.push(c);
  else if(c===')'||c==='}'){
   if(delimiters.pop()!==(c===')'?'(':'{'))throw Error('수식의 괄호 짝을 확인해 주세요.');
  }
 }
 if(delimiters.length)throw Error('수식의 괄호가 닫히지 않았습니다.');
 s=s.replace(/(?<!\\)\blog_/g,'\\log_');
 let out='';for(let i=0;i<s.length;){
  if(s.startsWith('\\log_',i)){
   let at=i+5,base,arg;while(s[at]===' ')at++;
   if(s[at]==='{'){const g=group(s,at);base=g[0];at=g[1];}else{base=s[at++];}
   while(s[at]===' ')at++;
   if(s[at]==='{'){const g=group(s,at);arg=g[0];at=g[1];}
   else if(s[at]==='('){let depth=1,start=++at;for(;at<s.length&&depth;at++){if(s[at]==='(')depth++;if(s[at]===')')depth--;}if(depth)throw Error('로그의 괄호를 닫아 주세요.');arg=s.slice(start,at-1);}
   else{const m=s.slice(at).match(/^(?:\\(?:theta|pi)|theta|pi|[abcdhkmnpqrstuvwxyzie]|[-+]?\d+(?:\.\d+)?)/);if(!m)throw Error('로그의 진수를 괄호 안에 적어 주세요. 예: log(8,2)');arg=m[0];at+=arg.length;}
   out+='log('+normalizeMathText(arg)+','+normalizeMathText(base)+')';i=at;
  }
  else if(s.startsWith('\\frac',i)){let at=i+5;while(s[at]===' ')at++;const [a,j]=group(s,at);at=j;while(s[at]===' ')at++;const [b,k]=group(s,at);out+='(('+normalizeMathText(a)+')/('+normalizeMathText(b)+'))';i=k;}
  else if(s.startsWith('\\sqrt',i)){let at=i+5;while(s[at]===' ')at++;const [a,j]=group(s,at);out+='sqrt('+normalizeMathText(a)+')';i=j;}
  else out+=s[i++];
 }
 out=out.replace(/\b(arcsin|arccos|arctan)\b/g,(_,f)=>({arcsin:'asin',arccos:'acos',arctan:'atan'}[f]));
 s=out.replace(/\\(arcsin|arccos|arctan)/g,(_,f)=>({arcsin:'asin',arccos:'acos',arctan:'atan'}[f])+' ')
 .replace(/\\(sin|cos|tan|ln|log|exp|theta|pi)/g,'$1 ').replace(/θ/g,'theta').replace(/π/g,'pi')
 .replace(/\\(?:cdot|times)/g,'*').replace(/\\div/g,'/').replace(/\\[,;! ]/g,'').replace(/\\circ/g,'°')
 .replace(/[−–—]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/⁴/g,'^4').replace(/[{}]/g,c=>c==='{'?'(':')');
 s=s.replace(/\^?\(°\)|\^?°/g,'');
 s=s.replace(/(sin|cos|tan)\s*\^\s*(?:\(([-+]?\d+)\)|([-+]?\d+))\s*(theta|pi|[xt]|e|\([^()]*\))/g,(_,f,a,b,arg)=>`(${f}(${arg}))^(${a||b})`);
 s=s.replace(/(sin|cos|tan|ln|log|exp|abs)\s+(theta|pi|[xt]|e|[-+]?\d+(?:\.\d+)?)/g,'$1($2)').replace(/(sin|cos|tan|ln|log)(theta|pi|[xt])/g,'$1($2)');
 // A variable followed by a bracket is multiplication, not a user-defined function.
 s=s.replace(/(?<![a-zA-Z])(theta|pi|[abcdhkmnpqrstuvwxyzie])\s*(?=\()/g,'$1*');
 if(/[^0-9a-zA-Z+\-*/^().,=\s]/.test(s))throw Error('지원하지 않는 기호가 있습니다. sin·cos·tan·ln·log·sqrt, π·e·i, x·t·θ를 사용할 수 있습니다.');
 return s.trim();
}
export function equationParts(raw){const s=normalizeMathText(raw),parts=s.split('=');if(parts.length>2||parts.some(p=>!p.trim()))throw Error('좌변과 우변이 있는 등식 하나를 입력해 주세요.');return parts.map(p=>p.trim());}
export function parseCalculation(raw,provided){
 const math=mathAPI(provided);if(!math)throw Error('계산 도구를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.');
 const parts=equationParts(raw),variables=new Set();let count=0;
 function check(node,depth=0){
  if(++count>220||depth>35)throw Error('수식이 너무 복잡합니다. 짧은 부분으로 나누어 주세요.');
  if(node.isConstantNode){if(typeof node.value!=='number'||!Number.isFinite(node.value))throw Error('유한한 숫자만 입력해 주세요.');return;}
  if(node.isSymbolNode){if(!symbols.has(node.name))throw Error('x, a, b, m, n, t, u, v 등 한 글자 문자와 θ를 사용할 수 있습니다.');if(!['e','pi','i'].includes(node.name))variables.add(node.name);return;}
  if(node.isParenthesisNode){check(node.content,depth+1);return;}
  if(node.isOperatorNode&&['+','-','*','/','^'].includes(node.op)&&node.args.length<=2){node.args.forEach(n=>check(n,depth+1));return;}
  if(node.isFunctionNode&&node.fn?.isSymbolNode&&functions.has(node.fn.name)&&node.args.length>=1&&node.args.length<=(node.fn.name==='log'?2:1)){node.args.forEach(n=>check(n,depth+1));return;}
  throw Error('사칙연산·거듭제곱·지원 함수로 된 수식만 계산할 수 있습니다.');
 }
 let nodes;try{nodes=parts.map(s=>math.parse(s));}catch{throw Error('함수의 괄호와 연산 기호를 확인해 주세요. 예: sin(theta)^2');}
 nodes.forEach(n=>check(n));return {parts,nodes,variables:[...variables],math};
}
export function evaluateCalculation(raw,{unit='rad',values={},binding=null}={},provided){
 const parsed=parseCalculation(raw,provided),{math}=parsed,used=new Set();if(!['rad','deg'].includes(unit))throw Error('각도 단위를 선택해 주세요.');
 const actualUnit=/°|\\circ/.test(raw)?'deg':unit;
 function finite(value){if(typeof value==='number'&&Number.isFinite(value)||math.isComplex(value)&&Number.isFinite(value.re)&&Number.isFinite(value.im))return value;throw Error('정의되지 않거나 계산 범위를 벗어난 값입니다.');}
 function visit(n,resolving=false){
  if(n.isParenthesisNode)return visit(n.content,resolving);
  if(n.isConstantNode)return n.value;
  if(n.isSymbolNode){
   if(n.name==='pi')return math.pi;if(n.name==='e')return math.e;if(n.name==='i')return math.complex(0,1);
   if(n.name==='t'&&binding&&!resolving){const b=parseCalculation(binding,math);if(b.parts.length!==1||b.variables.includes('t'))throw Error('치환식은 t 자신을 포함할 수 없습니다.');return visit(b.nodes[0],true);}
   const rawValue=values[n.name];if(rawValue===undefined||String(rawValue).trim()==='')throw Error(`${n.name==='theta'?'θ':n.name}에 대입할 값을 입력해 주세요.`);
   const value=Number(rawValue);if(!Number.isFinite(value))throw Error('대입값은 유한한 실수로 적어 주세요.');used.add(n.name);return value;
  }
  const a=n.args.map(v=>visit(v,resolving));let result;
  if(n.isOperatorNode){
   if(n.args.length===1)result=n.op==='-'?math.unaryMinus(a[0]):a[0];
   else if(n.op==='+')result=math.add(...a);else if(n.op==='-')result=math.subtract(...a);else if(n.op==='*')result=math.multiply(...a);
   else if(n.op==='/'){if(math.abs(a[1])===0)throw Error('0으로 나눌 수 없습니다.');result=math.divide(...a);}
   else if(n.op==='^'){if(math.abs(a[0])===0&&math.abs(a[1])===0)throw Error('0의 0제곱은 이 계산기에서 정의하지 않습니다.');result=math.pow(...a);}
  }else{
   const f=n.fn.name;let v=a[0];
   if(['sin','cos','tan'].includes(f)&&actualUnit==='deg')v=math.multiply(v,math.pi/180);
   if(f==='tan'&&math.abs(math.cos(v))<1e-14)throw Error('이 각도에서 tan은 정의되지 않거나 수치적으로 너무 불안정합니다.');
   if(f==='log'&&a.length===2&&(typeof a[1]!=='number'||a[1]<=0||a[1]===1))throw Error('로그의 밑은 0보다 크고 1이 아닌 실수로 입력해 주세요.');
   result=f==='ln'?math.log(v):f==='log'?a.length===2?math.log(v,a[1]):math.log10(v):math[f](v);
   if(['asin','acos','atan'].includes(f)&&actualUnit==='deg')result=math.multiply(result,180/math.pi);
  }
  return finite(result);
 }
 const results=parsed.nodes.map(n=>finite(visit(n))),format=v=>math.format(v,{precision:12});
 return {expression:parsed.parts.join(' = '),unit:actualUnit,values:results,texts:results.map(format),difference:results.length===2?format(math.subtract(results[0],results[1])):null,used:[...used]};
}
export function applySubstitution(raw,definition,direction='apply',provided){
 const parsed=parseCalculation(raw,provided),{math}=parsed,binding=parseCalculation(definition,math);
 if(binding.parts.length!==1||binding.variables.includes('t'))throw Error('t에 들어갈 식 하나를 적어 주세요. 치환식에 t를 넣을 수는 없습니다.');
 const unparen=n=>n.isParenthesisNode?unparen(n.content):n,target=unparen(binding.nodes[0]);let count=0;
 const key=n=>unparen(n).toString({parenthesis:'auto',implicit:'show'});
 const targetKey=key(target);
 function walk(n){
  if(direction==='restore'&&n.isSymbolNode&&n.name==='t'){count++;return new math.ParenthesisNode(target.cloneDeep());}
  if(direction==='apply'&&key(n)===targetKey){count++;return new math.SymbolNode('t');}
  return n.map(child=>walk(child));
 }
 const nodes=parsed.nodes.map(walk);if(!count)throw Error(direction==='restore'?'현재 식에는 되돌릴 t가 없습니다.':'현재 식에서 같은 모양의 치환식을 찾지 못했습니다. 괄호 안이나 치환식을 확인해 주세요.');
 return {result:nodes.map(n=>n.toString({parenthesis:'auto',implicit:'show'})).join(' = '),count};
}

// Repeated functions/parenthesized expressions can be chosen without typing a definition.
export function substitutionCandidates(raw,provided){
 const {nodes}=parseCalculation(raw,provided),candidates=new Map();
 function visit(n){
  const target=n.isParenthesisNode?n.content:n;
  if(n.isFunctionNode||n.isParenthesisNode&&['OperatorNode','FunctionNode'].includes(target.type)){
   const expression=target.toString({parenthesis:'auto',implicit:'show'});
   if(expression.length<=120&&!/\bt\b/.test(expression)){const old=candidates.get(expression);candidates.set(expression,{expression,count:(old?.count||0)+1});}
  }
  n.forEach(child=>visit(child));
 }
 nodes.forEach(visit);return [...candidates.values()].sort((a,b)=>b.count-a.count||a.expression.length-b.expression.length).slice(0,5);
}
