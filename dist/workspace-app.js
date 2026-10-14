import {LOGIC_TEMPLATES,LOGIC_DOMAINS,logicStatement,quantifiedStatement,logicEditorDraft,PRACTICE_PROBLEMS,checkPractice,practiceNeedsReview} from './learning-tools.js';
import {typeTabs,defaultAdvanced,advancedForm,updateAdvanced,resizeAdvanced,importMatrix} from './advanced-input.js';
import {calculateMatrix,solveLinearSystem} from './matrix-tools.js';
import {calculateCalculus} from './calculus-tools.js';
import {createAuxiliary,auxiliaryReplacements} from './auxiliary-tools.js';
import {visibleRowIndices,adjacentRowIndex,rowRemovalInfo} from './workspace-history.js';
import {originSnapshot,solutionOrigin} from './workspace-origin.js';
import {tidyMath} from './expression-format.js';
import * as MathLive from './vendor/mathlive-ssr.min.mjs';
import {createDirectEditor,directMath,mathInput} from './direct-editor.js';
import {inputPad,pressInputKey,setInputKeyboard} from './input-pad.js';
import {inputFeedback} from './input-feedback.js';
import {parseCalculation,substitutionCandidates} from './calculation.js';
import {hasInequality,parseWorkspaceFormula,balanceInequality,REAL_INEQUALITY_SCOPE} from './inequality-tools.js';
import {symbolicExpansion} from './symbolic-steps.js';
import {expansionSteps,describeOperation} from './working-steps.js';
import {lawCandidates,WORK_EXAMPLES} from './exponent-log.js';
import {definitionBinding} from './context-board.js';
import {BINDING_NAMES,substituteMany,restoreAll} from './substitutions.js';
import {equationInfo,balanceEquation,equationTerms,transposeTerms,balanceSuggestions} from './equation-tools.js';
import {TRANSFORM_GROUPS,BALANCE_GROUPS} from './operation-menu.js';
import {exportWorkspace} from './workspace-export.js';
import {WORK_KEY,loadWorkspace} from './workspace-state.js';
import {BACKUP_LIMIT,serializeBackup,parseBackup,isManualRow} from './workspace-backup.js';
window.MathLive=MathLive;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage={getItem:key=>window.localStorage?window.localStorage.getItem(key):localStorage.getItem(key),setItem:(key,value)=>window.localStorage?window.localStorage.setItem(key,value):localStorage.setItem(key,value)};
let saveFailed=false,suppressRepeatedInputClick=false,taskReturn=null,taskTrigger=null;
const app=document.querySelector('#app');let book=loadWorkspace(storage),activeAuxId=book.activeAuxId||null,state=book.auxiliary?.find(a=>a.id===activeAuxId)||book,history=[],task=null,taskTimer=null,toastTimer=null,selectionView=null,dockExpanded=false,taskCollapsed=false,operationPage='equation',operationGroup={expression:null,equation:'calculate'},historyStart=null,advancedDrafts={};
let linkedPractice=PRACTICE_PROBLEMS.find(p=>p.id===new URLSearchParams(window.location?.search||'').get('practice'))||null;
const startTitles=new Set(['직접 입력','시작 수식','이전 문제',...WORK_EXAMPLES.map(p=>p.title)]);
const isAux=()=>state!==book;
const current=()=>state.rows[state.active];
const rowMath=r=>directMath(r.displayLatex||r.value);const $=s=>app.querySelector(s);
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3000);}
function storageNotice(){const el=$('[data-storage-status]');if(!el)return;el.classList.toggle('is-error',saveFailed);el.innerHTML=saveFailed?'<strong>브라우저에 저장하지 못했습니다.</strong><span>이 화면을 닫기 전에 백업 파일을 내려받으세요.</span><button data-backup-download>백업 내려받기</button><button data-save-retry>저장 다시 시도</button>':'<span>이 브라우저에 저장됨 · 자동 동기화 안 됨</span>';}
function save(){book.activeAuxId=isAux()?state.id:null;try{storage.setItem(WORK_KEY,JSON.stringify(book));saveFailed=false;}catch{saveFailed=true;}storageNotice();return !saveFailed;}
function checkpoint(view=null){history.push({book:JSON.stringify(book),view});if(history.length>30)history.shift();}
function startingState(){const origin=solutionOrigin(state.rows,state.active,startTitles);origin.value=tidyMath(origin.value,{keepGroups:origin.keepGroups});return origin;}
function canReset(){return JSON.stringify(originSnapshot(current()))!==JSON.stringify(startingState());}
function resetSolution(){if(!canReset())return;const origin=startingState();append([{...origin,origin,startNew:false,title:'원상복귀',explanation:'현재 풀이를 시작한 식과 조건·치환으로 돌아왔습니다. 이전 풀이 기록은 그대로 남아 있습니다.'}]);}
function append(steps){
 if(state.rows.length+steps.length>300){toast('한 작업장에는 300줄까지 저장됩니다. 풀이를 복사해 보관하세요.');return false;}
 checkpoint();const parent=current(),origin=startingState(),insertAt=state.active+1;
 const rows=steps.map(s=>{const row={...parent,...s,note:s.note||'',practiceAnswer:'',practiceFeedback:null,logicStatements:JSON.parse(JSON.stringify(s.logicStatements??parent.logicStatements??[])),practiceId:s.startNew?(s.practiceId||null):parent.practiceId,value:s.displayLatex?s.value:tidyMath(s.value,{keepGroups:s.keepGroups===true}),displayLatex:s.displayLatex,matrix:s.matrix,keepGroups:s.keepGroups===true,startNew:s.startNew===true,parent:state.active,conditions:s.conditions||[],bindings:s.bindings??{...(parent.bindings||{})}};row.origin=s.startNew?originSnapshot(row):s.origin||origin;return row;});
 for(const row of state.rows.slice(insertAt))if(Number.isInteger(row.parent)&&row.parent>=insertAt)row.parent+=rows.length;
 if(!isAux())for(const a of book.auxiliary||[])if(a.sourceIndex>=insertAt)a.sourceIndex+=rows.length;
 state.rows.splice(insertAt,0,...rows);state.active+=rows.length;save();render();return true;
}
function startFreeSolution(value,context=null){
 // A new solution has no parent: neither the selected row nor its context is inherited.
 const origin=originSnapshot({value:tidyMath(value),...context});
 const row={...originSnapshot(origin),origin,startNew:true,title:'직접 입력',explanation:'자유롭게 입력한 식으로 새 풀이를 시작했습니다. 식과 풀이의 타당성은 자동으로 확인하지 않습니다.',note:'',practiceAnswer:'',practiceFeedback:null};
 startIndependentSolution(row);
}
function startIndependentSolution(row,expanded=true){
 if(book.rows.length>=300)throw Error('본식에는 300줄까지 저장됩니다. 백업 파일이나 풀이 복사로 보관하세요.');
 checkpoint();book.rows.push(row);book.active=book.rows.length-1;state=book;activeAuxId=null;
 historyStart=null;selectionView=null;dockExpanded=expanded;suppressRepeatedInputClick=true;save();render();
 const focus=$(`[data-work-row="${book.active}"]`);focus?.focus();focus?.scrollIntoView?.({block:'nearest'});
}
const editor=createDirectEditor({
 onApply:change=>{if(change.raw!==current().value||change.rowIndex!==state.active)return false;return append([{value:change.result,keepGroups:change.operation==='group',title:change.operation?operationTitle(change.operation):'직접 작성',explanation:describeOperation(change.operation),bindings:change.binding?{...(current().bindings||{}),t:change.binding}:current().bindings}]);},
 onUndo:undo,onReset:resetSolution,onPrevious:()=>navigate(-1),onNext:()=>navigate(1),onSelection:showOperations,onExpanded:value=>{dockExpanded=value;},onToggle:toggleTools,onOpen:openTools,onInput:()=>openInput(),onSubstitute:({definition,source})=>openSubstitution(definition,source)
});
function operationTitle(op){return ({sum:'합으로 변형',product:'곱으로 변형',factor:'공통인수로 묶기',group:'괄호로 묶기',power:'지수 나누기',powerForm:'거듭제곱으로 변형',replace:'직접 변형',expand:'부분 전개',square:'완전제곱식 만들기',remainder:'나머지 남겨 묶기',cancel:'약분',common:'통분',substitute:'치환',restore:'복원',reorder:'항 순서 바꾸기'})[op]||'식 변형';}
function undo(){if(!history.length)return;const previous=history.pop();book=JSON.parse(previous.book);activeAuxId=book.activeAuxId||null;state=book.auxiliary?.find(a=>a.id===activeAuxId)||book;historyStart=null;save();render(previous.view);}
function navigate(delta){const i=adjacentRowIndex(state,delta);if(i<0)return;state.active=i;save();render();}


function mountStructuredDock(){
 const r=current();$('[data-work-dock]').innerHTML=`<section class="direct-workbench direct-dock is-collapsed work-structured-dock"><header class="direct-heading"><strong>${esc(state.name||'보조 계산')}</strong><div><button data-structured-undo${history.length?'':' disabled'}>되돌리기</button><button data-structured-input>수식 작성</button></div></header><div class="direct-current-formula">${rowMath(r)}</div><nav class="direct-navigation is-overview"><button data-structured-nav="-1"${adjacentRowIndex(state,-1)>=0?'':' disabled'}>‹ 이전 줄</button>${taskCollapsed?'<button data-structured-resume>입력 계속 ↑</button>':state.entry?'<button data-advanced-edit>입력 고치기</button>':'<button data-new-aux>보조 식 쓰기</button>'}<button data-structured-nav="1"${adjacentRowIndex(state,1)>=0?'':' disabled'}>다음 줄 ›</button></nav></section>`;requestAnimationFrame(()=>{const h=$('.work-structured-dock')?.getBoundingClientRect().height;if(h)document.documentElement.style.setProperty('--direct-space',`${h+24}px`);});
}
function openAdvanced(type,entry,expressionDraft=null){
 const seed=!current().displayLatex&&selectionView?.selected?.length?editor.transformContext().raw:current().displayLatex?'':current().value;
 task={kind:'advanced',entry:entry||advancedDrafts[type]||defaultAdvanced(type,seed),expressionDraft,tab:'number',focus:null};drawAdvanced();
}
function focusAdvanced(f){if(!f)return;task.focus=f.dataset.advInput;f.focus();f.setSelectionRange?.(0,f.value.length);f.scrollIntoView?.({block:'nearest'});const label=$('[data-adv-focused]');if(label)label.textContent=f.getAttribute('aria-label');}
function drawAdvanced(){const t=task,title={matrix:'행렬',calculus:'미적분',system:'일차 연립식'}[t.entry.type];showTask(title+' · 보조 계산',advancedForm(t.entry,t.tab),'<button class="primary" data-adv-calculate>계산 과정 기록</button>');focusAdvanced([...app.querySelectorAll('[data-adv-input]')].find(f=>f.dataset.advInput===t.focus)||$('[data-adv-input]'));}
function advancedExample(){const type=task.entry.type;if(type==='matrix')task.entry={type,mode:task.entry.mode,a:[['1','2'],['3','4']],b:[['2','0'],['1','2']]};else if(type==='system')task.entry={type,variables:['x','y'],equations:['x+y=3','x-y=1']};else task.entry={...defaultAdvanced(type),mode:task.entry.mode,expression:task.entry.mode==='derivative'?'x^3+sin(2x)':'x^2',lower:'0',upper:'1'};drawAdvanced();}
function calculateAdvanced(){
 if((book.auxiliary?.length||0)>=20)throw Error('보조 계산은 20개까지 저장됩니다. 필요 없는 보조 식을 지워 주세요.');
 const entry=JSON.parse(JSON.stringify(task.entry)),result=entry.type==='matrix'?calculateMatrix(entry):entry.type==='system'?solveLinearSystem(entry):calculateCalculus(entry);
 const sourceIndex=isAux()?state.sourceIndex:book.active,source=book.rows[sourceIndex],sequence=(book.auxSequence||0)+1;
 const rows=result.steps.map((r,i)=>({...originSnapshot(source),...r,bindings:{...source.bindings},assumptions:[...new Set([...(source.assumptions||[]),...(r.assumptions||[])])],condition:[source.condition,r.condition].filter(Boolean).join('; '),startNew:i===0,parent:i?i-1:undefined}));
 const origin=originSnapshot(rows[0]);rows.forEach(r=>r.origin=origin);
 const aux={id:`aux-${sequence}`,name:`${{matrix:'행렬',calculus:'미적분',system:'연립식'}[entry.type]} ${sequence}`,sourceIndex,sourceValue:source.value,rows,active:rows.length-1,entry};
 checkpoint();book.auxSequence=sequence;(book.auxiliary||=[]).push(aux);advancedDrafts[entry.type]=entry;state=aux;activeAuxId=aux.id;historyStart=null;selectionView=null;dockExpanded=false;save();render();
}

