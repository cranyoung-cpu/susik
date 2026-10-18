import {CALCULATION_FUNCTION_NAMES} from './calculation.js';
const names=new Set([...CALCULATION_FUNCTION_NAMES,'arcsin','arccos','arctan']);

// Match complete names in the draft, not substrings of identifiers such as
// xsin, sin2 or θcos. Include a LaTeX command's backslash in its token.
export function functionNameRanges(value){
 return [...value.matchAll(/\\?[\p{L}_][\p{L}\p{N}_]*/gu)].filter(m=>names.has(m[0].replace(/^\\/,''))).map(m=>({start:m.index,end:m.index+m[0].length}));
}
export function nextInputPosition(value,start,end=start,direction=1){
 const left=direction<0;let pos=Math.max(0,Math.min(value.length,left?start:end));
 for(const range of functionNameRanges(value)){
  if(start!==end){if(range.start<pos&&pos<range.end)return left?range.start:range.end;continue;}
  if(left?range.start<pos&&pos<=range.end:range.start<=pos&&pos<range.end)return left?range.start:range.end;
 }
 if(start!==end)return pos;
 if(left){if(pos>0)pos-=Array.from(value.slice(0,pos)).at(-1).length;}
 else if(pos<value.length)pos+=String.fromCodePoint(value.codePointAt(pos)).length;
 return pos;
}
