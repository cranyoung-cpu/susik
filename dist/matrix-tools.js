import {C,Q,parse,evaluate} from './engine.js';
import {parseCalculation} from './calculation.js';
const zero=()=>new C(0),one=()=>new C(1),neg=a=>a.neg(),sub=(a,b)=>a.add(b.neg());
export function exactScalar(raw){const v=evaluate(parse(String(raw)));if(v.n.length!==1||v.d.length!==1)throw Error('행렬의 각 칸에는 숫자·분수·i로 된 상수식을 넣어 주세요.');return v.n[0].mul(v.d[0].inv());}
const qtex=q=>q.d===1n?String(q.n):`${q.n<0n?'-':''}\\frac{${q.n<0n?-q.n:q.n}}{${q.d}}`;
export function scalarTex(c){if(c.im.zero)return qtex(c.re);const sign=c.im.n<0n?'-':'+',q=c.im.n<0n?c.im.neg():c.im;return `${c.re.zero?'':qtex(c.re)}${c.re.zero?(sign==='-'?'-':''):sign}${q.eq(new Q(1))?'':qtex(q)}i`;}
export function matrixTex(a,split=null){const body=a.map(row=>row.map(v=>scalarTex(typeof v==='string'?exactScalar(v):v)).join(' & ')).join(' \\\\ ');return split===null?`\\begin{bmatrix}${body}\\end{bmatrix}`:`\\left[\\begin{array}{${'c'.repeat(split)}|${'c'.repeat(a[0].length-split)}}${body}\\end{array}\\right]`;}
const strings=a=>a.map(row=>row.map(String));
const text=a=>'['+a.map(row=>'['+row.map(String).join(', ')+']').join(', ')+']';
const row=(a,title,explanation,split=null)=>({value:text(a),displayLatex:matrixTex(a,split),matrix:strings(a),title,explanation});
function read(raw){if(!Array.isArray(raw)||!raw.length||raw.length>4||!raw[0]?.length||raw[0].length>4||raw.some(r=>r.length!==raw[0].length))throw Error('행렬은 같은 열 수를 가진 1~4행, 1~4열로 입력하세요.');return raw.map(r=>r.map(exactScalar));}
function identity(n){return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>new C(i===j?1:0)));}
function determinant(a){if(a.length===1)return a[0][0];return a[0].reduce((sum,v,j)=>sum.add(v.mul(new C(j%2?-1:1)).mul(determinant(a.slice(1).map(r=>r.filter((_,k)=>k!==j))))),zero());}
export function rowReduce(source,columns=source[0].length,split=null){
 const a=source.map(r=>[...r]),steps=[],pivots=[];let at=0;
 for(let c=0;c<columns&&at<a.length;c++){
  const found=a.findIndex((r,i)=>i>=at&&!r[c].zero);if(found<0)continue;
  if(found!==at){[a[found],a[at]]=[a[at],a[found]];steps.push(row(a,`R${at+1} ↔ R${found+1}`,'두 행의 위치를 바꿉니다.',split));}
  const pivot=a[at][c];if(!pivot.eq(one())){a[at]=a[at].map(v=>v.mul(pivot.inv()));steps.push(row(a,`R${at+1} ÷ (${pivot})`,'0이 아닌 피벗으로 행 전체를 나누어 피벗을 1로 만듭니다.',split));}
  for(let i=0;i<a.length;i++)if(i!==at&&!a[i][c].zero){const m=a[i][c];a[i]=a[i].map((v,j)=>sub(v,m.mul(a[at][j])));steps.push(row(a,`R${i+1} − (${m})R${at+1}`,'다른 행의 배수를 빼서 같은 열의 값을 0으로 만듭니다.',split));}
  pivots.push(c);at++;
 }
 return {matrix:a,steps,pivots};
}
export function calculateMatrix(entry){
 const a=read(entry.a),mode=entry.mode||'rref',steps=[row(a,'입력 행렬 A','각 칸의 상수식을 정확한 분수·복소수로 읽었습니다.')];let result;
 if(['add','subtract','multiply'].includes(mode)){
  const b=read(entry.b);steps.push(row(b,'입력 행렬 B','두 행렬의 순서는 A, B입니다.'));
  if(mode==='multiply'){
   if(a[0].length!==b.length)throw Error('곱하려면 A의 열 수와 B의 행 수가 같아야 합니다.');
   result=a.map(r=>b[0].map((_,j)=>r.reduce((s,v,k)=>s.add(v.mul(b[k][j])),zero())));
   const expressions=result.map((r,i)=>r.map((v,j)=>`(${i+1},${j+1}): ${a[i].map((x,k)=>`(${x})×(${b[k][j]})`).join(' + ')} = ${v}`).join('\n')).join('\n');
   steps.push(row(result,'행과 열의 내적으로 곱하기',expressions));
  }else{
   if(a.length!==b.length||a[0].length!==b[0].length)throw Error('더하기·빼기는 두 행렬의 크기가 같아야 합니다.');
   result=a.map((r,i)=>r.map((v,j)=>mode==='add'?v.add(b[i][j]):sub(v,b[i][j])));steps.push(row(result,mode==='add'?'행렬의 합':'행렬의 차','같은 위치의 성분끼리 계산합니다.'));
  }
 }else if(mode==='transpose'){result=a[0].map((_,j)=>a.map(r=>r[j]));steps.push(row(result,'전치행렬','행과 열을 서로 바꿉니다.'));}
 else if(mode==='determinant'){
  if(a.length!==a[0].length)throw Error('행렬식은 정사각행렬에서 계산합니다.');const det=determinant(a);
  const terms=a[0].map((v,j)=>a.length===1?String(v):`(${j%2?-1:1}) × (${v}) × (${determinant(a.slice(1).map(r=>r.filter((_,k)=>k!==j)))})`).join(' + ');
  steps.push({value:String(det),title:'행렬식',explanation:`첫째 행에 대한 여인수 전개: ${terms} = ${det}`});
 }else if(mode==='inverse'){
  if(a.length!==a[0].length)throw Error('역행렬은 정사각행렬에서 계산합니다.');const n=a.length,aug=a.map((r,i)=>[...r,...identity(n)[i]]),rr=rowReduce(aug,n,n);
  if(rr.pivots.length!==n)throw Error('행렬식이 0인 특이행렬이므로 역행렬이 없습니다. 행 사다리꼴에서 확인할 수 있습니다.');
  steps.push(row(aug,'단위행렬 붙이기','[A | I]에 같은 행 연산을 적용합니다.',n),...rr.steps);result=rr.matrix.map(r=>r.slice(n));steps.push(row(result,'역행렬','왼쪽이 단위행렬이 되었으므로 오른쪽이 A의 역행렬입니다.'));
 }else if(mode==='rref'){
  const rr=rowReduce(a);result=rr.matrix;steps.push(...rr.steps,row(result,'기약 행 사다리꼴',`피벗이 ${rr.pivots.length}개이므로 계수(rank)는 ${rr.pivots.length}입니다.`));
 }else throw Error('지원하는 행렬 연산을 골라 주세요.');
 return {steps,result:result?strings(result):null};
}
function linearNode(node,variables){
 if(node.isParenthesisNode)return linearNode(node.content,variables);const n=node,len=variables.length,empty=()=>Array.from({length:len+1},zero);
 if(n.isSymbolNode&&variables.includes(n.name)){const a=empty();a[variables.indexOf(n.name)]=one();return a;}
 if(n.isOperatorNode){const a=linearNode(n.args[0],variables);if(n.args.length===1)return n.op==='-'?a.map(neg):a;const b=linearNode(n.args[1],variables),ac=a.slice(0,len).every(v=>v.zero),bc=b.slice(0,len).every(v=>v.zero);
  if(n.op==='+'||n.op==='-')return a.map((v,i)=>v.add(n.op==='+'?b[i]:b[i].neg()));
  if(n.op==='*'){if(!ac&&!bc)throw Error('비선형 연립식은 아직 자동으로 풀지 않습니다. 일차식으로 입력하세요.');return ac?b.map(v=>v.mul(a[len])):a.map(v=>v.mul(b[len]));}
  if(n.op==='/'&&bc)return a.map(v=>v.mul(b[len].inv()));
  if(n.op==='^'&&bc&&b[len].eq(one()))return a;
  if(!(ac&&bc))throw Error('변수의 제곱·곱·분모가 있는 연립식은 아직 지원하지 않습니다.');
 }
 const a=empty();try{a[len]=exactScalar(n.toString());return a;}catch{throw Error('선택한 미지수와 숫자·분수 계수로 된 일차식을 입력하세요.');}
}
export function solveLinearSystem(entry,provided){
 const vars=entry.variables||['x','y'],eqs=entry.equations||[];
 if(vars.length<2||vars.length>4||new Set(vars).size!==vars.length||vars.some(v=>!['x','y','z','w','t','u','a','b'].includes(v)))throw Error('서로 다른 미지수 2~4개를 골라 주세요.');
 if(eqs.length<2||eqs.length>4)throw Error('방정식은 2~4개 입력하세요.');
 const parsed=eqs.map(e=>parseCalculation(e,provided));if(parsed.some(p=>p.nodes.length!==2))throw Error('각 줄에 =가 있는 등식을 입력하세요.');
 const a=parsed.map(p=>{const l=linearNode(p.nodes[0],vars),r=linearNode(p.nodes[1],vars),diff=l.map((v,i)=>sub(v,r[i]));return [...diff.slice(0,-1),diff.at(-1).neg()];});
 if(a.some(r=>r.some(c=>!c.im.zero)))throw Error('연립식 풀이는 현재 실수·유리수 계수를 지원합니다.');
 const tex=parsed.map(p=>p.nodes.map(n=>n.toTex()).join(' &= ')).join(' \\\\ '),steps=[{value:eqs.join('; '),displayLatex:`\\begin{cases}${tex}\\end{cases}`,title:'일차 연립방정식',explanation:`미지수 순서: ${vars.join(', ')}. 식을 행별로 소거합니다.`},row(a,'첨가행렬',`열 순서는 ${vars.join(', ')}, 마지막 열은 상수항입니다.`,vars.length)],rr=rowReduce(a,vars.length,vars.length);steps.push(...rr.steps);
 const inconsistent=rr.matrix.some(r=>r.slice(0,-1).every(v=>v.zero)&&!r.at(-1).zero);
 if(inconsistent){steps.push({value:'해 없음',displayLatex:'\\varnothing',title:'해 없음',explanation:'0이 0이 아닌 상수와 같아야 하는 행이 생겼으므로 모순입니다.'});return {steps,status:'none'};}
 const free=vars.map((_,i)=>i).filter(i=>!rr.pivots.includes(i));
 rr.pivots.forEach((col,i)=>{let rhs=String(rr.matrix[i].at(-1));for(const j of free)if(!rr.matrix[i][j].zero)rhs+=` + (${rr.matrix[i][j].neg()})*${vars[j]}`;steps.push({value:`${vars[col]} = ${rhs}`,title:free.length?'자유변수로 해 표현':'해',explanation:free.length?`${free.map(j=>vars[j]).join(', ')}는 자유로운 실수입니다. 원래 조건이 있으면 함께 확인하세요.`:'기약 행 사다리꼴에서 변수의 값을 읽습니다. 원래 식에 대입해 확인하세요.'});});
 if(!rr.pivots.length)steps.push({value:'모든 실수',displayLatex:`(${vars.join(',')})\\in\\mathbb{R}^{${vars.length}}`,title:'무수히 많은 해',explanation:'모든 식이 0 = 0이므로 선택한 미지수는 자유로운 실수입니다.'});
 return {steps,status:free.length?'infinite':'unique',free:free.map(j=>vars[j])};
}
