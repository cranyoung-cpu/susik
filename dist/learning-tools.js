import {parse,evaluate,checkStep} from './engine.js';
import {CalculationError,calculationFailure} from './calculation-errors.js';

// Bump when answer rules, reference answers or accepted domains change, not for UI edits.
export const PRACTICE_CRITERIA_VERSION='2026-10-16.1';
export const practiceNeedsReview=feedback=>!!feedback&&feedback.criteriaVersion!==PRACTICE_CRITERIA_VERSION;

// Templates describe their domains explicitly. Custom statements are annotations,
// never assumptions fed into the algebra engine or certificates of a proof.
export const LOGIC_TEMPLATES=[
 {id:'real',title:'실수 변수',domain:'x ∈ ℝ',formula:'x ∈ ℝ',meaning:'현재 살펴보는 x는 실수입니다. 모든 실수에 관한 주장이라는 뜻은 아닙니다.'},
 {id:'forall',title:'전칭 · 모든 실수',domain:'x ∈ ℝ',formula:'∀x ∈ ℝ (x² ≥ 0)',meaning:'모든 실수 x에 대해 x의 제곱은 0 이상입니다.'},
 {id:'exists',title:'존재 · 제곱근',domain:'x ∈ ℝ',formula:'∃x ∈ ℝ (x² = 4)',meaning:'제곱이 4인 실수가 적어도 하나 존재합니다. 유일하다는 뜻은 아닙니다.'},
 {id:'order',title:'전칭 뒤 존재',domain:'x, y ∈ ℝ',formula:'∀x ∈ ℝ (∃y ∈ ℝ (y > x))',meaning:'어떤 실수 x를 주어도 그보다 큰 실수 y가 있습니다. y는 x에 따라 달라질 수 있습니다.'},
 {id:'factor',title:'정수 인수의 정의',domain:'f, g, q ∈ ℤ',formula:'Factor(g, f) :⇔ ∃q ∈ ℤ (f = gq)',meaning:'정수 f, g에 대해 g가 f의 인수라는 것은 f = gq인 정수 q가 존재한다는 뜻입니다.'},
 {id:'log',title:'로그의 정의',domain:'a ∈ (0, ∞) ∖ {1}, x ∈ (0, ∞), y ∈ ℝ',formula:'∀a ∈ (0, ∞) ∖ {1} (∀x ∈ (0, ∞) (∀y ∈ ℝ (logₐ(x) = y ⇔ aʸ = x)))',meaning:'밑 a가 양수이고 1이 아니며 x가 양수일 때, 로그값이 y라는 것은 a의 y제곱이 x라는 것과 동치입니다.'}
];
export function logicStatement(domain,formula,meaning){
 const fields=[domain,formula,meaning].map(v=>String(v||'').trim());
 if(fields.some(v=>!v))throw Error('정의역, 기호 표기, 자연어 뜻을 모두 적어 주세요.');
 if(fields.some(v=>v.length>1000))throw Error('각 항목은 1,000자 이내로 적어 주세요.');
 return {domain:fields[0],formula:fields[1],meaning:fields[2],verification:'unverified'};
}
const problem=(id,topic,title,value,prompt,answer,kind='scalar',condition=kind==='scalar'?'실수 범위에서 계산합니다.':'x ∈ ℝ · x는 실수',options={})=>({id,topic,title,value,prompt,answer,kind,condition,...options});
export const PRACTICE_PROBLEMS=[
 problem('factor-1','인수분해','두 일차식으로 묶기','x^2-2x-3','실수 계수 일차식들의 곱으로 인수분해하세요.','(x-3)(x+1)','factor'),
 problem('factor-2','인수분해','항 나누어 묶기','2x^2-16x+14','상수와 실수 계수 일차식들의 곱으로 인수분해하세요.','2(x-1)(x-7)','factor'),
 problem('factor-3','인수분해','완전제곱 인수','x^2+12x+36','일차식의 곱 또는 그 거듭제곱으로 인수분해하세요.','(x+6)^2','factor'),
 problem('expand-1','전개','분배법칙','(x+2)(x-3)','괄호를 전개하고 동류항을 정리하세요.','x^2-x-6','expand'),
 problem('expand-2','전개','합의 제곱','(2x-1)^2','괄호를 전개하고 동류항을 정리하세요.','4x^2-4x+1','expand'),
 problem('power-1','지수','같은 밑의 곱','2^3*2^4','연산을 끝내고 정수 하나로 답하세요.','128','scalar','실수 범위에서 계산합니다.',{answerForm:'integer'}),
 problem('power-2','지수','음의 정수 지수','3^(-2)','값을 정수 분자와 0이 아닌 정수 분모의 분수로 나타내세요.','1/9','scalar','3 ≠ 0 · 음의 정수 지수는 0이 아닌 밑의 역수로 계산합니다.',{answerForm:'fraction'}),
 problem('power-3','지수','거듭제곱의 거듭제곱','(2^3)^2','연산을 끝내고 정수 하나로 답하세요.','64','scalar','실수 범위에서 계산합니다.',{answerForm:'integer'}),
 problem('log-1','로그','로그값','log(8,2)','밑이 2인 8의 로그값을 구하세요.','3','scalar','밑 2 > 0, 2 ≠ 1, 진수 8 > 0 · 실수 로그의 값입니다.'),
 problem('log-2','로그','지수식으로 바꾸기','log(x-1,2)=3','주어진 정의역에서 모든 x를 구하세요.',['9'],'roots','x ∈ ℝ, x > 1 · 진수 x−1 > 0, 밑 2 > 0, 2 ≠ 1',{domainMinimum:'1'}),
 problem('log-3','로그','자연로그 방정식','ln(x)=0','주어진 정의역에서 모든 x를 구하세요.',['1'],'roots','x ∈ ℝ, x > 0 · 진수 x > 0, 자연로그의 밑 e > 0, e ≠ 1',{domainMinimum:'0'}),
 problem('roots-1','방정식','모든 근 찾기','2x^2-16x+14=0','실수 해를 빠짐없이 적으세요. 여러 값은 쉼표로 구분합니다.',['1','7'],'roots'),
 problem('roots-2','방정식','중근','(x+3)^2=0','모든 실수 해를 적으세요. 같은 값은 한 번만 쓰면 됩니다.',['-3'],'roots')
];
export function practiceAnswerGuide(p){
 if(p.answerForm==='integer')return '정수 하나를 입력하세요. 부호·괄호는 허용하며, 남은 연산은 계산 미완료로 표시합니다.';
 if(p.answerForm==='fraction')return '정수 분자/0이 아닌 정수 분모로 입력하세요. 값이 같은 분수도 허용합니다.';
 if(p.kind==='factor')return 'x를 사용한 실수 계수 일차식의 곱·거듭제곱을 확인합니다.';
 if(p.kind==='expand')return 'x를 사용해 괄호를 전개하고 동류항을 정리한 다항식을 확인합니다.';
 const forms='숫자·분수·사칙연산·정수 지수(−12~12)';
 return p.kind==='roots'?`모든 해를 쉼표로 구분하세요. 각 값은 ${forms}로 확인합니다.`:`${forms}로 나타낸 정확한 값을 확인합니다.`;
}
function constant(raw){const ast=parse(raw);function visit(n){if(n.op==='var'||n.op==='imag')throw new CalculationError('unsupported','답의 값에는 문자나 허수 단위를 넣지 마세요.');if(n.a)visit(n.a);if(n.b)visit(n.b);}visit(ast);const v=evaluate(ast);return v.n[0].re.mul(v.d[0].re.inv());}
class AnswerFormError extends Error{}
function factored(ast){let degree=0;function walk(n){if(n.op==='mul'){walk(n.a);walk(n.b);return;}if(n.op==='neg'){walk(n.a);return;}if(n.op==='pow'&&n.b.op==='num'&&n.b.v.d===1n&&n.b.v.n>0n&&n.b.v.n<=12n){for(let i=0;i<Number(n.b.v.n);i++)walk(n.a);return;}const v=evaluate(n);if(v.d.length!==1||v.n.length>2||v.n.some(c=>!c.im.zero))throw new AnswerFormError('실수 계수 일차식들의 곱으로 더 묶어 주세요.');degree+=v.n.length-1;}walk(ast);return degree>=2;}
function expanded(ast){const degrees=new Set();function walk(n){if(n.op==='add'||n.op==='sub'){walk(n.a);walk(n.b);return;}if(n.op==='neg'){walk(n.a);return;}function noSum(t){if(t.op==='add'||t.op==='sub')throw new AnswerFormError('괄호 안의 합을 먼저 전개하세요.');if(t.a)noSum(t.a);if(t.b)noSum(t.b);}noSum(n);const v=evaluate(n),nz=v.n.flatMap((c,i)=>c.zero?[]:[i]);if(v.d.length!==1||nz.length>1)throw new AnswerFormError('다항식의 항들로 전개하세요.');if(nz.length){if(degrees.has(nz[0]))throw new AnswerFormError('같은 차수의 동류항을 정리하세요.');degrees.add(nz[0]);}}walk(ast);return true;}
function fractionForm(ast){if(ast.op==='neg')return fractionForm(ast.a);const integer=n=>n.op==='num'?n.v.d===1n:n.op==='neg'&&integer(n.a);return ast.op==='div'&&integer(ast.a)&&integer(ast.b);}
function integerForm(ast){return ast.op==='num'?ast.v.d===1n:ast.op==='neg'&&integerForm(ast.a);}
export function checkPractice(p,answer){return {...judgePractice(p,answer),criteriaVersion:PRACTICE_CRITERIA_VERSION};}
function judgePractice(p,answer){
 try{
  if(!p||!['roots','scalar','factor','expand'].includes(p.kind))throw Error('Missing practice definition');
  if(!String(answer).trim())return {status:'unverified',reason:'empty',message:'답을 먼저 입력하세요.'};
  let ok=false;
  if(p.kind==='roots'){
   const values=String(answer).replace(/^\s*x\s*=\s*/,'').replace(/^\s*\{([\s\S]*)\}\s*$/,'$1').split(/[,，]/).map(v=>v.trim());
   if(values.length>12)throw new CalculationError('unsupported','해는 12개 이하로 입력하세요.');
   const unique=[];for(const raw of values){const v=constant(raw);if(!unique.some(u=>u.eq(v)))unique.push(v);}
   if(p.domainMinimum!==undefined){const min=constant(p.domainMinimum);if(unique.some(v=>v.n*min.d<=min.n*v.d))return {status:'incorrect',message:`원래 정의역 x > ${p.domainMinimum} 밖의 값이 있습니다. 로그의 진수가 양수인지 먼저 확인하세요.`};}
   const expected=p.answer.map(constant);
   if(unique.some(v=>!expected.some(a=>v.eq(a))))return {status:'incorrect',message:'원래 방정식의 해가 아닌 값이 포함되어 있습니다. 각 값을 원래 식에 대입해 확인하세요.'};
   if(unique.length!==expected.length)return {status:'incorrect',message:'입력한 값은 해이지만 다른 해가 빠져 있습니다. 인수를 0으로 놓는 경우를 모두 확인하고, 같은 해는 한 번만 적으세요.'};
   ok=true;
  }else if(p.kind==='scalar'){ok=constant(answer).eq(constant(p.answer));if(ok&&p.answerForm==='integer'&&!integerForm(parse(answer)))return {status:'unverified',reason:'unfinished',message:'값은 같습니다. 계산 미완료: 남은 연산을 끝내고 정수 하나로 적어 주세요.'};if(ok&&p.answerForm==='fraction'&&!fractionForm(parse(answer)))throw new AnswerFormError('정수 분자와 0이 아닌 정수 분모의 분수로 적어 주세요.');}
  else {const check=checkStep(answer,{expression:p.answer,excluded:[]});if(!check.ok)return {status:check.status==='different'?'incorrect':'unverified',reason:check.status,message:check.message};const ast=parse(answer);ok=p.kind==='factor'?factored(ast):expanded(ast);}
  return {status:ok?'correct':'incorrect',message:ok?'최종 답이 문제의 값·형식 조건과 일치합니다. 풀이 서술과 중간 논증은 검증하지 않았습니다.':'최종 답이 맞지 않거나 해가 빠져 있습니다. 조건과 계산을 다시 확인하세요.'};
 }catch(e){if(e instanceof AnswerFormError)return {status:'incorrect',reason:'form',message:'값은 같지만 문제에서 요구한 답 형식이 아닙니다. '+e.message};return {status:'unverified',...calculationFailure(e)};}
}

