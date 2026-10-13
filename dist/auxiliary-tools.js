import {parseCalculation} from './calculation.js';
import {parseWorkspaceFormula} from './inequality-tools.js';
import {formatMathNode} from './expression-format.js';
import {originSnapshot} from './workspace-origin.js';

export function createAuxiliary(source,sourceIndex,value,id,name,provided){
 const parsed=parseWorkspaceFormula(value,provided);
 const row={...originSnapshot(source),value:parsed.value,startNew:true,title:'보조 식 시작',explanation:'본식에서 따로 계산할 식을 작성했습니다. 직접 작성한 식과 본식 사이의 관계는 자동 검증하지 않습니다.'};
 row.origin=originSnapshot(row);
 return {id,name,sourceIndex,sourceValue:source.value,rows:[row],active:0};
}

// A relation replaces complete syntax nodes, never matching substrings of names.
export function auxiliaryReplacements(source,relation,provided){
 const main=parseCalculation(source,provided),aux=parseCalculation(relation,main.math);
 if(aux.nodes.length!==2)return [];
 const key=n=>formatMathNode(n),un=n=>n.isParenthesisNode?un(n.content):n,out=[];
 for(const direction of [0,1]){
  const target=un(aux.nodes[direction]),replacement=aux.nodes[1-direction];
  if(target.isConstantNode||target.isSymbolNode&&['e','pi','i'].includes(target.name))continue;
  if(key(target)===key(replacement))continue;
  let count=0;
  function walk(n){if(key(n)===key(target)){count++;return new main.math.ParenthesisNode(replacement.cloneDeep());}return n.map(walk);}
  const nodes=main.nodes.map(walk);if(!count)continue;
  const value=nodes.map(n=>formatMathNode(n)).join(' = ');parseCalculation(value,main.math);
  out.push({direction,value,count,from:key(target),to:key(replacement)});
 }
 return out;
}
