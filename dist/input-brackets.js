// Visual matching only: never parse, repair or rewrite the draft.
export function matchingBrackets(value,start,end=start){
 if(!Number.isInteger(start)||start!==end||start<0||start>value.length)return [];
 const opens={'(':')','[':']','{':'}'},closes=new Set(Object.values(opens)),stack=[],pairs=new Map();
 for(let i=0;i<value.length;i++){
  const char=value[i];
  if(char==='\\'){i++;continue;}
  if(opens[char])stack.push(i);
  else if(closes.has(char)){
   const open=stack.pop();
   if(open!==undefined&&opens[value[open]]===char){pairs.set(open,i);pairs.set(i,open);}
   else stack.length=0; // Do not pair across a mismatched delimiter.
  }
 }
 // At a boundary between two brackets, prefer the one just before the caret.
 const at=/[()[\]{}]/.test(value[start-1]||'')?start-1:start;
 return pairs.has(at)?[at,pairs.get(at)].sort((a,b)=>a-b):[];
}

export function mountBracketHighlight(input){
 const doc=input.ownerDocument,existing=input.parentElement?.classList.contains('input-position-wrap'),wrap=existing?input.parentElement:doc.createElement('span'),overlay=doc.createElement('span'),text=doc.createElement('span');
 wrap.classList.add('work-expression-field');overlay.className='work-bracket-overlay';overlay.setAttribute('aria-hidden','true');text.setAttribute('data-bracket-text','');
 if(!existing){input.before(wrap);wrap.append(input);}wrap.append(overlay);overlay.append(text);let composing=false;
 function update(){
  const indices=composing?[]:matchingBrackets(input.value,input.selectionStart,input.selectionEnd);
  text.replaceChildren();overlay.hidden=!indices.length;
  if(!indices.length)return;
  let from=0;
  for(const at of indices){
   text.append(doc.createTextNode(input.value.slice(from,at)));
   const mark=doc.createElement('mark');mark.textContent=input.value[at];mark.dataset.bracketIndex=String(at);text.append(mark);from=at+1;
  }
  text.append(doc.createTextNode(input.value.slice(from)));
  const style=doc.defaultView?.getComputedStyle?.(input);
  if(style){
   for(const key of ['font','letterSpacing','wordSpacing','textTransform','textIndent','direction'])overlay.style[key]=style[key];
   overlay.style.inset=`${style.borderTopWidth} ${style.borderRightWidth} ${style.borderBottomWidth} ${style.borderLeftWidth}`;
   overlay.style.paddingLeft=style.paddingLeft;overlay.style.paddingRight=style.paddingRight;
  }
  text.style.transform=`translateX(${-input.scrollLeft||0}px)`;
 }
 for(const event of ['input','select','selectionchange','keyup','pointerup','click','focus','scroll'])input.addEventListener(event,update);
 input.addEventListener('compositionstart',()=>{composing=true;update();});
 input.addEventListener('compositionend',()=>{composing=false;update();});
 update();return update;
}
