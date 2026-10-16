import {isManualRow} from './workspace-backup.js';

export const PNG_ROW_LIMIT=20;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Explicit display fields only: never serialize a row, origin, answer or workspace.
export function pngSelection(sheet,{from=sheet.active,to=from,context=true,notes=false,reasons=true}={}){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<from||to>=sheet.rows.length)throw Error('시작·끝 줄을 확인하세요.');
 const selected=sheet.rows.flatMap((row,index)=>index>=from&&index<=to&&!row.archived?[{row,index}]:[]);
 if(!selected.length)throw Error('내보낼 수식을 선택하세요.');
 if(selected.length>PNG_ROW_LIMIT)throw Error(`PNG는 한 번에 ${PNG_ROW_LIMIT}줄까지 만들 수 있습니다. 구간을 줄여 주세요.`);
 const rows=selected.map(({row,index})=>{
  const details=[];
  if(reasons&&row.explanation)details.push(['변형 이유',row.explanation]);
  if(context){
   for(const [label,values]of [['조건',[row.condition,...row.conditions||[]]],['가정',row.assumptions||[]],['제외',row.excluded||[]]]){
    const text=[...new Set(values.filter(Boolean))].join(' · ');if(text)details.push([label,text]);
   }
   for(const [name,value]of Object.entries(row.bindings||{}))details.push(['치환',`${name} := ${value}`]);
   for(const branch of row.pendingCases||[])details.push(['별도 경우',`${branch.condition}: ${branch.equation}`]);
   for(const statement of row.logicStatements||[])details.push(['기호 기록 · 미검증',[statement.domain,statement.formula,statement.meaning].filter(Boolean).join('\n')]);
  }
  if(notes&&row.note)details.push(['내 설명 · 수학적 검증 안 됨',row.note]);
  return {number:index+1,title:row.title||'수식',formula:row.displayLatex||row.value,plain:row.value,manual:isManualRow(row),details};
 });
 const selection={sheet:sheet.name||'본식',from:from+1,to:to+1,rows,context,notes,reasons};
 if(JSON.stringify(selection).length>40000)throw Error('선택한 내용이 너무 큽니다. 줄 수나 포함 항목을 줄여 주세요.');
 return selection;
}

const sheetCss=`.png-sheet{box-sizing:border-box;width:800px;padding:36px;background:#fff;color:#202938;font:18px/1.7 sans-serif;letter-spacing:normal;text-align:left}.png-sheet *{box-sizing:border-box}.png-sheet h1{font-size:26px;margin:0 0 8px}.png-sheet h2{font-size:17px;margin:0 0 12px}.png-sheet p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}.png-sheet section{border-top:1px solid #dfe5ed;margin-top:24px;padding-top:20px}.png-sheet .png-caption{font-size:15px;color:#4f5d73}.png-sheet .png-formula{font-size:32px;line-height:1.7;padding:12px 0;white-space:nowrap}.png-sheet .png-plain{font:20px/1.8 monospace;white-space:pre-wrap;overflow-wrap:anywhere}.png-sheet .png-detail{font-size:17px}.png-sheet .png-detail strong{color:#4f5d73}`;
export function pngMarkup(selection,renderMath){
 return `<h1>수식연습실 · ${selection.rows.length===1?'선택한 수식':'선택한 풀이 구간'}</h1><p class="png-caption">${esc(selection.sheet)} · ${selection.from===selection.to?`${selection.from}번째 줄`:`${selection.from}–${selection.to}번째 줄 중 ${selection.rows.length}줄`}\n조건·치환 ${selection.context?'포함':'제외'} · 내 설명 메모 ${selection.notes?'포함':'제외'} · 변형 이유 ${selection.reasons?'포함':'제외'}</p>${selection.rows.map(row=>`<section><h2>${row.number}. ${esc(row.title)}</h2><div class="png-formula">${renderMath(row.formula)}</div>${row.manual?'<p class="png-caption">직접 입력 · 이전 줄과의 동치 미확인</p>':''}${row.details.map(([label,text])=>`<p class="png-detail"><strong>${esc(label)}</strong>\n${esc(text)}</p>`).join('')}</section>`).join('')}<p class="png-caption">선택한 기록의 이미지입니다. 풀이 전체를 자동 검증한 결과가 아닙니다.</p>`;
}

