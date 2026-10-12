import {Q, C, normalize, parse, evaluate, equivalent} from './engine.js';

export function complex(value) {
  if(value instanceof C || value instanceof Q)return C.from(value);
  const raw=String(value);
  if(raw.length>120 || /[xt]/.test(raw.replace(/\\(?:frac|left|right|cdot|times|mathrm)/g,'')))throw Error('문자를 제외한 a+bi 꼴의 수를 입력해 주세요.');
  const v=evaluate(parse(raw));
  if(v.n.length!==1||v.d.length!==1)throw Error('a+bi 꼴의 수를 입력해 주세요.');
  return v.n[0].mul(v.d[0].inv());
}
export function scalarLatex(value) {
  const z=C.from(value),q=v=>v.d===1n?String(v.n):`\\frac{${v.n}}{${v.d}}`;
  if(z.im.zero)return q(z.re);
  const negative=z.im.n<0n,b=negative?z.im.neg():z.im,imag=(b.eq(new Q(1))?'':q(b))+'i';
  return z.re.zero?(negative?'-':'')+imag:q(z.re)+(negative?'-':'+')+imag;
}
export function rational(value) {
  const s = String(value).trim().replace(/−/g, '-');
  if (s.length > 32 || !/^[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+(?:\.\d+)?)?$/.test(s))
    throw Error('정수, 유한소수 또는 분수로 입력해 주세요. 예: 2/3');
  const decimal = x => {
    const [a, b = ''] = x.split('.');
    return new Q(BigInt(a + b), 10n ** BigInt(b.length));
  };
  const [a, b] = s.split('/');
  return b === undefined ? decimal(a) : decimal(a).mul(decimal(b).inv());
}
export function factorPair(value, first) {
  const n = complex(value), a = complex(first);
  if (a.zero) throw Error('첫 인수는 0이 아닌 수로 골라 주세요.');
  return [a, n.mul(a.inv())];
}
export function integerPairs(value, negative = false) {
  const z=complex(value);if(!z.im.zero)return [];
  const n = z.re, magnitude = n.n < 0n ? -n.n : n.n;
  if (n.d !== 1n || n.zero || magnitude > 100000000n) return [];
  const out = [];
  for (let a = 1n; a * a <= magnitude; a++) if (magnitude % a === 0n) {
    const signed = negative ? -a : a;
    out.push([new Q(signed), new Q(n.n / signed)]);
  }
  return out;
}
export function integerDivisors(value, negative = false) {
  const pairs = integerPairs(value);
  const values = new Set(pairs.flat().map(q => String(q.n < 0n ? -q.n : q.n)));
  return [...values].map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
    .map(n => new Q(negative ? -n : n));
}
export function multiples(value, count = 12) {
  const n = complex(value);
  return Array.from({length: Math.min(60, Math.max(0, count))}, (_, i) => n.mul(new Q(i + 1)));
}
export function expressionTargets(raw) {
  let source,ast;
  try { source=normalize(raw);ast=parse(source); } catch {return {source:'',targets:[]};}
  const targets=[];
  const hasVariable=n=>n.op==='var'||!!(n.a&&hasVariable(n.a))||!!(n.b&&hasVariable(n.b));
  function visit(n){
    if(!hasVariable(n)){
      try{const v=evaluate(n),value=v.n[0].mul(v.d[0].inv());targets.push({start:n.start,end:n.end,value,label:source.slice(n.start,n.end)});}catch{}
      return;
    }
    if(n.a)visit(n.a);if(n.b&&n.op!=='pow')visit(n.b);
  }
  visit(ast);
  // On simple polynomial terms the entire term is a tap target; only its
  // coefficient is replaced. The original sign remains outside that range.
  const terms = []; let start = 0, depth = 0;
  for (let i = 0; i <= source.length; i++) {
    const c = source[i];
    if (c === '(') depth++; if (c === ')') depth--;
    if (i === source.length || (i > start && !depth && /[+-]/.test(c) && !/[*/^+-]/.test(source[i - 1]))) {
      terms.push({start, end: i}); start = i;
    }
  }
  targets.forEach(t => {
    const term = terms.find(a => t.start >= a.start && t.end <= a.end);
    if (!term) return;
    const before = source.slice(term.start, t.start), after = source.slice(t.end, term.end);
    if (/^[+-]?$/.test(before) && /^(?:\*?[xt](?:\^\(?[+-]?\d+\)?)?)?$/.test(after)) {
      t.label = source.slice(term.start, term.end); t.termStart = term.start; t.termEnd = term.end;
    }
  });
  terms.forEach(term => {
    const label = source.slice(term.start, term.end);
    if (/^[+-]?[xt](?:\^\(?[+-]?\d+\)?)?$/.test(label)) {
      const start = term.start + (/^[+-]/.test(label) ? 1 : 0);
      targets.push({start, end: start, value: new C(1), label, termStart: term.start, termEnd: term.end});
    }
  });
  targets.sort((a,b) => a.start - b.start);
  return {source, targets};
}
export function splitExpression(raw, targetIndex, first) {
  const {source, targets} = expressionTargets(raw), target = targets[targetIndex];
  if (!target) throw Error('분해할 항이나 숫자를 다시 골라 주세요.');
  const [a, b] = factorPair(target.value, first);
  const wrap=z=>!z.im.zero||z.re.n<0n?`\\left(${scalarLatex(z)}\\right)`:scalarLatex(z);
  const replacement = `\\left(${wrap(a)}\\cdot ${wrap(b)}\\right)`;
  const result = source.slice(0, target.start) + replacement + source.slice(target.end);
  // Compare to the selected line, not the problem: this never repairs an error
  // in the student's work and does not reveal whether the line was correct.
  if (!equivalent(source, result, 'x')) throw Error('이 위치에서는 분해를 적용할 수 없습니다.');
  return result;
}
export function sumTarget(raw,targetIndex) {
  const {source,targets}=expressionTargets(raw),target=targets[targetIndex];
  if(!target)throw Error('나눌 항이나 숫자를 다시 골라 주세요.');
  const wholeTerm=target.termStart!==undefined,start=wholeTerm?target.termStart:target.start,end=target.termEnd??target.end;
  const outsideSign=source.slice(start,target.start),value=outsideSign==='-'?target.value.neg():target.value;
  return {source,target,start,end,wholeTerm,value,tail:wholeTerm?source.slice(target.end,end).replace(/^\*/,''):''};
}
export function sumTermLatex(value,tail='') {
  const z=C.from(value);
  if(z.im.zero){
    const negative=z.re.n<0n,magnitude=negative?z.neg():z;
    return (negative?'-':'')+(tail&&magnitude.re.eq(new Q(1))?'':scalarLatex(magnitude))+tail;
  }
  const coefficient=scalarLatex(z);
  return (!z.re.zero?`\\left(${coefficient}\\right)`:coefficient)+tail;
}
export function sumSplitDetails(raw,targetIndex,first) {
  const info=sumTarget(raw,targetIndex),{source,start,end,value,tail,wholeTerm}=info;
  const a=complex(first),b=value.add(a.neg());
  const firstTerm=sumTermLatex(a,tail),secondTerm=sumTermLatex(b,tail);
  const replacement=firstTerm+(secondTerm.startsWith('-')?'':'+')+secondTerm;
  // A top-level subtraction belongs to the selected term. Replace it together
  // with the coefficient, so entering -14 for -16x means -14x - 2x.
  const inserted=wholeTerm?(start>0&&!replacement.startsWith('-')?'+':'')+replacement:`\\left(${replacement}\\right)`;
  const result=source.slice(0,start)+inserted+source.slice(end);
  if(!equivalent(source,result,'x'))throw Error('이 위치에서는 항 나누기를 적용할 수 없습니다.');
  return {...info,first:a,second:b,selected:sumTermLatex(value,tail),replacement,result};
}
export function splitSumExpression(raw,targetIndex,first) {
  return sumSplitDetails(raw,targetIndex,first).result;
}
