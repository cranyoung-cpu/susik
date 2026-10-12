# 수식연습실

직접 쓰는 풀이 노트와 기초대수 6단원 연습. 첫 버전은 로그인·서버 저장·광고 요청 없이 브라우저에 기록을 저장한다.

## 개발

- `node scripts/build.mjs`: 개념 노트 6개, 소개·개인정보·이용 안내 페이지와 정적 호스팅 설정 생성
- `node --test tests/*.test.mjs`: 정확한 유리수 계수 판정, 문제·해설 정합성, 분모 조건, 입력 처리 검사
- `dist/engine.js`: 검증 가능한 제한된 다항식·분수식 검사기. 임의 코드 실행과 표본값만으로 동치 판정하는 방식은 쓰지 않는다.
- `dist/app.js`: 풀이 입력, 줄 복사, 단계 검사, 세트·복습·저장
- `dist/number-tools.js`: 정확한 복소수 인수쌍·약수·배수, 항/계수 선택, 원래 식과 동치임을 확인한 분해
- `dist/number-panel.js`: 항 클릭 → 인수 선택 → 미리보기 → 명시적 분해 적용. 배수와 독립 숫자 조회는 메모로 저장.
- `dist/vendor/`: MathLive 0.111.1과 폰트, 라이선스. 실행 시 외부 CDN에 의존하지 않는다.

## 학습 범위

인수분해, 전개, 약분하여 다항식이 되는 분수식, 양의 정수 결과 지수법칙, 이차항 계수 1의 완전제곱, 지정된 일차식 치환. 식의 값을 유지하는지와 요청한 최종 형태인지 따로 확인한다. 기초 난도와 표준 난도는 계수 범위를 달리한다. 인수분해의 최종 일차 인수는 실수부·허수부가 유리수인 복소수 계수까지 인정한다.

수식 한 줄은 600자, 최대 30줄. 알려진 제외점으로 안전함을 증명할 수 없는 새 분모는 판정을 보류한다. 예를 들어 x²+1로 나누고 다시 곱하는 식은 실수에서 안전하지만 이 제한된 검사기는 추가 도메인 증명을 하지 않는다. 지원 밖 입력은 첫 제출 오답으로 세지 않는다.

## 광고 준비와 실제 공개 전 작업

현재 `dist/ads-config.js`는 `enabled: false`, `siteApproved: false`, 게시자 ID와 광고 단위 ID는 비어 있다. 광고 요청은 없다. 실제 ID를 임의로 만들거나 다른 사이트의 ID를 복사하지 않는다.

개념 페이지의 본문·학습 이동 버튼에서 떨어진 하단에만 광고 영역이 있다. 연습·정답 제출·세트 완료·내 기록·오류 화면에는 광고 영역이 없다. 자동광고나 시간 기반 광고 새로고침도 없다.

정식 공개 시 필요 사항:

1. 사용자의 확정된 서비스명·운영자 연락처·공개 도메인과 공개 범위를 확인한다.
2. 문제와 독창적인 개념·해설을 수동 검토한다. 정책상 미완성·저가치·미검토 자동생성 콘텐츠에는 광고를 게재하지 않는다.
3. 실제 운영 및 광고 기술에 맞게 개인정보 안내를 갱신하고 대상 지역의 Google 인증 CMP 등 동의 요구 사항을 충족한다. 현재 안내는 광고가 없는 시제품 기준이다.
4. 공개 검색 허용 시 `robots.txt`와 각 페이지의 noindex를 수정하고 실제 공개 도메인으로 canonical·sitemap을 생성한다. 비공개 검토판은 광고 심사용 공개 사이트를 대신하지 않는다.
5. 소유 계정으로 사이트를 AdSense에 등록하고 사이트 상태·승인을 확인한다. 이 작업은 아직 실행하지 않았다.
6. 사용자의 진짜 `ca-pub-...`와 수동 광고 단위 ID를 설정한 뒤에만 광고 기능을 활성화한다. `ads.txt`는 애드센스 계정이 제공하는 게시자 정보로 생성한다. 풀이 중 광고 금지 원칙을 유지한다.
7. 실제 수익 데이터가 없으므로 수익 전망을 확정하거나 승인을 보장하지 않는다.

정책 확인: 2026-10-12

- https://support.google.com/adsense/answer/1346295?hl=ko
- https://support.google.com/publisherpolicies/answer/11112688?hl=ko
- https://support.google.com/adsense/answer/1348695?hl=ko
- https://support.google.com/adsense/answer/12169212?hl=ko

