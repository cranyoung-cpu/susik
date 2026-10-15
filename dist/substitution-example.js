// Shared by the static lesson and the existing guided-example confirmation.
export const SUBSTITUTION_EXAMPLE={
 id:'substitution-positive-domain',group:'조건·치환 · 직접 확인',title:'조건을 유지하는 치환',value:'(x+1)^2 = 4',condition:'x는 실수, x > 0',
 goal:'t를 x+1로 정의하고, t의 범위를 확인하며 원래 x의 해를 구하세요.',guided:true,panelLabel:'조건·치환 직접 확인',
 hints:['t := x+1은 t를 x+1로 정의한다는 뜻입니다. 정의를 저장한 뒤 적용하면 t²=4가 됩니다.','x > 0과 t=x+1에서 t > 1을 얻습니다. 치환한 문자에도 이 범위를 유지하세요.'],
 confirmation:'t²=4 ⇔ (t−2)(t+2)=0이므로 t=2 또는 t=−2입니다. 두 값 중 t > 1을 만족하는 값을 골라 x=t−1로 돌아가세요.',
 hintNote:'조건·치환 보드에서 정의를 저장해도 현재 수식은 바뀌지 않습니다. 저장 후 치환 목록의 적용을 눌러야 새 줄에 반영됩니다. t의 범위는 직접 확인하고 기록하세요.',
 answerLabel:'풀이·정답 · 직접 확인',answers:['t > 1이므로 t=2만 남습니다. x=t−1=1입니다.','x=1은 원래 식과 x > 0을 모두 만족합니다. x=−3은 식은 만족하지만 주어진 범위를 벗어납니다.'],
 comparison:'인수분해로 가능한 모든 실수 t를 구했고, x=t−1로 되돌릴 수 있으므로 주어진 범위에서 해는 x=1뿐입니다.',
 answerNote:'이 예제는 자동 채점하지 않습니다. 조건 기록에서 문자 범위를 자동 추론하거나 해를 자동으로 제외하지 않습니다.'
};
