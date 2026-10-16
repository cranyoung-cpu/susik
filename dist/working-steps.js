import {normalize,parse,evaluate,equivalent,checkStep,C} from './engine.js';
import {expandPart,transformationTargets,polynomialLatex,algebraContext} from './transform-tools.js';
export function expansionSteps(raw,problem={}){
 const name=/t/.test(normalize(raw))?'t':'x',context=algebraContext(raw,problem),steps=[];let current=raw;
 const add=(result,title,explanation)=>{if(normalize(result)===normalize(current))return;const check=checkStep(result,{...context,expression:current});if(!check.ok)throw Error(check.message);steps.push({value:result,title,explanation,conditions:[]});current=result;};
 const initial=evaluate(parse(raw),name==='t'?'x':null);if(initial.d.length!==1)throw Error('자동 전개는 다항식에 사용할 수 있습니다. 분수식은 항을 선택해 약분·통분하세요.');
 // Bound the expansion before building a potentially very large intermediate expression.
 if(initial.n.length>9)throw Error('자동 전개는 8차 이하의 다항식에 사용할 수 있습니다. 부분 전개를 이용하세요.');
 for(let count=0;count<12;count++){
  const targets=transformationTargets(current,'expand').targets;
  if(targets.length){add(expandPart(current,targets.at(-1).id,context),'분배법칙','한 괄호의 각 항을 다른 괄호의 모든 항에 곱합니다. 빼는 항의 부호도 함께 곱합니다.');continue;}
  const source=normalize(current),ast=parse(source);let target=null;
  function find(n){if(n.a)find(n.a);if(n.b)find(n.b);if(n.op==='pow'&&['add','sub'].includes(n.a.op)){const p=evaluate(n.b);if(p.n.length===1&&p.d.length===1){const z=p.n[0].mul(p.d[0].inv());if(z.im.zero&&z.re.d===1n&&z.re.n>=3n&&z.re.n<=6n)target={n,k:Number(z.re.n)};}}}find(ast);
  if(!target)break;const {n,k}=target,base=source.slice(n.a.start,n.a.end);add(source.slice(0,n.start)+'('+Array.from({length:k},()=>`(${base})`).join('*')+')'+source.slice(n.end),'거듭제곱의 뜻',`같은 괄호식을 ${k}번 곱한 모양으로 바꿉니다.`);
 }
 const source=normalize(current),ast=parse(source),parts=[];
 function terms(n,sign=1){if(n.op==='add'){terms(n.a,sign);terms(n.b,sign);}else if(n.op==='sub'){terms(n.a,sign);terms(n.b,-sign);}else if(n.op==='neg')terms(n.a,-sign);else{const v=evaluate(n,name==='t'?'x':null);if(v.d.length!==1||v.n.filter(z=>!z.zero).length>1)throw Error('식이 너무 깁니다. 부분 전개로 나누어 진행하세요.');const p=v.n.map(z=>z.mul(v.d[0].inv()).mul(new C(sign)));const text=polynomialLatex(p,name);parts.push(parts.length&&!text.startsWith('-')?'+'+text:text);}}terms(ast);
 add(parts.join(''),'각 곱 계산','계수를 곱하고, 같은 문자의 곱은 지수를 더합니다. 아직 동류항은 합치지 않습니다.');
 const v=evaluate(parse(current),name==='t'?'x':null);add(polynomialLatex(v.n.map(z=>z.mul(v.d[0].inv())),name),'동류항 정리','문자와 차수가 같은 항의 계수를 더하고, 차수가 높은 항부터 정리합니다.');
 return steps;
}
const explanations={sum:'한 항의 계수를 두 수의 합으로 나누었습니다. 두 계수를 더하면 원래 계수가 됩니다.',product:'한 항을 두 인수의 곱으로 바꾸었습니다. 두 인수를 곱하면 원래 항이 됩니다.',factor:'선택한 항 각각을 공통인수로 나눈 식을 괄호 안에 적었습니다.',group:'선택한 항들을 괄호 안에 모았습니다. 항의 부호와 전체 값은 유지됩니다.',replace:'직접 입력한 식이 선택한 부분과 같은지 정확한 대수 계산으로 확인했습니다. 원래 정의역과 기록한 조건 안에서 사용하며, 전체 풀이의 동치를 증명한 것은 아닙니다.',powerForm:'같은 수나 식의 거듭제곱으로 나타냈습니다. 짝수 제곱과 음수의 부호를 구별합니다.',power:'같은 밑의 곱에서는 지수를 더하므로, 원래 지수를 두 정수의 합으로 나누었습니다.',expand:'분배법칙으로 괄호 안의 각 항에 곱셈을 적용했습니다.',square:'일차항에 맞는 제곱식을 만들고, 원래 식과의 차이를 나머지로 남겼습니다.',remainder:'원래 식에서 묶은 부분을 뺀 식을 나머지로 남겨 전체 값을 유지했습니다.',cancel:'0이 아닌 공통인수로 분자와 분모를 나누었습니다. 원래 식의 제외 조건은 유지합니다.',common:'각 분수의 분자와 분모에 같은 식을 곱해 분모를 맞추었습니다.',substitute:'같은 모양으로 반복되는 부분을 t로 바꾸고 정의를 기록했습니다.',restore:'t에 정의된 원래 식을 대입했습니다.',reorder:'덧셈의 교환법칙으로 항의 순서를 바꾸었습니다.'};
export function describeOperation(operation){return explanations[operation]||'직접 작성한 수식입니다. 이 줄과 앞줄의 동치 여부는 자동으로 확인하지 않았습니다.';}
