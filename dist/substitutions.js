import {formatMathNode} from './expression-format.js';
import {parseCalculation} from './calculation.js';
export const BINDING_NAMES=['t','u','v','w','y','z','a','b','c'];
const un=n=>n.isParenthesisNode?un(n.content):n;
const key=n=>un(n).toString({parenthesis:'auto',implicit:'show'});
export function validateBindings(bindings,math){
 const deps={};for(const [name,definition]of Object.entries(bindings)){
  if(!BINDING_NAMES.includes(name))throw Error(`치환 이름은 ${BINDING_NAMES.join(', ')}를 사용해 주세요.`);
  const p=parseCalculation(definition,math);if(p.parts.length!==1)throw Error('치환 정의에는 등식 대신 식 하나를 입력하세요.');deps[name]=p.variables.filter(v=>v in bindings);
 }
 const done=new Set(),active=new Set();function walk(n){if(active.has(n))throw Error('치환 정의가 서로를 가리키고 있습니다. 순환하는 정의를 바꿔 주세요.');if(done.has(n))return;active.add(n);for(const d of deps[n])walk(d);active.delete(n);done.add(n);}Object.keys(deps).forEach(walk);return bindings;
}
export function substituteMany(raw,bindings,name,definition,direction='apply',provided){
 const p=parseCalculation(raw,provided),math=p.math,current=bindings[name];
 if(direction==='apply'&&current&&key(parseCalculation(current,math).nodes[0])!==key(parseCalculation(definition,math).nodes[0]))throw Error('이미 사용한 치환 이름의 정의는 바꿀 수 없습니다. 다른 이름을 선택하세요.');
 if(direction==='apply'&&!current&&(p.variables.includes(name)||Object.values(bindings).some(d=>parseCalculation(d,math).variables.includes(name))))throw Error('현재 식에서 이미 사용하는 문자입니다. 다른 치환 이름을 선택하세요.');
 const next={...bindings,[name]:definition};validateBindings(next,math);const target=un(parseCalculation(definition,math).nodes[0]);let count=0;
 function walk(n){if(direction==='restore'&&n.isSymbolNode&&n.name===name){count++;return new math.ParenthesisNode(target.cloneDeep());}if(direction==='apply'&&key(n)===key(target)){count++;return new math.SymbolNode(name);}return n.map(c=>walk(c));}
 const nodes=p.nodes.map(walk);if(!count)throw Error(direction==='restore'?`현재 식에 ${name}이 없습니다.`:'같은 모양의 식을 찾지 못했습니다. 괄호 안을 눌러 선택해 보세요.');
 return {value:nodes.map(n=>formatMathNode(n)).join(' = '),bindings:next,title:direction==='restore'?`${name} 복원`:`${name}로 치환`,explanation:direction==='restore'?`${name} 자리에 정의된 ${definition}을 대입했습니다. 다른 치환 정의도 계속 유지합니다.`:`${name} := ${definition}으로 정의하고 같은 모양의 부분 ${count}곳을 바꿨습니다. 원래 조건에서 치환 문자의 범위를 따로 확인하세요.`};
}
export function restoreAll(raw,bindings,provided){
 const p=parseCalculation(raw,provided),math=p.math;validateBindings(bindings,math);let count=0;
 function walk(n,depth=0){if(depth>30||++count>1000)throw Error('치환을 펼친 식이 너무 큽니다. 하나씩 복원하세요.');if(n.isSymbolNode&&bindings[n.name])return new math.ParenthesisNode(walk(parseCalculation(bindings[n.name],math).nodes[0],depth+1));return n.map(c=>walk(c,depth+1));}
 const value=p.nodes.map(n=>formatMathNode(walk(n))).join(' = ');if(value.length>2000)throw Error('복원 결과가 너무 깁니다. 하나씩 복원하세요.');return value;
}
