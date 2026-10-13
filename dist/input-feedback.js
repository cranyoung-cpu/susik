// Explain rejected input without changing the expression or the parser's rules.
export function inputFeedback(raw, failure){
 const source=String(raw),message=String(failure?.message||failure||'');
 if(!source.trim())return '';
 if(source.length>2000)return '수식은 2,000자 이내로 입력해 주세요. 긴 식은 보조 식으로 나누어 주세요.';
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
 }
 return /[가-힣]/.test(message)?message:'입력한 수식을 읽을 수 없습니다. 괄호 짝과 연산 기호를 확인해 주세요. 예: (x+1)/2.';
}
