import {originSnapshot} from './workspace-origin.js';
import {originalDomainConditions} from './equation-tools.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const caseId=()=>globalThis.crypto?.randomUUID?.()||`case-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function captureZeroCase(branch,row){
 return copy({...branch,id:caseId(),previousCondition:row.condition||'',previousAssumptions:row.assumptions||[],previousConditions:row.conditions||[],previousExcluded:row.excluded||[],previousLogicStatements:row.logicStatements||[],previousCases:row.pendingCases||[],bindings:row.bindings||{}});
}
export function zeroCaseStart(branch,provided){
 const domain=originalDomainConditions(branch.equation,branch.bindings||{},provided);
 // Older backups have the original condition, assumptions and definitions only.
 // Never fill missing pre-operation context from the current nonzero branch.
 return originSnapshot({value:branch.equation,condition:[branch.previousCondition,branch.condition,...domain].filter(Boolean).join('; '),assumptions:[...new Set([...(branch.previousAssumptions||[]),branch.condition,...domain])],conditions:[...new Set([...(branch.previousConditions||[]),...domain])],bindings:branch.bindings||{},excluded:branch.previousExcluded||[],logicStatements:branch.previousLogicStatements||[],pendingCases:branch.previousCases||[]});
}
export function caseWorkInfo(branch,sourceSheet,sourceRow){
 return {branchId:branch.id||caseId(),condition:branch.condition,equation:branch.equation,sourceSheet,...(sourceSheet?{sourceRow}:{})};
}
export function caseWorkExport(work){
 return work?`별도 경우: ${work.condition}\n조작 전 방정식: ${work.equation}\n${work.result?`결론 기록됨 · 수학적 검증 안 됨\n결론: ${work.result.conclusion}\n이유: ${work.result.reason}`:'결론 미기록'}\n다른 분기의 해와 전체 해의 누락은 따로 확인해야 합니다.\n\n`:'';
}