MathLive: https://mathlive.io/mathfield/ (MIT; 서드파티 폰트 라이선스는 배포 패키지 확인)

## 항과 숫자 보조 도구

주 조작기는 수식 아래에서 바로 동작한다. 약수·인수쌍 목록은 바로 조작기의 보조 도구 버튼 또는 접힌 추가 도구에서 연다. 24의 기본 목록은 1×24, 2×12, 3×8, 4×6이다. 정수쌍은 빠른 선택이며 유리수쌍은 무한하므로 분자·분모로 첫 인수를 직접 지정한다. 나머지 인수는 부동소수점 반올림 없이 계산한다. 음수도 지원하며 첫 인수 0과 분모 0은 막는다. 선택만 하면 식은 바뀌지 않는다. 분해하기를 누르면 원래 줄을 보존하고 그 아래에 새 수식 줄을 넣는다.

지수 자체는 분해 대상에서 제외한다. 문자만 있는 단항식의 생략된 계수 1은 선택할 수 있다. 약수 탭은 정수 약수와 유리수 나눗셈을 제공한다. 배수 탭은 정수배 목록과 직접 지정한 유리수배를 계산해 메모로 저장한다. 정수 목록은 절댓값 1억 이하까지, 입력/검사는 기존 식 길이·숫자 크기 제한을 따른다. 숫자 도구는 힌트/해설과 달리 독립 첫 제출 통계에서 제외하지 않는다.

검증: 수식 엔진과 숫자·변형·복사 도구를 포함한 25개 테스트가 통과했다. 별도 Node DOM 점검으로 항 선택, 선택 후 취소, 명시적 적용, 유리수 입력, 0 거부, 원래 줄 보존, 배수/독립 조회 메모를 확인했다. 실제 브라우저의 MathLive 렌더링과 모바일 배치는 이번 환경에서 직접 검증하지 못했다.

## 복소수와 부분 변형

`dist/scalars.js`의 Q와 C는 BigInt 분수 및 그 실수부/허수부 쌍을 사용한다. i²=−1을 정확하게 계산하며 24=(1+i)(12−12i), x²+1=(x+i)(x−i)를 처리한다. 복소수 입력은 유리수 실수부·허수부를 지원하며 근호나 초월수 계수의 기호 계산은 제공하지 않는다. 자유 수식 작성에서는 근호·함수 등을 입력하고 복사할 수 있다.

`dist/transform-tools.js`는 파서의 원본 범위 정보로 선택한 부분만 바꾸고 정확한 동치 및 원래 분모 조건을 검사한다. 항 나누기는 계수를 합으로 나누어 문자 부분을 각각 붙인다. 통분은 사용자가 고른 분모로 나누어떨어지는지 검사한 뒤 분자에 곱한 과정을 보존한다. 약분은 사용자가 고른 공통인수로 다항식을 정확히 나눠 몫을 쓴다. 부분 전개는 선택한 곱/제곱에만 분배법칙을 적용하고 동류항은 자동으로 모으지 않는다. 지수 나누기는 두 지수의 합을 유지하며 새 0 제외 조건을 만들지 않는다. x와 t가 동시에 있는 부분의 다항식 나눗셈은 지원하지 않는다.

## 자유 수식 작성

`/#compose`, `dist/composer.js`, `dist/composer-export.js`. 문제/채점과 별도로 최대 50줄·줄당 10,000자를 작성하며 `susik-lab.composer.v1`에 저장한다. 기존 학습 기록은 그대로 둔다. 줄 복제·이동·삭제·줄 작업 취소, 기호 팔레트(분수·근호·미적분·행렬·그리스 문자), LaTeX/AsciiMath 가져오기, 현재 줄/전체 복사, 파일 내려받기를 제공한다. MathLive 0.111.1의 공식 변환기를 사용해 ASCII와 MathML을 내보내며 LaTeX 구분자와 여러 줄 정렬을 고를 수 있다. 클립보드 쓰기가 실패하면 브라우저의 복사 대체 수단을 사용하고, 모두 불가능하면 직접 선택/복사를 안내한다. 복사 성공을 거짓으로 표시하지 않는다.

검증 확장: 25개 Node 테스트와 3개 Node DOM 동작 점검(기존 도구, 복소수/부분 변형, 자유 편집/복사)을 통과했다. 공식 MathLive SSR로 실제 분수·적분·행렬의 ASCII/MathML 변환을 확인했다. 실제 브라우저의 시각적 배치·MathLive 커서/터치·클립보드 권한은 직접 검증하지 못했다.

