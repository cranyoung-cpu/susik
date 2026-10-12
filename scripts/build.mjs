import {build} from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
const base=new URL('../dist/',import.meta.url);
const siteOrigin='https://susik.app';
// Cloudflare preview branches stay out of search results.
const publicBuild=!process.env.CF_PAGES_BRANCH || process.env.CF_PAGES_BRANCH==='main';
const robots=publicBuild?'index,follow':'noindex,nofollow';
const write=(path,text)=>{const url=new URL(path,base);fs.mkdirSync(new URL('./',url),{recursive:true});fs.writeFileSync(url,text);};
const pages={
 about:{title:'수식연습실 소개',body:'<p>직접 입력한 수식의 항과 괄호를 선택해 바꾸고, 풀이 과정과 이유를 한 줄씩 남기는 수식 작업실입니다.</p><h2>수식과 변형에 집중합니다</h2><p>하단의 수식 작성에서 문자·LaTeX를 입력하고, 변형 메뉴에서 합·곱·거듭제곱, 공통인수, 전개 과정을 고릅니다. 조건·치환 목록에서 여러 정의를 적용·복원하며, 방정식에서는 양변조작으로 같은 연산 적용과 항 이항을 진행합니다. 지수·로그 예제에서는 적용할 법칙과 필요한 조건을 함께 확인합니다.</p><h2>보조 식과 계산 도구</h2><p>본식을 보관한 채 여러 보조 식에서 따로 계산하고 결과를 대입할 수 있습니다. 전용 입력에서는 1~4행·열 행렬, 2~4변수 일차 연립식, 1~3차 미분과 지원되는 기본 적분의 과정을 기록합니다. 행렬은 칸 입력, 연립식은 줄 입력, 미적분은 변수와 구간을 구분해 입력합니다. 일반 비선형 연립식·미분방정식·이상적분은 지원하지 않습니다.</p><h2>지원 범위</h2><p>기초대수의 정확한 계산과 명시적인 지수·로그 법칙을 이용합니다. 지수·로그의 조건은 실수 범위를 기준으로 표시합니다. 일반 방정식의 모든 해나 자유롭게 입력한 풀이 전체를 자동 증명하는 도구는 아닙니다.</p>'},
 privacy:{title:'저장 안내',body:'<p>수식, 풀이 설명, 조건과 치환 정의를 이 브라우저의 로컬 저장 공간에 보관합니다. 다른 기기로 자동 동기화하지 않으며 별도의 풀이 서버로 전송하지 않습니다.</p><p>이전 버전의 저장 내용은 삭제하지 않습니다. 수식 작성 내용이 있으면 먼저 가져오고, 없으면 진행 중이던 문제의 풀이를 가져옵니다.</p><p>브라우저의 사이트 데이터를 삭제하면 저장 내용이 사라집니다. 중요한 내용은 풀이 복사로 보관하세요. 현재 사진 입력·인식, 광고, 분석 추적 기능은 실행하지 않습니다.</p><p>사이트 제공과 접근 권한 확인을 위해 호스팅 제공업체가 접속 정보를 처리할 수 있습니다.</p>'},
 terms:{title:'이용 안내',body:'<p>수식 작성은 새 줄을 동치 확인 없이 기록합니다. 변형 메뉴의 직접 변형은 지원하는 대수식 범위에서 선택한 부분과 같은지 확인한 뒤 적용하며, 그 근거를 표시합니다. 복사 메뉴에서는 현재 수식의 LaTeX·문자 또는 설명을 포함한 풀이 전체를 선택합니다.</p><p>지수·로그 법칙에 추가 조건이 필요하면 적용 전에 표시하고, 사용자가 적용할 때 해당 조건을 풀이에 기록합니다. 조건을 추가하면 다루는 범위가 좁아질 수 있으므로 원래 문제의 조건과 맞는지 확인하세요.</p><p>치환은 같은 모양의 식을 문자로 바꿉니다. 새로운 문자의 범위는 원래 조건에서 따로 확인해야 합니다. 문자식으로 양변을 나누거나 곱할 때에는 0이 아닌 경우를 진행하고, 0인 경우는 원래 방정식과 함께 별도로 보관합니다. 방정식 풀이 후에도 원래 정의역과 조건을 확인하세요.</p><p>이 작업실은 학습용입니다. 표시되는 설명은 지원되는 계산 규칙에 따른 것이며, 자유 입력한 모든 수학적 논증을 판정하지 않습니다.</p>'}
};
function shell(title,body,path='',indexable=true){return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${indexable?robots:'noindex,nofollow'}"><link rel="canonical" href="${siteOrigin}/${path}"><title>${title} | 수식연습실</title><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/">수식연습실</a><a href="/">수식 작업실로 돌아가기</a></header><main><article class="article-wrap"><h1>${title}</h1>${body}</article></main></body></html>`;}
for(const [name,page]of Object.entries(pages))write(`${name}/index.html`,shell(page.title,page.body,`${name}/`));
for(const name of ['','factor/','expand/','fraction/','power/','square/','substitute/'])write(`learn/${name}index.html`,shell('수식과 풀이에 집중합니다','<p>예제와 법칙 설명은 수식 작업실에서 현재 식과 함께 확인할 수 있습니다.</p><a class="btn primary" href="/">수식 작업실 열기</a>','',false));
write('robots.txt',publicBuild?`User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','about/','privacy/','terms/'].map(path=>`<url><loc>${siteOrigin}/${path}</loc></url>`).join('')}</urlset>\n`);
// Hash each independent bundle so UI changes do not invalidate the parser cache.
const assetDir=new URL('assets/',base);fs.rmSync(assetDir,{recursive:true,force:true});fs.mkdirSync(assetDir,{recursive:true});
const common={bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,metafile:true,legalComments:'linked',outdir:assetDir.pathname};
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
