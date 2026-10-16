import {PRACTICE_PROBLEMS} from '../dist/learning-tools.js';

const escapeHtml=text=>String(text).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]));
const practiceLink=id=>{
 const problem=PRACTICE_PROBLEMS.find(p=>p.id===id);
 if(!problem)throw Error(`Unknown practice in learning guide: ${id}`);
 return `<a href="/?practice=${encodeURIComponent(problem.id)}">${escapeHtml(problem.title)}</a>`;
};
const practiceGroups=[...new Set(PRACTICE_PROBLEMS.map(p=>p.topic))].map(topic=>`<p><strong>${escapeHtml(topic)}</strong> · ${PRACTICE_PROBLEMS.filter(p=>p.topic===topic).map(p=>practiceLink(p.id)).join(' / ')}</p>`).join('\n');

export const learningGuide={
 title:'개념 해설',
 description:`조건과 명제부터 로그 방정식까지 5개 해설의 권장 학습 순서를 안내합니다. 조건 확인·변형 이유·계산·검산을 익히고 기존 ${PRACTICE_PROBLEMS.length}개 연습으로 이어가세요.`,
 body:`<p>조건·기호와 식을 바꾸는 이유를 읽는 5개 해설입니다. 내 식은 작업실의 <strong>직접 수식 작성</strong>에서 쓰고, 준비된 식은 <strong>예제로 시작하기</strong>에서 골라 풀 수 있습니다.</p>
<p><strong class="learning-process">조건 확인 → 변형 이유 → 계산 → 원래 식 검산</strong><br>주어진 범위와 정의역을 적고, 적용할 법칙과 필요한 조건을 확인한 뒤 계산하세요. 방정식은 구한 해를 원래 식에 넣어 확인하고, 빠진 경우가 없는지도 변형 과정에서 살펴보세요.</p>
<h2>개념 해설 · 권장 읽기 순서</h2>
<ol>
<li><p><a href="/learn/quantifiers/">조건과 명제: 모든/어떤의 구분</a> — 양화사 ∀·∃의 범위와 부정의 뜻을 반례로 확인하고, 양화사 조립에서 직접 기록해 보세요.</p></li>
<li><p><a href="/learn/substitute/">조건과 치환</a> — 등식과 정의의 차이, 새 문자의 범위를 익히세요. 해설에서 원식과 조건을 확인한 뒤 예제를 직접 시작할 수 있습니다.</p></li>
<li><p><a href="/learn/multiply-divide/">양변에 곱하기·나누기</a> — 0인 경우와 부등호 방향을 확인하며 변형 이유를 적으세요. <a href="/learn/multiply-divide/#board-example">조건·치환 보드에 근거 남기기</a>도 따라 해 보세요. 이어서 연습: ${practiceLink('roots-1')}.</p></li>
<li><p><a href="/learn/square/">제곱과 제곱근</a> — 제곱근의 값과 방정식의 해를 구분하세요. <a href="/learn/square/#root-denominator">제곱근의 부호·분모 조건</a>을 확인하고, 제곱해서 얻은 후보는 원래 식에 넣어 검산하세요. 이어서 연습: ${practiceLink('roots-2')}.</p></li>
<li><p><a href="/learn/log-equation/">로그 방정식</a> — 로그의 정의에 따라 지수식으로 바꾸어 계산한 뒤, 원래 식과 정의역을 확인하세요. <a href="/learn/log-equation/#domain-check">두 로그를 합친 뒤 놓치기 쉬운 정의역</a>을 오답과 비교하세요. 이어서 연습: ${practiceLink('log-2')} / ${practiceLink('log-4')}.</p></li>
</ol>
<details><summary>답 확인 연습 · ${PRACTICE_PROBLEMS.length}문제 보기</summary>
<p>계산 조작부터 익히고 싶다면 ${practiceLink('expand-1')}을 먼저 해 보세요. 필요한 주제를 골라 같은 순서로 조건과 이유를 확인하며 풉니다.</p>
${practiceGroups}
</details>
<p>연습 링크를 열고 <strong>이 연습 시작</strong>을 눌러야 기존 기록 끝에 새 풀이를 추가합니다. 답 확인은 문제별 최종 답을 검사하며, 풀이 서술과 중간 논증은 직접 검토하세요.</p>`
};
