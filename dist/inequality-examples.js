// A guided reference example; it does not add a graded practice problem.
export const INEQUALITY_EXAMPLES=[{
 id:'inequality-negative-division',group:'부등식 · 직접 확인',title:'음수로 나누는 부등식',value:'-2x < 6',condition:'x는 실수',
 lesson:{title:'부호·0 확인과 조건 보드',path:'/learn/multiply-divide/#board-example',summary:'나누는 수의 부호와 0 여부를 기록하고, 음수로 나눌 때 방향을 확인하세요.'},
 goal:'−2x < 6에서 x만 남도록 정리해 보세요. x는 실수예요.',guided:true,panelLabel:'부등식 직접 확인',hintLabel:'힌트 1',finalHintLabel:'힌트 2 · 음수 나눗셈',hintNote:'',
 hints:['x의 계수 −2를 1로 만들려면 양변을 어떤 수로 나누면 될까요?'],
 confirmation:'양변을 −2로 나누면 x의 계수가 1이 됩니다. 음수로 나눌 때는 부등호의 방향을 반대로 바꿔야 합니다.',
 answerLabel:'풀이·정답 · 직접 확인',answers:['양변을 −2로 나누면 (−2x)/(−2) > 6/(−2)입니다.','정리하면 x > −3입니다.'],
 comparison:'음수 −2로 나누면 <가 >로 바뀝니다. x > −3은 −3보다 큰 값만 뜻하므로 −3은 해에 포함되지 않습니다. x=−3을 넣으면 6<6이 되어 성립하지 않습니다.',
 answerNote:'이 예제는 자동 채점하지 않습니다. 기존 양변 조작에서 나누기 → −2를 선택해 직접 확인해 보세요.',
 support:[
  '현재는 실수 다항식을 <, ≤, >, ≥ 중 하나로 연결한 부등식만 조작합니다. 양변에 같은 다항식을 더하거나 뺄 수 있습니다.',
  '곱하기·나누기는 0이 아닌 정수나 분수로 나타낼 수 있는 상수만 지원합니다. 0이나 문자가 든 식은 보류하며, 조건 메모로 부호를 추론하지 않습니다.',
  '파서가 숫자를 정확히 읽지 못하면 반올림하지 않고 보류합니다. 연쇄 부등식·함수·문자가 든 분모도 아직 지원하지 않습니다.'
 ]
}];