function inputHelp(){return `<details class="work-input-help"><summary>입력·변형 범위</summary><p>다항식·분수·거듭제곱·√·절댓값, sin·cos·tan과 역삼각함수, ln·log·exp, π·e·i 및 등식 하나를 입력할 수 있습니다. log(x,2)는 밑이 2인 로그, log(x)는 상용로그입니다.</p><p>모든 수학식이나 모든 변형을 지원하지는 않습니다. 행렬·미적분·일차 연립식은 위의 전용 입력 탭을 사용하세요. 일반 비선형 연립식·미분방정식·합 기호는 아직 지원하지 않습니다. 단일 실수 다항식 부등식은 &lt;, &lt;=, &gt;, &gt;= 또는 ≤, ≥로 입력하세요. 부등호는 문자·기호 탭이나 기기 자판으로 입력할 수 있습니다. 연쇄 부등식·함수·변수 분모의 부등식은 아직 조작하지 않습니다. 실수 로그 법칙과 복소수 다항식 조작의 지원 범위도 서로 다릅니다.</p><p>분수·제곱근·함수 등 지원 문법의 LaTeX를 붙여넣을 수 있습니다. 한 식은 2,000자 이내이며, 너무 복잡한 식은 보조 식으로 나누어 주세요.</p></details>`;}
function sheetBar(){
 const aux=book.auxiliary||[];
 $('[data-work-sheets]').innerHTML=`<nav class="work-sheets" aria-label="본식과 보조 식"><div role="tablist"><button role="tab" data-sheet="main" aria-selected="${!isAux()}">본식</button>${aux.map(a=>`<button role="tab" data-sheet="${esc(a.id)}" aria-selected="${state===a}">${esc(a.name)}</button>`).join('')}</div><button data-new-aux>＋ 보조 식</button></nav>${isAux()?`<aside class="work-aux-source"><div><strong>본식 ${state.sourceIndex+1}번째 줄에서 따로 계산</strong><button class="work-aux-source-math" data-sheet="main" aria-label="본식으로 돌아가기">${directMath(state.sourceValue)}</button></div><div class="work-aux-actions"><button data-sheet="main">본식 보기</button><button data-aux-apply>결과 대입</button>${state.entry?'<button data-advanced-edit>입력 고치기</button>':''}<button data-aux-delete aria-label="현재 보조 식 삭제">삭제</button></div></aside>`:''}`;
}
function switchSheet(id){
 if(id==='main'&&isAux()&&!book.rows[state.sourceIndex]?.archived)book.active=Math.min(state.sourceIndex,book.rows.length-1);
 state=id==='main'?book:book.auxiliary?.find(a=>a.id===id)||book;activeAuxId=isAux()?state.id:null;
 historyStart=null;selectionView=null;save();render();
}
function startAuxiliary(value,context=null){
 if((book.auxiliary?.length||0)>=20)throw Error('보조 식은 20개까지 저장됩니다. 필요 없는 보조 식을 지워 주세요.');
 const sourceIndex=isAux()?state.sourceIndex:book.active,source=book.rows[sourceIndex];
 const sequence=(book.auxSequence||0)+1,aux=createAuxiliary({...current(),...context},sourceIndex,value,`aux-${sequence}`,`보조 ${sequence}`);aux.sourceValue=source.value;
 checkpoint();book.auxSequence=sequence;(book.auxiliary||=[]).push(aux);state=aux;activeAuxId=aux.id;historyStart=null;selectionView=null;save();render();
}
function openAuxiliaryApply(){
 if(!isAux())return;if(current().displayLatex){toast('값이 정리된 등식 줄을 선택한 뒤 대입하세요. 행렬은 입력 고치기로 계속 계산할 수 있습니다.');return;}const main=book.rows[state.sourceIndex],result=current();
 if(hasInequality(main.value)||hasInequality(result.value))throw Error('부등식의 보조 식 결과 대입은 아직 지원하지 않습니다. 각 부등식에서 양변 조작을 사용하세요.');
 // Merging definitions must not capture a free symbol in either sheet's existing definitions.
 for(const [target,source,label] of [[main,result,'본식'],[result,main,'보조 식']])for(const [name,value] of Object.entries(source.bindings||{})){
  if(target.bindings?.[name]&&target.bindings[name]!==value)throw Error('본식과 보조 식의 치환 정의가 다릅니다. 겹치지 않는 이름으로 보조 식을 작성하세요.');
  if(!target.bindings?.[name]&&[target.value,...Object.values(target.bindings||{})].some(raw=>parseCalculation(raw).variables.includes(name)))throw Error(`치환 문자 ${name}가 ${label}의 식이나 기존 정의에서 쓰는 문자와 겹칩니다. 겹치지 않는 이름으로 보조 식을 작성하세요.`);
 }
 let relation=result.value;if(!state.entry&&!parseCalculation(relation).parts[1]){const origin=startingState().value;if(!parseCalculation(origin).parts[1])relation=`${origin} = ${relation}`;}
 const options=auxiliaryReplacements(main.value,relation);
 task={kind:'aux-apply',sheet:state,result:JSON.parse(JSON.stringify(result)),main,options,relation,pick:0};drawAuxiliaryApply();
}
function drawAuxiliaryApply(){
 const t=task,choice=t.options[t.pick];
 showTask('보조 식 결과 대입',`<div class="work-law-preview">${directMath(t.relation)}</div><p class="work-tip">보조 식의 등식을 이용해 연결된 본식 ${t.sheet.sourceIndex+1}번째 줄에 대입합니다. 직접 작성한 등식의 타당성이나 최종 해는 자동 검증하지 않습니다.</p><div class="work-aux-choices">${t.options.map((o,i)=>`<button data-aux-replacement="${i}" aria-pressed="${i===t.pick}">${directMath(o.from)} <span>→</span> ${directMath(o.to)}</button>`).join('')}</div>${choice?`<div class="work-law-preview"><small>대입 전 본식</small><div>${directMath(t.main.value)}</div><small>대입 후 본식 · ${choice.count}곳 변경</small><div>${directMath(choice.value)}</div><p>보조 식의 조건과 미확인 경우도 함께 유지합니다.</p></div>`:'<p class="work-tip">본식과 일치하는 부분을 찾지 못했습니다. 보조 식을 x = 값 또는 log(8,2) = 3처럼 등식으로 정리하세요. 대입할 부분은 식의 구조가 같아야 합니다.</p>'}`,`<button class="primary" data-aux-confirm${choice?'':' disabled'}>본식에 대입</button>`);
}
function applyAuxiliary(){
 const t=task,c=t?.options?.[t.pick];if(!c||t.kind!=='aux-apply')return;
 if(book.rows.length>=300)throw Error('본식에는 300줄까지 저장됩니다. 풀이를 복사해 보관하세요.');
 const r=t.result,main=t.main,merge=(a,b)=>[...new Set([...(a||[]),...(b||[])])];
 const next={value:c.value,title:`${t.sheet.name} 결과 대입`,explanation:`${t.relation}를 이용해 ${c.from}을 ${c.to}로 대입했습니다. 원래 문제의 조건과 최종 해는 따로 확인하세요.`,condition:merge([main.condition],[r.condition]).filter(Boolean).join('; '),assumptions:merge(main.assumptions,r.assumptions),conditions:merge(main.conditions,r.conditions),bindings:{...main.bindings,...r.bindings},pendingCases:[...new Map([...(main.pendingCases||[]),...(r.pendingCases||[])].map(v=>[JSON.stringify(v),v])).values()]};
 // append checkpoints the complete notebook, including the selected auxiliary.
 const previous=JSON.stringify(book);book.active=t.sheet.sourceIndex;state=book;activeAuxId=null;historyStart=null;
 if(append([next])){history[history.length-1].book=previous;toast('보조 식의 결과를 본식에 대입했습니다.');}
}

function render(view=null){
 const r=current();if(!r.displayLatex)r.value=tidyMath(r.value,{keepGroups:r.keepGroups===true||r.title==='괄호로 묶기'});
 clearTimeout(taskTimer);task=null;taskCollapsed=false;taskReturn=null;
 app.innerHTML=`<section class="workspace"><header class="workspace-title"><div><p class="eyebrow">수식 · 변형 · 설명</p><h1>수식 작업실</h1><p>항을 누르고 바꾸면, 이유가 한 줄씩 남습니다.</p></div><button class="btn primary" data-free-input>자유 수식 작성</button></header>
 <details class="work-options"><summary>예제·연습·도움말·백업</summary><div class="work-options-body">
 <details class="work-examples" data-work-examples><summary>예제로 시작하기 <span>부등식 · 삼각방정식 · 전개 · 인수분해 · 지수 · 로그</span></summary><div data-example-list></div></details>
 <details class="work-guide"><summary>처음이라면 · 사용 순서와 저장</summary><ol><li><strong>식 고르기</strong> — 상단의 자유 수식 작성에서 빈칸에 식을 쓰고 새 풀이를 시작하거나 예제를 고르세요. 하단 새 줄 쓰기는 현재 풀이에 줄을 추가합니다.</li><li><strong>변형하기</strong> — 하단의 전체 식을 누르면 양변조작, 항·괄호를 누르면 항 변형을 고를 수 있습니다. 미리보기와 적용 조건을 확인하세요.</li><li><strong>따로 계산하기</strong> — ＋ 보조 식에서 계산한 뒤 결과 대입으로 본식에 연결하세요. 조건·치환에는 정의역과 공통 부분을 기록합니다.</li><li><strong>이유 확인하기</strong> — 각 줄의 변형 이유를 읽으세요. 직접 입력은 이전 줄과의 동치를 확인하지 않으며, 도구로 변형한 뒤에도 원래 조건과 해를 확인해야 합니다.</li></ol><p>이전 줄에서 다른 변형을 해도 뒤쪽 기록은 남습니다. 브라우저 데이터를 지우기 전에는 백업을 내려받으세요.</p></details>
 <div class="work-backup-actions"><button data-backup-download>백업 내려받기</button><button data-backup-open>백업 복원</button></div>

 <details class="work-examples" data-practice-picker><summary>연습문제 선택 <span>조건 파악 → 풀이 → 답 확인</span></summary><div data-practice-list></div></details></div></details>
 <div class="work-storage" data-storage-status role="status" aria-live="polite"></div>${linkedPractice?`<section class="work-practice" data-linked-practice><h2>${esc(linkedPractice.title)}</h2><p>풀이 예제에서 이어서 연습합니다. 시작하면 기존 기록을 남기고 새 풀이를 추가합니다.</p><button class="btn primary" data-practice-start="${linkedPractice.id}">이 연습 시작</button> <button class="btn" data-linked-dismiss>닫기</button></section>`:''}<div data-example-panel></div><div data-practice-panel></div><div data-work-context></div><div data-work-sheets></div><div data-work-cases></div>
 <section class="work-history" aria-label="수식과 풀이 과정"><header><h2>${isAux()?esc(state.name)+' 풀이':'본식 풀이'} <span>${visibleRowIndices(state).length}줄</span></h2><details class="work-history-menu"><summary>풀이 관리</summary><div><button data-copy-menu>복사</button><button data-history-undo${history.length?'':' disabled'}>실행 취소</button><button data-deleted-open>삭제한 수식 (${state.rows.filter(r=>r.archived).length})</button></div></details></header><div data-work-rows></div><nav class="work-history-pages" data-history-pages aria-label="풀이 기록 페이지"></nav></section>
 <p class="work-save-note">직접 입력한 줄은 동치 확인 없이 기록됩니다. 중요한 풀이는 백업 파일로 보관하세요.</p>
 <div data-work-dock></div><div data-work-task hidden></div></section>`;
 renderHistory(view?.pageStart);context();sheetBar();caseList();mountDock();renderPractice();renderGuidedExample();storageNotice();
 if(view)restoreHistoryView(view);
 const picker=$('[data-practice-picker]');picker.ontoggle=()=>{if(picker.open&&!$('[data-practice-list]').children.length)$('[data-practice-list]').innerHTML=PRACTICE_PROBLEMS.map(p=>`<button data-practice-start="${p.id}"><small>${esc(p.topic)}</small><strong>${esc(p.title)}</strong></button>`).join('');};
 const examples=$('[data-work-examples]');examples.ontoggle=()=>{if(examples.open&&!$('[data-example-list]').children.length)$('[data-example-list]').innerHTML=WORK_EXAMPLES.map(p=>`<button data-example="${p.id}"><small>${p.group}</small><strong>${p.title}</strong><span>${directMath(p.value)}</span></button>`).join('');};
}
function renderHistory(pageStart){
 const count=24,indices=visibleRowIndices(state),total=indices.length,activePosition=indices.indexOf(state.active);
 if(pageStart!==undefined)historyStart=Math.max(0,pageStart>=total?pageStart-count:pageStart);
 else if(historyStart===null||activePosition<historyStart||activePosition>=historyStart+count)historyStart=Math.max(0,activePosition-count+1);
 const end=Math.min(total,historyStart+count);
 $('[data-work-rows]').innerHTML=indices.slice(historyStart,end).map(i=>{const r=state.rows[i];return `<article class="work-row${i===state.active?' is-current':''}"><div class="work-row-number">${i+1}</div><div class="work-row-content"><div class="work-row-title"><span>${esc(r.title||'수식')}</span>${isManualRow(r)?'<small class="work-manual-status">직접 입력 · 동치 미확인</small>':''}${i===state.active?'<small>현재 식</small>':''}</div><button class="work-row-math" data-work-row="${i}" aria-label="${i+1}번째 수식에서 계속">${rowMath(r)}</button><p>${esc(r.explanation||'직접 작성한 수식입니다.')}</p>${r.note?`<div class="work-personal-note"><small>내 설명 · 저장됨 · 수학적 검증 안 됨</small><p>${esc(r.note)}</p></div>`:''}<details class="work-row-menu"><summary aria-label="${i+1}번째 줄 메뉴">줄 메뉴</summary><div><button class="btn small" data-note-edit="${i}">${r.note?'내 설명 편집':'내 설명 쓰기'}</button><button class="btn small" data-row-remove="${i}"${i===state.active?' disabled title="현재 식은 유지됩니다."':''}>이 수식 삭제</button></div></details>${r.conditions?.length?`<div class="work-conditions">조건: ${esc(r.conditions.join(' · '))}</div>`:''}${r.pendingCases?.length?`<div class="work-case-note">별도 확인: ${esc(r.pendingCases.map(c=>c.condition).join(' · '))}</div>`:''}${Object.keys(r.bindings||{}).length?`<small class="work-row-bindings">${esc(Object.entries(r.bindings).map(([n,v])=>`${n} := ${v}`).join(' · '))}</small>`:''}</div></article>`;}).join('');
 $('[data-history-pages]').innerHTML=total>count?`<button data-history-page="${Math.max(0,historyStart-count)}"${historyStart?'':' disabled'}>이전 24줄</button><span>${historyStart+1}–${end} / ${total}줄</span><button data-history-page="${historyStart+count}"${end<total?'':' disabled'}>다음 24줄</button>`:'';
}

