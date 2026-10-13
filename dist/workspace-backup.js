// Backups are data, never executable input. Keep every field for lossless round trips.
export const BACKUP_LIMIT=8*1024*1024;
const fail=()=>{throw Error('올바른 수식연습실 백업 파일이 아닙니다. 원래 파일을 확인해 주세요.');};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
function inspect(value,depth=0){
 if(depth>24)fail();
 if(value===null||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))fail();return;}
 if(typeof value==='string'){if(value.length>100000)fail();return;}
 if(Array.isArray(value)){if(value.length>1000)fail();value.forEach(v=>inspect(v,depth+1));return;}
 if(!object(value)||Object.keys(value).length>100)fail();
 for(const [key,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))fail();inspect(v,depth+1);}
}
function row(r){
 if(!object(r)||typeof r.value!=='string'||!r.value.trim())fail();
 for(const k of ['title','explanation','condition','displayLatex','note','practiceAnswer'])if(r[k]!==undefined&&typeof r[k]!=='string')fail();
 if(r.logicStatements!==undefined&&(!Array.isArray(r.logicStatements)||r.logicStatements.length>20||!r.logicStatements.every(v=>object(v)&&['domain','formula','meaning'].every(k=>typeof v[k]==='string'))))fail();
 if(r.practiceId!=null&&typeof r.practiceId!=='string')fail();
 if(r.practiceFeedback!=null&&(!object(r.practiceFeedback)||typeof r.practiceFeedback.message!=='string'||!['correct','incorrect','unverified'].includes(r.practiceFeedback.status)))fail();
 if(r.practiceFeedback?.criteriaVersion!=null&&typeof r.practiceFeedback.criteriaVersion!=='string')fail();
 if(r.practiceFeedback?.reason!=null&&typeof r.practiceFeedback.reason!=='string')fail();
 for(const k of ['conditions','assumptions','excluded'])if(r[k]!==undefined&&!strings(r[k]))fail();
 if(r.bindings!==undefined&&(!object(r.bindings)||!Object.values(r.bindings).every(v=>typeof v==='string')))fail();
 if(r.pendingCases!==undefined){if(!Array.isArray(r.pendingCases))fail();for(const c of r.pendingCases){if(!object(c)||typeof c.condition!=='string'||typeof c.equation!=='string')fail();row({...c,value:c.equation,assumptions:c.previousAssumptions, pendingCases:c.previousCases});}}
 if(r.archived!==undefined&&typeof r.archived!=='boolean')fail();
 if(r.origin!==undefined)row(r.origin);
}
function sheet(s){
 if(!object(s)||!Array.isArray(s.rows)||!s.rows.length||s.rows.length>300||!Number.isInteger(s.active)||s.active<0||s.active>=s.rows.length)fail();
 if(s.rows[s.active]?.archived===true)fail();
 s.rows.forEach((r,i)=>{row(r);if(r.parent!==undefined&&(!Number.isInteger(r.parent)||r.parent<0||r.parent>=i))fail();});
}
export function validateWorkspace(book){
 inspect(book);sheet(book);
 if(book.auxSequence!==undefined&&(!Number.isSafeInteger(book.auxSequence)||book.auxSequence<0))fail();
 const ids=new Set();if(book.auxiliary!==undefined){
  if(!Array.isArray(book.auxiliary)||book.auxiliary.length>20)fail();
  for(const a of book.auxiliary){sheet(a);if(typeof a.id!=='string'||!/^aux-\d+$/.test(a.id)||ids.has(a.id)||typeof a.name!=='string'||typeof a.sourceValue!=='string'||!Number.isInteger(a.sourceIndex)||a.sourceIndex<0||a.sourceIndex>=book.rows.length)fail();ids.add(a.id);
   if(Number(a.id.slice(4))>(book.auxSequence||0))fail();
   if(a.entry!==undefined){const e=a.entry;if(!object(e)||!['matrix','calculus','system'].includes(e.type)||typeof e.mode!=='string'&&e.type!=='system')fail();
    if(e.type==='matrix'){for(const m of [e.a,e.b])if(!Array.isArray(m)||!m.length||m.length>4||!m.every(r=>strings(r)&&r.length>0&&r.length<=4&&r.length===m[0].length))fail();}
    if(e.type==='system'&&(!strings(e.variables)||!strings(e.equations)||e.variables.length<2||e.variables.length>4||e.equations.length<2||e.equations.length>4))fail();
    if(e.type==='calculus'&&['expression','variable','lower','upper'].some(k=>e[k]!==undefined&&typeof e[k]!=='string'))fail();
   }
  }
 }
 if(book.activeAuxId!=null&&!ids.has(book.activeAuxId))fail();
 return book;
}
export function serializeBackup(book){
 const text=JSON.stringify({format:'susik-workspace',version:1,workspace:validateWorkspace(JSON.parse(JSON.stringify(book)))});
 if(new TextEncoder().encode(text).length>BACKUP_LIMIT)throw Error('백업이 8MB를 넘습니다. 풀이 전체 복사로 보관해 주세요.');
 return text;
}
export function parseBackup(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>BACKUP_LIMIT)fail();
 let data;try{data=JSON.parse(text);}catch{fail();}
 if(!object(data)||data.format!=='susik-workspace'||data.version!==1)fail();
 return validateWorkspace(data.workspace);
}
export function isManualRow(r){return ['직접 입력','직접 작성','보조 식 시작','이전 수식','이전 풀이'].includes(r.title);}
