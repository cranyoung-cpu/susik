# Susik · 수식연습실

항을 터치해 수식을 바꾸고, 변형 이유를 한 줄씩 남기는 학습용 수식 작업실입니다. 본식 옆에 여러 보조 식을 두고 계산할 수 있습니다. 브라우저에서 실행하는 정적 웹앱이며, 수식을 풀이 서버로 전송하지 않습니다.

## 실행

Node.js 20 이상과 npm이 필요합니다. 개발·검증 환경은 Node.js 24입니다.

```sh
npm ci
npm test
npm run build
npm start
```

`http://localhost:8080`을 엽니다. `dist/`가 정적 사이트 배포 폴더입니다. 런타임 외부 CDN, API 키, 데이터베이스가 필요하지 않습니다. 소스 변경 후 `npm run build`로 해시 번들을 다시 생성하세요.

공개 서비스 주소는 `https://susik.app`입니다. 이 저장소는 외부 호스팅 전용이며 기존 Sites 프로젝트 설정이나 자격 증명을 포함하지 않습니다.

## Cloudflare Pages 배포

Cloudflare의 **Workers & Pages → Create application → Pages → Connect to Git**에서 `cranyoung-cpu/susik`을 연결합니다.

| 설정 | 값 |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 저장소 루트(비워 두기) |
| Node.js | `.node-version`의 `24` 사용 |

첫 배포 후 **Custom domains → Set up a domain**에서 `susik.app`을 연결합니다. 도메인의 DNS 영역과 Pages 프로젝트는 같은 Cloudflare 계정에 두세요. GitHub 저장소 연결과 도메인 등록은 Cloudflare에서 한 번 설정해야 합니다. 이후 `main`에 올리는 변경은 자동 배포됩니다.

빌드는 `https://susik.app` 기준 canonical·sitemap을 생성합니다. `main`은 검색 수집을 허용하고, Cloudflare의 다른 브랜치는 `noindex,nofollow`와 robots 차단을 적용합니다. 기존 도메인의 브라우저 저장 기록은 새 도메인으로 자동 이전되지 않습니다.


## 사용 흐름

1. 하단 **수식 작성**에서 문자·지원 LaTeX를 입력하거나 예제를 고릅니다.
2. 전체 식을 누르면 **양변조작**, 항이나 괄호를 누르면 **항 변형** 도구가 열립니다.
3. **＋ 보조 식**으로 별도의 계산을 시작합니다. 본식·보조 식은 각자 기록과 현재 줄을 유지합니다.
4. 보조 식의 **결과 대입**은 등식 또는 계산 전후의 관계로 본식의 같은 부분을 대입합니다. 미리보기를 확인한 뒤 적용합니다. 직접 쓴 보조 식의 타당성이나 최종 해 전체를 자동 증명하지는 않습니다.
5. 입력 화면의 **행렬 / 미적분 / 연립식** 탭으로 전용 입력을 엽니다. 계산 과정은 보조 식으로 기록됩니다. 행렬·연립식은 여러 줄 붙여넣기도 가능합니다.
6. **복사**로 현재 수식의 문자·LaTeX 또는 본식과 보조 식 전체의 설명을 내보냅니다.

## 실제 지원 범위

| 분야 | 지원 | 범위·제한 |
|---|---|---|
| 수식 입력 | 다항식, 분수, 거듭제곱, sqrt/abs, 삼각·역삼각함수, ln/log/exp, e/π/i, 등식 | 2,000자·AST 220노드 이내. 모든 LaTeX 명령을 계산 문법으로 지원하지는 않음 |
| 항 변형 | 합·곱·거듭제곱 분해, 공통인수, 전개, 완전제곱, 나머지 남겨 묶기, 약분·통분 | 정확한 유리수·복소수 기초대수 범위. 규칙별로 지원 문자·차수 제한이 다름 |
| 방정식 | 양변 사칙연산, 이항, 조건과 0인 경우 보관 | 임의 방정식의 모든 해를 자동 판정하지 않음 |
| 지수·로그 | 법칙, 밑 바꾸기, 로그↔지수 방정식 변환 | 실수 로그 조건 유지. `log(x)`는 상용로그, `ln(x)`는 자연로그, `log(x,2)`는 밑 2 |
| 행렬 | 합·차·곱, 전치, 행렬식, 역행렬, 기약 행 사다리꼴과 행 연산 과정 | 1~4행·열. 유리수 실수부·허수부의 상수. 문자 성분·고유값·행렬 기호식은 미지원 |
| 일차 연립식 | 가우스–조르당 소거, 유일해·해 없음·무수히 많은 해, 자유변수 | 미지수 2~4개, 식 2~4개, 유리수 계수. 비선형 연립식은 미지원 |
| 미분 | 1~3차, 선택 변수에 대한 편미분, 곱·몫·연쇄법칙, 기본 함수 | 실수 함수, 삼각함수는 라디안. 조건을 기록하며 특이점의 별도 극한 판정은 하지 않음 |
| 적분 | 합·상수배·거듭제곱, 일차식 안쪽의 sin/cos/exp/ln/제곱근, 역수, 양수 상수 밑 지수함수 | 지원 기본형만 기호 적분. 부정적분 상수 보관. 유한 정적분의 끝값 차 계산. 일반 치환·부분적분·이상적분·수치적분은 미지원 |