// Reading position belongs to undo's in-memory UI state, never the saved notebook.
function historyView(index){
 const bottom=$('.direct-dock')?.getBoundingClientRect().top??window.innerHeight;
 const anchors=[...app.querySelectorAll('[data-work-row]')].map(el=>{const rect=el.getBoundingClientRect();return {index:+el.dataset.workRow,top:rect.top,bottom:rect.bottom};}).filter(rect=>rect.bottom>0&&rect.top<bottom);
 return {pageStart:historyStart,index,scrollY:window.scrollY,anchors};
}
function restoreHistoryView(view){
 requestAnimationFrame(()=>{
  const rows=[...app.querySelectorAll('[data-work-row]')],focus=rows.find(el=>+el.dataset.workRow>=view.index)||rows.at(-1);
  const anchor=view.anchors.find(a=>rows.some(el=>+el.dataset.workRow===a.index));
  const target=anchor?rows.find(el=>+el.dataset.workRow===anchor.index):focus,top=anchor?.top??view.anchors.find(a=>a.index===view.index)?.top;
  focus?.focus({preventScroll:true});
  const scrollY=target&&Number.isFinite(top)?window.scrollY+target.getBoundingClientRect().top-top:view.scrollY;
  if(Number.isFinite(scrollY))window.scrollTo?.({top:scrollY,left:window.scrollX,behavior:'instant'});
 });
}
function openRowRemoval(index){
 const refs=rowRemovalInfo(book,state,index),row=state.rows[index];task={kind:'remove-row',sheet:state,index,row,view:historyView(index)};
 showTask('선택한 수식 삭제',`<p>${esc(state===book?'본식':state.name)} · ${index+1}번째 줄</p><div class="work-law-preview">${rowMath(row)}</div><p>선택한 수식만 풀이 목록에서 숨깁니다. 실행 취소 또는 ‘삭제한 수식’에서 복구할 수 있습니다.</p><p class="work-tip">원본 기록은 보관합니다. ${refs.children}개 풀이 줄·${refs.auxiliary}개 보조 식의 참조와 현재 식은 유지합니다.</p>`,`<button class="primary" data-row-remove-confirm>이 수식 삭제</button>`,true);
}
function confirmRowRemoval(){
 if(task?.kind!=='remove-row'||task.sheet!==state||state.rows[task.index]!==task.row)return;
 rowRemovalInfo(book,state,task.index);const {row,view}=task;checkpoint(view);row.archived=true;
 if(!save()){delete row.archived;history.pop();throw Error('삭제 상태를 저장하지 못했습니다. 원래 수식은 유지됩니다.');}
 render(view);toast('수식을 목록에서 삭제했습니다. 풀이 관리에서 실행 취소할 수 있습니다.');
}
function openDeletedRows(){
 task={kind:'deleted-rows',sheet:state};const rows=state.rows.flatMap((row,index)=>row.archived?[{row,index}]:[]);
 showTask('삭제한 수식',`<p>${esc(state===book?'본식':state.name)} · 원본과 참조를 보관 중입니다.</p>${rows.length?rows.map(({row,index})=>`<article class="work-deleted-row"><span>${index+1}번째 줄</span><div>${rowMath(row)}</div><button data-row-restore="${index}">복구</button></article>`).join(''):'<p>삭제한 수식이 없습니다.</p>'}<p class="work-tip">새로고침 후에도 여기에서 복구할 수 있으며 백업에도 포함됩니다. 보관된 원본은 300줄 한도에 포함됩니다.</p>`,'',true);
}
function restoreDeletedRow(index){
 if(task?.kind!=='deleted-rows'||task.sheet!==state||!state.rows[index]?.archived)return;
 const row=state.rows[index];checkpoint();delete row.archived;
 if(!save()){row.archived=true;history.pop();throw Error('복구 상태를 저장하지 못했습니다. 다시 시도해 주세요.');}
 historyStart=null;render();toast('원래 위치에 수식을 복구했습니다.');
}

function openNote(){task={kind:'note',row:current(),rowIndex:state.active};showTask('내 설명 편집',`<label>풀이 설명<textarea data-note-draft maxlength="4000" rows="7" placeholder="가정, 정의, 계산 이유와 결론을 자유롭게 적으세요.">${esc(current().note||'')}</textarea></label><p class="work-tip">저장과 수학적 검증은 별개입니다. 이 서술의 참·거짓이나 증명은 자동 판정하지 않습니다. 돌아가기는 이번 편집을 취소합니다.</p>`,`<button class="primary" data-note-save>설명 저장</button>`);}
function saveNote(){if(task?.kind!=='note'||task.row!==current())throw Error('현재 줄이 바뀌었습니다. 설명을 다시 선택하세요.');const r=current(),old=r.note;checkpoint();r.note=$('[data-note-draft]').value.slice(0,4000);if(!save()){r.note=old;history.pop();throw Error('설명을 저장하지 못했습니다. 작성 내용은 이 창에 남아 있습니다.');}render();toast('설명을 저장했습니다. 수학적 검증은 하지 않았습니다.');}
function logicContext(r){return `<section class="work-logic"><h3>조건·정의의 기호 표기</h3>${(r.logicStatements||[]).map((v,i)=>`<article><small>${esc(v.kind||'주장')} · 직접 기록 · 검증 안 됨</small><p>정의역: ${esc(v.domain)}</p><p class="work-logic-formula">${esc(v.formula)}</p><p>${esc(v.meaning)}</p><button class="btn small" data-logic-edit="${i}">편집</button><button class="btn small" data-logic-remove="${i}">기록 삭제</button></article>`).join('')}<button class="btn small" data-logic-open>＋ 기호·정의 추가</button><p class="work-tip">아래 표기는 풀이에 보존되지만 계산 엔진의 증명이나 자동 검증 결과는 아닙니다.</p></section>`;}
function openLogic(index=null){task={kind:'logic',index,row:current()};showTask('조건·정의 기호 표기',`<label>입력 종류<select data-logic-kind><option selected>가정</option><option>정의</option><option>주장</option></select></label><div class="work-logic-templates">${LOGIC_TEMPLATES.map(p=>`<button data-logic-template="${p.id}">${esc(p.title)}</button>`).join('')}</div><label>입력 방법<select data-logic-method><option value="quantified" selected>양화사 조립</option><option value="direct">전체 기호 직접 표기</option></select></label><p class="work-tip" data-logic-edit-note hidden></p><div data-logic-bindings>${[0,1,2].map((i)=>`<div class="work-logic-binding"><select aria-label="${i+1}번째 양화사" data-logic-quantifier="${i}"><option value=""${i!==0?' selected':''}>사용 안 함</option><option value="∀"${i===0?' selected':''}>∀ 모든</option><option value="∃">∃ 존재</option></select><input data-logic-variable="${i}" aria-label="${i+1}번째 변수" maxlength="5" value="${['x','y','z'][i]}"><select data-logic-domain="${i}" aria-label="${i+1}번째 정의역">${Object.entries(LOGIC_DOMAINS).map(([key,[symbol,name]])=>`<option value="${key}"${key==='R'?' selected':''}>${symbol} ${name}</option>`).join('')}</select></div>`).join('')}</div><label>정의역·나머지 기호의 뜻<input data-logic-field data-logic-parameters maxlength="1000" placeholder="직접 표기에서는 모든 변수의 정의역을 적으세요."></label><label><span data-logic-predicate-label>양화 범위 안의 명제</span><textarea data-logic-field data-logic-predicate maxlength="1000" rows="2" placeholder="예: x² ≥ 0"></textarea></label><div class="work-logic-templates" aria-label="논리 기호">${['¬','∧','∨','⇒','⇔','∈','≠','≤','≥','(',')'].map(symbol=>`<button data-logic-symbol="${symbol}">${symbol}</button>`).join('')}</div><label>명제의 자연어 뜻<textarea data-logic-field data-logic-meaning maxlength="1000" rows="2" placeholder="예: x의 제곱은 0 이상입니다."></textarea></label><div data-logic-preview class="work-logic-preview" role="status"></div><p class="work-tip">조립은 양화사의 순서와 괄호 범위를 보존합니다. 자유변수·술어의 의미와 명제의 참·거짓은 자동 검사하지 않습니다. 빠진 기호의 정의역을 직접 밝혀 주세요.</p>`,`<button class="primary" data-logic-save>기호 기록 저장</button>`);task.logicMethod='quantified';if(index!==null){const v=current().logicStatements[index],draft=logicEditorDraft(v);task.assembledLogic=draft.method==='quantified'?v:null;$('[data-logic-kind]').value=v.kind||'주장';setLogicDraft(draft);}previewLogic();}
function readLogic(method=$('[data-logic-method]').value){const predicate=$('[data-logic-predicate]').value,meaning=$('[data-logic-meaning]').value,parameters=$('[data-logic-parameters]').value;if(method==='direct'){
 const original=task.index!==null?task.row.logicStatements[task.index]:null;
 // Retain exact matching structure when only the notation view changed.
 for(const source of [original,task.assembledLogic])if(source&&parameters===source.domain&&predicate===source.formula&&meaning===source.meaning)return JSON.parse(JSON.stringify(source));
 return logicStatement(parameters,predicate,meaning);
}return quantifiedStatement([0,1,2].map(i=>({quantifier:$(`[data-logic-quantifier="${i}"]`).value,variable:$(`[data-logic-variable="${i}"]`).value.trim(),domain:$(`[data-logic-domain="${i}"]`).value})),predicate,meaning,parameters);}
function setLogicDraft(draft){
 $('[data-logic-method]').value=draft.method;task.logicMethod=draft.method;
 $('[data-logic-parameters]').value=draft.parameters;$('[data-logic-predicate]').value=draft.predicate;$('[data-logic-meaning]').value=draft.meaning;
 if(draft.method==='quantified')for(let i=0;i<3;i++){const b=draft.bindings[i];$(`[data-logic-quantifier="${i}"]`).value=b?.quantifier||'';if(b){$(`[data-logic-variable="${i}"]`).value=b.variable;$(`[data-logic-domain="${i}"]`).value=b.domain;}}
 const note=$('[data-logic-edit-note]');note.hidden=false;note.textContent=draft.method==='quantified'?'양화사 순서·변수·정의역을 확인하며 편집하세요.':'원문을 직접 편집합니다. 직접 쓴 표기를 자동으로 조립식으로 바꾸지 않습니다.';
 if(draft.method==='direct'&&task.index!==null&&!task.assembledLogic)note.textContent='이 입력은 구조 편집으로 복원할 수 없어요. 원문을 그대로 표시했으니 직접 편집해 주세요. 수학적 오류를 뜻하지는 않습니다.';
}
function changeLogicMethod(){
 const method=$('[data-logic-method]').value;if(method===task.logicMethod){previewLogic();return;}
 if(method==='direct'){
  try{if(['parameters','predicate','meaning'].every(key=>!$(`[data-logic-${key}]`).value.trim())){task.emptyQuantifierDraft=[0,1,2].map(i=>({quantifier:$(`[data-logic-quantifier="${i}"]`).value,variable:$(`[data-logic-variable="${i}"]`).value,domain:$(`[data-logic-domain="${i}"]`).value}));setLogicDraft({method,parameters:'',predicate:'',meaning:''});}else{const v=readLogic('quantified');task.assembledLogic=v;setLogicDraft({method,parameters:v.domain,predicate:v.formula,meaning:v.meaning});}}
  catch{$('[data-logic-method]').value=task.logicMethod;toast('조립 내용을 완성한 뒤 전체 기호로 바꿔 주세요.');}
 }else{
  const source={...task.assembledLogic,domain:$('[data-logic-parameters]').value,formula:$('[data-logic-predicate]').value,meaning:$('[data-logic-meaning]').value};
  const draft=logicEditorDraft(source);
  if(draft.method==='quantified')setLogicDraft(draft);
  else if(!source.domain.trim()&&!source.formula.trim()&&!source.meaning.trim())setLogicDraft({method:'quantified',bindings:task.emptyQuantifierDraft||[{quantifier:'∀',variable:'x',domain:'R'}],parameters:'',predicate:'',meaning:''});
  else{$('[data-logic-method]').value=task.logicMethod;toast('직접 입력한 원문은 자동으로 조립식으로 바꾸지 않습니다.');}
 }
 previewLogic();
}
function previewPracticeAnswer(){
 if(task?.kind!=='practice')return;task.answer=$('[data-practice-answer]').value;
 const row=current(),stale=practiceNeedsReview(row.practiceFeedback),feedback=!stale&&task.answer===(row.practiceAnswer||'')?row.practiceFeedback:null,el=$('[data-practice-feedback]');
 el.textContent=feedback?.message||(task.answer.trim()?`아직 확인하지 않은 답입니다. ${stale?'다시 확인':'답 확인'}을 눌러 주세요.`:'답을 먼저 입력하세요.');el.dataset.status=feedback?.status||'unverified';el.dataset.reason=feedback?.reason||(!feedback?'unchecked':'');
 $('[data-practice-review-container]').innerHTML=practiceReviewNotice(row);$('[data-practice-check]').textContent=stale?'다시 확인':'답 확인';measureTask();
}
function practiceReviewNotice(row){
 if(!practiceNeedsReview(row.practiceFeedback))return '';
 const label={correct:'정답',incorrect:'오답',unverified:'미검증'}[row.practiceFeedback.status]||'판정';
 return `<aside class="work-practice-review" data-practice-review role="status"><strong>재확인 필요</strong><p>저장된 판정의 검사 기준이 없거나 현재 기준과 다릅니다. 기존 답과 판정은 그대로 보관했습니다. 답 확인창에서 ‘다시 확인’을 누를 때만 새로 판정합니다.</p><details><summary>이전 판정 기록 보기</summary><p>이전 답: ${esc(row.practiceAnswer||'입력 없음')}</p><p>이전 결과 · ${label}: ${esc(row.practiceFeedback.message)}</p></details></aside>`;
}
function previewLogic(){if(task?.kind!=='logic')return;const direct=$('[data-logic-method]').value==='direct';$('[data-logic-bindings]').hidden=direct;$('[data-logic-predicate-label]').textContent=direct?'전체 기호 표기':'양화 범위 안의 명제';try{const v=readLogic();$('[data-logic-preview]').innerHTML=`<p class="work-logic-formula">${esc(v.formula)}</p><p>${esc(v.meaning)}</p>`;$('[data-logic-save]').disabled=false;}catch(e){$('[data-logic-preview]').textContent=e.message;$('[data-logic-save]').disabled=true;}measureTask();}
function guidedExampleContent(p){
 const hintNote=p.hintNote??'치환은 선택 사항입니다. 정의를 기록하는 것과 수식에 적용하는 것은 별도 동작이며 풀이를 자동으로 덮어쓰지 않습니다.',answerNote=p.answerNote??'일반해 집합의 동치와 해의 누락은 자동 채점하지 않습니다. 유한 개 값을 대입한 확인은 일반해의 증명이 아닙니다.';
 return `<div class="work-example-equation">${directMath(p.value)}</div><p class="work-example-condition">${esc(p.condition)}</p><p>${esc(p.goal)}</p><details data-example-hints><summary>${esc(p.hintLabel||'힌트 · 치환 안내')}</summary>${p.hints.map(h=>`<p>${esc(h)}</p>`).join('')}<details data-example-final-hint><summary>${esc(p.finalHintLabel||'마지막 확인 힌트')}</summary><p>${esc(p.confirmation)}</p></details>${hintNote?`<p>${esc(hintNote)}</p>`:''}</details><details data-example-answers><summary>${esc(p.answerLabel||'정답 비교 안내 · 직접 확인')}</summary>${p.answers.map(a=>`<p class="work-example-answer">${esc(a)}</p>`).join('')}<p>${esc(p.comparison)}</p><p>${esc(answerNote)}</p></details>${p.support?`<details data-example-support><summary>지금 지원하는 부등식 범위</summary>${p.support.map(s=>`<p>${esc(s)}</p>`).join('')}</details>`:''}`;
}
function openGuidedExample(p){
 task={kind:'guided-example',exampleId:p.id};showTask(p.title,`<div class="work-guided-example"><p>원식과 조건에서 한 단계씩 기록해 보세요. 힌트·정답은 필요할 때 펼쳐 보세요. 기존 풀이·보조 식은 보존됩니다.</p>${guidedExampleContent(p)}</div>`,`<button class="primary" data-guided-start="${p.id}">이 예제로 새 풀이 시작</button>`,true);
}
function startGuidedExample(id){
 if(task?.kind!=='guided-example'||task.exampleId!==id)return;const p=WORK_EXAMPLES.find(p=>p.guided&&p.id===id);if(!p)return;
 const origin=originSnapshot({value:tidyMath(p.value),condition:p.condition,exampleId:p.id});
 const row={...originSnapshot(origin),origin,startNew:true,title:p.title,explanation:'주어진 원식과 조건에서 독립된 풀이를 시작했습니다. '+p.goal,note:'',practiceAnswer:'',practiceFeedback:null};
 startIndependentSolution(row,false);
}
function renderGuidedExample(){
 const p=WORK_EXAMPLES.find(p=>p.guided&&p.id===current().exampleId);$('[data-example-panel]').innerHTML=p?`<section class="work-guided-example"><header><strong>${esc(p.title)}</strong><small>${esc(p.panelLabel||'일반해 직접 확인')}</small></header>${guidedExampleContent(p)}<button class="btn small" data-context-board>조건·치환 보드 열기</button></section>`:'';
}

