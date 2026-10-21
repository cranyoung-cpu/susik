// One small, tab-local recovery slot. It is not a solution record or a backup.
export const PRACTICE_DRAFT_KEY='susik-lab.practice-draft.v1';
const MAX_AGE=24*60*60*1000;
export function createPracticeDraftStore(storage,now=()=>Date.now()){
 let hasData=false;
 const valid=(d,source)=>d?.version===1&&d.source===source&&typeof source==='string'&&source.length<=100000&&typeof d.value==='string'&&d.value.trim().length>0&&d.value.length<=2000&&['number','symbol','function'].includes(d.tab)&&Number.isSafeInteger(d.start)&&Number.isSafeInteger(d.end)&&d.start>=0&&d.end>=d.start&&d.end<=d.value.length&&['none','forward','backward'].includes(d.direction)&&Number.isFinite(d.at)&&d.at<=now()&&now()-d.at<=MAX_AGE;
 return {
  read(source){try{const raw=storage.getItem(PRACTICE_DRAFT_KEY);hasData=Boolean(raw);if(!raw||raw.length>110000)return null;const d=JSON.parse(raw);return valid(d,source)?{value:d.value,tab:d.tab,selection:{start:d.start,end:d.end,direction:d.direction}}:null;}catch{return null;}},
  write(source,draft){const d={version:1,source,value:draft.value,tab:draft.tab,start:draft.selection.start,end:draft.selection.end,direction:draft.selection.direction||'none',at:now()};if(!draft.value.trim())return this.clear();if(!valid(d,source)){this.clear();return false;}try{storage.setItem(PRACTICE_DRAFT_KEY,JSON.stringify(d));hasData=true;return true;}catch{return false;}},
  clear(){try{storage.removeItem(PRACTICE_DRAFT_KEY);hasData=false;return true;}catch{try{storage.setItem(PRACTICE_DRAFT_KEY,'');hasData=false;return true;}catch{return !hasData;}}}
 };
}
