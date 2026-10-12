import {isManualRow} from './workspace-backup.js';
// Keep the conditions and unresolved branches with the exported reasoning.
export function exportWorkspace(rows){
 return rows.map((r,i)=>`${i+1}. ${r.title||'수식'}\n${r.value}${r.displayLatex?'\nLaTeX: '+r.displayLatex:''}\n${r.explanation||''}${isManualRow(r)?'\n검증 상태: 직접 입력 · 이전 줄과의 동치 미확인':''}${r.note?'\n내 설명 (수학적 검증 안 됨): '+r.note:''}${r.logicStatements?.length?'\n기호 조건·정의 (검증 안 됨):\n'+r.logicStatements.map(v=>v.domain+'\n'+v.formula+'\n'+v.meaning).join('\n'):''}${r.condition?'\n조건: '+r.condition:''}${r.pendingCases?.length?'\n별도 경우: '+r.pendingCases.map(c=>c.condition+'에서 '+c.equation).join('; '):''}${Object.keys(r.bindings||{}).length?'\n치환: '+Object.entries(r.bindings).map(([n,v])=>`${n} := ${v}`).join(', '):''}`).join('\n\n');
}
