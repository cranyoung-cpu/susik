export const TOPICS=[
 {id:'factor',name:'인수분해',caption:'합을 곱의 구조로',symbol:'(a+b)(a−b)',order:'01',color:'blue'},
 {id:'expand',name:'전개와 식 정리',caption:'괄호를 풀고 같은 항 모으기',symbol:'a(b+c)',order:'02',color:'green'},
 {id:'fraction',name:'분수식 정리',caption:'약분과 허용 범위',symbol:'a/b',order:'03',color:'amber'},
 {id:'power',name:'지수법칙',caption:'곱·몫·거듭제곱 정리',symbol:'xᵐ · xⁿ',order:'04',color:'violet'},
 {id:'square',name:'완전제곱식',caption:'제곱한 식과 상수로',symbol:'(x+a)²',order:'05',color:'rose'},
 {id:'substitute',name:'치환',caption:'같은 구조를 새 문자로',symbol:'x+1 → t',order:'06',color:'teal'}
];
const signed=n=>n<0?'-'+Math.abs(n):'+'+n;
const linear=(a,b)=>`${a===1?'':a===-1?'-':a}x${b?signed(b):''}`;
export function polynomial(coeffs){let s='';for(let i=coeffs.length-1;i>=0;i--){const c=coeffs[i];if(!c)continue;const sign=c<0?'-':s?'+':'';s+=sign+((i&&Math.abs(c)===1)?'':Math.abs(c))+(i===0?'':i===1?'x':`x^${i}`);}return s||'0';}
export function makeProblem(topic,index=0,seed=Date.now(),level='standard'){
 let state=(Number(seed)+index*1640531527)>>>0;function rand(a,b){state=(Math.imul(state,1664525)+1013904223)>>>0;return a+state%(b-a+1);}
 const range=level==='basic'?3:7, nonzero=()=>{let n;do{n=rand(-range,range)}while(!n);return n;};
 const a=nonzero(),b=nonzero();let expression,answer,steps,hint,goal,condition='x는 실수입니다.',excluded=[],binding=null;
 if(topic==='factor'){
  const c=level==='basic'?1:rand(1,3);expression=polynomial([a*b,c*b+a,c]);answer=`(${linear(c,a)})(${linear(1,b)})`;
  const split=`${polynomial([0,a,c])}${signed(c*b)}x${signed(a*b)}`;
  steps=[['조작-변형',split,'중간항을 두 항으로 나눕니다.'],['조작-변형',`${c===1?'':c}x(x${signed(b)})${signed(a)}(x${signed(b)})`,'각 묶음에서 공통인수를 꺼냅니다.'],['논증-결론',answer,'공통인 괄호식을 묶습니다.']];
  // The split uses a*x and c*b*x; group c*x²+c*b*x and a*x+a*b.
  steps[0][1]=`${c===1?'':c}x^2${signed(c*b)}x${signed(a)}x${signed(a*b)}`;
  hint=`중간항을 두 항으로 나누어, 같은 괄호식이 생기도록 묶어 보세요.`;goal='복소수 계수의 일차식들의 곱으로 인수분해하세요.';
 }else if(topic==='expand'){
  const c=rand(1,3);expression=`(${linear(c,a)})(${linear(1,b)})`;answer=polynomial([a*b,c*b+a,c]);steps=[['조작-변형',`${c===1?'':c}x^2${signed(c*b)}x${signed(a)}x${signed(a*b)}`,'각 항에 분배법칙을 적용합니다.'],['조작-계산',answer,'같은 차수의 항을 모읍니다.']];hint='앞 괄호의 각 항을 뒤 괄호의 모든 항에 곱해 보세요.';goal='전개한 뒤 같은 차수의 항을 모으세요.';
 }else if(topic==='fraction'){
  expression=`(${polynomial([a*b,a+b,1])})/(x${signed(a)})`;answer=`x${signed(b)}`;excluded=[-a];condition=`x는 실수이며 x ≠ ${-a}입니다.`;steps=[['조작-변형',`((x${signed(a)})(x${signed(b)}))/(x${signed(a)})`,'분자를 인수분해합니다.'],['조작-변형',answer,'0이 아닌 공통인수를 약분합니다. 원래의 제외 조건은 유지합니다.']];hint='분모와 같은 인수가 분자에도 있는지 살펴보세요.';goal='분수식을 약분하여 간단히 쓰세요. 처음의 제외 조건은 유지됩니다.';
 }else if(topic==='power'){
  const m=rand(2,6),n=rand(2,5),kind=rand(0,2);excluded=[0];condition='x는 0이 아닌 실수입니다.';
  expression=kind===0?`x^${m}*x^${n}`:kind===1?`(x^${m+n})/(x^${n})`:`(x^${m})^${n>2?2:n}`;
  const k=kind===0?m+n:kind===1?m:m*2;answer=`x^${k}`;steps=[['조작-계산',answer,kind===0?'밑이 같은 거듭제곱의 곱에서는 지수를 더합니다.':kind===1?'밑이 같은 거듭제곱의 몫에서는 지수를 뺍니다.':'거듭제곱을 다시 거듭제곱하면 지수를 곱합니다.']];hint='곱, 몫, 거듭제곱 중 어떤 관계인지 먼저 확인하세요.';goal='x의 거듭제곱 하나로 정리하세요.';
 }else if(topic==='square'){
  const d=nonzero();expression=polynomial([a*a+d,2*a,1]);answer=`(x${signed(a)})^2${signed(d)}`;steps=[['조작-변형',`x^2${signed(2*a)}x+${a*a}${signed(d)}`,'일차항 계수의 절반을 제곱한 수를 분리합니다.'],['조작-변형',answer,'앞의 세 항을 완전제곱식으로 묶습니다.']];hint='x의 계수의 절반을 생각하고, 그 수의 제곱만큼 상수항을 조정해 보세요.';goal='(x + 상수)² + 상수 꼴로 나타내세요.';
 }else if(topic==='substitute'){
  binding=`x${signed(a)}`;expression=`(x${signed(a)})^2${signed(b)}(x${signed(a)})${signed(a*b)}`;answer=`t^2${signed(b)}t${signed(a*b)}`;condition=`x는 실수이고 t := x ${a<0?'−':'+'} ${Math.abs(a)}입니다.`;steps=[['도입-정의',`t=x${signed(a)}`,'반복되는 괄호식의 이름을 t로 정합니다.'],['조작-대입',answer,'각 괄호식 자리에 t를 넣습니다.']];hint='같은 괄호식이 등장하는 위치를 모두 찾아보세요.';goal='주어진 치환을 적용하여 t만의 다항식으로 쓰세요.';
 }else throw Error('알 수 없는 단원입니다.');
 return {id:`${topic}-${seed}-${index}-${level}`,topic,expression,answer,steps,hint,goal,condition,excluded,binding,level};
}