## 부호를 포함한 항 나누기와 모달 수식 문맥

항 나누기는 중간항의 뺄셈 부호까지 포함한다. `2x^2-16x+14`에서 `-16x`를 고르고 첫 계수에 `-14`를 입력하면 `2x^2-14x-2x+14`를 미리 보여 준다. 다른 항은 유지하고, 적용할 때 원래 풀이 다음 줄에 추가한다. 계수 선택 후 두 항의 순서를 바꿀 수 있다. 인수쌍 도구는 기존의 선택 계수 범위를 유지한다.

모든 계산 모달은 스크롤 본문과 분리된 상단에 기존 전체 수식과 선택한 항/부분을 표시한다. 새 미리보기는 원본 표시를 덮어쓰지 않는다. 공통 표시 도우미는 `dist/tool-context.js`에 있다. 자동 테스트 25개와 별도 Node DOM 점검으로 음수 중간항, 분수·복소수·반복 항, 모드 전환, 순서 바꾸기, 명시적 적용/취소, 원래 줄 보존과 각 모달의 원본 표시를 확인했다. 실제 브라우저/모바일 레이아웃 검증은 수행하지 못했다.

## 수식 바로 조작

`dist/direct-tools.js`와 `dist/direct-editor.js`를 연습장과 자유 수식 작성에서 공유한다. 수식의 항을 직접 눌러 선택하며, 음수 부호는 항에 포함한다. 항 하나의 합/곱 나누기, 여러 항에서 사용자가 입력한 공통인수 추출, 항의 좌우 이동/드래그, 부분 직접 교체를 지원한다. 통분·약분·부분 전개·지수 나누기도 선택 범위에서 같은 화면으로 처리한다. 공통인수는 정답을 추천하지 않고, 선택한 각 항을 입력 인수로 정확하게 나누는지 검증한다. 단항식 나누기와 묶기는 한 문자 다항식에서 동작하고, 나머지 기존 범위는 보조 도구로 남아 있다.

숫자는 입력칸 하나와 키패드로 적으며 분수는 `/`, 복소수는 `i`를 쓴다. 음수 항의 합 나누기는 음수 부호를 미리 두어 `−16x` → 항 나누기 → `1` → `4` → 완료의 5회 터치로 예시 변형을 확정할 수 있다. 이는 경로상의 조작 수이며 실제 필기 대비 속도 측정치는 아니다. 확정 전에는 식을 변경하지 않는다. 완료 시 원래 줄을 보존한 새 풀이 줄을 만들고 그 줄에서 작업을 계속한다. 이동은 직접 수행하는 즉시 기록하고 되돌릴 수 있다.

연습장의 최근 20개 편집 상태와 현재 행은 세션과 함께 기기에 저장한다. 되돌리기는 수식 편집 기록을 복원하며 이미 제출한 성적을 지우지 않는다. 자유 수식 작성은 최근 15개 편집 상태를 실행 중에 보관한다. 뒤에 직접 입력한 내용도 별도 편집으로 취급하여 변형 취소 시 함께 유실되지 않게 한다. 독립 첫 제출 집계는 기존 규칙을 유지한다.

수식은 같은 버전의 MathLive 정적 렌더러와 자체 호스팅 CSS/폰트로 표시하고, 편집 중 화면에 읽기 전용 Mathfield를 항마다 생성하지 않는다. 기본 경로에는 모달·분자/분모 별도 입력·중복 확인이 없다. 이전 자유 수식 기호 팔레트와 추가 계산 도구는 접어서 보존한다.

검증: 자동 테스트 30개, Node DOM의 연습장 인수분해 전체 흐름/되돌리기/이동/기존 조건/오래된 입력 거부, 자유 작성의 저장·복사·직접 입력 복원 흐름을 확인했다. 공식 MathLive SSR 렌더링과 정적 폰트 참조를 검사했다. 실제 브라우저 레이아웃, 모바일 드래그 감도, 손글씨 대비 시간은 직접 검증하지 못했다.

## Touch grouping, nested parentheses and bottom equation dock (V6)

- Practice and the free composer share a fixed bottom dock for the active equation. Its height is measured with ResizeObserver to reserve page space; the current expression remains visible while the tools scroll, and the panel can be collapsed. MathLive keyboard height is included in docking/page spacing.
- Tap multiple signed terms, then tap a common factor and confirm. Suggestions include numeric/variable common factors and already visible polynomial factors; each is checked by exact polynomial division. Hidden polynomial factorizations are not supplied as suggestions. Manual complex/rational factor input remains available.
- “괄호로 묶기” groups a selection without extracting a factor. Explicit “괄호 안 보기” navigates position-based scopes; repeated identical parentheses remain separate. Breadcrumbs return to outer scopes. Inner edits preserve outer signs, powers, denominators and the entire row in history.
- Native desktop dragging and signed arrow movement remain; actual touch gesture sensitivity and layout are not browser-verified in this environment.

