export const workspaceLoadingMarkup='<section class="notice" data-workspace-loading data-loading-state="loading" aria-label="작업실 불러오기" aria-busy="true"><p data-loading-message role="status" aria-live="polite">수식 작업실을 준비하고 있습니다.</p><p data-loading-help hidden></p><button type="button" class="btn" data-loading-retry hidden>다시 불러오기</button></section>';

// Embedded in HTML so a failed app or dependency cannot hide the recovery UI.
export function startWorkspaceLoading({document,load,reload,setTimer=setTimeout,clearTimer=clearTimeout}){
 const panel=document.querySelector('[data-workspace-loading]');
 if(!panel)return Promise.resolve();
 const message=panel.querySelector('[data-loading-message]'),help=panel.querySelector('[data-loading-help]'),retry=panel.querySelector('[data-loading-retry]');
 let finished=false,reloading=false;
 const waiting=()=>!finished&&panel.isConnected;
 function show(state,text,detail){
  if(!waiting())return;
  panel.dataset.loadingState=state;panel.setAttribute('aria-busy',state==='slow'?'true':'false');
  message.textContent=text;help.textContent=detail;help.hidden=false;retry.hidden=false;
 }
 function retryLoad(){
  // render() removes this panel before any workspace input becomes available.
  if(!waiting()||reloading||retry.hidden)return;
  reloading=true;retry.disabled=true;message.textContent='작업실을 다시 불러옵니다.';
  reload();
 }
 retry.addEventListener('click',retryLoad);
 const timer=setTimer(()=>show('slow','불러오는 데 시간이 걸리고 있습니다.','계속 기다리거나 연결을 확인한 뒤 다시 불러오세요. 이 브라우저에 저장한 기록은 삭제하지 않습니다.'),6000);
 function finish(){finished=true;clearTimer(timer);retry.removeEventListener('click',retryLoad);}
 function failed(){
  clearTimer(timer);
  if(!waiting()){finish();return;}
  show('failed','수식 작업실을 불러오지 못했습니다.','연결을 확인한 뒤 다시 불러오세요. 이 브라우저에 저장한 기록은 삭제하지 않습니다.');
 }
 return Promise.resolve().then(load).then(module=>module.ready).then(()=>{
  if(panel.isConnected){failed();return;}
  finish();
 },failed);
}
