// Explain rejected input without changing the expression or the parser's rules.
export function inputFeedback(raw, failure){
 const source=String(raw),message=String(failure?.message||failure||'');
 if(!source.trim())return '';
 if(source.length>2000)return '수식은 2,000자 이내로 입력해 주세요. 긴 식은 보조 식으로 나누어 주세요.';
 if(message.startsWith('지원하지 않는 기호가 있습니다.')){
  const replacements={'＋':'+','－':'-','＊':'*','／':'/','＾':'^','＝':'='},symbol=/[＋－＊／＾＝√]/.exec(source);
  if(symbol)return symbol[0]==='√'?`${symbol.index+1}번째 글자의 √는 sqrt(식) 형태로 입력해 주세요. 예: sqrt(x+1). 수식 키패드의 √도 사용할 수 있습니다.`:`${symbol.index+1}번째 글자의 ${symbol[0]}를 입력용 ${replacements[symbol[0]]} 기호로 바꿔 주세요. 수식 키패드에서 선택할 수 있습니다.`;
 }
 // Keep domain, precision and unsupported-operation explanations intact.
 const syntax=/괄호|연산 기호|1~2,000자|좌변과 우변|Unexpected|Expected|SyntaxError/.test(message);
 if(syntax){
  const stack=[],pairs={'(':')','{':'}'};
  // LaTeX sizing commands can use asymmetric delimiters; keep their parser message.
  if(!/\\(?:left|right)|\\[()[\]{}]/.test(source)){
   for(let i=0;i<source.length;i++){
    const c=source[i];
    if(pairs[c])stack.push({char:c,at:i+1});
    else if(c===')'||c==='}'){
     const open=stack.pop();
     if(!open)return `${i+1}번째 글자의 ${c}에 맞는 여는 괄호가 없습니다. 괄호 짝을 확인해 주세요.`;
     if(pairs[open.char]!==c)return `${i+1}번째 글자의 ${c} 대신 ${pairs[open.char]}가 필요한지 확인해 주세요.`;
    }
   }
   if(stack.length){const open=stack.at(-1);return `${open.at}번째 글자의 ${open.char}가 닫히지 않았습니다. 닫는 ${pairs[open.char]}를 넣을 위치를 확인해 주세요.`;}
  }
  if(/\^\s*(?:\(\s*\)|\{\s*\})?\s*$/.test(source))return '지수가 비어 있습니다. 예: x^2 또는 x^(2+1).';
  if(/\/\s*$/.test(source))return '나눗셈 기호 뒤에 분모를 입력해 주세요. 예: (x+1)/2.';
  if(/[+*×÷−-]\s*$/.test(source))return '연산 기호 뒤에 숫자나 식을 입력해 주세요. 예: x+1.';
  if(/(?:<=|>=|[=<>≤≥])\s*$/.test(source))return '등호·부등호 오른쪽에도 식을 입력해 주세요. 예: x+1=3 또는 x+1≤3.';
  const left=/^\s*(<=|>=|[=<>≤≥])/.exec(source);
  if(left&&[...source.matchAll(/<=|>=|[=<>≤≥]/g)].length===1)return `${left[0].indexOf(left[1])+1}번째 글자의 ${left[1]} 왼쪽에도 식을 입력해 주세요. 예: x+1${left[1]}3.`;
  const consecutive=/([+*/^×÷−-])\s*([*/^×÷])/.exec(source);
  if(consecutive)return `${consecutive.index+consecutive[0].lastIndexOf(consecutive[2])+1}번째 글자의 ${consecutive[2]} 앞에 숫자나 식이 없습니다. 식을 넣거나 불필요한 연산 기호를 지워 주세요.`;
  const unfinished=/([+*/^×÷−-])\s*[)}]/.exec(source);
  if(unfinished)return `${unfinished.index+1}번째 글자의 ${unfinished[1]} 뒤에 숫자나 식을 입력해 주세요. 예: (x+1)/2.`;
 }
 if(syntax||message==='사칙연산·거듭제곱·지원 함수로 된 수식만 계산할 수 있습니다.'){
  const empty=/\b(sin|cos|tan|asin|acos|atan|sqrt|abs|ln|log|exp)\s*\(\s*\)/.exec(source);
  if(empty)return `${empty.index+empty[0].indexOf('(')+1}번째 글자부터 ${empty[1]}의 괄호 안이 비어 있습니다. 숫자나 식을 입력해 주세요. 예: ${empty[1]}(x+1).`;
 }
 if(message==='사칙연산·거듭제곱·지원 함수로 된 수식만 계산할 수 있습니다.')return `${message} 입력 도움말 · 전용 계산에서 지원 함수 이름과 문법을 확인해 주세요. 예: sqrt(x+1), log(x,2). 미적분·행렬·연립식은 해당 전용 입력을 사용하세요. 계산하지 않을 기호는 조건·치환 보드에서 기호 정의로 기록할 수 있습니다. 입력 원문은 그대로 남아 있습니다.`;
 return /[가-힣]/.test(message)?message:'입력한 수식을 읽을 수 없습니다. 괄호 짝과 연산 기호를 확인해 주세요. 예: (x+1)/2.';
}