## Importing personal exercises

- `/#import` accepts plain expressions and LaTeX with common math delimiters. Parsed expressions can be used for factoring, expansion, fractions, powers, completing squares, or free equivalent transformations. Imported exercises have one problem and no generated worked solution. New domain exclusions currently accept integers; equations, inequalities, arbitrary functions and prose problems are rejected explicitly.
- Photos can be chosen, captured by a supported mobile file picker, or pasted. Images are resized locally (15 MB input cap, bounded stored JPEG) and retained with the exercise. Existing browser storage limits still apply; save failures are reported.
- OCR is self-hosted Tesseract.js 7.0.0 with an English character model, loaded only when requested. It creates an editable **draft**, not an authoritative math transcription. The user must copy the draft to the expression field and confirm it against the photo. Changing the expression invalidates confirmation. Cancellation/route changes terminate or discard OCR work. Images are not uploaded to an OCR service.
- The model read the clear printed `2x + 14` fixture in a Node runtime test. A printed superscript fixture lost the exponent; handwriting, small exponents, stacked fractions and general mathematical layout are NOT reliably supported. Do not market this as a full mathematical or handwriting OCR engine.
- Reproduce bundled OCR assets: `npm install` then `node scripts/vendor-ocr.mjs`. Bundles, model, third-party licenses and package lock are tracked. Only LSTM inference is used; the three core bundles cover non-SIMD, SIMD and relaxed SIMD. No external CDN is used at runtime.

Validation: 38 Node tests cover exact transformations, nested scope replacement, supported input/domain rejection, t-variable final forms, OCR lifecycle and a real local OCR fixture. Node DOM smoke flows also cover the practice/composer touch grouping chain, nested scopes/breadcrumbs/undo, dock collapse, imported-problem routing, photo draft selection and mandatory confirmation. Camera/gallery, browser Worker/WASM loading, real mobile layout and touch behavior still require device verification.

## Integrated worksheet, crop, substitutions and navigation (V7)

- Photo import starts with a movable crop rectangle, corner handles and accessible fine controls. The chosen crop is read by the existing local OCR worker. The original selected file stays in memory for cropping at original resolution; only the resized selected region is included in a saved problem. Draft confirmation remains mandatory. Latin function names are allowed by the OCR whitelist; recognition of Greek symbols, handwriting and structured fractions remains unreliable.
- Completing a chosen square and polynomial quotient/remainder grouping preserve exact rational/complex coefficients. The preview separates the formed expression from the residual expression, explains the adjustment and appends only on explicit apply.
- A shared top context panel shows the active row's substitution first. Applying or restoring appends a row; definitions are stored with each row, survive history navigation and are restored by undo. Conditions and questions accompany imported worksheets.
- Trigonometric equations and exponential/logarithmic expressions can be imported as ungraded worksheets with a final-answer field. The supplied `2sin(theta)^2 = sin(theta)cos(theta)+sin(theta)` example retains `0° ≤ θ < 360°`. These records do not count toward accuracy or the error-review queue. Numerical agreement at a chosen value is never graded as identity or completeness of a solution set.
- The shared dock has previous/check/next controls, equation-side selection, exact algebra tools and a function/calculation editor. Calculations support sin/cos/tan, inverse trigonometry, roots, powers, exp, ln, common log and positive real log bases other than 1; radians/degrees are explicit. Complex logarithms and fractional powers use principal values. Calculated approximations can be saved as notes in practice, separate from exact expression rows. User calculations use a bounded, allowlisted mathjs AST visitor, not arbitrary evaluation.
- `mathjs` 15.2.0 is self-hosted; `node scripts/vendor-mathjs.mjs` reproduces its bundle and license. Builds version all app module/CSS URLs to keep a refreshed browser on one release.
- Validation: 46 automated tests passed, including exact residuals, crop geometry, equation parsing, substitution/reversal, degree/radian differences and logarithm conditions. Node DOM checks cover crop/OCR confirmation, footer navigation, next-problem reset, substitution history, worksheet saving, composer copy/undo and calculator recording. Official MathLive SSR converters were checked with trig/log/exponential inputs. Native browser layout, actual mobile crop/keyboard interaction and browser OCR worker execution were not exercised in this environment.


