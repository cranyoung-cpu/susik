import {inputPad} from './input-pad.js';
export const ADVANCED_TYPES=[['expression','수식'],['matrix','행렬'],['calculus','미적분'],['system','연립식']];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const typeTabs=type=>`<div class="work-input-types" role="tablist" aria-label="입력 종류">${ADVANCED_TYPES.map(([id,name])=>`<button role="tab" data-input-type="${id}" aria-selected="${type===id}">${name}</button>`).join('')}</div>`;
const select=(name,label,options,value)=>`<label>${label}<select data-adv-option="${name}">${options.map(([id,text])=>`<option value="${esc(id)}"${String(value)===String(id)?' selected':''}>${text}</option>`).join('')}</select></label>`;
const input=(key,value,label,placeholder='')=>`<label class="adv-field">${label}<input data-adv-input="${key}" value="${esc(value)}" aria-label="${esc(label)}" placeholder="${esc(placeholder)}" maxlength="500" inputmode="none" autocomplete="off" spellcheck="false"></label>`;
const numbers=(min,max)=>Array.from({length:max-min+1},(_,i)=>[i+min,i+min]);
export function defaultAdvanced(type,expression=''){
 if(type==='matrix')return {type,mode:'rref',a:[['0','0'],['0','0']],b:[['0','0'],['0','0']]};
 if(type==='system')return {type,variables:['x','y'],equations:['','']};
 return {type:'calculus',mode:'derivative',expression:expression.includes('=')?'':expression,variable:'x',order:1,lower:'0',upper:'1'};
}
export function advancedForm(entry,tab='number'){
 const e=entry;let form='';
 if(e.type==='matrix'){
  const grid=name=>`<section class="adv-matrix"><div class="adv-matrix-size"><strong>${name.toUpperCase()}</strong>${select(name+'Rows','행',numbers(1,4),e[name].length)}<span>×</span>${select(name+'Cols','열',numbers(1,4),e[name][0].length)}</div><div class="adv-matrix-scroll"><div class="adv-matrix-grid" style="--matrix-cols:${e[name][0].length}">${e[name].flatMap((r,i)=>r.map((v,j)=>input(`${name}.${i}.${j}`,v,`${name.toUpperCase()} ${i+1}행 ${j+1}열`))).join('')}</div></div></section>`;
  form=`${select('mode','연산',[['rref','행 소거 과정'],['inverse','역행렬'],['determinant','행렬식'],['transpose','전치'],['add','A + B'],['subtract','A − B'],['multiply','A × B']],e.mode)}${grid('a')}${['add','subtract','multiply'].includes(e.mode)?grid('b'):''}<p class="work-tip">1~4행·열, 숫자·분수·i 상수 지원. 칸을 누르고 입력한 뒤 다음 칸으로 이동하세요.</p><details class="adv-paste"><summary>행렬 붙여넣기</summary><textarea data-adv-paste placeholder="1, 2&#10;3, 4" aria-label="행렬 문자 또는 LaTeX 붙여넣기"></textarea><div><button data-adv-import="a">A에 넣기</button>${['add','subtract','multiply'].includes(e.mode)?'<button data-adv-import="b">B에 넣기</button>':''}</div><p>줄바꿈·탭·쉼표 또는 LaTeX bmatrix/pmatrix를 사용하세요.</p></details>`;
 }else if(e.type==='system'){
  form=`<div class="adv-settings">${select('variables','미지수',[[2,'x, y'],[3,'x, y, z'],[4,'x, y, z, w']],e.variables.length)}${select('equationCount','방정식 수',numbers(2,4),e.equations.length)}</div><div class="adv-equations">${e.equations.map((v,i)=>input(`equations.${i}`,v,`식 ${i+1}`,i?'x-y=1':'x+y=3')).join('')}</div><p class="work-tip">미지수 2~4개, 방정식 2~4개인 일차 연립식을 가우스–조르당 소거법으로 풉니다. 해 없음·무수히 많은 해도 구분합니다. 비선형식은 아직 지원하지 않습니다.</p><details class="adv-paste"><summary>여러 식 붙여넣기</summary><textarea data-adv-paste placeholder="x+y=3&#10;x-y=1" aria-label="연립식 여러 줄 붙여넣기"></textarea><button data-adv-import="equations">줄별로 넣기</button></details>`;
 }else{
  form=`<div class="adv-settings">${select('mode','계산',[['derivative','미분'],['integral','부정적분'],['definite','정적분']],e.mode)}${select('variable','변수',['x','t','y','z','theta','a','b','u','v','w'].map(v=>[v,v==='theta'?'θ':v]),e.variable)}${e.mode==='derivative'?select('order','차수',numbers(1,3),e.order):''}</div>${input('expression',e.expression,'함수식','예: x^3+sin(2x)')}${e.mode==='definite'?`<div class="adv-bounds">${input('lower',e.lower,'하한')}${input('upper',e.upper,'상한')}</div>`:''}<p class="work-tip">${e.mode==='derivative'?'1~3차 미분·편미분. 다른 문자는 상수로 보고, 곱·몫·연쇄법칙을 표시합니다.':'기본 적분: 합·상수배, 거듭제곱, 일차식 안쪽의 sin·cos·exp·ln·제곱근. 일반 치환·부분적분·이상적분은 아직 지원하지 않습니다.'} 삼각함수는 라디안입니다.</p>`;
 }
 return typeTabs(e.type)+`<div class="adv-form">${form}<button class="adv-example" data-adv-example>예제로 채우기</button></div><div class="adv-keyboard"><div class="adv-cell-nav"><span data-adv-focused>입력할 칸을 누르세요</span><button data-adv-field-move="-1" aria-label="이전 입력 칸">이전 칸</button><button data-adv-field-move="1" aria-label="다음 입력 칸">다음 칸</button></div><div class="adv-context-keys">${(e.type==='system'?e.variables:e.type==='matrix'?['i']:[]).map(k=>`<button data-adv-key="${k}">${k}</button>`).join('')}</div><div data-adv-pad>${inputPad('adv',tab,e.type==='calculus')}</div></div>`;
}
export function updateAdvanced(entry,key,value){const parts=key.split('.');let target=entry;for(const p of parts.slice(0,-1))target=target[p];target[parts.at(-1)]=value;}
export function resizeAdvanced(entry,key,value){
 const e=entry,n=Number(value);if((/^[ab](Rows|Cols)$/.test(key)||['variables','equationCount'].includes(key))&&(!Number.isInteger(n)||n<1||n>4))throw Error('행·열 또는 식의 개수를 다시 선택하세요.');
 if(/^[ab](Rows|Cols)$/.test(key)){const k=key[0],rows=key.endsWith('Rows')?n:e[k].length,cols=key.endsWith('Cols')?n:e[k][0].length;e[k]=Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>e[k][i]?.[j]??'0'));}
 else if(key==='variables')e.variables=['x','y','z','w'].slice(0,n);
 else if(key==='equationCount')e.equations=Array.from({length:n},(_,i)=>e.equations[i]??'');
 else e[key]=value;
}
export function importMatrix(raw){
 const latex=raw.match(/\\begin\{(?:bmatrix|pmatrix|matrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix)\}/);
 let rows;if(latex)rows=latex[1].split(/\\\\/).filter(s=>s.trim()).map(s=>s.split('&').map(s=>s.trim()));
 else if(raw.trim().startsWith('[[')){try{rows=JSON.parse(raw).map(r=>r.map(String));}catch{throw Error('배열 표기는 [[1,2],[3,4]]처럼 입력하세요.');}}
 else rows=raw.trim().split(/\n|;/).filter(s=>s.trim()).map(s=>s.trim().split(/\t|,/).map(s=>s.trim()));
 if(!rows.length||rows.length>4||!rows[0].length||rows[0].length>4||rows.some(r=>r.length!==rows[0].length||r.some(v=>!v)))throw Error('빈칸 없이 같은 열 수를 가진 1~4행·열을 붙여넣으세요.');return rows;
}
