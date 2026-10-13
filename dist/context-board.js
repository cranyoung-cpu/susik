import {parseCalculation} from './calculation.js';
import {formatMathNode} from './expression-format.js';
import {BINDING_NAMES,validateBindings} from './substitutions.js';
export function definitionBinding(raw,bindings={},provided){
 const match=String(raw).trim().match(/^([a-z])\s*:=\s*(.+)$/s);
 if(!match)throw Error('정의는 등호와 구분해 a := sin θ처럼 입력하세요.');
 const [,name,expression]=match;
 if(!BINDING_NAMES.includes(name))throw Error(`치환 이름은 ${BINDING_NAMES.join(', ')}를 사용할 수 있습니다.`);
 const parsed=parseCalculation(expression,provided);if(parsed.parts.length!==1)throw Error(':= 오른쪽에는 등식 대신 식 하나를 입력하세요.');
 const definition=formatMathNode(parsed.nodes[0]);
 if(bindings[name]&&formatMathNode(parseCalculation(bindings[name],parsed.math).nodes[0])!==definition)throw Error('이미 저장한 정의는 다른 이름으로 기록하세요. 기존 치환의 뜻은 바꾸지 않습니다.');
 if(!bindings[name]&&Object.values(bindings).some(value=>parseCalculation(value,parsed.math).variables.includes(name)))throw Error('다른 정의에서 이미 쓰는 문자입니다. 다른 이름을 선택하세요.');
 const next={...bindings,[name]:definition};validateBindings(next,parsed.math);return {name,definition,bindings:next};
}
