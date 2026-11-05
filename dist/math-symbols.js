// Indexed letters are single symbols, not products or array lookups.
export const CALCULATION_SYMBOLS=new Set(['a','b','c','d','h','k','m','n','p','q','r','s','x','t','u','v','w','y','z','theta','e','pi','i']);
const indexed=/^(theta|pi|[abcdhkmnpqrstuvwxyzie])_([0-9]{1,12}|[a-z])$/;
const guidance='아래첨자는 문자 뒤에 a_1, a_{12}, a_n처럼 적어 주세요. 숫자 1~12자리 또는 영문 소문자 한 글자를 지원합니다. a_{n+1} 같은 식·중첩 첨자는 아직 지원하지 않습니다.';
export const isCalculationSymbol=name=>CALCULATION_SYMBOLS.has(name)||indexed.test(name);
export function normalizeSubscripts(source){
 const text=source.replace(/_\s*\{([^{}]*)\}/g,(match,index,at,source)=>{
  const value=index.trim();if(!/^(?:[0-9]{1,12}|[a-z])$/.test(value))throw Error(guidance);return '_'+value+(/[A-Za-z0-9]/.test(source[at+match.length]||'')?' ':'');
 }).replace(/\s*_\s*/g,'_');
 for(const [name]of text.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g))if(name.includes('_')&&!indexed.test(name))throw Error(guidance);
 return text;
}
export function indexedSymbolLatex(node){
 if(!node.isSymbolNode)return;
 const match=indexed.exec(node.name);if(!match)return;
 const [,base,index]=match;return ` ${base==='theta'||base==='pi'?'\\'+base:base}_{${index}}`;
}
