import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceFollowups,hasCurrentCorrectAnswer,practiceProgress} from '../dist/practice-followups.js';
import {PRACTICE_CRITERIA_VERSION,PRACTICE_PROBLEMS} from '../dist/learning-tools.js';
const row=(practiceId,status,extra={})=>({practiceId,practiceAnswer:'1',practiceFeedback:{status,criteriaVersion:PRACTICE_CRITERIA_VERSION},...extra});
const choices=(rows,id='power-1')=>practiceFollowups(rows,id).map(c=>[c.problem.id,c.kind,c.rowIndex]);

test('progress reports absent records without inventing attempts or mastery',()=>{
 const progress=practiceProgress([{value:'x+1'},row('unknown','correct'),row('power-1','correct',{archived:true})]);
 assert.deepEqual([progress.total,progress.attempted,progress.correct,progress.unfinished,progress.unstarted],[17,0,0,17,17]);
 assert(progress.problems.every(p=>p.status==='new'));
});
test('progress counts distinct problems and separates empty, stale, unverified and correct records',()=>{
 const rows=[row('power-1','incorrect'),row('power-1','correct'),row('power-1','incorrect'),row('power-2','correct',{practiceFeedback:{status:'correct',criteriaVersion:'old'}}),row('power-3','unverified'),row('power-4','correct',{practiceAnswer:' '}),{practiceId:'roots-1',practiceAnswer:'1,7'},row('roots-2','unverified',{practiceAnswer:''}),row('factor-1','correct',{archived:true})],before=structuredClone(rows),p=practiceProgress(rows);
 assert.deepEqual([p.attempted,p.correct,p.unfinished,p.unstarted],[3,1,16,11]);
 assert.deepEqual(p.problems.filter(p=>p.started).map(p=>[p.id,p.status]),[['power-1','correct'],['power-2','review'],['power-3','unverified'],['power-4','unchecked'],['roots-1','unchecked'],['roots-2','unchecked']]);
 assert.deepEqual(rows,before);
});
test('progress follows current visible records and the same correct-answer rule as followups',()=>{
 const rows=PRACTICE_PROBLEMS.map(p=>row(p.id,'correct'));let progress=practiceProgress(rows);
 assert.deepEqual([progress.attempted,progress.correct,progress.unfinished],[17,17,0]);assert.deepEqual(practiceFollowups(rows,'power-1'),[]);
 rows.find(r=>r.practiceId==='power-2').archived=true;progress=practiceProgress(rows);
 assert.deepEqual([progress.attempted,progress.correct,progress.unfinished,progress.unstarted],[16,16,1,1]);assert.equal(practiceFollowups(rows,'power-1')[0].problem.id,'power-2');
});

test('followups offer at most one unfinished and one wrong exercise in cyclic topic order',()=>{
 const rows=[row('power-3','incorrect'),row('factor-2','incorrect'),row('power-4','unverified')],before=structuredClone(rows);
 assert.deepEqual(choices(rows),[['power-2','new',null],['power-3','incorrect',0]]);
 assert.deepEqual(choices(rows,'power-4'),[['power-1','new',null],['power-3','incorrect',0]]);
 assert.deepEqual(rows,before);assert.deepEqual(choices(rows,'unknown'),[]);
});
test('current correct answers suppress old wrong records, without treating stale or absent checks as completion',()=>{
 const rows=[row('power-2','incorrect'),row('power-2','correct'),row('power-3','correct',{practiceFeedback:{status:'correct',criteriaVersion:'old'}}),row('power-4','incorrect')];
 assert.deepEqual(choices(rows),[['power-3','review',2],['power-4','incorrect',3]]);
 rows[2]=row('power-3','correct');rows[3]=row('power-4','correct');assert.deepEqual(choices(rows),[]);
 for(const r of [undefined,{},row('power-2','correct',{practiceAnswer:''}),row('power-2','correct',{practiceFeedback:{status:'correct'}}),row('power-2','unverified')])assert.equal(hasCurrentCorrectAnswer(r),false);
});
test('hidden records do not supply completion or resume targets; unfinished rows are preserved as targets',()=>{
 const rows=[row('power-2','correct',{archived:true}),row('power-3','incorrect',{archived:true}),row('power-4','unverified')];
 assert.deepEqual(choices(rows),[['power-2','new',null]]);
 rows.push(row('power-2','unverified'),row('power-3','incorrect'));
 assert.deepEqual(choices(rows),[['power-2','unfinished',3],['power-3','incorrect',4]]);
 assert.deepEqual(choices([{practiceId:'power-2',practiceAnswer:''}]),[['power-2','unfinished',0]]);
});
