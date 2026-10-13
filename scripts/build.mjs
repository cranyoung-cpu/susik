import {logExample} from './log-example.mjs';
import {build} from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const base=new URL('../dist/',import.meta.url);
const siteOrigin='https://susik.app';
// Cloudflare preview branches stay out of search results.
const publicBuild=!process.env.CF_PAGES_BRANCH || process.env.CF_PAGES_BRANCH==='main';
const robots=publicBuild?'index,follow':'noindex,nofollow';
const write=(path,text)=>{const url=new URL(path,base);fs.mkdirSync(new URL('./',url),{recursive:true});fs.writeFileSync(url,text);};
const issueNotice='<p><a href="https://github.com/cranyoung-cpu/susik/issues">오류·개선 제안</a>은 GitHub 공개 게시판입니다. 개인정보나 비공개 백업 파일은 올리지 마세요.</p>';
const pages={
 about:{title:'수식연습실 소개',body:`<p>직접 입력한 수식의 항과 괄호를 선택해 바꾸고, 풀이 과정과 이유를 한 줄씩 남기는 수식 작업실입니다.</p>
<h2>자유 작성·단계 예제·답 확인 연습</h2><ul><li><strong>자유 작성</strong> — 상단의 ‘자유 수식 작성’에서 빈칸에 문자·LaTeX를 입력하고 ‘새 풀이 시작’을 누르면 기존 기록 끝에 독립된 풀이가 추가됩니다. 하단의 ‘새 줄 쓰기’는 현재 풀이에 이어 씁니다. 풀이 설명 메모는 각 줄의 ‘내 설명 쓰기’에서 별도로 남깁니다.</li><li><strong>단계 예제</strong> — ‘예제·연습·도움말·백업 → 예제로 시작하기’나 <a href="/learn/">풀이 예제</a>에서 원식과 조건, 변형 이유를 확인하며 한 단계씩 기록합니다. 삼각방정식 예제의 힌트와 정답 비교 안내는 필요할 때 펼쳐 직접 확인합니다.</li><li><strong>최종 답 확인 연습</strong> — 같은 메뉴의 ‘연습문제 선택’에서 문제를 시작하고 ‘답 확인’을 누르면 브라우저에서 문제별 최종 답을 확인합니다. 풀이 서술과 중간 단계는 별도로 검토하세요.</li></ul><p>삼각 일반해 집합의 동치와 해의 누락은 자동 채점하지 않습니다. 유한 개 값을 대입한 확인은 일반해의 증명이 아닙니다.</p>
<h2>수식과 변형에 집중합니다</h2><p>변형 메뉴에서 합·곱·거듭제곱, 공통인수, 전개 과정을 고릅니다. 조건·치환 목록에서 여러 정의를 적용·복원하며, 방정식에서는 양변조작으로 같은 연산 적용과 항 이항을 진행합니다. 지수·로그 예제에서는 적용할 법칙과 필요한 조건을 함께 확인합니다.</p>
<h2>보조 식과 계산 도구</h2><p>본식을 보관한 채 여러 보조 식에서 따로 계산하고 결과를 대입할 수 있습니다. 전용 입력에서는 1~4행·열 행렬, 2~4변수 일차 연립식, 1~3차 미분과 지원되는 기본 적분의 과정을 기록합니다. 행렬은 칸 입력, 연립식은 줄 입력, 미적분은 변수와 구간을 구분해 입력합니다. 일반 비선형 연립식·미분방정식·이상적분은 지원하지 않습니다.</p>
<h2>지원 범위</h2><p>기초대수의 정확한 계산과 명시적인 지수·로그 법칙을 이용합니다. 지수·로그의 조건은 실수 범위를 기준으로 표시합니다. 일반 방정식의 모든 해나 자유롭게 입력한 풀이 전체를 자동 증명하는 도구는 아닙니다.</p>
<h2>기록 보관과 문의</h2><p>작업장을 파일로 보관하고 다시 가져오는 방법은 <a href="/privacy/">저장 안내</a>에서 확인하세요.</p>${issueNotice}`},
 privacy:{title:'저장 안내',body:`<p>본식·보조 식, 풀이 설명, 조건·치환·기호 정의, 연습 답과 확인 결과를 이 브라우저의 로컬 저장 공간에 보관합니다. 다른 기기로 자동 동기화하지 않으며 별도의 풀이 서버로 전송하지 않습니다.</p><p>이전 버전의 저장 내용은 삭제하지 않습니다. 수식 작성 내용이 있으면 먼저 가져오고, 없으면 진행 중이던 문제의 풀이를 가져옵니다.</p>
<h2>JSON 백업과 복원</h2><p>작업실 상단의 ‘예제·연습·도움말·백업’ 메뉴에서 ‘백업 내려받기’로 현재 작업장을 JSON 파일로 보관하고, ‘백업 복원’에서 파일을 선택해 다시 가져올 수 있습니다. 본식·보조 식과 위 기록이 함께 포함됩니다. 백업 파일은 사용자의 기기에서 처리하며 서버로 전송하지 않습니다.</p><p>복원하면 현재 작업장이 선택한 백업으로 바뀝니다. 먼저 현재 작업장을 백업하고, 파일을 선택한 뒤 표시되는 내용을 확인해 복원하세요. 복원 직후에는 ‘복원 취소 · 이전 작업장으로’로 되돌릴 수 있습니다.</p>
<h2>목록에서 삭제한 수식</h2><p>줄 메뉴의 ‘이 수식 삭제’는 해당 수식을 목록에서 숨깁니다. 원본 기록과 참조는 복구용으로 남고 JSON 백업에도 포함됩니다. ‘풀이 관리 → 삭제한 수식’에서 복구할 수 있으며, 삭제 직후에는 ‘실행 취소’로 되돌릴 수 있습니다. 이 동작은 영구 삭제가 아닙니다.</p><p>브라우저의 사이트 데이터를 삭제하면 저장 내용이 사라집니다. 중요한 작업장은 JSON 백업으로 보관하세요. 풀이 복사는 수식·설명을 다른 문서에 옮길 때 사용할 수 있습니다. 현재 사진 입력·인식, 광고, 분석 추적 기능은 실행하지 않습니다.</p><p>사이트 제공과 접근 권한 확인을 위해 호스팅 제공업체가 접속 정보를 처리할 수 있습니다.</p>`},
 terms:{title:'이용 안내',body:`<p>상단의 ‘자유 수식 작성’은 독립된 새 풀이를 시작하고, 하단의 ‘새 줄 쓰기’는 현재 풀이에 이어 씁니다. 직접 입력한 줄은 동치 확인 없이 기록됩니다. 변형 메뉴의 직접 변형은 지원하는 대수식 범위에서 선택한 부분과 같은지 확인한 뒤 적용하며, 그 근거를 표시합니다. 복사 메뉴에서는 현재 수식의 LaTeX·문자 또는 설명을 포함한 풀이 전체를 선택합니다.</p>
<p>단계 예제는 원식·조건과 변형 이유를 확인하며 직접 풀어 보는 안내입니다. 삼각방정식의 ‘정답 비교 안내 · 직접 확인’은 일반해 집합의 동치와 해의 누락을 자동 채점하지 않습니다. 유한 개 값을 대입한 확인은 일반해의 증명이 아닙니다.</p><p>‘연습문제 선택’의 최종 답 확인은 브라우저에서 수식의 정확한 값과 문제별 답 형식을 검사합니다. 지원 밖 입력은 오답과 구분해 미검증으로 표시합니다. 풀이 서술과 중간 단계는 별도로 검토하세요.</p>
<p>지수·로그 법칙에 추가 조건이 필요하면 적용 전에 표시하고, 사용자가 적용할 때 해당 조건을 풀이에 기록합니다. 조건을 추가하면 다루는 범위가 좁아질 수 있으므로 원래 문제의 조건과 맞는지 확인하세요.</p><p>치환은 같은 모양의 식을 문자로 바꿉니다. 새로운 문자의 범위는 원래 조건에서 따로 확인해야 합니다. 문자식으로 양변을 나누거나 곱할 때에는 0이 아닌 경우를 진행하고, 0인 경우는 원래 방정식과 함께 별도로 보관합니다. 방정식 풀이 후에도 원래 정의역과 조건을 확인하세요.</p><p>이 작업실은 학습용입니다. 표시되는 설명은 지원되는 계산 규칙에 따른 것이며, 자유 입력한 모든 수학적 논증을 판정하지 않습니다.</p>`}
};
function shell(title,body,path='',indexable=true){return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${indexable?robots:'noindex,nofollow'}"><link rel="canonical" href="${siteOrigin}/${path}"><title>${title} | 수식연습실</title><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/">수식연습실</a><a href="/">수식 작업실로 돌아가기</a></header><main><article class="article-wrap"><h1>${title}</h1>${body}</article></main></body></html>`;}
for(const [name,page]of Object.entries(pages))write(`${name}/index.html`,shell(page.title,page.body,`${name}/`));
write('learn/log-equation/index.html',shell(logExample.title,logExample.body,'learn/log-equation/'));
write('learn/index.html',shell('풀이 예제','<p>조건과 정의를 먼저 확인하고, 각 변형의 이유를 따라가 보세요.</p><h2><a href="/learn/log-equation/">로그 방정식: 로그를 지수식으로 바꾸기</a></h2><p>진수의 범위, 로그의 정의와 동치 변형을 이용해 모든 해를 확인합니다.</p>','learn/'));
for(const name of ['factor/','expand/','fraction/','power/','square/','substitute/'])write(`learn/${name}index.html`,shell('수식과 풀이에 집중합니다','<p>예제와 법칙 설명은 수식 작업실에서 현재 식과 함께 확인할 수 있습니다.</p><a class="btn primary" href="/">수식 작업실 열기</a>','',false));
write('robots.txt',publicBuild?`User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','about/','privacy/','terms/','learn/','learn/log-equation/'].map(path=>`<url><loc>${siteOrigin}/${path}</loc></url>`).join('')}</urlset>\n`);
// Hash each independent bundle so UI changes do not invalidate the parser cache.
const assetDir=new URL('assets/',base);fs.rmSync(assetDir,{recursive:true,force:true});fs.mkdirSync(assetDir,{recursive:true});
const common={bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,metafile:true,legalComments:'linked',outdir:fileURLToPath(assetDir)};
const parser=await build({...common,entryPoints:['src/math-runtime.js'],entryNames:'math-[hash]'});
const parserPath='/assets/'+Object.keys(parser.metafile.outputs).find(p=>p.endsWith('.js')).split('/').at(-1);
const app=await build({...common,entryPoints:['src/browser-entry.js'],entryNames:'workspace-[hash]',plugins:[{name:'shared-vendors',setup(b){
 b.onResolve({filter:/^@math-runtime$/},()=>({path:parserPath,external:true}));
 b.onResolve({filter:/vendor\/mathlive-ssr\.min\.mjs$/},()=>({path:'/vendor/mathlive-ssr.min.mjs',external:true}));
}}]});
const appPath='/assets/'+Object.keys(app.metafile.outputs).find(p=>p.endsWith('.js')).split('/').at(-1);
const version=crypto.createHash('sha256').update(fs.readFileSync(new URL('style.css',base))).digest('hex').slice(0,12);
let index=fs.readFileSync(new URL('index.html',base),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/g,'').replace(/<script[^>]*src="\/vendor\/mathjs\/math.js"[^>]*><\/script>/g,'').replace(/<link[^>]*rel="modulepreload"[^>]*>/g,'');
index=index.replace(/href="\/style\.css(?:\?v=[^"]*)?"/g,`href="/style.css?v=${version}"`).replace(/<script type="module" src="[^"]*"><\/script>/g,`<link rel="modulepreload" href="${parserPath}"><link rel="modulepreload" href="/vendor/mathlive-ssr.min.mjs"><script type="module" src="${appPath}"></script>`);
index=index.replace(/<meta name="robots"[^>]*>/g,`<meta name="robots" content="${robots}">`).replace(/<link rel="canonical"[^>]*>/g,'').replace('</head>',`<link rel="canonical" href="${siteOrigin}/"></head>`);
fs.writeFileSync(new URL('index.html',base),index);
console.log('Built app '+appPath+' and parser '+parserPath);
