import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContrastStory} from '../src/fish-ep-contrast-model.js';
const record=JSON.parse(await readFile(new URL('../../notes/fish-ep-sample.json',import.meta.url),'utf8'));
const story=buildContrastStory(record);
const near=(actual,expected,tolerance=2e-14)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
test('教学输出平衡把标签误差送入每个时刻的局部导数',()=>{
  for(const [name,sign] of [['plus',1],['minus',-1]]) {
    const phase=record.phases[name],b=sign*story.beta/story.count;
    for(let t=0;t<7;t++) {
      const q=record.parameters.before.C[2].reduce((sum,w,k)=>sum+w*phase.activity[t][k],0);
      near(phase.output[t][2],(q+b*record.targets[t][2])/(1+b));
      near(story.phases[name].terms[t],b/(1+b)*(q-record.targets[t][2])*phase.activity[t][0]);
    }
    near(story.phases[name].g,record.parameters.local_gradients[name].C[2][0]);
  }
});
test('分别除以有符号 β 再平均，等于保存的中心 EP 方向',()=>{
  assert.ok(story.positiveEstimate<0&&story.negativeEstimate<0);
  near(story.positiveEstimate,-0.00032501646519874483);
  near(story.negativeEstimate,-0.0003251234176747786);
  near(story.slope,(story.phases.plus.g-story.phases.minus.g)/(2*story.beta));
  near(story.slope,story.savedSlope);
  near(story.slope,story.exact,2e-11);
  near(story.exact,record.parameter_probe.exact_free_loss_gradient);
});
test('负斜率的权重增加与独立损失方向一致',()=>{
  assert.ok(story.change>0);
  near(story.newWeight,story.weight-story.rate*story.slope);
  assert.ok(story.probes[0].loss>story.probes[1].loss&&story.probes[1].loss>story.probes[2].loss);
  near((story.probes[2].loss-story.probes[0].loss)/.002,story.slope,2e-11);
});
test('鱼的固定时刻、教学端点、单参数与完整更新效果分开',()=>{
  near(story.phases.free.x,502.41506508160234,1e-10);
  near(story.phases.plus.x,502.41711618073595,1e-10);
  near(story.phases.minus.x,502.4130133483279,1e-10);
  near(story.truth[0],516.4519618822378,1e-10);
  near(story.probes[3].x,502.4387591389047,1e-10);
  near(story.allX,507.6152274359215,1e-10);
  assert.ok(story.probes[3].error>22&&story.allError<9);
});

test('自由态一刻的平方损失斜率与独立 Python 权重探针相等',()=>{
  let sum=0;
  for(let t=0;t<7;t++) {
    const low=record.parameter_probe.trials[0].output[t][2]-record.targets[t][2];
    const high=record.parameter_probe.trials[2].output[t][2]-record.targets[t][2];
    const finiteSlope=(high**2-low**2)/(2*story.count*.002);
    near(story.phases.free.rows[t].errorActivityOverN,finiteSlope);
    sum+=finiteSlope;
  }
  near(sum,story.exact);
  near(story.focusSlope,-0.0000541342250679199);
});

test('正负侧局部导数都精确分解为 β、校正因子、教学态误差乘积',()=>{
  for(const name of ['plus','minus']) {
    const phase=story.phases[name];
    for(let t=0;t<7;t++) {
      near(phase.terms[t],phase.teachingBeta*phase.factor*phase.rows[t].errorActivityOverN,2e-17);
      near(phase.terms[t],phase.teachingBeta*phase.rows[t].outputError*phase.rows[t].a/story.count,2e-17);
    }
    near(phase.factor,story.count/(story.count+phase.teachingBeta));
  }
  assert.ok(story.phases.plus.factor<1&&story.phases.minus.factor>1);
});

test('实际正负教学接近自由态，但不能把有限 β 的近似写成相等',()=>{
  near(story.beta*story.focusSlope,-0.00000016240267520375972,1e-20);
  for(const name of ['plus','minus']) {
    const phase=story.phases[name],expected=phase.teachingBeta*story.focusSlope;
    const relativeDifference=Math.abs(phase.terms[6]/expected-1);
    assert.ok(relativeDifference>.00022&&relativeDifference<.00023);
    assert.ok(Math.abs(phase.terms[6]-expected)>3.6e-11);
    assert.ok(Math.abs(phase.rows[6].error-story.phases.free.rows[6].error)<1.21e-5);
    assert.ok(Math.abs(phase.a-story.phases.free.a)<7.53e-6);
  }
});
