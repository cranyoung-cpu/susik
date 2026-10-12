// Keep an independent copy of the mathematical starting state, without nesting history.
export function originSnapshot(row){return JSON.parse(JSON.stringify({value:row.value,...(row.displayLatex?{displayLatex:row.displayLatex,matrix:row.matrix}:{}),condition:row.condition||'',assumptions:row.assumptions||[],conditions:row.conditions||[],bindings:row.bindings||{},excluded:row.excluded||[],pendingCases:row.pendingCases||[],keepGroups:row.keepGroups===true}));}
export function solutionOrigin(rows,index,startTitles=new Set()){
 const visited=new Set();let at=index;
 while(at>=0&&at<rows.length&&!visited.has(at)){
  visited.add(at);const row=rows[at];
  if(row.origin&&typeof row.origin.value==='string')return originSnapshot(row.origin);
  if(row.startNew||startTitles.has(row.title))return originSnapshot(row);
  if(Number.isInteger(row.parent)&&row.parent>=0&&row.parent<at){at=row.parent;continue;}
  for(let i=at;i>=0;i--)if(i===0||rows[i].startNew||startTitles.has(rows[i].title))return originSnapshot(rows[i]);
  break;
 }
 return originSnapshot(rows[index]);
}
