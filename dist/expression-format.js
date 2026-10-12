import {parseCalculation} from './calculation.js';
// Remove display wrappers, then let operator precedence restore required groups.
// This does not evaluate, cancel, reorder, or distribute any expression.
export function formatMathNode(node,{keepGroups=false}={}){
 function visit(n){
  if(n.isParenthesisNode){const child=visit(n.content);if(!keepGroups||child.isParenthesisNode)return child;const copy=n.clone();copy.content=child;return copy;}
  return n.map(visit);
 }
 return visit(node).toString({parenthesis:keepGroups?'keep':'auto',implicit:'show'}).replace(/\+ -/g,'- ').replace(/- -/g,'+ ');
}
export function tidyMath(raw,options={},provided){
 if(!/[()]/.test(raw))return raw;
 try{return parseCalculation(raw,provided).nodes.map(n=>formatMathNode(n,options)).join(' = ');}catch{return raw;}
}