행렬이나 적분 기호를 **표시할 수 있는 것**과 임의 식을 **계산·변형할 수 있는 것**은 다릅니다. 지원하지 않는 계산은 결과를 만들어 내지 않고 범위를 안내합니다. 부등식·범위는 상단 조건에 기록합니다. 조건이 기존 조건에서 따라오는지를 일반적으로 자동 증명하지 않습니다.

보조 식의 행렬·미적분 결과는 본식과 동치인 식으로 취급하지 않습니다. 연립식의 `x = 값` 같은 결과는 본식에 대입할 수 있으며, 행렬은 입력 고치기로 계속 계산합니다.

## 저장과 기록

- `susik-lab.workspace.v1`에 본식, 최대 20개 보조 식, 각 기록의 조건·치환·계산 입력을 저장합니다.
- 각 식의 기록은 최대 300줄이며 한 번에 24줄을 표시합니다. 브라우저 저장 공간이 부족하면 오류를 표시합니다.
- **되돌리기**는 최근 작업을 취소하고, **원상복귀**는 시작 식·조건·치환을 새 줄로 복원합니다. 기존 기록은 유지합니다.
- 다른 기기로 자동 동기화하지 않습니다. 브라우저 데이터를 지우면 기록도 지워집니다.
- 이전 버전의 composer/practice 저장 키는 삭제하지 않고 가능한 기록을 가져옵니다.
- 현재 UI에서는 사진 OCR, 광고, 분석 추적, 계정·채점 기능을 실행하지 않습니다.

## 코드 구조

| 경로 | 역할 |
|---|---|
| `dist/workspace-app.js` | 본식·보조 식 상태, 기록, 네비게이션, 입력과 작업 흐름 |
| `dist/direct-editor.js` | 항·괄호 터치 선택, 변형 미리보기, 수식 표시 |
| `dist/advanced-input.js` | 행렬 칸, 미적분 변수·구간, 연립식 행 입력 |
| `dist/matrix-tools.js` | 정확한 행렬 연산과 일차 연립식 소거 과정 |
| `dist/calculus-tools.js` | 제한된 기호 미분·적분 규칙과 조건 검사 |
| `dist/auxiliary-tools.js` | 보조 식 생성과 AST 단위 결과 대입 |
| `dist/scalars.js`, `dist/engine.js` | BigInt 유리수·복소수 및 기초대수 동치 검사 |
| `dist/equation-tools.js`, `dist/exponent-log.js` | 양변조작, 경우 분리, 지수·로그 법칙 |
| `dist/substitutions.js`, `dist/workspace-origin.js` | 여러 치환과 원상복귀 |
| `src/math-runtime.js` | 계산용 AST 파서만 포함한 mathjs 번들 |
| `src/browser-entry.js`, `scripts/build.mjs` | 앱 진입점과 해시 번들·정적 페이지 생성 |
| `tests/` | 정확한 계산, 지원 밖 입력, 기록·키패드·대입의 DOM 회귀 검사 |

`dist/`의 개별 JS/CSS는 편집 가능한 소스이며 `dist/assets/`는 생성된 번들입니다. 명시적으로 허용한 AST와 자체 규칙을 방문하며, 사용자 입력에 JavaScript `eval()`을 사용하지 않습니다. 수치 샘플의 일치를 일반 동치 증명으로 사용하지 않습니다.

## 검증과 UI 참고

자동 검증은 Node 테스트와 LinkeDOM 상호작용 검사, MathLive SSR 수식 렌더링 검사로 구성됩니다. 실제 휴대폰 브라우저의 배치·터치·시스템 키보드 동작은 별도 확인이 필요합니다.

입력 설계는 다음 공식 문서를 참고했습니다. 행렬은 행·열 크기와 칸 입력, 미적분은 식·변수·구간 분리, 입력칸은 하나의 공통 키패드를 사용합니다.

- [Desmos Matrix Calculator](https://help.desmos.com/hc/en-us/articles/4404851938445-Matrix-Calculator)
- [GeoGebra Integral](https://geogebra.github.io/docs/manual/en/commands/Integral/)
- [GeoGebra Solve](https://geogebra.github.io/docs/manual/en/commands/Solve/)
- [MathLive Virtual Keyboard](https://mathlive.io/mathfield/guides/virtual-keyboard/)

서드파티 배포물의 라이선스는 `dist/vendor/`와 생성 번들의 `LEGAL.txt`에 보관합니다. 프로젝트 자체의 공개 라이선스는 아직 정하지 않았습니다. 이전 구현 기록은 [docs/earlier-versions.md](docs/earlier-versions.md)에 있으며, 현재 지원 범위는 이 README를 기준으로 합니다.
