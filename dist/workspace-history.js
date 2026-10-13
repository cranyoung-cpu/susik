// Keep original rows and numeric references intact when tidying the visible history.
export const visibleRowIndices=sheet=>sheet.rows.flatMap((row,index)=>row.archived===true?[]:[index]);
export function adjacentRowIndex(sheet,direction){
 for(let i=sheet.active+direction;i>=0&&i<sheet.rows.length;i+=direction)if(!sheet.rows[i].archived)return i;
 return -1;
}
export function rowRemovalInfo(book,sheet,index){
 if(!Number.isInteger(index)||!sheet.rows[index]||sheet.rows[index].archived)throw Error('삭제할 수식을 다시 선택하세요.');
 if(index===sheet.active)throw Error('현재 식은 삭제할 수 없습니다. 계속 사용할 다른 수식을 먼저 선택하세요.');
 return {children:sheet.rows.filter(r=>r.parent===index).length,auxiliary:sheet===book?(book.auxiliary||[]).filter(a=>a.sourceIndex===index).length:0};
}