function renderPractice(){const p=isAux()?null:PRACTICE_PROBLEMS.find(p=>p.id===current().practiceId);$('[data-practice-panel]').innerHTML=p?`<section class="work-practice"><small>${esc(p.topic)} · 연습문제</small><h2>${esc(p.title)}</h2><p>${esc(p.prompt)}</p><div>${directMath(p.value)}</div><p>주어진 조건: ${esc(p.condition)}</p><button class="btn" data-practice-open>답 입력·확인</button>${practiceNeedsReview(current().practiceFeedback)?practiceReviewNotice(current()):current().practiceFeedback?`<p data-status="${esc(current().practiceFeedback.status)}" data-reason="${esc(current().practiceFeedback.reason||'')}">${esc(current().practiceFeedback.message)}</p>`:''}<small>최종 답만 검사합니다. 풀이와 자유 서술 전체를 검증하지 않습니다.</small></section>`:'';}
function openPracticeAnswer(){const p=PRACTICE_PROBLEMS.find(p=>p.id===current().practiceId);if(!p)return;task={kind:'practice',answer:current().practiceAnswer||''};showTask('연습문제 · 최종 답 확인',`<div data-practice-review-container></div><div class="work-law-preview"><small>원래 문제</small><div>${directMath(p.value)}</div></div><p>${esc(p.prompt)}</p><p class="work-tip">원래 조건: ${esc(p.condition)}</p><label>최종 답<input data-practice-answer inputmode="text" maxlength="600" value="${esc(task.answer)}" placeholder="${p.kind==='roots'?'예: 1, 7':'식 또는 정확한 값'}"></label><div data-practice-pad>${inputPad('practice','number',true)}</div><p data-practice-feedback role="status"></p><p class="work-tip">수식의 정확한 값과 문제별 답 형식을 검사합니다. 지원 밖 입력은 오답과 구분해 미검증으로 표시합니다. 풀이 서술과 중간 단계는 별도로 검토하세요.</p>`,`<button class="primary" data-practice-check>답 확인</button>`);previewPracticeAnswer();}

