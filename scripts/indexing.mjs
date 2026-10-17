// Both Cloudflare build products expose the pushed branch. A known preview
// branch (or a cloud build missing its branch) must not become indexable.
export function isPublicBuild(env=process.env){
 const branches=[env.WORKERS_CI_BRANCH,env.CF_PAGES_BRANCH].filter(Boolean);
 return branches.length?branches.every(branch=>branch==='main'):!env.WORKERS_CI&&!env.CF_PAGES;
}
