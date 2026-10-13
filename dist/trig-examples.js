// Guided examples are reference material, not inputs to the automatic answer grader.
const condition='θ ∈ ℝ · 각도는 도(°) 단위 · 일반해의 매개변수 k ∈ ℤ';
const example=(id,number,value,hints,answers,comparison,confirmation)=>({id,group:'삼각방정식 · 직접 확인',title:`삼각방정식 ${number}`,value,condition,goal:'주어진 조건에서 모든 θ를 구하고, 빠진 해와 주기를 직접 확인하세요.',guided:true,hints,answers,comparison,confirmation});
export const TRIG_EXAMPLES=[
 example('trig-sine-zero','①','2sin(theta)^2-sin(theta)=0',[
  'sin²θ는 (sinθ)²입니다. sin(2θ)와 구분하세요. sinθ를 공통인수로 묶어 볼 수 있습니다.',
  '선택 안내: a := sinθ를 조건·치환 보드에 기록한다면 −1 ≤ a ≤ 1도 조건으로 남기세요.',
 ],['θ = 180°k 또는 θ = 30° + 360°k 또는 θ = 150° + 360°k'],
 '각 식에서 k ∈ ℤ입니다. sinθ=0인 해를 빼지 않았는지, sinθ=1/2의 두 가지 각도를 모두 포함했는지 확인하세요.',
 'sinθ(2sinθ−1)=0에서는 sinθ=0 또는 sinθ=1/2로 경우를 나눕니다. sinθ로 나누면 0인 경우를 별도로 보존해야 합니다.'),
 example('trig-cosine-quadratic','②','2cos(theta)^2-cos(theta)-1=0',[
  '선택 안내: a := cosθ와 −1 ≤ a ≤ 1을 조건·치환 보드에 기록하면 2a²−a−1=0으로 치환할 수 있습니다.',
 ],['θ = 120°k','같은 해 집합: θ = 360°k 또는 θ = 120° + 360°k 또는 θ = 240° + 360°k'],
 '두 표기는 모두 올바른 일반해입니다. 120°k의 정수 k를 3의 배수·나머지 1·나머지 2로 나누면 두 번째 표기가 됩니다. 표현이 다르다는 이유로 오답 처리하지 않습니다.',
 '(2a+1)(a−1)=0에서 a=−1/2 또는 a=1입니다. 정의를 복원해 cosθ=−1/2 또는 cosθ=1로 돌아오세요.'),
 example('trig-sine-quadratic','③','2sin(theta)^2-3sin(theta)+1=0',[
  '선택 안내: a := sinθ와 −1 ≤ a ≤ 1을 기록하고 이차식을 인수분해해 보세요.',
 ],['θ = 30° + 360°k 또는 θ = 150° + 360°k 또는 θ = 90° + 360°k'],
 '30°+360°k와 90°+360°k만 쓰면 150°+360°k가 누락됩니다. 제시한 해가 대입된다는 확인과 모든 해를 찾았다는 주장은 구분하세요.',
 '(2a−1)(a−1)=0에서 a=1/2 또는 a=1입니다. sinθ=1/2에 해당하는 각도는 한 주기에 두 개입니다.'),
 example('trig-double-angle','④','2sin(2theta)-1=0',[
  '선택 안내: u := 2θ와 u ∈ ℝ을 조건·치환 보드에 기록하면 2sin(u)−1=0으로 바꿀 수 있습니다. u도 도(°) 단위입니다.',
  '다른 경로로 a := sinθ, b := cosθ를 선택해도 됩니다. −1 ≤ a,b ≤ 1과 a²+b²=1을 함께 기록하면 a²−4ab+b²=0을 원식과 연결할 수 있습니다.',
  'a(a−2b)+b(b−2a)는 합입니다. 곱이 0인 경우처럼 각 항을 각각 0으로 놓을 수 없습니다.'
 ],['θ = 15° + 180°k 또는 θ = 75° + 180°k'],
 'θ=u/2이므로 360°k도 180°k로 바뀝니다. sin²θ와 sin(2θ)를 혼동하지 말고, 원식의 모든 해를 보존했는지 직접 확인하세요.',
 'sin u=1/2에서 u=30°+360°k 또는 u=150°+360°k입니다. θ로 돌아올 때 각도와 주기를 모두 2로 나누세요.')
];
