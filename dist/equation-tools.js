import {tidyMath} from './expression-format.js';
import {parseCalculation} from './calculation.js';
import {parse,evaluate,C,Q} from './engine.js';
import {polynomialLatex,dividePolynomial} from './transform-tools.js';
import {symbolicExpansion} from './symbolic-steps.js';
import {restoreAll} from './substitutions.js';
import {exactLiterals} from './exact-literals.js';
const un=n=>n.isParenthesisNode?un(n.content):n;
const text=n=>un(n).toString({parenthesis:'auto',implicit:'show'});
const knownZero=(node,provided)=>{const n=un(node);return scalar(text(n),provided)?.zero||n.isFunctionNode&&n.fn.name==='sqrt'&&scalar(text(n.args[0]),provided)?.zero;};
export function equationInfo(raw,provided){const info=parseCalculation(raw,provided);exactLiterals(info.parts);if(info.nodes.length!==2)throw Error('좌변 = 우변 형태의 방정식에서 사용할 수 있습니다.');for(const root of info.nodes)root.traverse(n=>{if(n.isOperatorNode&&n.op==='/'&&knownZero(n.args[1],provided))throw Error('원래 방정식의 분모가 0입니다. 수식을 먼저 고쳐 주세요.');});return info;}
function exact(raw,provided){const p=parseCalculation(raw,provided);if(p.nodes.length!==1||p.variables.length>1)throw Error('한 문자로 된 대수식이 필요합니다.');const name=p.variables[0]||'x',source=p.nodes[0].transform(n=>n.isSymbolNode&&n.name===name?new p.math.SymbolNode('x'):n).toString({parenthesis:'auto',implicit:'show'});return {...evaluate(parse(source)),name,source};}
function scalar(raw,provided){try{const v=exact(raw,provided);if(v.n.length===1&&v.d.length===1)return v.n[0].mul(v.d[0].inv());}catch{}return null;}
export function simplifyEquationSide(raw,provided){
 try{const v=exact(raw,provided);let coefficients;if(v.d.length===1)coefficients=v.n.map(c=>c.mul(v.d[0].inv()));else coefficients=dividePolynomial(v.n,v.d);return polynomialLatex(coefficients,v.name);}catch{}
 try{return symbolicExpansion(raw,provided).at(-1)?.value||raw;}catch{return raw;}
}
function logConditions(node,provided){
 const out=['실수 로그 범위: 진수와 밑은 실수'];
 const unsupported=()=>{throw Error('실수 로그의 진수·밑에서 정의역을 정확히 확인할 수 없어 조작을 보류합니다. 중첩 함수·복소수·지원 밖 거듭제곱은 먼저 따로 확인하세요.');};
 function parameter(raw,base=false){
  // Only exact rational algebra and the named positive constants are supported here.
  // Never use a floating-point approximation or a condition note to prove the domain.
  function check(raw){const n=un(raw);
   if(n.isSymbolNode){if(n.name==='i')unsupported();return ['e','pi'].includes(n.name);}
   if(n.isFunctionNode)unsupported();
   if(n.isOperatorNode){
    const constant=n.args.map(check).every(Boolean);
    if(n.op==='/'){if(scalar(text(n.args[1]),provided)?.zero)throw Error('실수 로그의 진수·밑에 분모가 0인 식이 있습니다. 수식이나 치환 정의를 고쳐 주세요.');out.push(`${text(n.args[1])} ≠ 0`);}
    if(n.op==='^'){const exponent=scalar(text(n.args[1]),provided);if(!exponent||!exponent.im.zero||exponent.re.d!==1n||exponent.re.n< -12n||exponent.re.n>12n)unsupported();if(exponent.re.n<=0n){if(scalar(text(n.args[0]),provided)?.zero)throw Error('실수 로그의 진수·밑에 정의되지 않는 0의 거듭제곱이 있습니다. 수식이나 치환 정의를 고쳐 주세요.');out.push(`${text(n.args[0])} ≠ 0`);}}
    if(constant&&!scalar(text(n),provided))unsupported();return constant;
   }
   if(n.isConstantNode){if(!scalar(text(n),provided))unsupported();return true;}unsupported();
  }
  const n=un(raw),constant=check(n),source=text(n),value=scalar(source,provided);
  if(value){if(!value.im.zero||value.re.n<=0n||base&&value.eq(new C(1)))throw Error(base?'실수 로그의 밑은 0보다 크고 1이 아니어야 합니다. 수식이나 치환 정의를 고쳐 주세요.':'실수 로그의 진수는 0보다 커야 합니다. 수식이나 치환 정의를 고쳐 주세요.');return;}
  if(n.isSymbolNode&&['e','pi'].includes(n.name))return;
  if(constant)unsupported();out.push(`${source} > 0`);if(base)out.push(`${source} ≠ 1`);
 }
 parameter(node.args[0]);if(node.fn.name==='log'&&node.args.length===2)parameter(node.args[1],true);
 return out;
}
export function realLogConditions(raw,bindings={},provided){
 const p=parseCalculation(raw,provided),expanded=Object.keys(bindings).length?parseCalculation(restoreAll(raw,bindings,p.math),p.math):p,out=[];
 for(const info of [p,expanded])for(const root of info.nodes)root.traverse(n=>{if(n.isFunctionNode&&['ln','log'].includes(n.fn.name)){exactLiterals(info.parts);out.push(...logConditions(n,p.math));}});
 if(out.length)for(const definition of Object.values(bindings))exactLiterals(parseCalculation(definition,p.math).parts);
 return [...new Set(out)];
}
function numericConstant(node){
 // Build exact numeric nodes directly: mathjs can print 0.0000001 as 1e-7,
 // which the editable polynomial parser intentionally does not accept.
 function convert(raw){
  const n=un(raw);
  if(n.isConstantNode){
   const [decimal,power='0']=String(n.value).toLowerCase().split('e'),fraction=(decimal.split('.')[1]||'').length,scale=BigInt(power)-BigInt(fraction),digits=BigInt(decimal.replace('.',''));
   return {op:'num',v:scale>=0n?new Q(digits*10n**scale):new Q(digits,10n**(-scale))};
  }
  if(!n.isOperatorNode)return null;
  const args=n.args.map(convert);if(args.some(a=>!a))return null;
  if(args.length===1)return n.op==='+'?args[0]:n.op==='-'?{op:'neg',a:args[0]}:null;
  const op={'+':'add','-':'sub','*':'mul','/':'div','^':'pow'}[n.op];return op?{op,a:args[0],b:args[1]}:null;
 }
 try{const ast=convert(node);if(!ast)return null;const value=evaluate(ast);return value.n[0].mul(value.d[0].inv()).re;}
 catch{throw Error('거듭제곱의 숫자 지수를 정확히 확인할 수 없어 조작을 보류합니다. 지수의 계산을 먼저 확인하세요.');}
}
function conditionsOf(nodes,provided){
 const out=[];
 for(const root of nodes)root.traverse(n=>{
  if(n.isFunctionNode&&['ln','log'].includes(n.fn.name))out.push(...logConditions(n,provided));
  if(n.isFunctionNode&&n.fn.name==='sqrt')out.push(`sqrt(${text(n.args[0])})가 정의되는 범위 유지 (실수 계산: ${text(n.args[0])} ≥ 0)`);
  if(n.isOperatorNode&&n.op==='/')out.push(`${text(n.args[1])} ≠ 0`);
  if(n.isOperatorNode&&n.op==='^'){
   const value=scalar(text(n.args[1]),provided),exponent=value?.im.zero?value.re:numericConstant(n.args[1]);
   // A computed exponent such as 1-2 has the same domain as the literal -1.
   const nonpositive=exponent&&exponent.n<=0n;
   if(nonpositive){
    let zero=knownZero(n.args[0],provided);
    if(!zero)try{zero=numericConstant(n.args[0])?.zero;}catch{}
    if(zero)throw Error('0의 0제곱이나 음의 지수 거듭제곱은 정의되지 않습니다. 수식이나 치환 정의를 고쳐 주세요.');
    out.push(`${text(n.args[0])} ≠ 0`);
   }
  }
 });
 return [...new Set(out)];
}
// Reuse the equation tool's domain rules for term edits and laws too. These are
// retained requirements, not a proof that a learner's conditions are satisfied.
export function originalDomainConditions(raw,bindings={},provided){
 const p=parseCalculation(raw,provided),expanded=Object.keys(bindings).length?parseCalculation(restoreAll(raw,bindings,p.math),p.math):p;
 if([p,expanded].some(info=>info.nodes.some(root=>root.filter(n=>n.isOperatorNode&&n.op==='^').length))){
  exactLiterals(p.parts);for(const definition of Object.values(bindings))exactLiterals(parseCalculation(definition,p.math).parts);
 }
 const conditions=realLogConditions(raw,bindings,p.math);
 for(const info of [p,expanded]){
  for(const root of info.nodes)root.traverse(n=>{if(n.isOperatorNode&&n.op==='/'&&knownZero(n.args[1],p.math))throw Error('원래 식의 분모가 0입니다. 수식이나 치환 정의를 먼저 고쳐 주세요.');});
  conditions.push(...conditionsOf(info.nodes,p.math));
 }
 return [...new Set(conditions)];
}
function validateOperand(raw,provided){const p=parseCalculation(raw,provided);if(p.nodes.length!==1)throw Error('양변에 적용할 식 하나만 입력하세요.');function check(raw){const n=un(raw);if(n.isConstantNode)return;if(n.isSymbolNode&&!['e','pi'].includes(n.name))return;if(n.isOperatorNode){if(['+','-','*'].includes(n.op)){n.args.forEach(check);return;}if(n.op==='/'){const d=scalar(text(n.args[1]),provided);if(d&&!d.zero){check(n.args[0]);return;}}if(n.op==='^'){const e=scalar(text(n.args[1]),provided);if(e&&e.im.zero&&e.re.d===1n&&e.re.n>=1n&&e.re.n<=12n){check(n.args[0]);return;}}}throw Error('새로 적용할 식은 숫자 또는 다항식으로 입력하세요. 변수 분모·함수의 정의역을 임의로 추가하지 않습니다.');}check(p.nodes[0]);return p.parts[0];}
function zeroCase(raw,operand,provided){const info={equation:raw,factor:operand,condition:`${operand} = 0`,note:'이 식이 0인 경우에는 나누기 전 방정식을 따로 확인해야 합니다.'};
 try{const f=exact(operand,provided);if(f.d.length===1&&f.n.length===2&&!f.n[1].zero){const root=f.n[0].neg().mul(f.n[1].inv()),p=equationInfo(raw,provided);const sides=p.nodes.map(n=>n.transform(c=>c.isSymbolNode&&c.name===f.name?new p.math.ParenthesisNode(p.math.parse(root.toString())):c).toString({parenthesis:'auto',implicit:'show'}));const a=scalar(sides[0],provided),b=scalar(sides[1],provided);info.candidate=`${f.name} = ${root}`;if(a&&b){info.substitution=sides.join(' = ');info.note=a.eq(b)?'대입하면 양변이 같습니다. 주어진 조건에도 맞는지 확인해 이 경우의 해로 포함하세요.':'대입하면 양변이 다릅니다. 이 값은 원래 방정식의 해가 아닙니다.';}}}catch{}
 return info;
}
const symbol={add:'+',subtract:'-',multiply:'*',divide:'/'};
const names={add:'더하기',subtract:'빼기',multiply:'곱하기',divide:'나누기'};
export function balanceEquation(raw,operation,operand='',options={},provided){
 const p=equationInfo(raw,provided),bindings=options.bindings||{};
 // Inspect the definitions without replacing the learner's displayed symbols.
 for(const definition of Object.values(bindings))exactLiterals(parseCalculation(definition,p.math).parts);
 const expanded=Object.keys(bindings).length?equationInfo(restoreAll(raw,bindings,p.math),p.math):p;
 const conditions=[...new Set([...conditionsOf(p.nodes,p.math),...conditionsOf(expanded.nodes,p.math)])];let value,title,explanation,branch=null;
 if(operation==='swap'){value=[p.parts[1],p.parts[0]].join(' = ');title='좌우변 바꾸기';explanation='[조작-변형] 등식의 대칭성으로 좌변과 우변의 위치를 바꿉니다.';}
 else if(operation==='simplify'){value=p.parts.map(v=>simplifyEquationSide(v,provided)).join(' = ');title='양변 각각 정리';explanation='[조작-계산] 각 변에서 곱을 계산하고 동류항을 정리합니다. 원래 식의 정의역은 유지합니다.';}
 else{
  if(!symbol[operation])throw Error('양변에 적용할 연산을 선택하세요.');operand=options.existingTerm?parseCalculation(operand,provided).parts[0]:validateOperand(operand,provided);
  exactLiterals(parseCalculation(operand,p.math).parts);
  const expandedOperand=Object.keys(bindings).length?restoreAll(operand,bindings,p.math):operand;
  const operandInfo=equationInfo(`(${expandedOperand}) = 0`,p.math);
  if(!options.existingTerm)validateOperand(expandedOperand,p.math);
  conditions.push(...conditionsOf(operandInfo.nodes,p.math));
  const clean=simplifyEquationSide(expandedOperand,p.math),c=scalar(clean,p.math);
  if(['multiply','divide'].includes(operation)){
   if(c?.zero||knownZero(operandInfo.nodes[0],p.math))throw Error(operation==='divide'?'0으로 나눌 수 없습니다.':'양변에 0을 곱하면 원래 방정식의 정보를 잃습니다. 다른 값을 선택하세요.');
   if(!c){const nonzero=`${operand} ≠ 0`,known=conditions.includes(nonzero)||(options.assumptions||[]).includes(nonzero);conditions.push(nonzero);if(!known)branch=zeroCase(raw,operand,provided);}
  }
  value=p.parts.map(v=>`(${v})${symbol[operation]}(${operand})`).join(' = ');title=`양변에 ${operand} ${names[operation]}`;
  explanation=`[조작-변형] 양변에 같은 연산을 적용합니다: ${operation==='add'?'더할 식':operation==='subtract'?'뺄 식':operation==='multiply'?'곱할 식':'나눌 식'} ${operand}. ${['multiply','divide'].includes(operation)?'적용하는 식이 0이 아닌 범위에서 해가 유지됩니다.':'등식이 성립하는 범위와 해를 유지합니다.'}`;
 }
 value=tidyMath(value,{},provided);
 const steps=[{value,title,explanation,conditions:[...new Set(conditions)]}];
 if(options.simplify!==false&&!['simplify','swap'].includes(operation)){const result=value.split('=').map(v=>simplifyEquationSide(v,provided)).join(' = ');if(result!==value)steps.push({value:result,title:'양변 계산·정리',explanation:'[조작-계산] 양변에서 같은 항을 없애고 곱·나눗셈을 계산합니다. 앞 단계의 조건과 별도 경우는 유지합니다.',conditions:steps[0].conditions});}
 return {steps,branch,operand};
}
export function equationTerms(raw,provided){const p=equationInfo(raw,provided);function flatten(raw,sign=1){const n=raw;if(n.isOperatorNode&&n.op==='+'&&n.args.length===2)return [...flatten(n.args[0],sign),...flatten(n.args[1],sign)];if(n.isOperatorNode&&n.op==='-')return n.args.length===1?flatten(n.args[0],-sign):[...flatten(n.args[0],sign),...flatten(n.args[1],-sign)];return [{value:sign<0?`-(${text(n)})`:text(n),label:sign<0?`-(${text(n)})`:text(n)}];}return p.nodes.map(n=>flatten(n).map((t,i)=>({...t,id:i})));}
export function transposeTerms(raw,side,ids,options={},provided){const terms=equationTerms(raw,provided);if(![0,1].includes(side)||!ids.length||ids.some(i=>!Number.isInteger(i)||!terms[side][i]))throw Error('한쪽 변에서 이항할 항을 선택하세요.');const selected=[...new Set(ids)].sort((a,b)=>a-b).map(i=>terms[side][i].value),operand=selected.map(s=>`(${s})`).join('+');const change=balanceEquation(raw,'subtract',operand,{...options,existingTerm:true},provided);change.steps[0].title=side===0?'선택한 항을 우변으로 이항':'선택한 항을 좌변으로 이항';change.steps[0].explanation='[조작-변형] 선택한 항 전체를 양변에서 똑같이 뺍니다. 정리하면 원래 변에서는 없어지고 반대쪽에 부호가 바뀌어 나타납니다.';return change;}
export function balanceSuggestions(raw,provided){const p=equationInfo(raw,provided),out=[];const add=(operation,operand,label)=>{if(!out.some(v=>v.operation===operation&&v.operand===operand))out.push({operation,operand,label});};
 try{const left=exact(p.parts[0],provided);if(left.d.length===1&&left.n.length===3){const a=left.n[2].mul(left.d[0].inv()),b=left.n[1].mul(left.d[0].inv());if(!a.eq(new C(1)))add('divide',a.toString(),'이차항 계수로 나누기');else if(!b.zero){const h=b.mul(new C(2).inv()),needed=h.mul(h),existing=left.n[0].mul(left.d[0].inv()),diff=needed.add(existing.neg());if(!diff.zero)add('add',diff.toString(),'완전제곱에 필요한 수 더하기');}}}catch{}
 return out;
}
