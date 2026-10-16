// mathjs uses Number-valued constants; reject a literal if AST round-tripping would change it.
export function exactLiterals(parts){
 const canonical=raw=>{const [base,power='0']=raw.toLowerCase().split('e'),fraction=(base.split('.')[1]||'').length,digits=base.replace('.','').replace(/^0+/,'');if(!digits)return '0';const zeros=digits.match(/0*$/)[0].length;return `${zeros?digits.slice(0,-zeros):digits}:${BigInt(power)-BigInt(fraction)+BigInt(zeros)}`;};
 for(const part of parts){
  if(/\b0[xob][0-9a-f]/i.test(part))throw Error('수식의 숫자는 십진수나 분수로 입력하세요. 진법 접두어는 아직 지원하지 않습니다.');
  for(const [literal]of part.matchAll(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi))if(canonical(literal)!==canonical(String(Number(literal))))throw Error('이 숫자는 현재 수식 파서의 정밀도 범위를 벗어납니다. 값을 반올림하지 않고 조작을 보류합니다.');
 }
}
