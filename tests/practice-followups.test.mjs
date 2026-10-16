import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceFollowups,hasCurrentCorrectAnswer} from '../dist/practice-followups.js';
import {PRACTICE_CRITERIA_VERSION} from '../dist/learning-tools.js';
const row=(practiceId,status,extra={})=>({practiceId,practiceAnswer:'1',practiceFeedback:{status,criteriaVersion:PRACTICE_CRITERIA_VERSION},...extra});
const choices=(rows,id='power-1')=>practiceFollowups(rows,id).map(c=>[c.problem.id,c.kind,c.rowIndex]);

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
