import {nextInputPosition} from './input-navigation.js';
const positions=new WeakMap(),documents=new WeakSet();

export function updateInputPosition(input,reveal=false){positions.get(input)?.(reveal);}
// Readonly touch inputs can hide the native caret. Measure the real selection in
// the same font and scroll position; keep the overlay out of hit testing and AT.
export function mountInputPosition(input){
 if(!input||!['INPUT','TEXTAREA'].includes(input.tagName)||positions.has(input))return;
 const multiline=input.tagName==='TEXTAREA';
 const doc=input.ownerDocument,win=doc.defaultView,wrap=doc.createElement('span'),layer=doc.createElement('span'),mirror=doc.createElement('span'),caret=doc.createElement('span'),selection=doc.createElement('span');
 wrap.className='input-position-wrap';layer.className='input-position-layer';layer.setAttribute('aria-hidden','true');mirror.className='input-position-mirror';caret.className='input-position-caret';caret.setAttribute('data-input-caret','');selection.className='input-position-selection';
 if(multiline)layer.classList.add('input-position-multiline');
 input.before(wrap);wrap.append(input,layer);layer.append(mirror,selection,caret);let composing=false;
 function update(reveal=false){
  const active=doc.activeElement===input&&input.getAttribute('inputmode')==='none'&&!composing;
  layer.hidden=!active;input.classList.toggle('has-input-position',active);if(!active)return;
  const start=input.selectionStart??0,end=input.selectionEnd??start,focus=input.selectionDirection==='backward'?start:end;
  caret.dataset.position=String(focus);selection.dataset.start=String(start);selection.dataset.end=String(end);
  const style=win?.getComputedStyle?.(input);if(!style||!doc.createRange)return;
  for(const key of ['font','lineHeight','letterSpacing','wordSpacing','textTransform','textIndent','textAlign','direction','wordBreak','overflowWrap','tabSize'])mirror.style[key]=style[key];
  const f=input.getBoundingClientRect(),w=wrap.getBoundingClientRect(),paddingLeft=parseFloat(style.paddingLeft)||0,paddingRight=parseFloat(style.paddingRight)||0;
  const paddingTop=multiline?parseFloat(style.paddingTop)||0:0,paddingBottom=multiline?parseFloat(style.paddingBottom)||0:0,width=input.clientWidth-paddingLeft-paddingRight,height=input.clientHeight-paddingTop-paddingBottom;
  layer.style.left=`${f.left-w.left+(parseFloat(style.borderLeftWidth)||0)+paddingLeft}px`;layer.style.top=`${f.top-w.top+(parseFloat(style.borderTopWidth)||0)+paddingTop}px`;layer.style.width=`${width}px`;layer.style.height=`${height}px`;
  // A trailing newline needs a measurable final line, like the textarea itself.
  mirror.textContent=multiline?input.value+'\u200b':input.value||'\u200b';
  if(multiline)mirror.style.whiteSpace=input.wrap==='off'?'pre':'pre-wrap';
  const scroll=()=>{mirror.style.transform=`translate(${-input.scrollLeft||0}px,${multiline?-input.scrollTop||0:0}px)`;};scroll();
  const text=mirror.firstChild,range=doc.createRange();range.setStart(text,focus);range.collapse(true);
  let rect=range.getClientRects?.()[0];if(!rect){caret.hidden=true;selection.replaceChildren();return;}
  const bounds=layer.getBoundingClientRect();
  if(reveal){
   const x=rect.left-bounds.left;
   if(x<4)input.scrollLeft+=x-4;else if(x>width-4)input.scrollLeft+=x-width+4;
   if(multiline){if(rect.top<bounds.top)input.scrollTop+=rect.top-bounds.top;else if(rect.bottom>bounds.bottom)input.scrollTop+=rect.bottom-bounds.bottom;}
   scroll();rect=range.getClientRects()[0];
  }
  const x=rect.left-bounds.left;caret.hidden=x<-.5||x>width+.5||rect.bottom<bounds.top||rect.top>bounds.bottom;
  caret.style.left=`${Math.max(0,Math.min(width-2,x))}px`;caret.style.top=`${rect.top-bounds.top}px`;caret.style.height=`${rect.height}px`;
  selection.replaceChildren();
  if(start!==end){range.setStart(text,start);range.setEnd(text,end);for(const part of range.getClientRects()){const mark=doc.createElement('span');mark.style.cssText=`left:${part.left-bounds.left}px;top:${part.top-bounds.top}px;width:${part.width}px;height:${part.height}px`;selection.append(mark);}}
 }
 positions.set(input,update);
 for(const type of ['input','select','selectionchange','keyup','pointerup','click','focus'])input.addEventListener(type,()=>update(true));
 for(const type of ['blur','scroll'])input.addEventListener(type,()=>update());
 input.addEventListener('compositionstart',()=>{composing=true;update();});input.addEventListener('compositionend',()=>{composing=false;update(true);});
 input.addEventListener('keydown',event=>{
  if(composing||event.isComposing||event.keyCode===229||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();const pos=nextInputPosition(input.value,input.selectionStart??0,input.selectionEnd??0,event.key==='ArrowLeft'?-1:1);input.setSelectionRange?.(pos,pos);update(true);
  input.dispatchEvent(new win.Event('select'));
 });
 if(!documents.has(doc)){
  documents.add(doc);const active=()=>updateInputPosition(doc.activeElement,true);
  doc.addEventListener('selectionchange',active);win?.addEventListener('resize',active);win?.visualViewport?.addEventListener('resize',active);doc.fonts?.addEventListener?.('loadingdone',active);
 }
 update();
}
