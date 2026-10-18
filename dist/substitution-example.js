// Shared by the static lesson and the existing guided-example confirmation.
export const SUBSTITUTION_EXAMPLE={
 id:'substitution-positive-domain',group:'조건·치환 · 직접 확인',title:'조건을 유지하는 치환',value:'(x+1)^2 = 4',condition:'x는 실수, x > 0',
 goal:'t를 x+1로 정의하고, t의 범위를 확인하며 원래 x의 해를 구하세요.',guided:true,panelLabel:'조건·치환 직접 확인',
 hints:['t := x+1은 t를 x+1로 정의한다는 뜻입니다. 정의를 저장한 뒤 적용하면 t²=4가 됩니다.','x > 0과 t=x+1에서 t > 1을 얻습니다. 치환한 문자에도 이 범위를 유지하세요.'],
 confirmation:'t²=4 ⇔ (t−2)(t+2)=0이므로 t=2 또는 t=−2입니다. 두 값 중 t > 1을 만족하는 값을 골라 x=t−1로 돌아가세요.',
 hintNote:'조건·치환 보드에 정의를 저장하고, 치환 목록의 적용을 눌러 새 줄에 반영하세요. t의 범위는 원래 조건에서 구해 함께 기록합니다.',
 answerLabel:'풀이·정답 · 직접 확인',answers:['t > 1이므로 t=2만 남습니다. x=t−1=1입니다.','x=1은 원래 식과 x > 0을 모두 만족합니다. x=−3은 식은 만족하지만 주어진 범위를 벗어납니다.'],
 comparison:'인수분해로 가능한 모든 실수 t를 구했고, x=t−1로 되돌릴 수 있으므로 주어진 범위에서 해는 x=1뿐입니다.',
 answerNote:'풀이·정답을 펼쳐 직접 비교하는 예제입니다. 치환한 문자의 범위와 각 후보가 조건을 만족하는지 직접 확인하세요.'
};
