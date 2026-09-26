export const DEFAULT_SIM_HZ=30;

export class FixedStepClock{
  constructor({hz=DEFAULT_SIM_HZ,maxCatchUpSteps=6}={}){
    this.hz=hz;
    this.fixedDelta=1/hz;
    this.maxCatchUpSteps=maxCatchUpSteps;
    this.accumulator=0;
    this.tick=0;
    this.paused=false;
    this.alpha=0;
  }
  reset(){this.accumulator=0;this.tick=0;this.alpha=0;this.paused=false;}
  setPaused(paused){this.paused=!!paused;}
  stepOnce(stepFn){this.tick++;stepFn?.(this.fixedDelta,this.tick);this.alpha=0;return 1;}
  advance(realDt,stepFn){
    if(this.paused){this.alpha=0;return 0;}
    const dt=Math.max(0,Math.min(.25,Number(realDt)||0));
    this.accumulator+=dt;
    let steps=0;
    while(this.accumulator+1e-10>=this.fixedDelta&&steps<this.maxCatchUpSteps){
      this.accumulator-=this.fixedDelta;
      this.tick++;
      stepFn?.(this.fixedDelta,this.tick);
      steps++;
    }
    if(steps===this.maxCatchUpSteps&&this.accumulator>=this.fixedDelta)this.accumulator%=this.fixedDelta;
    this.alpha=this.accumulator/this.fixedDelta;
    return steps;
  }
}
