import {parseCalculation} from './calculation.js';
import {formatMathNode} from './expression-format.js';
import {parse,evaluate} from './engine.js';
import {simplifyEquationSide} from './equation-tools.js';
import {restoreAll} from './substitutions.js';

export const REAL_INEQUALITY_SCOPE='부등식에 쓰인 모든 문자는 실수';
export const hasInequality=raw=>/[<>≤≥]|\\(?:leq?|geq?|lt|gt)\b/.test(String(raw));
const flip={'<':'>','>':'<','≤':'≥','≥':'≤'};
const text=node=>formatMathNode(node);
// mathjs uses Number-valued constants; reject a literal if AST round-tripping would change it.
function exactLiterals(parts){
 const canonical=raw=>{const [base,power='0']=raw.toLowerCase().split('e'),fraction=(base.split('.')[1]||'').length,digits=base.replace('.','').replace(/^0+/,'');if(!digits)return '0';const zeros=digits.match(/0*$/)[0].length;return `${zeros?digits.slice(0,-zeros):digits}:${BigInt(power)-BigInt(fraction)+BigInt(zeros)}`;};
 for(const part of parts){
  if(/\b0[xob][0-9a-f]/i.test(part))throw Error('부등식의 숫자는 십진수나 분수로 입력하세요. 진법 접두어는 아직 지원하지 않습니다.');
  for(const [literal]of part.matchAll(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi))if(canonical(literal)!==canonical(String(Number(literal))))throw Error('이 숫자는 현재 수식 파서의 정밀도 범위를 벗어납니다. 값을 반올림하지 않고 조작을 보류합니다.');
 }
}
function rationalConstant(node,message='곱하기·나누기는 0이 아닌 정확한 유리수 상수만 지원합니다. 문자식의 부호는 조건 메모에서 추론하지 않습니다.'){
 let symbol=false;node.traverse(n=>{if(n.isSymbolNode||n.isFunctionNode)symbol=true;});
 if(symbol)throw Error(message);
 const value=evaluate(parse(text(node)));
 if(value.n.length!==1||value.d.length!==1)throw Error('정확한 유리수 상수를 입력하세요.');
 const number=value.n[0].mul(value.d[0].inv());
 if(!number.im.zero)throw Error('복소수에는 부등식의 대소 관계를 적용하지 않습니다.');
 return number.re;
}
function polynomial(node){
 if(node.isParenthesisNode)return polynomial(node.content);
 if(node.isConstantNode)return;
 if(node.isSymbolNode){if(node.name==='i')throw Error('복소수에는 부등식의 대소 관계를 적용하지 않습니다.');return;}
 if(node.isOperatorNode){
  if(['+','-','*'].includes(node.op)){node.args.forEach(polynomial);return;}
  if(node.op==='/'){const divisor=rationalConstant(node.args[1],'다항식의 분모는 0이 아닌 유리수 상수만 지원합니다. 함수·변수 분모의 부등식은 아직 조작할 수 없습니다.');if(divisor.zero)throw Error('분모가 0인 식은 사용할 수 없습니다.');polynomial(node.args[0]);return;}
  if(node.op==='^'){const exponent=rationalConstant(node.args[1],'다항식의 지수는 1~12의 정수만 지원합니다.');if(exponent.d===1n&&exponent.n>=1n&&exponent.n<=12n){polynomial(node.args[0]);return;}}
 }
 throw Error('부등식은 실수 다항식만 지원합니다. 함수·변수 분모·0 이하 또는 분수 지수는 아직 조작할 수 없습니다.');
}

