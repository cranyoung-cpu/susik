import {nextInputPosition} from './input-navigation.js';
import {mountInputPosition,updateInputPosition} from './input-position.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Common operations keep the same position while only the left panel changes.
const fixed=['⌫','AC','/','*','-','+','sqrt()','^()','±','='];
const rows={number:['7','8','9','4','5','6','1','2','3','0','.','(',')','←','→'],symbol:['←','→',',','x','y','z','t','a','b','c','k','m','n','u','v','w','i','theta','(',')'],function:['sin()','cos()','tan()','ln()','log()','exp()','log(,2)','arcsin()','arccos()','arctan()','abs()','pi','e','theta','e^()','^(-1)',',','(',')','←','→']};
const label={'*':'×','/':'÷','^2':'x²','^':'xʸ','^()':'xʸ','pi':'π','theta':'θ','sqrt()':'√','sin()':'sin','cos()':'cos','tan()':'tan','ln()':'ln','log()':'log','exp()':'exp','log(,2)':'logₐ','arcsin()':'arcsin','arccos()':'arccos','arctan()':'arctan','abs()':'|x|','e^()':'eˣ','^(-1)':'x⁻¹'};
export function inputPad(prefix,tab='number',functions=false){
 const tabs=[['number','숫자'],['symbol','문자·기호'],...(functions?[['function','함수']]:[])];
 const button=k=>`<button type="button" data-${prefix}-key="${esc(k)}" class="${/^[0-9.]$/.test(k)?'digit':'+-*/='.includes(k)?'operator':'utility'}" aria-label="${esc({'⌫':'한 글자 또는 선택 영역 지우기','←':'커서 왼쪽','→':'커서 오른쪽','<':'작다 <','≤':'작거나 같다 ≤','>':'크다 >','≥':'크거나 같다 ≥','AC':'모두 지우기','±':'부호 바꾸기','sqrt()':'제곱근','^()':'거듭제곱'}[k]||label[k]||k)}">${k==='⌫'?'<span aria-hidden="true">⌫</span><small>지우기</small>':esc(label[k]||k)}</button>`;
 return `<div class="input-pad"><div class="input-pad-tabs" role="tablist" aria-label="계산기 입력 종류">${tabs.map(([id,name])=>`<button type="button" role="tab" data-${prefix}-pad-tab="${id}" aria-selected="${tab===id}">${name}</button>`).join('')}</div><div class="input-pad-grid" aria-label="계산기 버튼"><div class="input-pad-variable" aria-label="${esc(tabs.find(([id])=>id===tab)?.[1]||'숫자')} 입력">${[...(rows[tab]||rows.number),...(prefix==='work'&&tab==='symbol'?['<','≤','>','≥']:[])].map(button).join('')}</div><div class="input-pad-fixed" aria-label="기본 연산과 지우기">${fixed.map(button).join('')}</div></div></div>`;
}
export function setInputKeyboard(input,system=false,touch=false){
 input.setAttribute('inputmode',system?'text':'none');
 // Read-only touch input also suppresses keyboards that ignore inputmode=none.
 if(touch&&!system)input.setAttribute('readonly','');else input.removeAttribute('readonly');
 mountInputPosition(input);updateInputPosition(input);
}

export function pressInputKey(input,key,max=2000){
 const value=input.value,start=input.selectionStart??value.length,end=input.selectionEnd??start;let pos=start,next=value;
 if(key==='←'||key==='→')pos=nextInputPosition(value,start,end,key==='←'?-1:1);
 else if(key==='AC'||key==='지우기'){next='';pos=0;}
 else if(key==='±'){next=value.startsWith('-(')&&value.endsWith(')')?value.slice(2,-1):value?`-(${value})`:'-';pos=next.length;}
 else {const a=key==='⌫'&&start===end?Math.max(0,start-1):start,insert=key==='⌫'?'':key;next=value.slice(0,a)+insert+value.slice(end);pos=key==='log(,2)'?a+4:a+insert.length-(insert.endsWith('()')?1:0);}
 if(next.length>max)return false;mountInputPosition(input);input.value=next;input.focus({preventScroll:true});input.setSelectionRange?.(pos,pos);updateInputPosition(input,true);return true;
}