function categoryTabs(groups,active,type){return `<div class="operation-categories" role="tablist" aria-label="${type==='expression'?'변형':'양변조작'} 세부 분류">${groups.map(g=>`<button role="tab" data-operation-group="${g.id}" aria-selected="${g.id===active}">${g.label}</button>`).join('')}</div>`;}
function showOperations(view){
 selectionView=view;operationPage=view.selected.length||view.scoped?'expression':'equation';
 if(view.inequality){$('[data-operation-title]').textContent='부등식 양변조작';task={kind:'inequality-menu',raw:current().value};$('[data-operation-content]').innerHTML=`<p class="work-tip">${REAL_INEQUALITY_SCOPE}인 범위에서 적용합니다. 같은 다항식을 더하기·빼기, 0이 아닌 유리수 상수로 곱하기·나누기를 지원합니다.</p><div class="work-transform-actions work-balance-actions" data-action-count="4">${BALANCE_GROUPS[0].modes.map(([id,label])=>`<button data-equation-mode="${id}">${label}</button>`).join('')}</div>`;editor.resize();return;}
 $('[data-operation-title]').textContent=operationPage==='expression'?'항 변형':'양변조작';
 if(operationPage==='expression'){
  if(!view.selected.length&&!view.scoped){task=null;$('[data-operation-content]').innerHTML='<p class="work-tip">변형할 항을 누르세요. 여러 항을 함께 고를 수 있습니다.</p>';return;}
  openLaws(view.ctx);
 }else{
  if(!view.equation){task=null;$('[data-operation-content]').innerHTML='<p class="work-tip">양변조작은 =가 있는 식에서 사용할 수 있습니다. 위의 항을 누르면 변형 도구가 바로 나옵니다.</p>';return;}
  showEquationPage();
 }
 editor.resize();
}
function showEquationPage(){
 const category=operationGroup.equation,group=BALANCE_GROUPS.find(g=>g.id===category),raw=current().value;
 task={kind:'equation-menu',raw,category,ctx:{resultFor:v=>v},laws:[],lawIndex:null};
 if(category==='laws')try{task.laws=lawCandidates(raw);}catch{}
 $('[data-operation-content]').innerHTML=categoryTabs(BALANCE_GROUPS,category,'equation')+(category==='laws'?lawList(task.laws):`<div class="work-transform-actions work-balance-actions" data-action-count="${group.modes.length}">${group.modes.map(([id,label])=>`<button data-equation-mode="${id}">${label}</button>`).join('')}</div>`)+(category==='laws'&&!task.laws.length?'<p class="work-tip">이 등식에 바로 적용할 지수·로그 법칙이 없습니다. 양변 계산이나 이항·정리를 선택하세요.</p>':'');
 editor.resize();
}
function mountDock(){const r=current();if(r.displayLatex){mountStructuredDock();return;}editor.mount($('[data-work-dock]'),{raw:r.value,expanded:dockExpanded,rowIndex:state.active,label:`${isAux()?state.name+' · ':''}${state.active+1}번째 줄에서 계속`,problem:{binding:r.bindings?.t,excluded:r.excluded||[],expression:r.value},canUndo:!!history.length,canReset:!state.entry&&canReset(),canPrevious:adjacentRowIndex(state,-1)>=0,canNext:adjacentRowIndex(state,1)>=0});}
function context(){const r=current(),bindings=r.bindings||{};let candidates=[];try{candidates=substitutionCandidates(r.value);}catch{}
 $('[data-work-context]').innerHTML=`<details class="work-context"><summary><span class="work-binding-summary">${Object.keys(bindings).length?Object.entries(bindings).map(([n,v])=>`<span>${esc(n)} := ${directMath(v)}</span>`).join(''):'조건 · 치환'}</span><small>펼치기 ⌄</small></summary><div class="work-context-body"><button class="btn small" data-context-board>조건·치환 보드</button><p>적용 대상: ${esc(isAux()?state.name:'본식')} · ${state.active+1}번째 줄</p><label>현재 줄의 조건<textarea data-work-condition maxlength="1000" placeholder="이 줄에 적용할 조건을 입력하세요. 예: x는 실수, x > 0">${esc(r.condition||'')}</textarea></label>${logicContext(r)}${(r.assumptions||[]).length?`<p>변형에 사용한 조건: ${esc(r.assumptions.join(' · '))}</p>`:''}<div class="work-binding-list">${Object.entries(bindings).map(([n,v])=>`<div><span>${esc(n)} := ${directMath(v)}</span><button class="btn small" data-binding-apply="${n}">적용</button><button class="btn small" data-binding-restore="${n}">복원</button></div>`).join('')}</div><div class="button-row"><button class="btn small" data-new-binding>＋ 치환 추가</button>${Object.keys(bindings).length?'<button class="btn small" data-restore-all>모두 복원</button>':''}</div>${candidates.length?`<div class="work-sub-candidates"><small>눌러서 치환</small>${candidates.map((c,i)=>`<button data-candidate="${i}">${directMath(c.expression)}</button>`).join('')}</div>`:''}<p>정의는 각 풀이 줄에 보관됩니다. 앞줄의 정의를 바꾸지 않고 계속 쓸 수 있습니다.</p></div></details>`;
 $('[data-work-condition]').onchange=e=>{checkpoint();r.condition=e.target.value;save();};
 $('[data-work-context]').onclick=e=>{const b=e.target.closest('button');if(!b)return;try{
  if(hasInequality(r.value)&&['data-new-binding','data-binding-apply','data-binding-restore','data-restore-all'].some(key=>b.hasAttribute(key)))throw Error('부등식 행의 치환 적용·복원은 아직 지원하지 않습니다. 기록한 정의는 보관되며 양변 조작을 사용할 수 있습니다.');
  if(b.hasAttribute('data-logic-open'))openLogic();
  if(b.hasAttribute('data-logic-edit'))openLogic(+b.dataset.logicEdit);
  if(b.hasAttribute('data-logic-remove')){const old=r.logicStatements||[];checkpoint();r.logicStatements=old.filter((_,i)=>i!==+b.dataset.logicRemove);if(!save()){r.logicStatements=old;history.pop();throw Error('삭제 내용을 저장하지 못했습니다.');}context();}
  if(b.hasAttribute('data-new-binding'))openSubstitution('');
  if(b.hasAttribute('data-candidate'))openSubstitution(candidates[+b.dataset.candidate].expression);
  if(b.hasAttribute('data-binding-apply')||b.hasAttribute('data-binding-restore')){const name=b.dataset.bindingApply||b.dataset.bindingRestore;append([substituteMany(r.value,bindings,name,bindings[name],b.hasAttribute('data-binding-restore')?'restore':'apply')]);}
  if(b.hasAttribute('data-restore-all')){const value=restoreAll(r.value,bindings);if(value===r.value)throw Error('현재 식에 복원할 치환 문자가 없습니다.');append([{value,title:'모든 치환 복원',explanation:'의존하는 정의를 차례로 대입해 원래 문자로 되돌렸습니다. 치환 정의는 기록에 보관됩니다.'}]);}
 }catch(err){toast(err.message);}};
}
function showTask(title,body,footer,independent=false){if(!taskReturn)taskReturn={expanded:dockExpanded,focus:taskTrigger||focusTarget(document.activeElement)};taskCollapsed=false;$('[data-work-dock]').hidden=true;const host=$('[data-work-task]');host.hidden=false;host.innerHTML=`<section class="work-task${independent?' work-free-input':''}" aria-label="${esc(title)}"><header><strong>${esc(title)}</strong><button data-task-close aria-label="닫기">×</button></header>${independent?'':`<div class="work-task-source"><small>${isAux()?esc(state.name):'현재 식'}</small><div>${rowMath(current())}</div></div>`}<div class="work-task-body">${body}</div><p class="work-task-error" role="status"></p><nav class="work-task-navigation">${footer}<button data-task-close>${independent?'취소':'돌아가기'}</button>${independent?'':'<button data-task-fold aria-label="식 변형 도구 접기">접기 ↓</button>'}</nav></section>`;measureTask();}
function measureTask(){requestAnimationFrame(()=>{const el=$('.work-task');if(el&&!$('[data-work-task]').hidden){const h=el.getBoundingClientRect().height;if(h)document.documentElement.style.setProperty('--direct-space',`${h+24}px`);if(task?.kind==='context-board'&&task.systemKeyboard){const field=document.activeElement,body=$('.work-task-body');if(body?.contains(field)&&field.matches('input,textarea')){const f=field.getBoundingClientRect(),b=body.getBoundingClientRect();if(f.bottom>b.bottom)body.scrollTop+=Math.ceil(f.bottom-b.bottom)+2;else if(f.top<b.top)body.scrollTop-=Math.ceil(b.top-f.top)+2;}}}});}
function focusTarget(element){return element?{element,attributes:[...element.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])}:null;}
function restoreTaskFocus(target,free){
 const same=target?.element?.isConnected&&!target.element.closest('[hidden]')?target.element:null;
 const replacement=target?.attributes.length?[...app.querySelectorAll('button,input,textarea,select,summary,[tabindex]')].find(el=>!el.disabled&&!el.closest('[hidden]')&&target.attributes.every(([name,value])=>el.getAttribute(name)===value)):null;
 (same||replacement||(free?$('[data-free-input]'):$(`[data-work-row="${state.active}"]`)))?.focus({preventScroll:true});
}
function closeTask(){if(task?.kind==='context-board'&&task.owner){const owner=task.owner;openInput(owner.mode,owner);return;}const back=taskReturn,practice=task?.kind==='practice',free=task?.mode==='free'||task?.expressionDraft?.mode==='free';if(task?.kind==='advanced')advancedDrafts[task.entry.type]=task.entry;clearTimeout(taskTimer);task=null;taskCollapsed=false;taskReturn=null;taskTrigger=null;$('[data-work-task]').hidden=true;$('[data-work-task]').innerHTML='';$('[data-work-dock]').hidden=false;dockExpanded=back?.expanded??dockExpanded;if(current().displayLatex)mountStructuredDock();else if(practice)mountDock();else editor.setExpanded(dockExpanded);restoreTaskFocus(back?.focus,free);}
function toggleTools(){
 if(current().displayLatex){if(taskCollapsed){taskCollapsed=false;$('[data-work-dock]').hidden=true;$('[data-work-task]').hidden=false;measureTask();}return;}
 if(taskCollapsed){taskCollapsed=false;dockExpanded=true;$('[data-work-dock]').hidden=true;$('[data-work-task]').hidden=false;measureTask();return;}
 editor.setExpanded(!dockExpanded);
}
function openTools(){clearTimeout(taskTimer);task=null;taskCollapsed=false;taskReturn=null;$('[data-work-task]').hidden=true;$('[data-work-task]').innerHTML='';$('[data-work-dock]').hidden=false;editor.open();}
function foldTask(){taskCollapsed=true;$('[data-work-task]').hidden=true;$('[data-work-dock]').hidden=false;if(current().displayLatex)mountStructuredDock();else editor.setExpanded(false);}
function error(message){const el=$('.work-task-error');if(el){el.textContent=message;measureTask();}else if(message)toast(message);}
function caseList(){const cases=current().pendingCases||[];$('[data-work-cases]').innerHTML=cases.length?`<aside class="work-case-list"><strong>놓치지 말아야 할 별도 경우</strong><p>아래 경우와 현재 가지의 해를 함께 확인해야 합니다.</p>${cases.map((c,i)=>`<button data-equation-case="${i}">${esc(c.condition)} <span>원래 방정식 확인 →</span></button>`).join('')}</aside>`:'';}
function openCase(index){const c=current().pendingCases[index];task={kind:'case',branch:c};showTask('0인 경우 따로 확인',`<div class="work-law-preview"><strong>${esc(c.condition)}</strong><div>${directMath(c.equation)}</div>${c.candidate?`<p>확인할 값: ${directMath(c.candidate)}</p>`:''}${c.substitution?`<div>${directMath(c.substitution)}</div>`:''}<p>${esc(c.note)}</p><p>원래 조건: ${esc(c.previousCondition||'별도 조건 없음')}</p></div><p class="work-tip">이 경우에서 계속하면 0이 아닌 가지의 조건을 가져오지 않습니다. 다른 가지는 풀이 기록에서 다시 선택할 수 있습니다.</p>`,`<button class="primary" data-case-continue>이 경우에서 계속</button>`);}
function openBalance(options={}){const raw=current().value,inequality=hasInequality(raw),parsed=inequality?parseWorkspaceFormula(raw):equationInfo(raw);task={kind:'balance',raw,inequality,mode:options.mode||'add',operand:'',side:options.side??0,selected:options.selected||[],operandPicks:[],manual:false,tab:'number',simplify:true,terms:equationTerms(inequality?parsed.parts.join(' = '):raw),suggestions:inequality?[]:balanceSuggestions(raw)};drawBalance();}
function pickBalanceOperand(){const t=task;const values=t.operandPicks.map(key=>{const [side,id]=key.split(':').map(Number);return t.terms[side][id].value;});t.operand=values.length===1?values[0]:values.map(v=>`(${v})`).join('+');}
function operandTerms(t){return `<p class="work-tip">양변에 적용할 항을 누르세요. 여러 항을 고르면 합으로 사용합니다.</p><div class="balance-operand-sides">${t.terms.map((list,side)=>`<section><small>${side===0?'좌변의 항':'우변의 항'}</small><div class="balance-terms">${list.map(v=>`<button data-operand-term="${side}:${v.id}" aria-pressed="${t.operandPicks.includes(`${side}:${v.id}`)}">${directMath(v.label)}</button>`).join('')}</div></section>`).join('')}</div>`;}
function drawBalance(){const t=task,needs=['add','subtract','multiply','divide'].includes(t.mode),suggestions=t.suggestions.map((s,i)=>({s,i})).filter(v=>v.s.operation===t.mode),quick=['1','-1','2','-2'],title=BALANCE_GROUPS.flatMap(g=>g.modes).find(([id])=>id===t.mode)?.[1]||'양변 계산';
 showTask((t.inequality?'부등식 양변조작 · ':'양변조작 · ')+title,`
 ${t.inequality?`<p class="work-tip">${REAL_INEQUALITY_SCOPE}인 범위에서 적용합니다. 조건 메모·양화사 기록을 증명이나 부호 판정으로 사용하지 않습니다.</p>`:''}
 ${t.mode==='transpose'?`<div class="balance-side-choice"><button data-balance-side="0" aria-pressed="${t.side===0}">좌변 → 우변</button><button data-balance-side="1" aria-pressed="${t.side===1}">우변 → 좌변</button></div><div class="balance-terms">${t.terms[t.side].map(v=>`<button data-balance-term="${v.id}" aria-pressed="${t.selected.includes(v.id)}">${directMath(v.label)}</button>`).join('')}</div><p class="work-tip">옮길 항을 누르세요. 여러 항을 함께 선택할 수 있습니다.</p>`:''}
 ${needs?`${operandTerms(t)}${suggestions.length?`<div class="balance-suggestions">${suggestions.map(({s,i})=>`<button data-balance-suggest="${i}">${esc(s.label)} <strong>${directMath(s.operand)}</strong></button>`).join('')}</div>`:''}<div class="balance-values">${quick.map(v=>`<button data-balance-value="${esc(v)}" aria-pressed="${t.operand===v}">${directMath(v)}</button>`).join('')}</div><div class="balance-operand-preview"><small>적용할 값</small><span>${t.operand?directMath(t.operand):'항 또는 숫자를 선택하세요'}</span></div><button class="direct-manual-toggle" data-balance-manual>${t.manual?'선택으로 입력':'직접 입력'}</button>${t.manual?`<label class="work-input-label">양변에 적용할 값 또는 식<input data-balance-input inputmode="none" autocomplete="off" maxlength="160" value="${esc(t.operand)}" placeholder="예: 2, -7, x+1"></label><div data-balance-pad>${inputPad('balance',t.tab)}</div>`:''}`:''}
 ${!['swap','simplify'].includes(t.mode)?`<label class="balance-simplify"><input type="checkbox" data-balance-simplify${t.simplify?' checked':''}> 계산한 결과도 다음 줄에 남기기</label>`:''}<div data-balance-preview></div>`,`<button class="primary" data-balance-apply disabled>적용하기</button>`);previewBalance();}
function previewBalance(){const t=task;t.change=null;error('');const shown=$('.balance-operand-preview span');if(shown)shown.innerHTML=t.operand?directMath(t.operand):'항 또는 숫자를 선택하세요';try{
 if(['add','subtract','multiply','divide'].includes(t.mode)&&!t.operand.trim()){$('[data-balance-preview]').innerHTML='<p class="work-tip">양변에 적용할 값을 선택하세요.</p>';$('[data-balance-apply]').disabled=true;return;}
 if(t.mode==='transpose'&&!t.selected.length){$('[data-balance-preview]').innerHTML='';$('[data-balance-apply]').disabled=true;return;}
 const opts={simplify:t.simplify,existingTerm:t.operandPicks.length>0,assumptions:current().assumptions||[],bindings:current().bindings||{}};t.change=t.inequality?balanceInequality(t.raw,t.mode,t.operand,opts):t.mode==='transpose'?transposeTerms(t.raw,t.side,t.selected,opts):balanceEquation(t.raw,t.mode,t.operand,opts);
 const c=t.change;$('[data-balance-preview]').innerHTML=`<div class="balance-preview"><small>양변 변경 미리보기</small>${c.steps.map(s=>`<div>${directMath(s.value)}</div>`).join('')}<p>${esc(c.steps[0].explanation)}</p>${c.steps[0].conditions.length?`<p>유지할 조건: ${esc(c.steps[0].conditions.join(' · '))}</p>`:''}${c.branch?`<div class="balance-branch"><strong>${esc(c.branch.condition)}인 경우도 따로 남깁니다.</strong><p>${esc(c.branch.note)}</p></div>`:''}</div>`;$('[data-balance-apply]').disabled=false;$('[data-balance-apply]').textContent=c.branch?'경우를 나누어 적용':'적용하기';
 }catch(err){$('[data-balance-preview]').innerHTML='';$('[data-balance-apply]').disabled=true;error(err.message);}measureTask();}
