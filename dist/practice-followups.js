import {PRACTICE_PROBLEMS,practiceNeedsReview} from './learning-tools.js';

export const hasCurrentCorrectAnswer=row=>Boolean(row?.practiceAnswer?.trim()&&row.practiceFeedback?.status==='correct'&&!practiceNeedsReview(row.practiceFeedback));

// Count problems, not rows or clicks. Reading and proficiency are not recorded.
export function practiceProgress(rows){
 const problems=PRACTICE_PROBLEMS.map(problem=>{
  const records=rows.filter(row=>row.practiceId===problem.id&&!row.archived);
  const checks=records.filter(row=>row.practiceAnswer?.trim()&&['correct','incorrect','unverified'].includes(row.practiceFeedback?.status));
  const correct=records.some(hasCurrentCorrectAnswer),last=checks.at(-1);
  const status=correct?'correct':last?(practiceNeedsReview(last.practiceFeedback)?'review':last.practiceFeedback.status):records.length?'unchecked':'new';
  return {id:problem.id,attempted:checks.length>0,correct,started:records.length>0,status};
 });
 const correct=problems.filter(p=>p.correct).length;
 return {total:problems.length,attempted:problems.filter(p=>p.attempted).length,correct,unfinished:problems.length-correct,unstarted:problems.filter(p=>!p.started).length,problems};
}

// Read only main-sheet records; this is a choice of exercises, not a mastery score.
export function practiceFollowups(rows,currentId){
 const current=PRACTICE_PROBLEMS.find(p=>p.id===currentId);if(!current)return [];
 const topic=PRACTICE_PROBLEMS.filter(p=>p.topic===current.topic),at=topic.findIndex(p=>p.id===currentId);
 const ordered=[...topic.slice(at+1),...topic.slice(0,at)],choices=[];
 for(const problem of ordered){
  const records=rows.flatMap((row,index)=>row.practiceId===problem.id&&!row.archived?[{row,index}]:[]);
  if(records.some(({row})=>hasCurrentCorrectAnswer(row)))continue;
  const wrong=records.findLast(({row})=>row.practiceAnswer?.trim()&&row.practiceFeedback?.status==='incorrect'&&!practiceNeedsReview(row.practiceFeedback));
  const record=wrong||records.at(-1);
  choices.push({problem,rowIndex:record?.index??null,kind:wrong?'incorrect':record?(practiceNeedsReview(record.row.practiceFeedback)?'review':'unfinished'):'new'});
 }
 return [choices.find(c=>c.kind!=='incorrect'),choices.find(c=>c.kind==='incorrect')].filter(Boolean);
}