export const LOGIC_DOMAINS={R:['ℝ','실수'],Z:['ℤ','정수'],Q:['ℚ','유리수'],C:['ℂ','복소수'],N:['ℕ₀','0 이상의 정수'],positive:['(0, ∞)','양의 실수']};
function quantifiedMeaning(bindings,meaning,legacy=false){
 let natural=String(meaning).trim();
 for(const b of [...bindings].reverse()){
  const domain=LOGIC_DOMAINS[b.domain][1];
  natural=b.quantifier==='∀'?`모든 ${domain} ${b.variable}에 대해${legacy?' 다음이 성립합니다':''}: ${natural}`:`다음을 만족하는 ${domain} ${b.variable}가 적어도 하나 ${legacy?'존재합니다':'존재한다'}: ${natural}`;
 }
 return legacy?natural:`다음을 주장하는 표기입니다: ${natural}`;
}
export function quantifiedStatement(bindings,predicate,meaning,parameters=''){
 const selected=bindings.filter(b=>b.quantifier);if(!selected.length||selected.length>3)throw Error('양화사를 1~3개 선택하세요.');
 const names=new Set();for(const b of selected){if(!['∀','∃'].includes(b.quantifier)||!Object.hasOwn(LOGIC_DOMAINS,b.domain))throw Error('양화사와 정의역을 선택하세요.');if(!/^(?:[a-zA-Z]|theta|θ)$/.test(b.variable))throw Error('변수는 서로 다른 한 글자 또는 theta로 적어 주세요.');const name=b.variable==='theta'?'θ':b.variable;if(names.has(name))throw Error('결속 변수는 서로 다른 이름으로 적어 주세요. theta와 θ는 같은 변수 표기입니다.');names.add(name);}
 if(!String(predicate).trim())throw Error('양화 범위 안의 명제를 적어 주세요.');
 let formula=predicate.trim();
 for(const b of [...selected].reverse())formula=`${b.quantifier}${b.variable} ∈ ${LOGIC_DOMAINS[b.domain][0]} (${formula})`;
 if(!String(meaning).trim())throw Error('명제의 자연어 뜻을 적어 주세요.');
 const result=logicStatement(selected.map(b=>`${b.variable} ∈ ${LOGIC_DOMAINS[b.domain][0]}`).join(', ')+(parameters.trim()?`; 나머지 기호: ${parameters.trim()}`:''),formula,quantifiedMeaning(selected,meaning));
 return {...result,quantifiers:selected.map(b=>({...b})),predicate:predicate.trim(),predicateMeaning:meaning.trim(),parameters:parameters.trim()};
}
// Restore only known builder metadata whose regenerated text matches verbatim.
// Legacy builder records omitted the unwrapped meaning and extra parameters;
// recover only their exact generated prefixes, never parse a handwritten formula.
export function logicEditorDraft(statement){
 const direct={method:'direct',parameters:statement?.domain||'',predicate:statement?.formula||'',meaning:statement?.meaning||''};
 try{
  if(!Array.isArray(statement.quantifiers)||!statement.quantifiers.length||statement.quantifiers.length>3||typeof statement.predicate!=='string')return direct;
  const bindings=statement.quantifiers.map(({quantifier,variable,domain})=>({quantifier,variable,domain}));
  if(bindings.some(b=>!['∀','∃'].includes(b.quantifier)||!Object.hasOwn(LOGIC_DOMAINS,b.domain)))return direct;
  const probe=quantifiedStatement(bindings,statement.predicate,'__predicate_meaning__');
  let parameters=statement.parameters,meaning=statement.predicateMeaning;
  if(parameters===undefined){const prefix=probe.domain+'; 나머지 기호: ';if(statement.domain===probe.domain)parameters='';else if(statement.domain.startsWith(prefix))parameters=statement.domain.slice(prefix.length);else return direct;}
  if(meaning===undefined){const prefixes=[probe.meaning,quantifiedMeaning(bindings,'__predicate_meaning__',true)].map(text=>text.slice(0,-'__predicate_meaning__'.length)),prefix=prefixes.find(text=>statement.meaning.startsWith(text));if(!prefix)return direct;meaning=statement.meaning.slice(prefix.length);}
  if(typeof parameters!=='string'||typeof meaning!=='string')return direct;
  const rebuilt=quantifiedStatement(bindings,statement.predicate,meaning,parameters);
  if(['domain','formula'].some(key=>rebuilt[key]!==statement[key])||![rebuilt.meaning,quantifiedMeaning(bindings,meaning,true)].includes(statement.meaning))return direct;
  return {method:'quantified',bindings,predicate:statement.predicate,meaning,parameters};
 }catch{return direct;}
}
