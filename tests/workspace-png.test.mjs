import test from 'node:test';
import assert from 'node:assert/strict';
import {pngSelection,pngMarkup,PNG_ROW_LIMIT} from '../dist/workspace-png.js';
const row={value:'(x^2-1)/(x-1)',title:'직접 입력',explanation:'분모 확인',condition:'x ≠ 1',conditions:['x ≠ 1','x > 0'],assumptions:['x는 실수'],excluded:['1'],bindings:{t:'x-1'},pendingCases:[{condition:'x = 1',equation:'원래 식',previousAssumptions:['PRIVATE_BRANCH_HISTORY']}],logicStatements:[{domain:'x ∈ ℝ',formula:'x > 0',meaning:'양수',secret:'PRIVATE_LOGIC_METADATA'}],note:'PRIVATE_NOTE <img src=x onerror=alert(1)>',practiceAnswer:'PRIVATE_ANSWER',practiceFeedback:{status:'correct',message:'PRIVATE_FEEDBACK'},origin:{value:'PRIVATE_ORIGIN'},parent:0};
const sheet=()=>({name:'보조 1',active:1,rows:[{value:'PRIVATE_OTHER_SOLUTION'},structuredClone(row),{value:'PRIVATE_HIDDEN',archived:true},{value:'x+1',title:'약분'}],auxiliary:[{rows:[{value:'PRIVATE_OTHER_SHEET'}]}]});
test('PNG selection whitelists only the selected visible rows and requested annotations',()=>{
 const s=sheet(),before=structuredClone(s),selection=pngSelection(s),text=JSON.stringify(selection);
 assert.equal(selection.sheet,'보조 1');assert.equal(selection.rows.length,1);assert.equal(selection.rows[0].number,2);assert.equal(selection.rows[0].manual,true);
 for(const secret of ['PRIVATE_OTHER','PRIVATE_HIDDEN','PRIVATE_NOTE','PRIVATE_ANSWER','PRIVATE_FEEDBACK','PRIVATE_ORIGIN','PRIVATE_BRANCH_HISTORY','PRIVATE_LOGIC_METADATA'])assert(!text.includes(secret),secret);
 assert.deepEqual(selection.rows[0].details.map(([label])=>label),['변형 이유','조건','가정','제외','치환','별도 경우','기호 기록 · 미검증']);assert.equal(selection.rows[0].details[1][1],'x ≠ 1 · x > 0');
 const bare=pngSelection(s,{context:false,reasons:false});assert.deepEqual(bare.rows[0].details,[]);const memo=pngSelection(s,{notes:true});assert(memo.rows[0].details.some(([label,text])=>label.includes('내 설명')&&text===row.note));assert.deepEqual(s,before);
});
test('PNG ranges skip hidden rows, reject excessive or reversed ranges and retain LaTeX display',()=>{
 const s=sheet(),selection=pngSelection(s,{from:1,to:3});assert.deepEqual(selection.rows.map(r=>r.number),[2,4]);
 for(const opts of [{from:-1},{from:3,to:1},{from:0,to:4},{from:'1'}, {from:2,to:2}])assert.throws(()=>pngSelection(s,opts));
 assert.throws(()=>pngSelection({active:0,rows:Array.from({length:PNG_ROW_LIMIT+1},()=>row)},{from:0,to:PNG_ROW_LIMIT}),/20줄/);
 assert.throws(()=>pngSelection({active:0,rows:[{value:'x',note:'큰 메모'.repeat(20000)}]},{notes:true}),/너무 큽니다/);
 s.rows[1].displayLatex='\\frac{x^2-1}{x-1}';assert.equal(pngSelection(s).rows[0].formula,s.rows[1].displayLatex);
});
test('PNG labels explicitly describe omitted context and notes and escape all user prose',()=>{
 const s=sheet();s.name='<script>sheet</script>';s.rows[1].title='<img src=x>';const selection=pngSelection(s,{context:false,notes:true,reasons:false}),html=pngMarkup(selection,()=>'<span>rendered math</span>');
 assert.match(html,/조건·치환 제외 · 내 설명 메모 포함 · 변형 이유 제외/);assert.match(pngMarkup(pngSelection(sheet()),()=>''),/동치 미확인/);assert.match(html,/수학적 검증 안 됨/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(!html.includes('PRIVATE_ANSWER'));assert.match(html,/rendered math/);
});
