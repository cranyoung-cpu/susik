import test from 'node:test';
import assert from 'node:assert/strict';
import {quantifiedStatement,logicStatement,logicEditorDraft,LOGIC_TEMPLATES} from '../dist/learning-tools.js';
import {serializeBackup,parseBackup} from '../dist/workspace-backup.js';

const bindings=[{quantifier:'∀',variable:'x',domain:'R'},{quantifier:'∃',variable:'y',domain:'Z'},{quantifier:'∀',variable:'z',domain:'positive'}];
const source=()=>quantifiedStatement(bindings,'P(x, y) ⇒ (Q(y, z) ∧ z > 0)','P이면 Q이고 z는 양수입니다.','P, Q는 위 변수들에 관한 술어');
test('builder editing restores exact quantifier order, domains, predicate and unwrapped meaning',()=>{
 const statement=source(),before=structuredClone(statement),draft=logicEditorDraft(statement);
 assert.equal(draft.method,'quantified');assert.deepEqual(draft.bindings,bindings);assert.equal(draft.predicate,statement.predicate);assert.equal(draft.meaning,'P이면 Q이고 z는 양수입니다.');assert.equal(draft.parameters,'P, Q는 위 변수들에 관한 술어');
 assert.deepEqual(quantifiedStatement(draft.bindings,draft.predicate,draft.meaning,draft.parameters),statement);assert.deepEqual(statement,before);
 for(const domain of ['R','Z','Q','C','N','positive']){const s=quantifiedStatement([{quantifier:'∃',variable:'θ',domain}],'P(θ)','P가 성립합니다.');assert.equal(logicEditorDraft(s).bindings[0].domain,domain);}
});
test('legacy builder metadata is recovered only by exact generated text and survives backup v1',()=>{
 for(const parameters of ['', 'a ∈ ℝ; 나머지 기호: P는 술어']){
  const statement=quantifiedStatement(bindings,'P(x, y, z)','모든 조건을 만족합니다.',parameters);delete statement.predicateMeaning;delete statement.parameters;
  const book={rows:[{value:'x+1',logicStatements:[statement]}],active:0},text=serializeBackup(book),restored=parseBackup(text);assert.equal(JSON.parse(text).version,1);assert.deepEqual(restored,book);
  const draft=logicEditorDraft(restored.rows[0].logicStatements[0]);assert.equal(draft.method,'quantified');assert.equal(draft.parameters,parameters);assert.equal(draft.meaning,'모든 조건을 만족합니다.');
  const rebuilt=quantifiedStatement(draft.bindings,draft.predicate,draft.meaning,draft.parameters);for(const key of ['formula','domain','meaning'])assert.equal(rebuilt[key],statement[key]);
 }
});
test('direct templates and handwritten complex scopes are never parsed into builder controls',()=>{
 for(const statement of [...LOGIC_TEMPLATES,logicStatement('x, y ∈ ℝ','¬∀x ∈ ℝ (∃y ∈ ℝ (P(x, y))) ∨ Q','전칭 명제의 부정 또는 Q'),logicStatement('x ∈ ℝ','∀x ∈ ℝ (x² ≥ 0)','모든 실수 x의 제곱은 0 이상입니다.')]){
  assert.deepEqual(logicEditorDraft(statement),{method:'direct',parameters:statement.domain,predicate:statement.formula,meaning:statement.meaning});
 }
});
test('inconsistent or unsupported builder metadata falls back to exact source without repair',()=>{
 for(const mutate of [s=>s.formula='¬('+s.formula+')',s=>s.meaning+=' 다른 뜻',s=>s.domain+='; 추가 범위',s=>s.quantifiers.reverse(),s=>s.quantifiers[0].domain='custom',s=>s.quantifiers[0].domain='__proto__',s=>s.quantifiers[1].variable='x',s=>s.quantifiers.push({quantifier:'∀',variable:'a',domain:'R'}),s=>s.quantifiers=null,s=>s.predicateMeaning={},s=>s.parameters={},s=>s.predicate='다른 명제']){
  const statement=source();mutate(statement);const before=structuredClone(statement),draft=logicEditorDraft(statement);assert.equal(draft.method,'direct');assert.equal(draft.predicate,statement.formula);assert.equal(draft.parameters,statement.domain);assert.equal(draft.meaning,statement.meaning);assert.deepEqual(statement,before);
 }
});

test('generated meanings explain a claim without certifying even a false predicate',()=>{
 for(const quantifier of ['∀','∃']){const s=quantifiedStatement([{quantifier,variable:'x',domain:'R'}],'x² < 0','x의 제곱은 0보다 작습니다.');assert.equal(s.formula,`${quantifier}x ∈ ℝ (x² < 0)`);assert.equal(s.verification,'unverified');assert.match(s.meaning,/^다음을 주장하는 표기입니다:/);assert.doesNotMatch(s.meaning,/성립합니다|존재합니다/);assert.equal(s.predicateMeaning,'x의 제곱은 0보다 작습니다.');}
});
test('theta aliases only affect duplicate binding checks and never rewrite source notation',()=>{
 for(const variables of [['theta','θ'],['θ','theta'],['x','x']])assert.throws(()=>quantifiedStatement(variables.map(variable=>({quantifier:'∀',variable,domain:'R'})),'P(θ)','P입니다.'),/서로 다른.*theta와 θ/);
 for(const variable of ['theta','θ']){const s=quantifiedStatement([{quantifier:'∀',variable,domain:'R'}],'θ² ≥ 0','세타의 제곱은 0 이상입니다.');assert.equal(s.quantifiers[0].variable,variable);assert.equal(s.predicate,'θ² ≥ 0');assert.equal(s.formula,`∀${variable} ∈ ℝ (θ² ≥ 0)`);}
 assert.doesNotThrow(()=>quantifiedStatement([{quantifier:'∀',variable:'x',domain:'R'},{quantifier:'∃',variable:'X',domain:'R'}],'x = X','같습니다.'));
 const old={domain:'theta ∈ ℝ, θ ∈ ℝ',formula:'∀theta ∈ ℝ (∃θ ∈ ℝ (θ² = 2))',meaning:'이전에 저장한 뜻',verification:'unverified',quantifiers:[{quantifier:'∀',variable:'theta',domain:'R'},{quantifier:'∃',variable:'θ',domain:'R'}],predicate:'θ² = 2'};
 const before=structuredClone(old),draft=logicEditorDraft(old);assert.equal(draft.method,'direct');assert.equal(draft.predicate,old.formula);assert.deepEqual(old,before);
});
test('old generated meaning formats restore builder metadata without rewriting stored claims',()=>{
 for(const withMetadata of [false,true]){
  const s=quantifiedStatement([{quantifier:'∀',variable:'x',domain:'R'},{quantifier:'∃',variable:'y',domain:'Z'}],'y > x','y는 x보다 큽니다.','추가 기호 없음');s.meaning='모든 실수 x에 대해 다음이 성립합니다: 다음을 만족하는 정수 y가 적어도 하나 존재합니다: y는 x보다 큽니다.';if(!withMetadata){delete s.predicateMeaning;delete s.parameters;}
  const before=structuredClone(s),draft=logicEditorDraft(s);assert.equal(draft.method,'quantified');assert.equal(draft.meaning,'y는 x보다 큽니다.');assert.equal(draft.parameters,'추가 기호 없음');assert.deepEqual(s,before);assert.deepEqual(parseBackup(serializeBackup({rows:[{value:'x+1',logicStatements:[s]}],active:0})).rows[0].logicStatements[0],before);
 }
});
