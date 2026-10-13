// Known input/engine limits are distinct from unexpected processing failures.
export class CalculationError extends Error{
 constructor(reason,message){super(message);this.name='CalculationError';this.reason=reason;}
}
export function calculationFailure(error){
 const reason=error instanceof CalculationError?error.reason:'error';
 const prefix={unsupported:'이 식은 자동 확인 범위 밖입니다. 직접 확인해 주세요.',invalid:'입력한 식의 표기를 확인해 주세요.',undefined:'정의되지 않은 식입니다.'}[reason];
 return prefix?{reason,message:`${prefix} ${error.message}`}:{reason:'error',message:'식을 확인하는 중 문제가 발생했습니다. 다시 시도해 주세요. 정답·오답은 판정하지 않았습니다.'};
}