## Focused touch editing and compact symbol keyboard (V8)

- Selecting a transformation (including common-factor extraction, term splitting and substitution) now replaces the tool menu with the original expression, relevant controls and a preview. The dock footer contains only Back and Apply; Back discards the pending transformation, and Apply retains the existing history behavior. Inner-scope navigation never invokes answer grading.
- Parenthesized expressions are directly tappable, with a separate whole-term handle for selecting or dragging an outer term. Scope offsets still distinguish repeated brackets. Tapping a selected expression or a repeated-function suggestion prepares a substitution; its definition is recorded only on Apply. Multiple selected polynomial terms are grouped before substitution. Implicit multiplication such as `x(x+6)` is normalized for calculation/substitution parsing.
- Photo OCR opens a dedicated comparison/editor screen with an automatically shown MathLive keyboard. Text/LaTeX imports can open the same editor. Cancel preserves the prior expression; Apply updates it and still requires photo confirmation. Opening manual editing cancels pending OCR to prevent a later recognition result from overwriting the editor.
- All MathLive fields share four compact keyboard tabs (numbers, expressions, functions, symbols), four rows of six keys or three rows of eight in short landscape viewports. VisualViewport geometry positions the keyboard and editor; the equation dock hides while the symbol keyboard is open. The photo can be collapsed, zoomed and scrolled, and cursor/placeholder buttons preserve the active selection.
- Validation: 49 automated tests and Node DOM flows exercise focused Back/Apply behavior, cancellation, history, direct bracket navigation, click substitution/restoration, photo draft editing/confirmation, the shared keyboard controller and viewport/orientation updates. Existing practice and composer flows pass. Keyboard integration uses a mock MathLive element in Node; actual mobile layout, native keyboard/camera behavior, touch accuracy and real browser OCR remain unverified.

## Reference navigation and touch-first choices (V9)

- The supplied navigation mockup informed the dock's hierarchy and styling: current expression, signed selectable terms, selection count, four primary transformations, secondary tools, separate preview, and a fixed Apply/Back footer. Previous/next-expression controls now sit in the dock header. A selected term shows Apply/Exit term rather than answer grading.
- Default transformation panels contain clickable choices and no text field or keypad. Exact sum/product choices, common-denominator/cancellation suggestions, power choices and remainder grouping reuse the existing algebra engine. A short list is intentionally not an exhaustive enumeration of rational or complex possibilities; arbitrary supported values remain available through Direct input.
- Direct input opens a calculator-shaped display/key grid. Its shared keyboard component also serves the function calculator, including numbers, cursor control, variable/complex symbols, trig/log functions, logarithm bases and powers. Touching the keys preserves text selection and uses the in-app keypad instead of invoking the phone keyboard. The pending value survives input/control order changes.
- Applying a polynomial edit changes only the selected terms and keeps the existing exact equivalence/domain validation and history. Substitution retains the previous whole-expression structural replacement behavior with a visible definition and explicit Apply.
- Validation: 52 automated tests passed. Node DOM flows cover click-only splitting and swapping, cancellation, selection footer states, direct entry, draft-preserving layout changes, unselected-term preservation, logarithm-base input, composer/history and earlier touch operations. Physical-device layout and touch behavior were not browser-verified.

## Three transformation families (V10)

- The primary actions and active-mode names are now `+ 변형`, `× 변형`, and `^ 변형`. The three buttons stay on one row on narrow screens; common-factor extraction and substitution occupy the row above.
- `^ 변형` offers an exact power-form mode and the existing exponent-splitting mode. Selecting `−4` can produce `−(2)²`; negative odd powers put the sign inside the base. Monomial degrees must divide by the chosen exponent. Rational roots and Gaussian-rational square roots use exact integer/rational arithmetic and the existing equivalence/domain checks. Supported power-form exponents are integers 2–12; unsupported irrational bases are rejected instead of rounded.
- Choices are touch-first and manual exponent input is opt-in. Preview, cancel, explicit Apply, history and unselected-term preservation use the shared editor workflow.
- Math rendering recognizes already-braced LaTeX exponents such as `t^{2}` rather than passing them through the AsciiMath converter and exposing braces.
- Validation: 56 automated tests passed, including signed/rational/complex roots, unsupported exponents, preservation of untouched terms, substitution bindings and braced-exponent input. Node DOM flows also exercised the new ^ action and both power modes. Real-device visual/touch verification remains unavailable in this environment.
