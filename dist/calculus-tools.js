import {parseCalculation} from './calculation.js';
import {formatMathNode} from './expression-format.js';
import {exactScalar} from './matrix-tools.js';
import {symbolicExpansion} from './symbolic-steps.js';
const un=n=>n.isParenthesisNode?un(n.content):n;
const str=n=>formatMathNode(n);
const dependent=(n,v)=>{let found=false;n.traverse(t=>{if(t.isSymbolNode&&t.name===v)found=true;});return found;};
const constant=s=>{try{const c=exactScalar(s);return c.im.zero?c.re:null;}catch{return null;}};
function bin(a,op,b){const x=constant(a),y=constant(b);if(x&&y){try{if(op==='+')return String(x.add(y));if(op==='-')return String(x.add(y.neg()));if(op==='*')return String(x.mul(y));if(op==='/')return String(x.mul(y.inv()));return String(exactScalar(`(${a})^(${b})`));}catch{}}
 if(op==='+'&&x?.zero)return b;if(op==='+'&&y?.zero||op==='-'&&y?.zero)return a;
 if(op==='*'){if(x?.zero||y?.zero)return '0';if(x?.n===x?.d&&x)return b;if(y?.n===y?.d&&y)return a;}
 if(op==='/'&&y?.n===y?.d&&y)return a;
 if(op==='^'&&y?.n===y?.d&&y)return a;
 return `(${a})${op}(${b})`;
}
const add=(a,b)=>bin(a,'+',b),mul=(a,b)=>bin(a,'*',b),div=(a,b)=>bin(a,'/',b),pow=(a,b)=>bin(a,'^',b),minus=a=>mul('-1',a);
function simpleFunctions(root,math){
 function piCoefficient(node){const n=un(node);if(n.isSymbolNode&&n.name==='pi')return constant('1');if(n.isOperatorNode&&n.args.length===1){const a=piCoefficient(n.args[0]);return a&&(n.op==='-'?a.neg():a);}if(n.isOperatorNode&&['*','/'].includes(n.op)){const a=piCoefficient(n.args[0]),b=constant(str(n.args[1]));if(a&&b)return n.op==='*'?a.mul(b):b.zero?null:a.mul(b.inv());if(n.op==='*'){const c=constant(str(n.args[0])),d=piCoefficient(n.args[1]);if(c&&d)return c.mul(d);}}return null;}
 function walk(node){const n=node.map(walk);if(!n.isFunctionNode)return n;const f=n.fn.name,a=constant(str(n.args[0]));let value;
 if(['sin','cos','tan'].includes(f)){const q=piCoefficient(n.args[0]);let k=a?.zero?0:q&&(q.n*2n)%q.d===0n?Number(((q.n*2n/q.d)%4n+4n)%4n):null;if(k!==null)value=f==='sin'?[0,1,0,-1][k]:f==='cos'?[1,0,-1,0][k]:k%2===0?0:undefined;}
 if(['ln','log'].includes(f)&&a?.n===a?.d&&a)value=0;if(f==='exp'&&a?.zero)value=1;
 return value===undefined?n:math.parse(String(value));}
 return walk(root);
}
function tidy(s,math){let value=formatMathNode(simpleFunctions(math.parse(s),math));try{const steps=symbolicExpansion(value,math);if(steps.length)value=steps.at(-1).value;}catch{}return value;}
function numeric(node,scope={}){const n=un(node);if(n.isConstantNode)return n.value;if(n.isSymbolNode){if(n.name==='pi')return Math.PI;if(n.name==='e')return Math.E;if(n.name in scope)return scope[n.name];throw Error('정적분의 구간과 식에는 선택한 변수 외의 미정 문자를 넣지 마세요.');}const a=n.args.map(x=>numeric(x,scope));let r;if(n.isOperatorNode){if(a.length===1)r=n.op==='-'?-a[0]:a[0];else r=({'+':()=>a[0]+a[1],'-':()=>a[0]-a[1],'*':()=>a[0]*a[1],'/':()=>a[0]/a[1],'^':()=>a[0]**a[1]})[n.op]();}else{const f=n.fn.name;r=f==='ln'?Math.log(a[0]):f==='log'?Math.log(a[0])/Math.log(a.length===2?a[1]:10):({sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,abs:Math.abs,sqrt:Math.sqrt,exp:Math.exp})[f]?.(a[0]);}if(!Number.isFinite(r))throw Error('정의되지 않거나 유한하지 않은 실수 값입니다.');return r;}
export function calculateCalculus(entry,provided){
 const p=parseCalculation(entry.expression,provided),math=p.math,v=entry.variable||'x',mode=entry.mode||'derivative';
 if(p.nodes.length!==1)throw Error('미적분에는 등식 대신 함수식 하나를 입력하세요.');
 if(!['x','t','y','z','theta','a','b','u','v','w'].includes(v))throw Error('미분·적분할 변수를 선택하세요.');
 if(/\bi\b/.test(p.parts[0]))throw Error('미적분 도구는 현재 실수 함수만 지원합니다.');
 const requirements=new Set([v,...p.variables].map(n=>`${n==='theta'?'θ':n}는 실수`)),rules=new Set(),root=p.nodes[0],s=str(root),tex=n=>n.toTex({handler(n,o){if(n.isFunctionNode&&n.fn.name==='ln')return `\\ln\\left(${n.args[0].toTex(o)}\\right)`;if(n.isFunctionNode&&n.fn.name==='log')return `\\log_{${n.args[1]?.toTex(o)||'10'}}\\left(${n.args[0].toTex(o)}\\right)`;}}),variable=v==='theta'?'\\theta':v,steps=[];
 function requireText(text){requirements.add(text);}
 function hasVariable(n){n=un(n);if(n.isSymbolNode)return !['e','pi'].includes(n.name);return (n.args||[]).some(hasVariable);}
 function validateDomain(n){n=un(n);const known=a=>hasVariable(a)?null:numeric(a);
 if(n.isOperatorNode&&n.op==='/'){const d=known(n.args[1]);if(d===0)throw Error('0으로 나누는 식은 미적분할 수 없습니다.');}
 if(n.isOperatorNode&&n.op==='^'){const base=known(n.args[0]),exponent=known(n.args[1]);if(base===0&&exponent===0||base===0&&exponent!==null&&exponent<0||base!==null&&base<0&&exponent!==null&&!Number.isInteger(exponent))throw Error('실수에서 정의되지 않는 거듭제곱입니다.');if(base!==null&&base<=0&&exponent===null)throw Error('변수 지수의 미적분은 양수인 밑을 지원합니다.');}
 if(n.isFunctionNode){const arg=known(n.args[0]),name=n.fn.name;if(['log','ln'].includes(name)&&arg!==null&&arg<=0)throw Error('실수 로그의 진수는 양수여야 합니다.');if(name==='log'&&n.args[1]){const base=known(n.args[1]);if(base!==null&&(base<=0||base===1))throw Error('로그의 밑은 양수이고 1이 아니어야 합니다.');}if(name==='sqrt'&&arg!==null&&arg<0)throw Error('실수 제곱근의 안쪽은 음수가 될 수 없습니다.');if(['asin','acos'].includes(name)&&arg!==null&&Math.abs(arg)>1)throw Error('역삼각함수의 실수 정의역을 벗어났습니다.');}
 n.forEach(validateDomain);
 }
 validateDomain(root);
 function derivative(n){n=un(n);if(!dependent(n,v))return '0';if(n.isSymbolNode)return '1';
  if(n.isOperatorNode){const a=str(n.args[0]),da=derivative(n.args[0]);if(n.args.length===1)return n.op==='-'?minus(da):da;const b=str(n.args[1]),db=derivative(n.args[1]);
   if(n.op==='+'||n.op==='-'){rules.add('합·차의 미분');return bin(da,n.op,db);}
   if(n.op==='*'){rules.add('곱의 미분');return add(mul(da,b),mul(a,db));}
   if(n.op==='/'){rules.add('몫의 미분');requireText(`${b} ≠ 0`);return div(bin(mul(da,b),'-',mul(a,db)),pow(b,'2'));}
   if(n.op==='^'){
    rules.add('거듭제곱·합성함수 미분');const exponent=constant(b);
    if(!dependent(n.args[1],v)){if(!exponent||exponent.d!==1n)requireText(`${a} > 0`);else if(exponent.n<1n)requireText(`${a} ≠ 0`);return mul(mul(b,pow(a,bin(b,'-','1'))),da);}
    requireText(`${a} > 0`);rules.add('로그 미분');return mul(pow(a,b),add(mul(db,`ln(${a})`),div(mul(b,da),a)));
   }
  }
  if(n.isFunctionNode){const f=n.fn.name,u=str(n.args[0]),du=derivative(n.args[0]);rules.add('합성함수의 연쇄법칙');
   if(f==='sin')return mul(`cos(${u})`,du);if(f==='cos')return minus(mul(`sin(${u})`,du));if(f==='tan'){requireText(`cos(${u}) ≠ 0`);return div(du,pow(`cos(${u})`,'2'));}
   if(f==='exp')return mul(`exp(${u})`,du);
   if(f==='ln'){requireText(`${u} > 0`);return div(du,u);}
   if(f==='log'){const base=n.args[1]?str(n.args[1]):'10';requireText(`${u} > 0`);requireText(`${base} > 0`);requireText(`${base} ≠ 1`);return derivative(math.parse(`ln(${u})/ln(${base})`));}
   if(f==='sqrt'){requireText(`${u} > 0`);return div(du,mul('2',`sqrt(${u})`));}
   if(f==='abs'){requireText(`${u} ≠ 0`);return mul(div(u,`abs(${u})`),du);}
   if(['asin','acos'].includes(f)){requireText(`-1 < ${u} < 1`);const d=div(du,`sqrt(1-(${u})^2)`);return f==='acos'?minus(d):d;}
   if(f==='atan')return div(du,add('1',pow(u,'2')));
  }
  throw Error('이 함수의 미분 규칙은 아직 지원하지 않습니다.');
 }
 // Preserve original domains even if a differentiation rule cancels a factor.
 function domain(n){n=un(n);if(n.isOperatorNode&&n.op==='/')requireText(`${str(n.args[1])} ≠ 0`);if(n.isFunctionNode){const u=str(n.args[0]);if(['ln','log'].includes(n.fn.name))requireText(`${u} > 0`);if(n.fn.name==='log'&&n.args[1]){requireText(`${str(n.args[1])} > 0`);requireText(`${str(n.args[1])} ≠ 1`);}if(n.fn.name==='sqrt')requireText(`${u} ≥ 0`);if(n.fn.name==='tan')requireText(`cos(${u}) ≠ 0`);}n.forEach(domain);}
 domain(root);
 if(mode==='derivative'){
  const order=Number(entry.order||1);if(!Number.isInteger(order)||order<1||order>3)throw Error('미분 차수는 1~3으로 선택하세요.');let node=root;
  steps.push({value:s,displayLatex:`\\frac{d${order>1?'^{'+order+'}':''}}{d${variable}${order>1?'^{'+order+'}':''}}\\left(${tex(root)}\\right)`,title:`${order}차 미분`,explanation:`${v} 이외의 문자는 상수로 봅니다. 삼각함수의 각도는 라디안입니다.`});
  for(let i=1;i<=order;i++){rules.clear();const raw=derivative(node),value=tidy(raw,math);parseCalculation(value,math);steps.push({value:formatMathNode(math.parse(raw)),title:`${i}차 미분 규칙 적용`,explanation:[...rules].join(' · ')||'상수의 미분은 0, 선택한 변수의 미분은 1입니다.'});if(value!==steps.at(-1).value)steps.push({value,title:`${i}차 도함수 정리`,explanation:'곱 계산과 동류항을 정리했습니다. 미분 가능 조건을 유지합니다.'});node=math.parse(value);}
 }else{
  const restrictions=[];
  function affine(n){const d=derivative(n),q=constant(d);if(!q||q.zero||dependent(math.parse(d),v))throw Error('이 적분은 현재 지원 범위 밖입니다. 다항식 또는 일차식 안쪽을 가진 기본 함수를 사용하세요.');return String(q);}
  function restriction(n,type){restrictions.push({node:n,type});requireText(`${str(n)} ${type==='positive'?'> 0':'≠ 0'}`);}
  function integrate(n){n=un(n);if(!dependent(n,v)){rules.add('상수배·상수 적분');return mul(str(n),v);}if(n.isSymbolNode){rules.add('거듭제곱 적분');return div(pow(v,'2'),'2');}
   if(n.isOperatorNode){const a=n.args[0],b=n.args[1];if(n.args.length===1){const f=integrate(a);return n.op==='-'?minus(f):f;}
    if(n.op==='+'||n.op==='-'){rules.add('합·차의 적분');return bin(integrate(a),n.op,integrate(b));}
    if(n.op==='*'){if(!dependent(a,v))return mul(str(a),integrate(b));if(!dependent(b,v))return mul(str(b),integrate(a));}
    if(n.op==='/'){if(!dependent(b,v)){requireText(`${str(b)} ≠ 0`);return div(integrate(a),str(b));}if(!dependent(a,v)){const slope=affine(b);restriction(b,'nonzero');rules.add('일차식의 역수 적분');return mul(str(a),div(`ln(abs(${str(b)}))`,slope));}}
    if(n.op==='^'){
     const exponent=constant(str(b));if(exponent){const slope=affine(a);if(exponent.n===-exponent.d){restriction(a,'nonzero');rules.add('역수의 적분');return div(`ln(abs(${str(a)}))`,slope);}if(exponent.d!==1n)restriction(a,'positive');else if(exponent.n<0n)restriction(a,'nonzero');const next=bin(str(b),'+','1');rules.add('거듭제곱 적분·일차 치환');return div(pow(str(a),next),mul(slope,next));}
     if(!dependent(a,v)){const slope=affine(b),base=str(a),baseNumber=base==='e'?Math.E:base==='pi'?Math.PI:Number(constant(base)?.n)/Number(constant(base)?.d);if(!Number.isFinite(baseNumber)||baseNumber<=0||baseNumber===1)throw Error('지수함수 적분의 밑은 양수이고 1이 아닌 수여야 합니다.');rules.add('지수함수 적분');return div(str(n),mul(slope,base==='e'?'1':`ln(${base})`));}
    }
   }
   if(n.isFunctionNode){const f=n.fn.name,a=n.args[0],u=str(a),slope=affine(a);rules.add('기본 함수 적분·일차 치환');if(f==='sin')return div(minus(`cos(${u})`),slope);if(f==='cos')return div(`sin(${u})`,slope);if(f==='exp')return div(`exp(${u})`,slope);if(f==='sqrt'){restriction(a,'positive');return div(pow(u,'3/2'),mul(slope,'3/2'));}if(f==='ln'){restriction(a,'positive');return div(bin(mul(u,`ln(${u})`),'-',u),slope);}}
   throw Error('이 적분의 원시함수는 아직 지원하지 않습니다. 합·상수배, 거듭제곱, 일차식 안쪽의 sin·cos·exp·ln·제곱근을 지원합니다.');
  }
  if(!['integral','definite'].includes(mode))throw Error('미분·부정적분·정적분을 선택하세요.');
  const primitive=tidy(integrate(root),math),primitiveNode=math.parse(primitive);
  if(mode==='integral'){
   const name=['c','k','h','r','s'].find(n=>!p.variables.includes(n));if(!name)throw Error('적분상수에 쓸 문자가 부족합니다. 문자를 줄여 주세요.');requireText(`${name}는 임의의 실수 상수`);
   steps.push({value:s,displayLatex:`\\int ${tex(root)}\\,d${variable}`,title:'부정적분',explanation:'원시함수를 구하고 적분상수를 더합니다. 연결된 정의역 구간마다 적분상수를 정합니다.'},{value:`${primitive} + ${name}`,title:'원시함수 + 적분상수',explanation:[...rules].join(' · ')});
  }else{
   const lo=parseCalculation(entry.lower,math),hi=parseCalculation(entry.upper,math);if(lo.nodes.length!==1||hi.nodes.length!==1||lo.variables.length||hi.variables.length||p.variables.some(x=>x!==v))throw Error('정적분 구간에는 유한한 수·π·e를, 식에는 선택한 변수만 입력하세요.');
   const l=numeric(lo.nodes[0]),h=numeric(hi.nodes[0]);numeric(root,{[v]:(l+h)/2});
   for(const {node,type} of restrictions){const a=numeric(node,{[v]:l}),b=numeric(node,{[v]:h});if(type==='positive'?Math.min(a,b)<=0:Math.min(a,b)<=0&&Math.max(a,b)>=0)throw Error('적분 구간에 정의되지 않는 점이 있습니다. 이상적분은 아직 지원하지 않습니다.');}
   // Every supported variable-dependent elementary input is continuous after these affine-domain checks.
   const substitute=bound=>formatMathNode(primitiveNode.transform(n=>n.isSymbolNode&&n.name===v?new math.ParenthesisNode(bound.cloneDeep()):n));
   const high=substitute(hi.nodes[0]),low=substitute(lo.nodes[0]),difference=bin(high,'-',low),value=tidy(difference,math);parseCalculation(value,math);
   steps.push({value:s,displayLatex:`\\int_{${tex(lo.nodes[0])}}^{${tex(hi.nodes[0])}} ${tex(root)}\\,d${variable}`,title:'정적분',explanation:'유한 구간에서 원시함수의 끝값과 시작값의 차를 구합니다.'},{value:primitive,title:'원시함수 F',explanation:[...rules].join(' · ')},{value:formatMathNode(math.parse(difference)),title:'F(상한) − F(하한)',explanation:`상한 ${entry.upper}, 하한 ${entry.lower}를 대입했습니다. 적분상수는 차에서 소거됩니다.`});if(value!==steps.at(-1).value)steps.push({value,title:'정적분 값',explanation:'대입한 식을 정확하게 정리했습니다. 삼각함수·로그 상수는 기호 그대로 남을 수 있습니다.'});
  }
 }
 const conditions=[...requirements];return {steps:steps.map(r=>({...r,conditions,assumptions:conditions,condition:conditions.join(' · ')}))};
}
