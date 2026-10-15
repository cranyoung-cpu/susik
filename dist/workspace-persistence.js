import {WORK_KEY,loadWorkspace} from './workspace-state.js';
import {validateWorkspace} from './workspace-backup.js';

// Compare against the exact snapshot this page read or successfully wrote.
// A restored page must never treat someone else's write as its own baseline.
export function createWorkspacePersistence(storage){
 let baseline=null,readable=false;
 const read=()=>storage.getItem(WORK_KEY)??null;
 return {
  load(){return loadWorkspace({getItem(key){const value=storage.getItem(key)??null;if(key===WORK_KEY){baseline=value;readable=true;}return value;}});},
  status(){try{const value=read();if(!readable&&value===null){baseline=null;readable=true;}return readable&&value===baseline?'current':'conflict';}catch{return 'unavailable';}},
  save(book){
   const status=this.status();if(status!=='current')return status;
   try{const value=JSON.stringify(book);storage.setItem(WORK_KEY,value);baseline=value;readable=true;return 'saved';}catch{return 'unavailable';}
  },
  latest(){
   const value=read();if(value===null)throw Error('저장된 최신 기록을 찾지 못했습니다. 현재 화면을 백업해 보관해 주세요.');
   let book;try{book=validateWorkspace(JSON.parse(value));}catch{throw Error('최신 저장 기록을 읽을 수 없습니다. 현재 화면을 백업해 보관해 주세요.');}
   baseline=value;readable=true;return book;
  },
  changed(book){return JSON.stringify(book)!==baseline;}
 };
}
