// Draft-only editing history. Never shares the notebook's undo stack or storage.
export function mountInputHistory(input,{state,onChange=()=>{},onState=()=>{},limit=100}={}){
 const past=[...(state?.past||[])].slice(-limit),future=[...(state?.future||[])].slice(-limit);
 const read=()=>({value:input.value,start:input.selectionStart??input.value.length,end:input.selectionEnd??input.value.length,direction:input.selectionDirection||'none'});
 let last=read(),pending=null,composition=null,composing=false;
 function record(before,after){
  if(before.value!==after.value){past.push({before,after});if(past.length>limit)past.shift();future.length=0;}
  last=after;pending=null;onState();
 }
 function sync(){if(!composing)record(last,read());}
 function restore(value,focus=true){
  input.value=value.value;
  if(focus)input.focus({preventScroll:true});
  input.setSelectionRange?.(value.start,value.end,value.direction);last=read();pending=null;
 }
 function step(redo=false){
  if(composing)return false;
  sync();const from=redo?future:past,to=redo?past:future,entry=from.pop();
  if(!entry)return false;
  to.push(entry);restore(redo?entry.after:entry.before);onState();onChange();return true;
 }
 const historyAction=event=>event.inputType==='historyUndo'?'undo':event.inputType==='historyRedo'?'redo':null;
 input.addEventListener('beforeinput',event=>{
  if(composing||event.isComposing)return;
  const action=historyAction(event);
  if(action&&event.cancelable){event.preventDefault();event.stopPropagation();step(action==='redo');return;}
  pending=read();
 });
 input.addEventListener('input',event=>{
  if(composing||event.isComposing)return;
  const action=historyAction(event);
  if(action){
   // Some mobile edits have no cancelable beforeinput. Discard only the native
   // history result, then apply this field's own history exactly once.
   restore(pending||last,false);step(action==='redo');onChange();return;
  }
  record(pending||last,read());
 });
 for(const type of ['paste','cut','drop'])input.addEventListener(type,()=>{if(!composing)pending=read();});
 for(const type of ['select','selectionchange','keyup','pointerup','focus','blur'])input.addEventListener(type,()=>{
  if(!composing&&!pending&&input.value===last.value)last=read();
 });
 input.addEventListener('compositionstart',()=>{sync();composition=read();pending=null;composing=true;onState();});
 input.addEventListener('compositionend',()=>{
  if(!composing)return;
  composing=false;record(composition,read());composition=null;onChange();
 });
 input.addEventListener('keydown',event=>{
  if(composing||event.isComposing||event.keyCode===229||event.altKey||!(event.ctrlKey||event.metaKey))return;
  const key=event.key?.toLowerCase();
  if(key!=='z'&&!(key==='y'&&event.ctrlKey&&!event.metaKey))return;
  event.preventDefault();event.stopPropagation();step(key==='y'||event.shiftKey);
 });
 return {
  get composing(){return composing;},
  get canUndo(){return !composing&&past.length>0;},
  get canRedo(){return !composing&&future.length>0;},
  undo:()=>step(),redo:()=>step(true),
  edit(change){if(composing)return false;sync();const before=read();change();record(before,read());onChange();return true;},
  snapshot(){sync();return {past:[...past],future:[...future]};}
 };
}
