import {PRACTICE_PROBLEMS,practiceNeedsReview} from './learning-tools.js';

export const hasCurrentCorrectAnswer=row=>Boolean(row?.practiceAnswer?.trim()&&row.practiceFeedback?.status==='correct'&&!practiceNeedsReview(row.practiceFeedback));

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