// The equation parser remains strict. Only workspace input/display uses this adapter.
export function parseWorkspaceFormula(raw,provided){
 if(!hasInequality(raw)){const parsed=parseCalculation(raw,provided);return {...parsed,relation:parsed.parts.length===2?'=':null,value:parsed.parts.join(' = ')};}
 const source=String(raw).trim();if(!source||source.length>2000)throw Error('수식은 1~2,000자 이내로 입력해 주세요.');
 const normalized=source.replace(/\\(?:leq|le)\b|≤/g,'<=').replace(/\\(?:geq|ge)\b|≥/g,'>=').replace(/\\lt\b/g,'<').replace(/\\gt\b/g,'>');
 const relations=[...normalized.matchAll(/<=|>=|[<>=]/g)];
 if(relations.length!==1||relations[0][0]==='=')throw Error('부등호 하나로 연결한 좌변과 우변을 입력하세요. 연쇄·혼합 관계는 아직 지원하지 않습니다.');
 const match=relations[0],parts=[normalized.slice(0,match.index),normalized.slice(match.index+match[0].length)];
 if(parts.some(part=>!part.trim()))throw Error('부등호의 좌변과 우변을 모두 입력하세요.');
 // Reuse the existing combined AST size/depth checks for the two arithmetic sides.
 const parsed=parseCalculation(parts.join(' = '),provided);exactLiterals(parsed.parts);parsed.nodes.forEach(polynomial);
 const relation=({'<=':'≤','>=':'≥'})[match[0]]||match[0];
 return {...parsed,relation,value:parsed.parts.join(` ${relation} `)};
}
function checkDefinitions(parts,bindings,math){
 if(!Object.keys(bindings).length)return;
 for(const definition of Object.values(bindings))exactLiterals(parseCalculation(definition,math).parts);
 for(const part of parts){const expanded=restoreAll(part,bindings,math);parseCalculation(expanded,math).nodes.forEach(polynomial);}
}
export function balanceInequality(raw,operation,operand,options={},provided){
 const parsed=parseWorkspaceFormula(raw,provided);if(!flip[parsed.relation])throw Error('단일 부등식에서 사용할 수 있습니다.');
 const symbols={add:'+',subtract:'-',multiply:'*',divide:'/'},names={add:'더하기',subtract:'빼기',multiply:'곱하기',divide:'나누기'};
 if(!symbols[operation])throw Error('부등식에서는 양변 더하기·빼기와 상수 곱하기·나누기만 지원합니다.');
 const input=parseCalculation(operand,parsed.math);if(input.nodes.length!==1)throw Error('양변에 적용할 식 하나를 입력하세요.');
 exactLiterals(input.parts);
 polynomial(input.nodes[0]);checkDefinitions([...parsed.parts,input.parts[0]],options.bindings||{},parsed.math);
 let relation=parsed.relation,negative=false;
 if(['multiply','divide'].includes(operation)){
  const number=rationalConstant(input.nodes[0]);
  if(number.zero)throw Error(operation==='divide'?'0으로 나눌 수 없습니다.':'0을 곱하면 원래 부등식의 정보를 잃습니다. 다른 상수를 선택하세요.');
  negative=number.n<0n;if(negative)relation=flip[relation];
 }
 const explanation=`실수 범위에서 양변에 같은 ${['add','subtract'].includes(operation)?'다항식을':'상수를'} 적용합니다. ${negative?`음수로 ${operation==='multiply'?'곱하면':'나누면'} 대소 관계가 뒤집히므로 ${parsed.relation}를 ${relation}로 바꿉니다.`:'부등호의 방향은 유지됩니다.'}`;
 const sides=parsed.parts.map(part=>`(${part})${symbols[operation]}(${input.parts[0]})`);
 const value=parseWorkspaceFormula(sides.join(` ${relation} `),parsed.math).value,conditions=[REAL_INEQUALITY_SCOPE];
 const steps=[{value,title:`양변에 ${input.parts[0]} ${names[operation]}`,explanation,conditions}];
 if(options.simplify!==false){
  const simplified=sides.map(side=>simplifyEquationSide(side,parsed.math)).join(` ${relation} `);
  if(simplified!==value)steps.push({value:parseWorkspaceFormula(simplified,parsed.math).value,title:'양변 계산·정리',explanation:'양변의 다항식을 각각 정리했습니다. 부등호와 실수 범위·기존 조건은 유지합니다.',conditions});
 }
 return {steps,branch:null,operand:input.parts[0]};
}
