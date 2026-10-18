import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {parseHTML} from 'linkedom';
import {isPublicBuild} from '../scripts/indexing.mjs';

const origin='https://susik.app';
const root=new URL('../dist/',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const page=path=>parseHTML(read(path)).document;
const urls=[...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
const documents=new Map(urls.map(url=>[url.pathname,page(`${url.pathname.slice(1)}index.html`)]));

test('production sitemap contains unique, indexable static canonical pages with individual metadata',()=>{
 assert.equal(urls.length,10);assert.equal(new Set(urls.map(url=>url.href)).size,10);
 const titles=new Set(),descriptions=new Set();
 for(const url of urls){
  assert.equal(url.origin,origin);assert.equal(url.search,'');assert.equal(url.hash,'');
  const document=documents.get(url.pathname);
  assert.equal(document.documentElement.lang,'ko');
  assert.equal(document.querySelectorAll('link[rel=canonical]').length,1);
  assert.equal(document.querySelector('link[rel=canonical]').href,url.href);
  assert.equal(document.querySelectorAll('meta[name=robots]').length,1);
  assert.equal(document.querySelector('meta[name=robots]').content,'index,follow');
  const title=document.querySelector('title').textContent.trim();
  const description=document.querySelector('meta[name=description]').content.trim();
  assert(title);assert(description);assert(!titles.has(title),url.href);assert(!descriptions.has(description),url.href);
  titles.add(title);descriptions.add(description);
  // There are no translated editions; Korean copies must not acquire locale URLs.
  assert.equal(document.querySelectorAll('link[hreflang]').length,0);
 }
 assert.match(read('robots.txt'),/Allow: \/\nSitemap: https:\/\/susik\.app\/sitemap\.xml/);
 assert.doesNotMatch(read('robots.txt'),/Disallow/);
 assert.doesNotMatch(read('sitemap.xml'),/<lastmod>/);
});

test('all canonical pages are reachable from home through real links and static lesson fragments resolve',()=>{
 const seen=new Set(),pending=['/'];
 while(pending.length){
  const path=pending.pop();if(seen.has(path))continue;seen.add(path);
  for(const link of documents.get(path).querySelectorAll('a[href]')){
   const url=new URL(link.href,origin+path);if(url.origin!==origin)continue;
   const target=documents.get(url.pathname);
   assert(target,`Unlisted internal page: ${url.href}`);
   if(url.hash)assert(target.getElementById(decodeURIComponent(url.hash.slice(1))),`Missing fragment: ${url.href}`);
   if(!seen.has(url.pathname))pending.push(url.pathname);
  }
 }
 assert.deepEqual([...seen].sort(),[...documents.keys()].sort());
 for(const [path,document]of documents){
  if(!path.startsWith('/learn/'))continue;
  assert.equal(document.querySelectorAll('script,iframe').length,0,path);
  assert.equal(document.querySelectorAll('h1').length,1,path);
  assert(document.querySelector('article').textContent.trim().length>500,path);
 }
});

test('home includes a visible static learning-tool description and lesson link outside the replaced app',()=>{
 const document=documents.get('/'),intro=document.querySelector('[data-workspace-intro]');
 assert(intro);assert(!intro.closest('#app,script,noscript,[hidden]'));
 assert.match(intro.textContent,/직접 수식을 쓰고 항을 조작/);
 assert.match(intro.textContent,/조건과 변형 이유/);
 assert.equal(intro.querySelector('a').href,'/learn/');
 assert.equal(intro.querySelector('a').target,'_blank');
 document.querySelector('#app').innerHTML='<p>작업실</p>';
 assert(intro.isConnected);
});

test('unfinished pages and missing-page guidance stay out of the canonical sitemap',()=>{
 for(const name of ['factor/','expand/','fraction/','power/']){
  assert(!documents.has('/learn/'+name));
  assert.equal(page(`learn/${name}index.html`).querySelector('meta[name=robots]').content,'noindex,nofollow');
 }
 const missing=page('404.html');
 assert.equal(missing.querySelector('meta[name=robots]').content,'noindex,nofollow');
 assert.equal(missing.querySelectorAll('link[rel=canonical]').length,0);
 assert(!urls.some(url=>url.pathname.includes('404')));
 assert.equal(missing.querySelector('a[href="/learn/"]').textContent,'개념 해설 목록');
});

test('Workers and Pages main builds are public while previews and unknown cloud branches are not',()=>{
 for(const env of [{},{WORKERS_CI:'1',WORKERS_CI_BRANCH:'main'},{CF_PAGES:'1',CF_PAGES_BRANCH:'main'}])assert.equal(isPublicBuild(env),true,JSON.stringify(env));
 for(const env of [{WORKERS_CI_BRANCH:'feature/lesson'},{CF_PAGES_BRANCH:'feature/lesson'},{WORKERS_CI:'1'},{CF_PAGES:'1'},{WORKERS_CI_BRANCH:'feature/lesson',CF_PAGES_BRANCH:'main'},{WORKERS_CI_BRANCH:'main',CF_PAGES_BRANCH:'feature/lesson'}])assert.equal(isPublicBuild(env),false,JSON.stringify(env));
});

test('local HTTP serves real canonical pages and XML while unknown slugs return 404 instead of the workspace',async t=>{
 const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{const exited=once(server,'exit');server.kill();await exited;});
 const base=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Local server did not start')),5000);
  server.once('error',error=>{clearTimeout(timer);reject(error);});
  server.stdout.on('data',data=>{const port=String(data).match(/localhost:(\d+)/)?.[1];if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});
 });
 for(const url of urls){const response=await fetch(base+url.pathname);assert.equal(response.status,200,url.pathname);assert.match(response.headers.get('content-type'),/^text\/html/);}
 const verificationPath='/naver9b3365185d9eedc597a6cf23067915dc.html';
 const verification=await fetch(base+verificationPath,{redirect:'manual'});
 assert.equal(verification.status,200);assert.equal(verification.headers.get('location'),null);
 assert.equal(await verification.text(),'naver-site-verification: naver9b3365185d9eedc597a6cf23067915dc.html');
 assert(!urls.some(url=>url.pathname===verificationPath));
 const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/^application\/xml/);
 for(const path of ['/learn/indexing-test-missing/','/indexing-test-missing']){
  const response=await fetch(base+path);assert.equal(response.status,404,path);
  const html=await response.text();assert.match(html,/페이지가 없습니다/);assert.doesNotMatch(html,/id="app"|data-workspace-loader/);
 }
});
