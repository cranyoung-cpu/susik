import {CalculationError} from './calculation-errors.js';
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a||1n;}
export class Q{
 constructor(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)throw new CalculationError('undefined','0으로 나눌 수 없습니다.');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);this.n=n/g;this.d=d/g;if(abs(this.n).toString().length>150||this.d.toString().length>150)throw new CalculationError('unsupported','계산 가능한 수의 범위를 넘었습니다.');}
 add(b){return new Q(this.n*b.d+b.n*this.d,this.d*b.d)}
 mul(b){return new Q(this.n*b.n,this.d*b.d)}
 neg(){return new Q(-this.n,this.d)}
 inv(){return new Q(this.d,this.n)}
 eq(b){return this.n===b.n&&this.d===b.d}
 get zero(){return this.n===0n}
 toString(){return this.d===1n?String(this.n):`${this.n}/${this.d}`}
}

export class C {
 constructor(re=0,im=0){this.re=re instanceof Q?re:new Q(re);this.im=im instanceof Q?im:new Q(im);}
 static from(v){return v instanceof C?v:new C(v);}
 add(v){const b=C.from(v);return new C(this.re.add(b.re),this.im.add(b.im));}
 neg(){return new C(this.re.neg(),this.im.neg());}
 mul(v){const b=C.from(v);return new C(this.re.mul(b.re).add(this.im.mul(b.im).neg()),this.re.mul(b.im).add(this.im.mul(b.re)));}
 inv(){const norm=this.re.mul(this.re).add(this.im.mul(this.im));if(norm.zero)throw new CalculationError('undefined','0으로 나눌 수 없습니다.');return new C(this.re.mul(norm.inv()),this.im.neg().mul(norm.inv()));}
 eq(v){const b=C.from(v);return this.re.eq(b.re)&&this.im.eq(b.im);}
 get zero(){return this.re.zero&&this.im.zero;}
 toString(){if(this.im.zero)return String(this.re);const negative=this.im.n<0n,b=negative?this.im.neg():this.im,imag=(b.eq(new Q(1))?'':String(b))+'i';return this.re.zero?(negative?'-':'')+imag:String(this.re)+(negative?'-':'+')+imag;}
}
