// Keep the conditions and unresolved branches with the exported reasoning.
export function exportWorkspace(rows){
 return rows.map((r,i)=>`${i+1}. ${r.title||'수식'}\n${r.value}${r.displayLatex?'\nLaTeX: '+r.displayLatex:''}\n${r.explanation||''}${r.condition?'\n조건: '+r.condition:''}${r.pendingCases?.length?'\n별도 경우: '+r.pendingCases.map(c=>c.condition+'에서 '+c.equation).join('; '):''}${Object.keys(r.bindings||{}).length?'\n치환: '+Object.entries(r.bindings).map(([n,v])=>`${n} := ${v}`).join(', '):''}`).join('\n\n');
}
