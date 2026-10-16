import {tidyMath} from './expression-format.js';
import {powerFormDirectTerm} from './power-forms.js';
import {inputPad,pressInputKey} from './input-pad.js';
import {directChoices} from './direct-choices.js';
import {equationParts,parseCalculation} from './calculation.js';
import {hasInequality,parseWorkspaceFormula} from './inequality-tools.js';
import {directTerms,monomialTerm,splitDirectTerm,factorDirectTerms,reorderDirectTerm,replaceDirectTerms,groupDirectTerms,commonFactorChoices,parenthesisScopes,replaceDirectScope,squareSuggestion,squareDirectTerms,remainderDirectTerms} from './direct-tools.js';
import {complex} from './number-tools.js';
import {transformationTargets,commonDenominator,cancelFraction,expandPart,splitPower} from './transform-tools.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rawMathInput(raw){try{
 if(hasInequality(raw)){const p=parseWorkspaceFormula(raw),relation=({'≤':'\\leq','≥':'\\geq'})[p.relation]||p.relation;return p.nodes.map(n=>n.toTex({parenthesis:'auto'})).join(` ${relation} `);}
 if(/\\|[_^]\s*\{/.test(raw))return raw;
 if(/\b(?:sin|cos|tan|asin|acos|atan|arcsin|arccos|arctan|ln|log|exp|sqrt|abs)\s*\(/.test(raw)&&window.math){
  const parsed=parseCalculation(raw),options={handler(node,opts){if(!node.isFunctionNode)return;const name=node.fn.name,arg=i=>node.args[i].toTex(opts),wrap=v=>`\\left(${v}\\right)`;
   if(name==='log')return `\\log_{${node.args.length===2?arg(1):'10'}}${wrap(arg(0))}`;
   if(name==='ln')return `\\ln${wrap(arg(0))}`;if(name==='exp')return `e^{${arg(0)}}`;
   if(['asin','acos','atan'].includes(name))return '\\'+({asin:'arcsin',acos:'arccos',atan:'arctan'}[name])+wrap(arg(0));
  }};return parsed.nodes.map(n=>n.toTex(options)).join(' = ');
 }
 return window.MathLive?.convertAsciiMathToLatex?.(raw)||raw;
}catch{return raw;}}

// Keep visible multiplication only where juxtaposition would be ambiguous.
export function mathInput(raw){return rawMathInput(raw).replace(/\s*\\(?:cdot|times)\s*/g,(match,offset,source)=>/^[+\-0-9.]/.test(source.slice(offset+match.length))?'\\times ':' ');}