// MathLive uses spans and local SVG paths. No links, images or resource attributes.
function safeMath(markup){
 const template=document.createElement('template');template.innerHTML=markup;
 const tags=new Set(['span','svg','path','g','line','rect','sup','sub']);
 const attributes=new Set(['class','style','aria-hidden','role','xmlns','viewbox','width','height','d','fill','stroke','stroke-width','preserveaspectratio']);
 for(const el of [...template.content.querySelectorAll('*')]){
  if(!tags.has(el.localName)){el.replaceWith(document.createTextNode(el.textContent));continue;}
  for(const a of [...el.attributes])if(!attributes.has(a.name.toLowerCase())||/url\s*\(|@import|javascript:|expression\s*\(/i.test(a.value))el.removeAttribute(a.name);
 }
 return template.innerHTML;
}
function waitFor(promise,signal){return new Promise((resolve,reject)=>{
 const finish=(fn,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(value);},cancel=()=>finish(reject,Error('이미지 만들기를 취소했습니다.'));
 const timer=setTimeout(()=>finish(reject,Error('이미지 준비가 오래 걸립니다. 다시 시도하거나 구간을 줄여 주세요.')),15000);
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();return;}
 Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
});}
let cachedMathCss='';
async function mathCss(signal){
 if(cachedMathCss)return cachedMathCss;
 const response=await fetch('/vendor/mathlive-static.css',{signal,credentials:'omit'});if(!response.ok)throw Error('수식 글꼴을 불러오지 못했습니다. 다시 시도하세요.');
 let css=await response.text();const paths=[...new Set([...css.matchAll(/url\((fonts\/[\w-]+\.woff2)\)/g)].map(m=>m[1]))];
 await Promise.all(paths.map(async path=>{
  const response=await fetch('/vendor/'+path,{signal,credentials:'omit'});if(!response.ok)throw Error('수식 글꼴을 불러오지 못했습니다. 다시 시도하세요.');
  const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  css=css.replaceAll(`url(${path})`,`url(data:font/woff2;base64,${btoa(binary)})`);
 }));
 cachedMathCss=css;return css;
}

export async function createWorkspacePng(selection,renderMath,{signal}={}){
 let host,canvas;
 try{
  const css=await waitFor(mathCss(signal),signal);
  host=document.createElement('div');host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
  const card=document.createElement('div');card.className='png-sheet';card.innerHTML=pngMarkup(selection,raw=>safeMath(renderMath(raw)));
  const style=document.createElement('style');style.textContent=css+'\n'+sheetCss;card.prepend(style);host.append(card);document.body.append(host);
  card.getBoundingClientRect();await waitFor(document.fonts.ready,signal);
  const formulas=[...card.querySelectorAll('.png-formula')],widest=Math.max(728,...formulas.map(el=>el.scrollWidth));
  const width=Math.min(1600,Math.max(800,Math.ceil(widest+72)));card.style.width=width+'px';
  let plainCount=0;
  for(const [i,el]of formulas.entries()){
   const available=width-72;if(el.scrollWidth>available)el.style.fontSize=Math.max(20,32*available/el.scrollWidth)+'px';
   if(el.scrollWidth>available+1){el.className='png-plain';el.textContent=selection.rows[i].plain;const label=document.createElement('p');label.className='png-caption';label.textContent='긴 수식 · 문자 표기로 줄바꿈';el.before(label);plainCount++;}
  }
  const height=Math.ceil(card.getBoundingClientRect().height)+2,scale=Math.min(2,8192/width,8192/height,Math.sqrt(8000000/(width*height)));
  if(scale<1||!Number.isFinite(scale))throw Error('이미지가 너무 큽니다. 풀이 구간이나 포함 항목을 줄여 주세요.');
  const markup=new XMLSerializer().serializeToString(card),svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
  const picture=new Image();picture.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await waitFor(picture.decode(),signal);
  canvas=document.createElement('canvas');canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('이 브라우저에서 이미지를 만들 수 없습니다.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(picture,0,0,canvas.width,canvas.height);
  const blob=await waitFor(new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG를 만들지 못했습니다. 구간을 줄여 다시 시도하세요.')),'image/png')),signal);
  return {blob,width:canvas.width,height:canvas.height,plainCount};
 }finally{host?.remove();if(canvas){canvas.width=0;canvas.height=0;}}
}