function applyBalance(){if(!task.change||task.raw!==current().value)return;const parent=current(),c=task.change,added=c.steps[0].conditions.filter(v=>!(parent.assumptions||[]).includes(v)),assumptions=[...new Set([...(parent.assumptions||[]),...added])],pendingCases=[...(parent.pendingCases||[])];if(c.branch)pendingCases.push({...c.branch,previousCondition:parent.condition||'',previousAssumptions:[...(parent.assumptions||[])],previousCases:[...(parent.pendingCases||[])],bindings:{...(parent.bindings||{})}});const condition=[parent.condition,added.join(' · ')].filter(Boolean).join('; ');append(c.steps.map(s=>({...s,condition,assumptions,pendingCases,...(task.inequality?{conditions:[...new Set([...(parent.conditions||[]),...s.conditions])]}:{})})));}
function openInput(mode='line',draft=null){
 const free=mode==='free',auxiliary=mode==='auxiliary',selected=!current().displayLatex&&(selectionView?.selected?.length||selectionView?.scoped);
 const seed=draft?.value??(free?'':auxiliary?(selected?editor.transformContext().raw:''):current().displayLatex?'':current().value);
 clearTimeout(taskTimer);task={kind:'input',mode,raw:current().value,tab:draft?.tab||'number',context:draft?.context||null,systemKeyboard:false};
 showTask(free?'자유 수식 작성':auxiliary?'보조 식 쓰기':'수식 작성 · 새 줄',`<div class="work-expression-entry"><label class="work-input-label" for="work-expression">수식 · LaTeX</label><div><input id="work-expression" data-work-expression inputmode="none" autocomplete="off" spellcheck="false" maxlength="2000" value="${esc(seed)}" placeholder="예: (x+1)/2 또는 x^2=4" aria-describedby="work-input-guide work-input-draft work-input-error"><button type="button" data-work-keyboard aria-pressed="false" title="기기 자판으로 문자·LaTeX 입력">기기 자판</button></div></div>${auxiliary?'<div class="work-aux-input-actions"><button data-aux-use-current>현재 식 가져오기</button><span>본식은 그대로 두고 따로 계산합니다.</span></div>':''}<p id="work-input-guide" class="work-input-guide">분수 <code>(x+1)/2</code> · 지수 <code>x^(2+1)</code> · 부등식 <code>x+1≤3</code><br>여러 항은 괄호로 묶으세요.</p><p id="work-input-draft" class="work-input-draft">${free?'기존 풀이 보존 · 새 풀이 시작으로 저장.':auxiliary?'보조 식 시작을 누르면 저장합니다.':'수식 기록을 누르면 새 줄로 저장합니다. 앞줄과 동치인지는 확인하지 않습니다.'} 닫으면 초안은 저장되지 않습니다.</p><div data-input-preview class="work-input-preview" aria-label="수식 미리보기"></div><div data-work-pad>${inputPad('work',task.tab,true)}</div><details class="work-expression-options"><summary>입력 도움말 · 전용 계산</summary>${typeTabs('expression')}<button class="btn small" data-draft-context>조건·치환 보드${task.context?' · 설정됨':''}</button>${free?'<p class="work-tip">이전 풀이 기록은 보존되며 새 풀이가 시작됩니다. 보조 식도 그대로 남고, 이전 조건·치환은 가져오지 않습니다.</p>':''}<p class="work-tip">${free?'새 풀이는 본식 기록 맨 끝에 추가됩니다. 조건·정의는 시작한 뒤 기록하세요.':'새로 작성한 줄은 앞줄과 동치인지 확인하지 않습니다. 같은 식으로 고치려면 항 선택 → 치환·직접 → 직접 변형을 사용하세요.'} 함수 탭에서 sin · log · e · π 등을 넣을 수 있습니다. 문자·LaTeX를 직접 쓰거나 붙여넣으려면 기기 자판을 선택하세요.</p>${inputHelp()}</details>`,`<button class="primary" data-input-save>${free?'새 풀이 시작':auxiliary?'보조 식 시작':'수식 기록'}</button>`,free);
 $('.work-task').classList.add('work-expression-task');
 $('.work-task-error').id='work-input-error';
 const f=$('[data-work-expression]'),touch=window.matchMedia?.('(pointer: coarse)').matches||false;
 setInputKeyboard(f,false,touch);if(!touch)f.focus();f.setSelectionRange?.(0,f.value.length);previewInput();
}
function toggleExpressionKeyboard(){
 const f=$('[data-work-expression]'),start=f.selectionStart,end=f.selectionEnd,system=!task.systemKeyboard;
 task.systemKeyboard=system;f.blur();setInputKeyboard(f,system,window.matchMedia?.('(pointer: coarse)').matches||false);
 $('[data-work-pad]').hidden=system;const button=$('[data-work-keyboard]');button.textContent=system?'수식 키패드':'기기 자판';button.setAttribute('aria-pressed',String(system));
 if(system||!f.hasAttribute('readonly'))f.focus();f.setSelectionRange?.(start,end);measureTask();
}

function openContextBoard(owner=null){
 const base=owner?.context||(owner?.mode==='free'?{}:current());
 task={kind:'context-board',owner,row:current(),sheet:state,mode:'condition',tab:'number',systemKeyboard:false,context:{condition:base.condition||'',bindings:{...(base.bindings||{})},logicStatements:JSON.parse(JSON.stringify(base.logicStatements||[]))},condition:base.condition||'',definition:'',recordOnly:false,domain:'',meaning:''};drawContextBoard();
}
function boardField(){return $(task.mode==='condition'?'[data-board-condition]':'[data-board-definition]');}
function stashContextBoard(){if(!task||task.kind!=='context-board')return;task.condition=$('[data-board-condition]').value;task.definition=$('[data-board-definition]').value;task.recordOnly=$('[data-board-record-only]').checked;task.domain=$('[data-board-domain]').value;task.meaning=$('[data-board-meaning]').value;}
function boardContext(){
 stashContextBoard();const t=task,next={...t.context,condition:t.condition,bindings:{...t.context.bindings},logicStatements:[...t.context.logicStatements]};
 if(t.definition.trim()){
  if(t.recordOnly){if(next.logicStatements.length>=20)throw Error('한 줄에는 기호 기록을 20개까지 보관합니다.');next.logicStatements.push({...logicStatement(t.domain,t.definition,t.meaning),kind:'정의'});}
  else next.bindings=definitionBinding(t.definition,next.bindings).bindings;
 }
 return next;
}
function drawContextBoard(){
 const t=task,scope=t.owner?(t.owner.mode==='free'?'새 본식 풀이 초안':t.owner.mode==='auxiliary'?'새 보조 식 초안':`${isAux()?state.name:'본식'} · 새 줄 초안`):`${isAux()?state.name:'본식'} · ${state.active+1}번째 줄`;
 showTask('조건·치환 보드',`<p class="work-board-scope">적용 대상: <strong>${esc(scope)}</strong><small>직접 기록 · 자동 검증 안 됨</small></p><div class="work-board-tabs" role="tablist" aria-label="조건 또는 치환 정의"><button role="tab" data-board-mode="condition" aria-selected="${t.mode==='condition'}">조건</button><button role="tab" data-board-mode="definition" aria-selected="${t.mode==='definition'}">치환 :=</button><button data-board-key=":="${t.mode==='definition'?'':' hidden'} aria-label="정의 기호 :=">:=</button><button data-board-keyboard aria-pressed="false">기기 자판</button></div><label class="work-board-field"${t.mode==='condition'?'':' hidden'}>이 줄에 적용할 조건<textarea data-board-condition inputmode="none" maxlength="1000" rows="2" placeholder="예: θ ∈ ℝ, 도(°) 단위, k ∈ ℤ">${esc(t.condition)}</textarea></label><div${t.mode==='definition'?'':' hidden'}><label class="work-board-field">정의 · 등호(=)와 구분<input data-board-definition inputmode="none" maxlength="600" autocomplete="off" spellcheck="false" value="${esc(t.definition)}" placeholder="a := sin θ"></label></div><div data-board-pad>${t.mode==='condition'?`<div class="work-board-symbols">${['x','θ','a','k','∈','ℝ','ℤ','<','≤','>','≥','≠','∀','∃','∧','∨',',','°','−','0','1','(',')','⌫'].map(k=>`<button data-board-key="${esc(k)}" aria-label="${k==='⌫'?'한 글자 또는 선택 영역 지우기':esc(k)}">${esc(k)}</button>`).join('')}</div>`:inputPad('board',t.tab,true)}</div><p data-board-preview class="work-tip" role="status"></p><details class="work-board-options"${t.recordOnly?' open':''}><summary>기호 기록 · 조건 안내</summary><div class="work-board-definition-tools"><label><input type="checkbox" data-board-record-only${t.recordOnly?' checked':''}>기호 정의로만 기록</label></div><div class="work-board-symbolic"${t.recordOnly?'':' hidden'}><label>기호의 정의역<input data-board-domain maxlength="1000" value="${esc(t.domain)}" placeholder="예: θ ∈ ℝ, k ∈ ℤ, 도(°) 단위"></label><label>자연어 뜻<textarea data-board-meaning maxlength="1000" rows="2">${esc(t.meaning)}</textarea></label></div><p class="work-tip">조건과 정의는 직접 기록이며 자동 검증하지 않습니다. 정의 저장은 수식을 바꾸지 않습니다. 실제 치환은 저장 뒤 적용·복원에서 별도로 실행하세요.${t.owner?' 초안에만 설정하며 수식을 시작하기 전에는 저장되지 않습니다.':''}</p><p class="work-tip">나누는 식이 0인 경우, 제곱 뒤의 불필요한 해, 삼각함수의 범위·각도 단위·주기를 따로 확인하세요. 해의 대입 확인은 모든 해를 찾았다는 증명이 아닙니다. 일반해의 동치는 자동 판정하지 않습니다.</p></details>`,`<button class="primary" data-board-save>${t.owner?'초안에 설정':'조건·정의 저장'}</button>`,true);
 $('.work-task').classList.add('work-context-board');for(const key of ['condition','definition','domain','meaning'])$(`[data-board-${key}]`).value=t[key];const f=boardField();setInputKeyboard(f,false,window.matchMedia?.('(pointer: coarse)').matches||false);t.systemKeyboard=false;previewContextBoard();
}
function previewContextBoard(){
 try{const next=boardContext();$('[data-board-save]').disabled=false;$('[data-board-preview]').textContent=task.definition.trim()?(task.recordOnly?'기호 기록만 보관합니다. 계산·치환에는 적용하지 않습니다.':Object.entries(next.bindings).map(([n,v])=>`${n} := ${v}`).join(' · ')):'조건을 기록하거나 치환 := 탭에서 정의를 추가하세요.';error('');}
 catch(err){$('[data-board-save]').disabled=true;$('[data-board-preview]').textContent='계산할 수 없는 정의는 기호 정의로만 기록하고 정의역·뜻을 함께 적을 수 있습니다.';error(err.message);}
 measureTask();
}
function toggleBoardKeyboard(){
 const f=boardField(),start=f.selectionStart,end=f.selectionEnd;task.systemKeyboard=!task.systemKeyboard;f.blur();setInputKeyboard(f,task.systemKeyboard,window.matchMedia?.('(pointer: coarse)').matches||false);$('[data-board-pad]').hidden=task.systemKeyboard;const button=$('[data-board-keyboard]');button.textContent=task.systemKeyboard?'수식 키패드':'기기 자판';button.setAttribute('aria-pressed',String(task.systemKeyboard));if(task.systemKeyboard||!f.hasAttribute('readonly'))f.focus();f.setSelectionRange?.(start,end);measureTask();
}
function saveContextBoard(){
 const next=boardContext(),t=task;
 if(t.owner){openInput(t.owner.mode,{...t.owner,context:next});return;}
 if(t.row!==current()||t.sheet!==state)throw Error('적용할 줄을 다시 선택하세요.');
 const old={};for(const key of Object.keys(next))old[key]=t.row[key];checkpoint();Object.assign(t.row,next);
 if(!save()){for(const [key,value]of Object.entries(old))if(value===undefined)delete t.row[key];else t.row[key]=value;history.pop();throw Error('저장하지 못했습니다. 입력 내용은 보드에 남아 있습니다.');}
 render();toast('조건·정의를 기록했습니다. 수식 자체는 바꾸지 않았습니다.');
}