let markupRenderer=null;const markupCache=new Map();
export function directMath(raw){
 try{const math=window.MathLive;if(math?.convertLatexToMarkup){
  if(markupRenderer!==math.convertLatexToMarkup){markupRenderer=math.convertLatexToMarkup;markupCache.clear();}
  if(markupCache.has(raw))return markupCache.get(raw);
  const html=math.convertLatexToMarkup(mathInput(raw));if(markupCache.size>=400)markupCache.delete(markupCache.keys().next().value);markupCache.set(raw,html);return html;
 }}catch{}
 return esc(raw).replace(/\^\{?(\d+)\}?/g,'<sup>$1</sup>').replace(/-/g,'−');
}
const modes={square:'제곱 모양 맞추기',remainder:'나머지 남겨 묶기',sum:'+ 변형',product:'× 변형',factor:'공통인수로 묶기',group:'괄호로 묶기',replace:'직접 변형 · 대수 확인',common:'통분',cancel:'약분',expand:'부분 전개',power:'^ 변형',powerForm:'^ 변형'};
const labels={square:'괄호 안에 더할 수',remainder:'묶을 식',sum:'첫 항의 계수',product:'첫 인수',factor:'꺼낼 공통인수',replace:'바꿀 부분의 수식',common:'공통분모',cancel:'나눌 공통인수',power:'첫 번째 지수',powerForm:'거듭제곱 지수 (2~12)'};
export function createDirectEditor({onApply,onPreview,onUndo,onReset,onPrevious,onNext,onSelection,onSubstitute,onInput,onExpanded,onToggle,onOpen}){
 let root=null,state=null,observer=null;
 const calculationCache=new Map();const cached=(key,fn)=>{if(calculationCache.has(key))return calculationCache.get(key);const value=fn();if(calculationCache.size>=80)calculationCache.clear();calculationCache.set(key,value);return value;};
 const $=s=>root?.querySelector(s);
 function resize(){
  const dock=$('.direct-workbench');if(!dock||!root.isConnected)return;
  const height=dock.getBoundingClientRect?.().height;
  if(height)document.documentElement.style.setProperty('--direct-space',`${Math.ceil(height)+24}px`);
 }
 function mount(container,options){
  observer?.disconnect();calculationCache.clear();root=container;if(!root)return;
  state={inputLabel:'새 줄 쓰기',compactInputLabel:'새 줄',inputDescription:'현재 풀이에 새 줄 쓰기',expanded:false,side:null,selected:[],mode:null,param:'',targetId:null,result:null,scopes:[],manual:false,padTab:'number',...options,fullRaw:options.raw,inequality:hasInequality(options.raw)};
  try{const sides=equationParts(state.fullRaw);if(sides.length===2){state.sides=sides;state.side=0;state.raw=sides[0];}}catch{}
  readTerms();
  root.onclick=click;root.oninput=e=>{if(e.target.matches('[data-direct-input]')){state.param=e.target.value;preview();}};
  root.onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('[data-direct-input]')){e.preventDefault();commit();}if(e.key==='Escape'){e.preventDefault();if(state.mode){state.mode=null;draw();}else if(state.scopes.length)goScope(state.scopes.length-1);}};
  root.onpointerdown=e=>{if(e.target.closest('[data-direct-key],[data-direct-pad-tab]'))e.preventDefault();};
  draw();
 }
 function readTerms(view=state){view.generic=false;try{view.info=directTerms(view.raw);}catch{view.info=null;try{const source=parseCalculation(view.raw).parts[0],terms=[];let depth=0,start=0;for(let i=0;i<source.length;i++){if(source[i]==='(')depth++;if(source[i]===')')depth--;if(i>0&&!depth&&'+-'.includes(source[i])&&!'+-*/^(,'.includes(source.slice(0,i).trim().at(-1))){terms.push({id:terms.length,raw:source.slice(start,i).trim().replace(/^\+/,''),start,end:i});start=i;}}terms.push({id:terms.length,raw:source.slice(start).trim().replace(/^\+/,''),start,end:source.length});view.info={source,terms};view.raw=source;view.generic=true;}catch{}}}
 function scopeList(view=state){if(!view.generic)return parenthesisScopes(view.raw);const source=view.raw,items=[];let depth=0,start=0;for(let i=0;i<source.length;i++){if(source[i]==='('){if(!depth)start=i;depth++;}else if(source[i]===')'){depth--;if(!depth&&i>start+1){const inner=source.slice(start+1,i);if(!/(?:sin|cos|tan|asin|acos|atan|ln|log|exp|sqrt|abs)\s*$/.test(source.slice(0,start))&&!(source[start-1]==='^'&&/^[+-]?\d+$/.test(inner)))items.push({id:String(start),raw:source.slice(start,i+1),inner,start,end:i+1,innerStart:start+1,innerEnd:i});}}}return items;}
 function targets(mode){return cached(JSON.stringify([state.raw,state.selected,mode]),()=>{
  try{const all=transformationTargets(state.raw,mode).targets;
   return state.selected.length?all.filter(t=>state.info.terms.filter(term=>term.end>t.node.start&&term.start<t.node.end).every(term=>state.selected.includes(term.id))):all;
  }catch{return [];}
 });}
 function factorChoices(){try{return commonFactorChoices(state.raw,state.selected);}catch{return [];}}
 function factorButtons(choices){return `<div class="direct-factor-choices" aria-label="꺼낼 공통인수 선택">${choices.map(t=>`<button type="button" data-direct-factor="${esc(t.value)}" aria-pressed="${state.mode==='factor'&&state.param===t.value}">${directMath(t.label)}</button>`).join('')}</div>`;}
 function entry(){const s=state;return `<label class="direct-entry"><span>${labels[s.mode]}</span><input data-direct-input inputmode="none" autocomplete="off" spellcheck="false" maxlength="120" aria-label="${labels[s.mode]}" value="${esc(s.param)}" placeholder="${s.mode==='sum'?'예: -14':s.mode==='factor'?'예: 2x':s.mode==='replace'?'예: -14x-2x':'값 또는 식'}"></label>`;}
 function fragment(raw){return raw.split(/(\^\([-+]?\d+\)|\^[-+]?\d+|[*/])/g).filter(Boolean).map((part,index,parts)=>part.startsWith('^')?`<sup>${esc(part.slice(1).replace(/[()]/g,''))}</sup>`:['*','/'].includes(part)?`<span class="direct-operator">${part==='*'?(/^[+\-0-9.]/.test(parts[index+1]||'')?'×':''):'/'}</span>`:directMath(part)).join('');}
 function termHTML(t,i,view=state){
  const s=view,sideData=s.sides?` data-term-side="${s.side}"`:'',pressed=s.selected.includes(i),plus=i&&!t.raw.startsWith('-')?'<span class="direct-plus">+</span>':'';
  let scopes=[];try{scopes=scopeList(s).filter(p=>p.start>=t.start&&p.end<=t.end);}catch{}
  if(!scopes.length)return `<button type="button" class="direct-term" data-direct-term="${i}"${sideData} aria-pressed="${pressed}" aria-label="${esc(t.raw)} 항 선택">${plus}${directMath(t.raw)}</button>`;
  const source=s.info.source;let at=t.start+(source[t.start]==='+'?1:0),pieces=plus;
  for(const scope of scopes){pieces+=fragment(source.slice(at,scope.start));pieces+=`<button type="button" class="direct-inline-scope" data-direct-scope="${scope.id}"${sideData} aria-label="${esc(scope.inner)} 괄호 안 바로 편집">${directMath(scope.raw)}</button>`;at=scope.end;}
  pieces+=fragment(source.slice(at,t.end));
  return `<div class="direct-composite" data-selected="${pressed}"><button type="button" data-direct-term="${i}"${sideData} class="direct-whole-term" aria-pressed="${pressed}" aria-label="${esc(t.raw)} 항 전체 선택">${pressed?'✓':'○'} 항 전체</button><div class="direct-inline-expression">${pieces}</div></div>`;
 }
 function expressionHTML(){
  const s=state;
  const row=view=>`<div class="direct-expression" aria-label="${view.scopes.length?'선택한 괄호 안의 항':'현재 식의 항'}">${(view.info?.terms||[]).map((t,i)=>termHTML(t,i,view)).join('')}</div>`;
  if(!s.sides||s.scopes.length)return row(s);
  return `<div class="direct-equation-terms">${s.sides.map((raw,side)=>{const view=side===s.side?s:{...s,side,raw,selected:[],scopes:[]};if(view!==s)readTerms(view);return `<div class="direct-equation-side" data-expression-side="${side}"><span>${side===0?'좌변':'우변'}</span>${row(view)}</div>`;}).join('')}</div>`;
 }
 function selectSide(side){if(!state.sides||state.side===side)return;state.side=side;state.scopes=[];state.raw=state.sides[side];readTerms();state.mode=null;state.selected=[];}
 function selectionExpression(){const s=state;if(s.selected.length&&s.info)return s.selected.map(i=>s.info.terms[i].raw).map((v,i)=>i&&!v.startsWith('-')?'+'+v:v).join('');return s.raw;}
 function setExpanded(value){state.expanded=value;onExpanded?.(value);draw();}
 function open(){state.mode=null;state.selected=[];state.scopes=[];state.side=state.sides?0:null;state.raw=state.sides?state.sides[0]:state.fullRaw;readTerms();setExpanded(true);}
 function navigation(editing=false){return `<nav class="direct-navigation${editing?' is-task':' is-overview'}" aria-label="식 변형 도구 내비게이션">${editing?'<button type="button" class="direct-check" data-direct-apply disabled>적용하기</button><button type="button" data-direct-cancel>돌아가기</button>':`<button type="button" data-direct-previous aria-label="이전 식"${state.canPrevious?'':' disabled'}>${state.expanded?'‹ 이전 식':'‹'}</button>`}<button type="button" data-direct-toggle aria-expanded="${state.expanded}" aria-controls="direct-tool-body" aria-label="식 변형 도구 펼치기·접기">${state.expanded?'접기 ↓':'도구 ↑'}</button>${editing?'':`<button type="button" data-direct-next aria-label="다음 식"${state.canNext?'':' disabled'}>${state.expanded?'다음 식 ›':'›'}</button>`}</nav>`;}
 function draw(){
  if(!state.expanded){root.innerHTML=`<section class="direct-workbench direct-dock is-collapsed" aria-label="식 변형 내비게이션"><div class="direct-compact-row"><button class="direct-current-formula" data-direct-open aria-label="현재 식의 변형 도구 열기">${directMath(state.fullRaw)}</button><button data-direct-open-input aria-label="${esc(state.inputDescription)}" title="${esc(state.inputDescription)}">${esc(state.compactInputLabel)}</button></div><div id="direct-tool-body" hidden></div>${navigation()}</section>`;resize();return;}
  const s=state,terms=s.info?.terms||[],one=s.selected.length===1,index=s.selected[0],editing=!!s.mode;let canSplit=false;
  if(one)try{monomialTerm(terms[index].raw);canSplit=true;}catch{}
  const selected=s.selected.length?s.selected:terms.map(t=>t.id);let square=null;try{if(s.mode==='square')square=cached('square'+JSON.stringify([s.raw,selected]),()=>squareSuggestion(s.raw,selected));}catch{}
  const choices=s.mode&&['expand','cancel','common','power'].includes(s.mode)?targets(s.mode):[],factors=s.mode==='factor'?cached('factor'+JSON.stringify([s.raw,s.selected]),factorChoices):[];
  if(choices.length&&!choices.some(t=>t.id===s.targetId))s.targetId=choices[0].id;
  let picks=[];if(editing&&!s.manual)try{picks=cached('picks'+JSON.stringify([s.raw,s.selected,s.mode,s.targetId]),()=>directChoices(s.raw,s.selected,s.mode,s.targetId,s.problem));}catch{}
  const canInput=editing&&!['expand','group'].includes(s.mode),needsInput=canInput&&s.manual;
  const pickButtons=picks.length?`<div class="direct-pick-list" aria-label="눌러서 선택할 변형">${picks.map(p=>`<button type="button" data-direct-choice="${esc(p.value)}" aria-pressed="${s.param===p.value}">${directMath(p.label)}</button>`).join('')}</div>`:`<p class="direct-mode-help">${canInput&&!['factor','square','replace'].includes(s.mode)?'표시할 후보가 없습니다. 직접 입력에서 원하는 값을 넣으세요.':''}</p>`;
  const powerTabs=['power','powerForm'].includes(s.mode)?`<div class="direct-power-tabs" aria-label="지수 변형 종류"><button type="button" data-direct-mode="powerForm" aria-pressed="${s.mode==='powerForm'}"${!canSplit?' disabled':''}>거듭제곱으로</button><button type="button" data-direct-mode="power" aria-pressed="${s.mode==='power'}"${!targets('power').length?' disabled':''}>지수 나누기</button></div>`:'';
  const controls=`${!s.manual?`${choices.length>1?`<div class="direct-targets">${choices.map(t=>`<button type="button" data-direct-target="${t.id}" aria-pressed="${t.id===s.targetId}">${directMath(t.label)}</button>`).join('')}</div>`:''}
   ${s.mode==='factor'?factorButtons(factors):s.mode==='square'?`${square?`<div class="direct-factor-choices"><button type="button" data-direct-square="${esc(square.value)}" aria-pressed="${s.param===square.value}">${directMath(square.label)}</button></div>`:''}`:pickButtons}
   ${['sum','product'].includes(s.mode)&&s.param&&!['-','+'].includes(s.param)?'<button type="button" class="direct-manual-toggle" data-direct-swap-parts>⇄ 두 부분 순서 바꾸기</button>':''}
   `:''}${canInput?`<button type="button" class="direct-manual-toggle" data-direct-manual aria-expanded="${s.manual}">${s.manual?'선택으로 돌아가기':'직접 입력'}</button>`:''}`;
  root.classList.add('direct-host');
  root.innerHTML=`<section class="direct-workbench direct-dock${editing?' is-editing':''}" aria-label="현재 식 하단 조작바">
   <header class="direct-heading"><span><strong data-operation-title>${editing?modes[s.mode]:'양변조작'}</strong></span>${s.mode?'':`<div><button type="button" data-direct-undo${s.canUndo?'':' disabled'}>↶ 되돌리기</button><button type="button" data-direct-reset${s.canReset?'':' disabled'} title="현재 풀이의 시작 식과 조건으로 돌아가기">원상복귀</button><button type="button" data-direct-open-input aria-label="${esc(s.inputDescription)}" title="${esc(s.inputDescription)}">${esc(s.inputLabel)}</button></div>`}</header>
   <div id="direct-tool-body" class="direct-tool-body">
   ${editing?`<div class="direct-edit-source"><span>원래 식</span><div>${directMath(s.fullRaw)}</div></div>`:`<button class="direct-current-formula" data-direct-open aria-label="현재 식 전체 선택 · 양변조작">${directMath(s.fullRaw)}</button>`}
   ${s.scopes.length&&!editing?`<div class="direct-scope-context"><span>편집 중인 괄호</span><div>${directMath(s.raw)}</div></div><nav class="direct-breadcrumb" aria-label="수식 편집 범위"><button type="button" data-direct-level="0">전체 식</button>${s.scopes.map((p,i)=>`<span>›</span><button type="button" data-direct-level="${i+1}"${i===s.scopes.length-1?' aria-current="location"':''}>${i+1}단계 괄호 안</button>`).join('')}</nav>`:''}
   ${editing?(selectionExpression()!==s.raw||s.scopes.length||s.sides?`<div class="direct-selected-source"><span>선택한 부분</span><div>${directMath(selectionExpression())}</div></div>`:''):s.inequality?'':expressionHTML()}
   <div class="direct-panel">
   ${!s.mode&&!s.inequality?`<div class="direct-selection-status">${s.selected.length?`${s.selected.length}개 항 선택`:s.scopes.length?'괄호 전체 선택':'항을 누르면 변형 도구로 전환'}<span>다시 누르면 선택 해제</span></div><div class="direct-selection-tools">${one&&!s.generic?`<button type="button" data-direct-move="-1" aria-label="선택한 항 왼쪽으로"${index===0?' disabled':''}>←</button><button type="button" data-direct-move="1" aria-label="선택한 항 오른쪽으로"${index===terms.length-1?' disabled':''}>→</button>`:''}${terms.length>1&&s.selected.length!==terms.length?'<button type="button" data-direct-all>전체 선택</button>':''}${s.selected.length?'<button type="button" data-direct-clear>선택 해제</button>':''}${s.scopes.length?'<button type="button" data-direct-exit>괄호 나가기</button>':''}</div>`:''}
   ${!editing?'<div id="operation-content" data-operation-content></div>':''}
   ${editing?`<div class="direct-edit">${powerTabs}
    ${s.mode==='remainder'?'<p class="direct-mode-help">묶을 식을 선택하면 남는 식을 자동으로 맞춥니다.</p>':''}
    <div class="direct-preview-card"><div class="direct-preview-heading"><span>변경 미리보기</span><span>적용 전</span></div><div class="direct-preview" aria-live="polite"></div></div><p class="direct-error" role="status"></p>
    <div class="direct-input-work"><div class="direct-choice-controls">${controls}</div>${needsInput?`<section class="direct-manual-calculator" aria-label="직접 입력 계산기">${entry()}${inputPad('direct',s.padTab)}</section>`:''}</div></div>`:''}
   </div>
   </div>
   ${navigation(editing)}
   </section>`;
  if(s.mode)preview();else onSelection?.({ctx:transformContext(),selected:[...s.selected],side:s.side,scoped:!!s.scopes.length,equation:!!s.sides,inequality:s.inequality,scopeRaw:s.raw});
  observer?.disconnect();const Observer=window.ResizeObserver||globalThis.ResizeObserver;if(Observer){observer=new Observer(resize);observer.observe($('.direct-workbench'));}resize();
 }
 function whole(result){const scope=state.scopes.at(-1),base=state.sides?state.sides[state.side]:state.fullRaw;let changed=scope?replaceDirectScope(base,scope,result,state.problem):result;if(state.sides){const sides=[...state.sides];sides[state.side]=changed;changed=sides.join(' = ');}return tidyMath(changed,{keepGroups:state.mode==='group'});}
 function preview(){
  const s=state;if(!s.mode)return;let error='',detail='',adjustment='',conditions=[];s.result=null;
  if(['expand','group'].includes(s.mode)||s.param.trim()&&!['-','+'].includes(s.param.trim()))try{
   let change;
   if(s.mode==='powerForm')change=powerFormDirectTerm(s.raw,s.selected[0],s.param,s.problem);
   else if(s.mode==='sum'||s.mode==='product')change=splitDirectTerm(s.raw,s.selected[0],s.param,s.mode,s.problem);
   else if(s.mode==='square')change=squareDirectTerms(s.raw,s.selected,s.param,s.problem);
   else if(s.mode==='remainder')change=remainderDirectTerms(s.raw,s.selected,s.param,s.problem);
   else if(s.mode==='factor')change=factorDirectTerms(s.raw,s.selected,s.param,s.problem);
   else if(s.mode==='group')change=groupDirectTerms(s.raw,s.selected,s.problem);
   else if(s.mode==='replace')change=replaceDirectTerms(s.raw,s.selected,s.param,s.problem);
   else change={result:s.mode==='expand'?expandPart(s.raw,s.targetId,s.problem):s.mode==='cancel'?cancelFraction(s.raw,s.targetId,s.param,s.problem):s.mode==='common'?commonDenominator(s.raw,s.targetId,s.param,s.problem):splitPower(s.raw,s.targetId,s.param,s.problem)};
   s.result=whole(change.result);detail=s.selected.length===s.info?.terms.length&&!s.scopes.length&&!s.sides?'':change.detail||'';if(change.remainder!==undefined)adjustment=`<div class="direct-adjustment"><div><span>묶은 부분</span>${directMath(change.formed)}</div><div><span>남는 식</span>${directMath(change.remainder)}</div></div><details class="direct-why"><summary>남는 식이 나온 과정</summary><div>${directMath(change.explanation)}</div></details>`;
   conditions=onPreview?.({raw:s.fullRaw,result:s.result})||[];
  }catch(e){s.result=null;error=e.message;}
  $('.direct-preview').innerHTML=s.result?`${detail?`<div class="direct-detail">${directMath(detail)}</div>`:''}<div class="direct-result" aria-label="변형 후 전체 수식">${directMath(s.result)}</div>${adjustment}${conditions.length?`<p class="work-tip" data-direct-conditions>유지할 조건: ${esc(conditions.join(' · '))}</p>`:''}`:`<span class="direct-placeholder">${s.mode==='square'?'제곱 모양을 선택하세요. 남는 식은 자동으로 맞춰집니다.':s.mode==='factor'?'꺼낼 공통인수를 누르면 전체 식의 변화를 미리 볼 수 있습니다.':s.manual?'바꿀 값만 입력하세요. 나머지 식은 그대로 이어집니다.':'아래에서 원하는 변형을 누르세요.'}</span>`;
  $('.direct-error').textContent=error;$('[data-direct-apply]').disabled=!s.result;resize();
 }
 function commit(){
  if(!state.result)return;
  const {fullRaw:raw,rowIndex,result}=state;
  try{if(onApply({raw,rowIndex,result,direct:true,operation:state.mode,parameter:state.param})===false){$('.direct-error').textContent='풀이가 바뀌었거나 줄 수 제한에 도달했습니다. 현재 줄을 다시 선택해 주세요.';return;}}
  catch(e){$('.direct-error').textContent=e.message;}

 }
 function move(from,to){
  if(from===to||state.generic)return;
  try{const result=whole(reorderDirectTerm(state.raw,from,to,state.problem));if(onApply({raw:state.fullRaw,rowIndex:state.rowIndex,result,direct:true,operation:'reorder'})===false)throw Error('현재 풀이를 다시 선택해 주세요.');}catch(e){const el=$('.direct-help');if(el)el.textContent=e.message;}
 }
 function begin(mode){
  if(!state.selected.length)state.selected=state.info?.terms.map(t=>t.id)||[];
  state.mode=mode;state.param='';state.targetId=null;state.manual=mode==='replace';state.padTab='number';
  if(mode==='replace'){if(!state.selected.length)state.selected=state.info?.terms.map(t=>t.id)||[];state.param=selectionExpression();}
  if(mode==='sum')try{const z=monomialTerm(state.info.terms[state.selected[0]].raw).value;if(z.im.zero&&z.re.n<0n)state.param='-';}catch{}
  draw();const input=$('[data-direct-input]');input?.focus();input?.setSelectionRange?.(input.value.length,input.value.length);
 }
 function goScope(level){
  state.scopes=state.scopes.slice(0,level);state.raw=state.scopes.at(-1)?.inner||(state.sides?state.sides[state.side]:state.fullRaw);
  readTerms();state.selected=[];state.mode=null;draw();
 }
 function click(e){
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-direct-toggle')){if(onToggle)onToggle();else setExpanded(!state.expanded);return;}
  if(b.hasAttribute('data-direct-open')){if(onOpen)onOpen();else open();return;}
  if(b.hasAttribute('data-direct-previous')){onPrevious?.();return;}
  if(b.hasAttribute('data-direct-next')){onNext?.();return;}
  if(b.hasAttribute('data-direct-term')){if(b.hasAttribute('data-term-side'))selectSide(+b.dataset.termSide);const i=+b.dataset.directTerm;state.selected=state.selected.includes(i)?state.selected.filter(n=>n!==i):[...state.selected,i].sort((a,b)=>a-b);state.mode=null;draw();return;}
  if(b.hasAttribute('data-direct-mode')){begin(b.dataset.directMode);return;}
  if(b.hasAttribute('data-direct-square')){state.param=b.dataset.directSquare;draw();return;}
  if(b.hasAttribute('data-direct-all')){state.selected=state.info?.terms.map(t=>t.id)||[];state.mode=null;draw();return;}
  if(b.hasAttribute('data-direct-factor')){state.mode='factor';state.param=b.dataset.directFactor;state.manual=false;draw();return;}
  if(b.hasAttribute('data-direct-manual')){if(state.mode==='replace'){state.mode=null;state.manual=false;draw();return;}state.manual=!state.manual;draw();const f=$('[data-direct-input]');f?.focus();f?.setSelectionRange?.(f.value.length,f.value.length);return;}
  if(b.hasAttribute('data-direct-open-input')){onInput?.();return;}
  if(b.hasAttribute('data-direct-exit')){state.selected=[];if(state.scopes.length)goScope(state.scopes.length-1);else draw();return;}
  if(b.hasAttribute('data-direct-choice')){state.param=b.dataset.directChoice;draw();return;}
  if(b.hasAttribute('data-direct-pad-tab')){const f=$('[data-direct-input]'),a=f?.selectionStart,z=f?.selectionEnd;state.padTab=b.dataset.directPadTab;const pad=$('.direct-manual-calculator .input-pad');if(pad)pad.outerHTML=inputPad('direct',state.padTab);f?.focus();f?.setSelectionRange?.(a,z);resize();return;}
  if(b.hasAttribute('data-direct-swap-parts')){try{const z=monomialTerm(state.info.terms[state.selected[0]].raw).value,a=complex(state.param);state.param=(state.mode==='sum'?z.add(a.neg()):z.mul(a.inv())).toString();draw();}catch{}return;}
  if(b.hasAttribute('data-direct-scope')){
   if(b.hasAttribute('data-term-side'))selectSide(+b.dataset.termSide);
   const p=scopeList().find(p=>p.id===b.dataset.directScope);if(!p)return;
   const offset=state.scopes.at(-1)?.innerStart||0;
   state.scopes.push({...p,innerStart:p.innerStart+offset,innerEnd:p.innerEnd+offset});goScope(state.scopes.length);return;
  }
  if(b.hasAttribute('data-direct-level')){goScope(+b.dataset.directLevel);return;}
  if(b.hasAttribute('data-direct-target')){state.targetId=b.dataset.directTarget;state.param='';draw();return;}
  if(b.hasAttribute('data-direct-cancel')){state.mode=null;draw();return;}
  if(b.hasAttribute('data-direct-clear')){state.selected=[];state.mode=null;draw();return;}
  if(b.hasAttribute('data-direct-move')){const i=state.selected[0];move(i,i+Number(b.dataset.directMove));return;}
  if(b.hasAttribute('data-direct-reset')){onReset?.();return;}
  if(b.hasAttribute('data-direct-undo')){onUndo?.();return;}
  if(b.hasAttribute('data-direct-apply')){commit();return;}
  if(b.hasAttribute('data-direct-key')){const input=$('[data-direct-input]');if(input&&pressInputKey(input,b.dataset.directKey,120)){state.param=input.value;preview();}}

 }
 function transformContext(){
  const s=state,terms=s.info?.terms||[],ids=s.selected.length?[...s.selected]:terms.map(t=>t.id),part=selectionExpression(),actions=[];
  const add=id=>actions.push({id,title:modes[id]});
  if(!s.generic&&(s.selected.length||s.scopes.length)){
   if(ids.length===1){try{monomialTerm(terms[ids[0]].raw);add('sum');add('product');add('powerForm');}catch{}}
   if(ids.length>1){if(factorChoicesFor(ids).length)add('factor');add('group');}
   try{squareSuggestion(s.raw,ids);add('square');}catch{}
   if(ids.length)add('remainder');
   for(const mode of ['expand','cancel','common','power'])if(targets(mode).length&&!(mode==='power'&&actions.some(a=>a.id==='powerForm')))add(mode);
   if(ids.length)add('replace');
  }
  const full=s.fullRaw,side=s.side,sides=s.sides?[...s.sides]:null,scope=s.scopes.at(-1);
  const base=sides?sides[side]:full;let baseSource=base;
  try{baseSource=s.generic?parseCalculation(base).parts[0]:directTerms(base).source;}catch{}
  const resultFor=value=>{
   const selected=new Set(ids);let piece=ids.length<terms.length?terms.flatMap((t,i)=>i===ids[0]?[`(${value})`]:selected.has(i)?[]:[t.raw]).map((t,i)=>i&&!t.startsWith('-')?'+'+t:t).join(''):value;
   if(scope)piece=baseSource.slice(0,scope.innerStart)+piece+baseSource.slice(scope.innerEnd);
   if(sides){const out=[...sides];out[side]=piece;return tidyMath(out.join(' = '));}return tidyMath(piece);
  };
  return {raw:part,fullRaw:full,actions,resultFor,label:scope?'괄호 안':s.selected.length?'선택한 부분':sides?(side===0?'좌변':'우변'):'전체 식',isWhole:!scope&&!sides&&ids.length===terms.length,
   substitute(){const definition=part;let source=full;if(ids.length>1&&ids.length<terms.length)source=resultFor(part);onSubstitute?.({definition,source});}};
 }
 function factorChoicesFor(ids){try{return commonFactorChoices(state.raw,ids);}catch{return [];}}
 return {mount,begin,resize,open,setExpanded,refresh:draw,transformContext,select(index){if(state?.info?.terms[index]){state.selected=[index];state.mode=null;draw();}},get rowIndex(){return state?.rowIndex;},get raw(){return state?.fullRaw;}};
}
