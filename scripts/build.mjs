import {logExample} from './log-example.mjs';
import {substitutionLesson} from './substitution-lesson.mjs';
import {multiplyDivideLesson} from './multiply-divide-lesson.mjs';
import {squareRootLesson} from './square-root-lesson.mjs';
import {learningGuide} from './learning-guide.mjs';
import {quantifierLesson} from './quantifier-lesson.mjs';
import {isPublicBuild} from './indexing.mjs';
import {startWorkspaceLoading,workspaceLoadingMarkup} from '../dist/workspace-loader.js';
import {build} from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const base=new URL('../dist/',import.meta.url);
const siteOrigin='https://susik.app';
// Cloudflare preview branches stay out of search results.
const publicBuild=isPublicBuild();
const robots=publicBuild?'index,follow':'noindex,nofollow';
const write=(path,text)=>{const url=new URL(path,base);fs.mkdirSync(new URL('./',url),{recursive:true});fs.writeFileSync(url,text);};
const contactEmail='susiksekim@gmail.com';
const contactNotice=`<p data-contact-email>문의: <a href="mailto:${contactEmail}">${contactEmail}</a></p>`;
const issueNotice='<p><a href="https://github.com/cranyoung-cpu/susik/issues">오류·개선 제안</a>은 GitHub 공개 게시판입니다. 개인정보나 비공개 백업 파일은 올리지 마세요.</p>';
const pages={
 about:{title:'수식연습실 소개',description:'식을 직접 쓰고, 항과 괄호를 눌러 바꾸며 한 줄씩 풀어 보세요. 개념 해설과 예제로 시작하고 연습문제의 최종 답을 확인할 수 있습니다.',body:`<p><strong>식을 직접 쓰고, 바꾸고, 이유를 적으며 풀어 보세요.</strong> 수식연습실에서는 항과 괄호를 눌러 변형하고, 풀이 과정을 한 줄씩 남길 수 있습니다. 처음이라면 예제의 힌트를 따라 한 문제부터 시작해 보세요.</p>
<p><a class="btn primary" href="/">수식 작업실 시작하기</a> <a class="btn" href="/learn/">개념 해설 읽기</a></p>
<h2>내게 맞는 방법으로 시작하세요</h2><ul><li><strong>풀고 싶은 식이 있다면</strong> — 작업실 상단의 ‘직접 수식 작성’에 문자나 LaTeX로 식을 입력하고 ‘새 풀이 시작’을 누르세요.</li><li><strong>사용법부터 익히려면</strong> — ‘예제·도움말·백업 → 예제로 시작하기’에서 문제를 고르세요. 힌트와 풀이를 펼쳐 보며 한 단계씩 따라 할 수 있습니다.</li><li><strong>스스로 풀어 보고 싶다면</strong> — ‘문제 풀기 · 답 확인’에서 연습문제를 고르세요. 풀이를 적은 뒤 ‘답 확인’으로 최종 답을 비교합니다.</li></ul>
<h2>식의 어느 부분을 바꿀지 직접 고르세요</h2><p>하단의 항·괄호를 누르면 전개·인수분해 등 항 변형을 고를 수 있습니다. 식 전체를 누르면 양변조작으로 이동합니다. 미리보기에서 결과와 필요한 조건을 확인한 뒤 적용하세요. 다음 계산은 ‘새 줄 쓰기’, 연습문제는 ‘풀이 줄 추가’로 이어 갑니다.</p>
<p>부등식은 실수 다항식의 단일 부등식에서 같은 다항식을 더하거나 빼고, 0이 아닌 유리수 상수로 곱하거나 나눌 수 있습니다. 음수로 곱하거나 나누면 부등호가 바뀌는 이유를 미리보기에서 확인하세요.</p>
<h2>복잡한 부분은 이름을 붙이거나 따로 계산하세요</h2><p>‘조건·치환’에 정의역과 <code>t := x+1</code> 같은 정의를 적고, 치환 목록의 적용·복원으로 식을 바꿔 보세요. <a href="/learn/substitute/">조건과 치환 해설</a>에서 예제를 따라 할 수 있습니다. ‘＋ 보조 식’에서는 계산을 따로 진행하고, 결과 대입 미리보기에서 본식에 사용할 관계와 조건을 확인합니다.</p>
<p>행렬·일차 연립식·미적분은 수식 작성창의 전용 입력에서 시작하세요. 1~4행·열 행렬, 2~4변수 일차 연립식, 1~3차 미분과 기본 적분 도구를 사용할 수 있습니다. 각 도구의 입력 안내에서 계산 범위를 확인하세요.</p>
<h2>계산과 함께 이유도 확인하세요</h2><p>각 줄의 ‘내 설명 쓰기’에 사용한 조건과 변형 이유를 남기세요. 연습의 답 확인은 최종 답을 비교합니다. 직접 입력한 풀이와 조건 메모는 자동 증명하지 않으므로, 중간 단계와 원래 식의 정의역은 직접 확인하세요. 삼각방정식 예제는 ‘정답 비교 안내 · 직접 확인’에서 일반해와 빠진 경우를 비교합니다.</p>
<h2>다음에도 이어서 풀려면</h2><p>풀이 기록은 사용 중인 브라우저에 저장됩니다. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에는 ‘백업 내려받기’로 파일을 보관하세요. <a href="/privacy/">저장·백업 방법 보기</a></p>${contactNotice}${issueNotice}`},
 privacy:{title:'저장 안내',description:'수식과 풀이 기록의 브라우저 저장 방식, JSON 백업·복원 방법과 보관 시 주의점을 안내합니다.',body:`<p>본식·보조 식, 풀이 설명, 조건·치환·기호 정의, 연습 답과 확인 결과를 이 브라우저의 로컬 저장 공간에 보관합니다. 다른 기기로 자동 동기화하지 않으며 별도의 풀이 서버로 전송하지 않습니다.</p><p>이전 버전의 저장 내용은 삭제하지 않습니다. 수식 작성 내용이 있으면 먼저 가져오고, 없으면 진행 중이던 문제의 풀이를 가져옵니다.</p>
<h2>JSON 백업과 복원</h2><p>작업실 상단의 ‘예제·도움말·백업’ 메뉴에서 ‘백업 내려받기’로 현재 작업장을 JSON 파일로 보관하고, ‘백업 복원’에서 파일을 선택해 다시 가져올 수 있습니다. 본식·보조 식과 위 기록이 함께 포함됩니다. 백업 파일은 사용자의 기기에서 처리하며 서버로 전송하지 않습니다.</p><p>복원하면 현재 작업장이 선택한 백업으로 바뀝니다. 먼저 현재 작업장을 백업하고, 파일을 선택한 뒤 표시되는 내용을 확인해 복원하세요. 복원 직후에는 ‘복원 취소 · 이전 작업장으로’로 되돌릴 수 있습니다.</p>
<h2>목록에서 삭제한 수식</h2><p>줄 메뉴의 ‘이 수식 삭제’는 해당 수식을 목록에서 숨깁니다. 원본 기록과 참조는 복구용으로 남고 JSON 백업에도 포함됩니다. ‘풀이 관리 → 삭제한 수식’에서 복구할 수 있으며, 삭제 직후에는 ‘실행 취소’로 되돌릴 수 있습니다. 이 동작은 영구 삭제가 아닙니다.</p><p>브라우저의 사이트 데이터를 삭제하면 저장 내용이 사라집니다. 중요한 작업장은 JSON 백업으로 보관하세요. 풀이 복사는 수식·설명을 다른 문서에 옮길 때 사용할 수 있습니다. 현재 사진 입력·인식, 광고, 분석 추적 기능은 실행하지 않습니다.</p><p>사이트 제공과 접근 권한 확인을 위해 호스팅 제공업체가 접속 정보를 처리할 수 있습니다.</p>`},
 terms:{title:'이용 안내',description:'자유 수식 작성과 풀이 도구, 연습 답 확인의 사용 방법과 지원 범위를 안내합니다. 조건과 중간 논증은 직접 확인하세요.',body:`<p>상단의 ‘직접 수식 작성’은 독립된 새 풀이를 시작하고, 하단의 ‘새 줄 쓰기’는 현재 풀이에 이어 씁니다. 연습 중에는 ‘풀이 줄 추가’로 같은 문제를 이어 쓰며 문제 안내와 답 확인을 유지합니다. 직접 입력한 줄은 동치 확인 없이 기록됩니다. 변형 메뉴의 직접 변형은 지원하는 대수식 범위에서 선택한 부분과 같은지 확인한 뒤 적용하며, 그 근거를 표시합니다. 복사 메뉴에서는 현재 수식의 LaTeX·문자 또는 설명을 포함한 풀이 전체를 선택합니다.</p>
<p>단계 예제는 원식·조건과 변형 이유를 확인하며 직접 풀어 보는 안내입니다. 삼각방정식의 ‘정답 비교 안내 · 직접 확인’은 일반해 집합의 동치와 해의 누락을 자동 채점하지 않습니다. 유한 개 값을 대입한 확인은 일반해의 증명이 아닙니다.</p><p>‘문제 풀기 · 답 확인’의 최종 답 확인은 브라우저에서 수식의 정확한 값과 문제별 답 형식을 검사합니다. 지원 밖 입력은 오답과 구분해 미검증으로 표시합니다. 풀이 서술과 중간 단계는 별도로 검토하세요.</p>
<p>지수·로그 법칙에 추가 조건이 필요하면 적용 전에 표시하고, 사용자가 적용할 때 해당 조건을 풀이에 기록합니다. 조건을 추가하면 다루는 범위가 좁아질 수 있으므로 원래 문제의 조건과 맞는지 확인하세요.</p><p>치환은 같은 모양의 식을 문자로 바꿉니다. 새로운 문자의 범위는 원래 조건에서 따로 확인해야 합니다. 문자식으로 양변을 나누거나 곱할 때에는 0이 아닌 경우를 진행하고, 0인 경우는 원래 방정식과 함께 별도로 보관합니다. 방정식 풀이 후에도 원래 정의역과 조건을 확인하세요.</p><p>이 작업실은 학습용입니다. 표시되는 설명은 지원되는 계산 규칙에 따른 것이며, 자유 입력한 모든 수학적 논증을 판정하지 않습니다.</p>`}
};
function shell(title,body,path='',indexable=true,description=''){return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${indexable?robots:'noindex,nofollow'}">${description?`<meta name="description" content="${description.replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]))}">`:''}${path===null?'':`<link rel="canonical" href="${siteOrigin}/${path}">`}<title>${title} | 수식연습실</title><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/">수식연습실</a><a href="/">수식 작업실로 돌아가기</a></header><main><article class="article-wrap"><h1>${title}</h1>${body}</article></main><footer class="site-footer"><span>수식연습실</span>${contactNotice}</footer></body></html>`;}
for(const [name,page]of Object.entries(pages))write(`${name}/index.html`,shell(page.title,page.body,`${name}/`,true,page.description));
const lessonPages=[['learn/quantifiers/',quantifierLesson],['learn/substitute/',substitutionLesson],['learn/multiply-divide/',multiplyDivideLesson],['learn/square/',squareRootLesson],['learn/log-equation/',logExample]];
for(const [index,[path,lesson]]of lessonPages.entries()){
 const next=lessonPages[index+1];
 const navigation=`<nav aria-label="해설 이어 보기"><hr><p>${next?`다음 해설: <a rel="next" href="/${next[0]}">${next[1].title}</a>`:'이어서 작업실에서 조건과 변형 이유를 직접 기록하며 풀어 보세요.'}</p><p><a href="/learn/">개념 해설 목록</a> · <a href="/">수식 작업실 열기</a></p></nav>`;
 const body=`<nav aria-label="해설 탐색"><a href="/learn/">개념 해설 목록</a></nav>${lesson.body}${navigation}`;
 write(`${path}index.html`,shell(lesson.title,body,path,true,lesson.description));
}
write('learn/index.html',shell(learningGuide.title,learningGuide.body,'learn/',true,learningGuide.description));
write('404.html',shell('페이지가 없습니다','<p>입력한 주소에 페이지가 없습니다. 주소를 확인하거나 개념 해설 목록에서 필요한 내용을 찾아보세요.</p><p><a href="/learn/">개념 해설 목록</a> · <a href="/">수식 작업실 열기</a></p>',null,false,'요청한 페이지가 없습니다. 수식 작업실이나 개념 해설 목록으로 이동할 수 있습니다.'));
for(const name of ['factor/','expand/','fraction/','power/'])write(`learn/${name}index.html`,shell('수식과 풀이에 집중합니다','<p>예제와 법칙 설명은 수식 작업실에서 현재 식과 함께 확인할 수 있습니다.</p><a class="btn primary" href="/">수식 작업실 열기</a>','',false));
write('robots.txt',publicBuild?`User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','about/','privacy/','terms/','learn/',...lessonPages.map(([path])=>path)].map(path=>`<url><loc>${siteOrigin}/${path}</loc></url>`).join('')}</urlset>\n`);
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
let index=fs.readFileSync(new URL('index.html',base),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/g,'').replace(/<script[^>]*src="\/vendor\/mathjs\/math.js"[^>]*><\/script>/g,'').replace(/<link[^>]*rel="modulepreload"[^>]*>/g,'').replace(/<script type="module" src="[^"]*"><\/script>/g,'').replace(/<script data-workspace-loader>[\s\S]*?<\/script>/g,'');
index=index.replace(/href="\/style\.css(?:\?v=[^"]*)?"/g,`href="/style.css?v=${version}"`).replace('</head>',`<link rel="modulepreload" href="${parserPath}"><link rel="modulepreload" href="/vendor/mathlive-ssr.min.mjs"><link rel="modulepreload" href="${appPath}"></head>`);
const loader=`<script data-workspace-loader>(${startWorkspaceLoading.toString()})({document,load:()=>import(${JSON.stringify(appPath)}),reload:()=>window.location.reload()});</script>`;
index=index.replace(/<main id="app">[\s\S]*?<\/main>/,`<main id="app">${workspaceLoadingMarkup}</main>${loader}`);
index=index.replace(/<meta name="robots"[^>]*>/g,`<meta name="robots" content="${robots}">`).replace(/<link rel="canonical"[^>]*>/g,'').replace('</head>',`<link rel="canonical" href="${siteOrigin}/"></head>`);
index=index.replace(/<p data-contact-email>[\s\S]*?<\/p>/g,'').replace('</footer>',`${contactNotice}</footer>`);
fs.writeFileSync(new URL('index.html',base),index);
console.log('Built app '+appPath+' and parser '+parserPath);