function openSubstitution(definition='',source=current().value){const bindings=current().bindings||{},name=BINDING_NAMES.find(n=>!bindings[n]&&!new RegExp(`\\b${n}\\b`).test(source));if(!name){toast('사용 가능한 치환 이름을 모두 쓰고 있습니다. 기존 정의를 적용하거나 복원하세요.');return;}task={kind:'substitution',source,raw:current().value};showTask('치환 추가',`<p class="work-tip">선택한 식을 짧은 이름으로 바꿉니다. t, u, v 등 여러 정의를 함께 쓸 수 있습니다.</p><div class="work-sub-entry"><label>이름<select data-sub-name>${BINDING_NAMES.filter(n=>!bindings[n]).map(n=>`<option value="${n}"${n===name?' selected':''}>${n}</option>`).join('')}</select></label><span>:=</span><label>치환할 식<input data-sub-definition value="${esc(definition)}" maxlength="500" placeholder="예: x+1 또는 sin(theta)"></label></div><p class="work-tip">이미 만든 치환을 새 정의에 써도 됩니다. 예: t := x+1, u := t².</p>`,`<button class="primary" data-sub-save>적용하기</button>`);}
function openLaws(ctx=editor.transformContext()){
 const category=operationGroup.expression||(/(?:log|ln|exp)\s*\(|\^[a-z(]/.test(ctx.raw)?'power':ctx.actions.some(a=>a.id==='sum')?'split':'group');
 task={kind:'laws',raw:current().value,ctx,category,laws:[],expansion:[],lawIndex:null};drawLaws();
}
function lawList(laws){return `<div class="work-law-list">${laws.map((l,i)=>`<button data-law="${i}"><strong>${esc(l.title)}</strong><span>${directMath(l.value)}</span></button>`).join('')}</div>`;}
function drawLaws(){
 const t=task,group=TRANSFORM_GROUPS.find(g=>g.id===t.category);t.laws=[];t.expansion=[];
 if(t.category==='power')try{t.laws=lawCandidates(t.ctx.raw);}catch{}
 if(t.category==='group')try{t.expansion=expansionSteps(t.ctx.raw,{binding:current().bindings?.t,excluded:current().excluded||[]});}catch{try{t.expansion=symbolicExpansion(t.ctx.raw);}catch{}}
 const actions=t.ctx.actions.filter(a=>group.modes.includes(a.id)),sub=t.category==='edit'&&t.ctx.substitute;
 const shortcuts=selectionView.equation&&!selectionView.scoped?'<div class="operation-shortcuts" aria-label="선택한 항 이동"><button data-selected-balance="transpose">반대변으로 이동</button></div>':'';
 $('[data-operation-content]').innerHTML=shortcuts+categoryTabs(TRANSFORM_GROUPS,t.category,'expression')+`<div class="work-transform-actions">${actions.map(a=>`<button data-transform-mode="${a.id}">${esc(a.title)}</button>`).join('')}${sub?'<button data-transform-substitute>선택한 식 치환</button>':''}${t.category==='edit'?'<button data-new-aux>보조 식으로 계산</button>':''}</div>${t.expansion.length?`<button class="work-expand-button" data-expand-all><strong>전개 과정 ${t.expansion.length}줄 보기</strong><span>분배법칙 · 곱 계산 · 동류항 정리</span></button>`:''}${lawList(t.laws)}${!actions.length&&!sub&&!t.laws.length&&!t.expansion.length?'<p class="work-tip">선택한 부분에 적용할 항목이 없습니다. 다른 분류나 항을 선택하세요.</p>':''}`;
 editor.resize();
}
function selectLaw(index){
 task.lawIndex=index;const law=task.laws[index],known=new Set(current().assumptions||[]);task.required=law.conditions.filter(c=>!known.has(c));
 showTask(law.title,`<div class="work-law-preview"><div>${directMath(task.ctx.resultFor(law.value))}</div><p>${esc(law.explanation)}</p>${law.conditions.length?`<p>적용 조건: ${esc(law.conditions.join(' · '))}</p>`:''}${task.required.length?'<p>적용하면 필요한 조건을 이 풀이에 추가합니다.</p>':''}</div>`,`<button class="primary" data-law-apply>${task.required.length?'조건을 추가하고 적용':'적용하기'}</button>`);
}
function downloadBackup(){const text=serializeBackup(book),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`susik-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('백업 다운로드를 요청했습니다. 다운로드 목록에서 파일을 확인하세요.');}
function openBackup(){task={kind:'backup'};showTask('백업 복원',`<p class="work-tip">수식연습실에서 내려받은 JSON 백업을 선택하세요. 파일은 서버로 전송되지 않습니다. 내용을 확인한 뒤 복원할 수 있습니다.</p><label>백업 파일<input type="file" data-backup-file accept=".json,application/json"></label><div data-backup-preview></div>`,'');}
async function readBackupFile(file){const pending=task;if(!file||pending?.kind!=='backup')return;pending.backup=null;$('[data-backup-preview]').textContent='';try{if(file.size>BACKUP_LIMIT)throw Error('8MB 이하의 백업 파일을 선택하세요.');const restored=parseBackup(await file.text());if(task!==pending)return;
 // Parse and render before replacing any live data, including offscreen rows.
 for(const s of [restored,...(restored.auxiliary||[])])for(const r of s.rows){if(!r.displayLatex)parseWorkspaceFormula(r.value);rowMath(r);}
 pending.backup=restored;$('[data-backup-preview]').innerHTML=`<p>본식 ${restored.rows.length}줄 · 보조 식 ${restored.auxiliary?.length||0}개</p><p>복원하면 현재 작업장을 이 백업으로 바꿉니다. 먼저 현재 풀이를 백업하세요. 복원 직후에는 아래 버튼으로 취소할 수 있습니다.</p><button data-backup-download>현재 풀이 백업</button><button class="primary" data-backup-restore>이 백업으로 복원</button>`;error('');measureTask();
 }catch(err){if(task===pending){error(err.message);measureTask();}}}
function restoreBackup(){if(!task?.backup)return;checkpoint();book=task.backup;activeAuxId=book.activeAuxId||null;state=book.auxiliary?.find(a=>a.id===activeAuxId)||book;historyStart=null;selectionView=null;dockExpanded=false;save();render();task={kind:'restored'};showTask('백업을 복원했습니다','<p>본식과 보조 식, 조건·치환 및 풀이 기록을 가져왔습니다.</p>','<button data-backup-undo>복원 취소 · 이전 작업장으로</button>');}
function openCopy(){task={kind:'copy'};showTask('복사',`<p class="work-tip">현재 선택한 ${state.active+1}번째 줄 또는 풀이 전체를 복사합니다.</p><div class="work-copy-options"><button data-copy-format="latex"><strong>현재 수식 · LaTeX</strong><span>문서와 수식 편집기에 붙여넣기</span></button><button data-copy-format="text"><strong>현재 수식 · 문자</strong><span>일반 텍스트로 붙여넣기</span></button><button data-copy-format="steps"><strong>풀이 전체 · 설명 포함</strong><span>본식과 보조 식, 이유, 조건, 치환, 별도 경우</span></button></div>`,'');}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('복사했습니다.');}catch{const area=document.createElement('textarea');area.value=text;area.setAttribute('aria-label','복사할 풀이');document.body.append(area);area.select();try{if(!document.execCommand('copy'))throw Error();toast('복사했습니다.');area.remove();}catch{toast('복사가 허용되지 않았습니다. 표시된 텍스트를 길게 눌러 복사하세요.');}}}
app.addEventListener('click',e=>{const button=e.target.closest('button');if(button&&!button.closest('[data-work-task]'))taskTrigger=focusTarget(button);},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing&&$('[data-work-task]')&&!$('[data-work-task]').hidden){e.preventDefault();e.stopPropagation();closeTask();}},true);
app.addEventListener('pointerdown',e=>{if(e.target.matches('[data-work-expression],[data-board-condition],[data-board-definition]')&&e.pointerType==='touch'&&!task?.systemKeyboard)setInputKeyboard(e.target,false,true);if(e.target.closest('[data-adv-key],[data-adv-pad-tab],[data-adv-field-move],[data-work-key],[data-work-pad-tab],[data-work-keyboard],[data-board-key],[data-board-pad-tab],[data-board-keyboard],[data-practice-key],[data-practice-pad-tab],[data-balance-key],[data-balance-pad-tab]'))e.preventDefault();});
app.addEventListener('input',e=>{if(e.target.matches('[data-board-condition],[data-board-definition],[data-board-domain],[data-board-meaning]')){previewContextBoard();return;}if(e.target.matches('[data-logic-field],[data-logic-variable]')){previewLogic();return;}if(e.target.matches('[data-practice-answer]')){previewPracticeAnswer();return;}if(e.target.matches('[data-adv-input]')&&task?.kind==='advanced'){updateAdvanced(task.entry,e.target.dataset.advInput,e.target.value);error('');return;}if(e.target.matches('[data-balance-input]')){task.operand=e.target.value;task.operandPicks=[];clearTimeout(taskTimer);taskTimer=setTimeout(()=>{if(task?.kind==='balance')previewBalance();},100);return;}if(!e.target.matches('[data-work-expression]'))return;queuePreview();});
function previewInput(){if(task?.kind!=='input')return;const field=$('[data-work-expression]'),raw=field.value;field.setAttribute('aria-invalid','false');try{const p=parseWorkspaceFormula(raw);$('[data-input-preview]').innerHTML=directMath(p.value)+(hasInequality(raw)?`<p class="work-tip">${REAL_INEQUALITY_SCOPE}인 범위의 단일 부등식입니다. 양변 조작의 적용 조건을 확인하세요.</p>`:'');$('[data-input-save]').disabled=false;error('');}catch(err){$('[data-input-preview]').textContent='';$('[data-input-save]').disabled=true;field.setAttribute('aria-invalid',String(Boolean(raw.trim())));error(inputFeedback(raw,err));}measureTask();}
function queuePreview(){clearTimeout(taskTimer);taskTimer=setTimeout(previewInput,120);}
app.addEventListener('focusin',e=>{if(e.target.matches('[data-adv-input]')&&task?.kind==='advanced'){task.focus=e.target.dataset.advInput;const label=$('[data-adv-focused]');if(label)label.textContent=e.target.getAttribute('aria-label');}});
app.addEventListener('change',e=>{if(e.target.matches('[data-backup-file]'))readBackupFile(e.target.files?.[0]);});
// A confirming double click must not activate a different button after the task disappears.
app.addEventListener('click',e=>{if(suppressRepeatedInputClick&&e.detail>1){e.preventDefault();e.stopImmediatePropagation();$(`[data-work-row="${book.active}"]`)?.focus();return;}suppressRepeatedInputClick=false;},true);
app.addEventListener('change',e=>{if(e.target.matches('[data-board-record-only]')){stashContextBoard();$('.work-board-symbolic').hidden=!task.recordOnly;previewContextBoard();return;}if(e.target.matches('[data-logic-method]')){changeLogicMethod();return;}if(e.target.matches('[data-logic-quantifier],[data-logic-domain]')){previewLogic();return;}if(e.target.matches('[data-adv-option]')&&task?.kind==='advanced'){resizeAdvanced(task.entry,e.target.dataset.advOption,e.target.value);drawAdvanced();return;}if(e.target.matches('[data-balance-simplify]')&&task?.kind==='balance'){task.simplify=e.target.checked;previewBalance();}});
app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;try{
 if(b.hasAttribute('data-note-edit')){state.active=+b.dataset.noteEdit;save();render();openNote();}
 if(b.hasAttribute('data-context-board'))openContextBoard();
 if(b.hasAttribute('data-draft-context'))openContextBoard({mode:task.mode,value:$('[data-work-expression]').value,tab:task.tab,context:task.context});
 if(b.hasAttribute('data-board-mode')){stashContextBoard();task.mode=b.dataset.boardMode;drawContextBoard();}
 if(b.hasAttribute('data-board-keyboard'))toggleBoardKeyboard();
 if(b.hasAttribute('data-board-key')){pressInputKey(boardField(),b.dataset.boardKey,task.mode==='condition'?1000:600);previewContextBoard();}
 if(b.hasAttribute('data-board-pad-tab')){task.tab=b.dataset.boardPadTab;$('[data-board-pad]').innerHTML=inputPad('board',task.tab,true);measureTask();}
 if(b.hasAttribute('data-board-save'))saveContextBoard();
 if(b.hasAttribute('data-note-save'))saveNote();
 if(b.hasAttribute('data-logic-symbol')){pressInputKey($('[data-logic-predicate]'),b.dataset.logicSymbol,1000);previewLogic();}
 if(b.hasAttribute('data-logic-template')){const p=LOGIC_TEMPLATES.find(p=>p.id===b.dataset.logicTemplate);$('[data-logic-kind]').value=['factor','log'].includes(p.id)?'정의':p.id==='real'?'가정':'주장';task.assembledLogic=null;setLogicDraft({method:'direct',parameters:p.domain,predicate:p.formula,meaning:p.meaning});previewLogic();}
 if(b.hasAttribute('data-logic-save')){if(task.row!==current())throw Error('현재 줄이 바뀌었습니다. 다시 선택하세요.');const v=readLogic();v.kind=$('[data-logic-kind]').value;const r=current(),old=r.logicStatements||[];if(task.index===null&&old.length>=20)throw Error('한 줄에는 기호 조건을 20개까지 보관합니다.');checkpoint();r.logicStatements=task.index===null?[...old,v]:old.map((entry,i)=>i===task.index?v:entry);if(!save()){r.logicStatements=old;history.pop();throw Error('저장하지 못했습니다. 입력 내용을 복사해 보관하세요.');}render();}
 if(b.hasAttribute('data-linked-dismiss')){linkedPractice=null;render();}
 if(b.hasAttribute('data-practice-start')){const p=PRACTICE_PROBLEMS.find(p=>p.id===b.dataset.practiceStart);if(!p)return;linkedPractice=null;if(isAux())switchSheet('main');append([{startNew:true,value:p.value,title:p.title,explanation:p.prompt,condition:p.condition,assumptions:[],bindings:{},conditions:[],pendingCases:[],excluded:[],practiceId:p.id,exampleId:null,logicStatements:[]}]);}
 if(b.hasAttribute('data-row-remove'))openRowRemoval(+b.dataset.rowRemove);
 if(b.hasAttribute('data-row-remove-confirm'))confirmRowRemoval();
 if(b.hasAttribute('data-deleted-open'))openDeletedRows();
 if(b.hasAttribute('data-row-restore'))restoreDeletedRow(+b.dataset.rowRestore);
 if(b.hasAttribute('data-history-undo'))undo();
 if(b.hasAttribute('data-practice-open'))openPracticeAnswer();
 if(b.hasAttribute('data-practice-key')){const f=$('[data-practice-answer]');pressInputKey(f,b.dataset.practiceKey,600);previewPracticeAnswer();}
 if(b.hasAttribute('data-practice-pad-tab')){$('[data-practice-pad]').innerHTML=inputPad('practice',b.dataset.practicePadTab,true);measureTask();}
 if(b.hasAttribute('data-practice-check')){const r=current(),p=PRACTICE_PROBLEMS.find(p=>p.id===r.practiceId),answer=$('[data-practice-answer]').value,result=checkPractice(p,answer),old=[r.practiceAnswer,r.practiceFeedback];checkpoint();r.practiceAnswer=answer;r.practiceFeedback=result;if(!save()){[r.practiceAnswer,r.practiceFeedback]=old;history.pop();throw Error('답과 확인 결과를 저장하지 못했습니다.');}error('');previewPracticeAnswer();renderPractice();}
 if(b.hasAttribute('data-save-retry'))save();
 if(b.hasAttribute('data-backup-download'))downloadBackup();
 if(b.hasAttribute('data-backup-open'))openBackup();
 if(b.hasAttribute('data-backup-restore'))restoreBackup();
 if(b.hasAttribute('data-backup-undo'))undo();
 if(b.hasAttribute('data-input-type')){const type=b.dataset.inputType,draft=task?.kind==='input'?{mode:task.mode,value:$('[data-work-expression]').value,tab:task.tab,context:task.context}:task?.expressionDraft;if(task?.kind==='advanced')advancedDrafts[task.entry.type]=task.entry;if(type==='expression')openInput(draft?.mode||'auxiliary',draft);else openAdvanced(type,undefined,draft);}
 if(b.hasAttribute('data-advanced-edit'))openAdvanced(state.entry.type,JSON.parse(JSON.stringify(state.entry)));
 if(b.hasAttribute('data-structured-nav'))navigate(+b.dataset.structuredNav);
 if(b.hasAttribute('data-structured-undo'))undo();
 if(b.hasAttribute('data-structured-input'))openInput();
 if(b.hasAttribute('data-structured-resume'))toggleTools();
 if(b.hasAttribute('data-adv-option'))return;
 if(b.hasAttribute('data-adv-example'))advancedExample();
 if(b.hasAttribute('data-adv-calculate'))calculateAdvanced();
 if(b.hasAttribute('data-adv-pad-tab')){task.tab=b.dataset.advPadTab;$('[data-adv-pad]').innerHTML=inputPad('adv',task.tab,task.entry.type==='calculus');measureTask();}
 if(b.hasAttribute('data-adv-key')){const fields=[...app.querySelectorAll('[data-adv-input]')],f=fields.find(f=>f.dataset.advInput===task.focus)||fields[0];if(f){pressInputKey(f,b.dataset.advKey,500);updateAdvanced(task.entry,f.dataset.advInput,f.value);error('');}}
 if(b.hasAttribute('data-adv-field-move')){const fields=[...app.querySelectorAll('[data-adv-input]')],index=fields.findIndex(f=>f.dataset.advInput===task.focus),next=fields[Math.max(0,Math.min(fields.length-1,index+Number(b.dataset.advFieldMove)))];focusAdvanced(next);}
 if(b.hasAttribute('data-adv-import')){const raw=$('[data-adv-paste]').value;if(b.dataset.advImport==='equations'){const rows=raw.split(/\n|;/).map(s=>s.trim()).filter(Boolean);if(rows.length<2||rows.length>4)throw Error('등식을 2~4줄 붙여넣으세요.');task.entry.equations=rows;}else task.entry[b.dataset.advImport]=importMatrix(raw);drawAdvanced();}
 if(b.hasAttribute('data-sheet'))switchSheet(b.dataset.sheet);
 if(b.hasAttribute('data-free-input'))openInput('free');
 if(b.hasAttribute('data-new-aux'))openInput('auxiliary');
 if(b.hasAttribute('data-aux-use-current')){$('[data-work-expression]').value=task.raw;previewInput();}
 if(b.hasAttribute('data-aux-apply'))openAuxiliaryApply();
 if(b.hasAttribute('data-aux-replacement')){task.pick=+b.dataset.auxReplacement;drawAuxiliaryApply();}
 if(b.hasAttribute('data-aux-confirm'))applyAuxiliary();
 if(b.hasAttribute('data-aux-delete')){checkpoint();book.auxiliary=book.auxiliary.filter(a=>a!==state);switchSheet('main');}
 if(b.hasAttribute('data-operation-group')){operationGroup[operationPage]=b.dataset.operationGroup;if(operationPage==='expression'){task.category=b.dataset.operationGroup;drawLaws();}else showEquationPage();}
 if(b.hasAttribute('data-equation-mode'))openBalance({mode:b.dataset.equationMode,side:selectionView.side||0,selected:selectionView.scoped?[]:[...selectionView.selected]});
 if(b.dataset.selectedBalance==='transpose')openBalance({mode:'transpose',side:selectionView.side||0,selected:[...selectionView.selected]});
 if(b.hasAttribute('data-operand-term')){const key=b.dataset.operandTerm;task.operandPicks=task.operandPicks.includes(key)?task.operandPicks.filter(k=>k!==key):[...task.operandPicks,key];pickBalanceOperand();drawBalance();}
 if(b.hasAttribute('data-history-page'))renderHistory(+b.dataset.historyPage);
 if(b.hasAttribute('data-balance-value')){task.operand=b.dataset.balanceValue;task.operandPicks=[];drawBalance();}
 if(b.hasAttribute('data-balance-suggest')){const s=task.suggestions[+b.dataset.balanceSuggest];task.mode=s.operation;task.operand=s.operand;task.operandPicks=[];drawBalance();}
 if(b.hasAttribute('data-balance-manual')){task.manual=!task.manual;drawBalance();const f=$('[data-balance-input]');f?.focus();f?.setSelectionRange?.(0,f.value.length);}
 if(b.hasAttribute('data-balance-pad-tab')){task.tab=b.dataset.balancePadTab;$('[data-balance-pad]').innerHTML=inputPad('balance',task.tab);measureTask();}
 if(b.hasAttribute('data-balance-key')){const f=$('[data-balance-input]');pressInputKey(f,b.dataset.balanceKey,160);task.operand=f.value;task.operandPicks=[];previewBalance();}
 if(b.hasAttribute('data-balance-side')){task.side=+b.dataset.balanceSide;task.selected=[];drawBalance();}
 if(b.hasAttribute('data-balance-term')){const i=+b.dataset.balanceTerm;task.selected=task.selected.includes(i)?task.selected.filter(v=>v!==i):[...task.selected,i];drawBalance();}
 if(b.hasAttribute('data-balance-apply')){clearTimeout(taskTimer);previewBalance();applyBalance();}
 if(b.hasAttribute('data-equation-case'))openCase(+b.dataset.equationCase);
 if(b.hasAttribute('data-case-continue')){const c=task.branch;append([{value:c.equation,title:'별도 경우: '+c.condition,explanation:'[도입-설정] '+c.condition+'인 경우를 나누기 전 방정식에서 살펴봅니다.',condition:[c.previousCondition,c.condition].filter(Boolean).join('; '),assumptions:[...(c.previousAssumptions||[]),c.condition],pendingCases:c.previousCases||[],bindings:c.bindings||{}}]);}

 if(b.hasAttribute('data-guided-start'))startGuidedExample(b.dataset.guidedStart);
 if(b.hasAttribute('data-example')){const p=WORK_EXAMPLES.find(p=>p.id===b.dataset.example);if(p.guided){openGuidedExample(p);return;}append([{exampleId:null,startNew:true,value:p.value,title:p.title,explanation:p.goal,logicStatements:[],condition:p.condition,assumptions:['x는 실수',...(p.assumptions||[])],bindings:{},excluded:[],conditions:[],pendingCases:[]}]);}
 if(b.hasAttribute('data-work-row')){state.active=+b.dataset.workRow;dockExpanded=true;save();render();}
 if(b.hasAttribute('data-copy-menu'))openCopy();
 if(b.hasAttribute('data-copy-format')){const format=b.dataset.copyFormat;copy(format==='latex'?(current().displayLatex||mathInput(current().value)):format==='text'?(current().displayLatex?current().value:parseWorkspaceFormula(current().value).value):exportWorkspace(book.rows)+(book.auxiliary?.length?'\n\n'+book.auxiliary.map(a=>`[${a.name} · 본식 ${a.sourceIndex+1}번째 줄에서]\n${a.sourceValue}\n\n${exportWorkspace(a.rows)}`).join('\n\n'):''));}
 if(b.hasAttribute('data-transform-mode')){task=null;editor.begin(b.dataset.transformMode);}
 if(b.hasAttribute('data-transform-substitute'))task.ctx.substitute();
 if(b.hasAttribute('data-task-close'))closeTask();
 if(b.hasAttribute('data-task-fold'))foldTask();
 if(b.hasAttribute('data-work-keyboard'))toggleExpressionKeyboard();
 if(b.hasAttribute('data-work-pad-tab')){task.tab=b.dataset.workPadTab;$('[data-work-pad]').innerHTML=inputPad('work',task.tab,true);measureTask();}
 if(b.hasAttribute('data-work-key')){pressInputKey($('[data-work-expression]'),b.dataset.workKey);previewInput();}
 if(b.hasAttribute('data-input-save')){if(task?.kind!=='input')return;const p=parseWorkspaceFormula($('[data-work-expression]').value);if(task.mode==='free')startFreeSolution(p.value,task.context);else{dockExpanded=true;if(task.mode==='auxiliary')startAuxiliary(p.value,task.context);else append([{...(hasInequality(p.value)?{conditions:current().conditions||[]}:{}),...task.context,startNew:true,value:p.value,title:'직접 입력',explanation:describeOperation(null)}]);}}
 if(b.hasAttribute('data-sub-save')){if(task.raw!==current().value)throw Error('현재 줄이 바뀌었습니다. 다시 선택하세요.');append([substituteMany(task.source,current().bindings||{},$('[data-sub-name]').value,$('[data-sub-definition]').value)]);}
 if(b.hasAttribute('data-expand-all'))showTask('전개 과정',`<div class="balance-preview">${task.expansion.map(s=>`<div>${directMath(task.ctx.resultFor(s.value))}</div><p>${esc(s.explanation)}</p>`).join('')}</div>`,'<button class="primary" data-expansion-apply>적용하기</button>');
 if(b.hasAttribute('data-expansion-apply')){const ctx=task.ctx;append(task.expansion.map(s=>({...s,value:ctx.resultFor(s.value)})));}
 if(b.hasAttribute('data-law'))selectLaw(+b.dataset.law);
 if(b.hasAttribute('data-law-apply')){const l=task.laws[task.lawIndex],assumptions=[...new Set([...(current().assumptions||[]),...l.conditions])],added=task.required||[];append([{...l,value:task.ctx.resultFor(l.value),assumptions,condition:[current().condition,added.join(' · ')].filter(Boolean).join('; ')}]);}
 }catch(err){if(task)error(err.message);else toast(err.message);}});
function viewport(){const v=window.visualViewport,height=v?.height||window.innerHeight,width=v?.width||window.innerWidth,left=v?.offsetLeft||0,bottom=Math.max(0,window.innerHeight-height-(v?.offsetTop||0));const s=document.documentElement.style;s.setProperty('--visual-height',height+'px');s.setProperty('--visual-width',width+'px');s.setProperty('--visual-left',left+'px');s.setProperty('--visual-bottom',bottom+'px');document.body.classList.toggle('short-viewport',height<550);measureTask();}
window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
export function startWorkspace(){render();viewport();save();}
