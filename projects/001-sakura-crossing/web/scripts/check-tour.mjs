import assert from 'node:assert/strict';
import { TourClock, TOUR_DURATION, sampleTour } from '../src/tour/route.js';
import { TourNarrator } from '../src/tour/narrator.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const clock = new TourClock();
clock.start(); clock.advance(12.4); clock.pause();
const paused = sampleTour(clock.elapsed);
clock.advance(8); assert.deepEqual(sampleTour(clock.elapsed), paused, '暂停期间镜头、字幕和店门状态不能前进');
clock.toggle(); clock.advance(2.6); assert.equal(clock.elapsed, 15);
clock.advance(30, false); assert.equal(clock.elapsed, 15, '不可见时不能消耗导览时间');
clock.seek(20); assert.equal(clock.mode, 'paused'); assert.equal(sampleTour(clock.elapsed).shopOpen, true);
clock.seek(7); assert.equal(sampleTour(clock.elapsed).shopOpen, false, '回看街口必须恢复店门状态');
clock.explore(); clock.advance(50); assert.equal(clock.elapsed, 7); assert.equal(clock.ownsCamera, false);
clock.start();
// Uneven frame intervals must still end at 60 seconds, rather than counting frames.
for (const delta of [11.2, 7.3, 22.1, 19.4]) clock.advance(delta);
assert.equal(clock.elapsed, TOUR_DURATION); assert.equal(clock.mode, 'complete'); assert.equal(clock.ownsCamera, false);
clock.start(); assert.equal(clock.elapsed, 0); assert.equal(clock.mode, 'playing');
clock.seek(999); assert.equal(clock.elapsed, 60); clock.seek(-4); assert.equal(clock.elapsed, 0);
assert.equal(sampleTour(19.999).stop, 0); assert.equal(sampleTour(20).stop, 1); assert.equal(sampleTour(40).stop, 2);
for (let t = 0; t <= 60; t += .1) {
  const shot = sampleTour(t), next = sampleTour(Math.min(t + .001, 60));
  for (const field of ['position', 'target']) {
    assert.ok(shot[field].every(Number.isFinite));
    assert.ok(Math.hypot(...shot[field].map((v, i) => v - next[field][i])) < .02, '相邻时间的镜头路径必须连续');
  }
}
assert.deepEqual(sampleTour(2, true).position, sampleTour(19, true).position, '减少动态时同一站保持静态镜头');
assert.notDeepEqual(sampleTour(19, true).position, sampleTour(20, true).position);
class FakeAudio extends EventTarget {
  currentTime = 0; paused = true; ended = false; readyState = 4; seeking = false; muted = false;
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
}
const media = new FakeAudio(), mediaClock = new TourClock(), errors = [];
const voice = new TourNarrator(media, mediaClock, (message) => errors.push(message));
mediaClock.start(); await voice.play(); media.currentTime = 12.35; voice.sample();
assert.equal(mediaClock.elapsed, 12.35, '镜头时间必须来自音频，不能另开帧计时器');
voice.pause(); mediaClock.pause();
assert.equal(media.paused, true); media.currentTime = 16; voice.sample();
assert.equal(mediaClock.elapsed, 12.35, '暂停后音频、字幕与路线时间冻结');
voice.seek(20); mediaClock.seek(20);
assert.equal(media.currentTime, 20); assert.equal(media.paused, true);
assert.equal(sampleTour(mediaClock.elapsed).stop, 1);
mediaClock.toggle(); await voice.play(); media.currentTime = 20.75; voice.sample();
assert.equal(mediaClock.elapsed, 20.75, '章节回看后从对应语音位置继续');
media.seeking = true; media.currentTime = 0; voice.sample();
assert.equal(mediaClock.elapsed, 20.75, '异步媒体 seek 不能把镜头拉回未就绪的时间');
assert.equal(voice.waiting, true);
media.seeking = false; media.currentTime = 21.2; media.muted = true; voice.sample();
assert.equal(mediaClock.elapsed, 21.2, '静音只改变听感，仍使用同一音频时钟');
voice.pause(); mediaClock.explore(); media.currentTime = 35; voice.sample();
assert.equal(mediaClock.elapsed, 21.2); assert.equal(media.paused, true); assert.equal(mediaClock.ownsCamera, false);
mediaClock.start(); voice.seek(0); await voice.play(); media.ended = true; media.currentTime = 60;
media.dispatchEvent(new Event('ended'));
assert.equal(mediaClock.elapsed, 60); assert.equal(mediaClock.mode, 'complete'); assert.equal(media.paused, true);

// A late browser play() must never restart narration after the user has left the tour.
const lateAudio = new FakeAudio(), lateClock = new TourClock(); let resolvePlay;
lateAudio.play = () => new Promise((resolve) => { resolvePlay = () => { lateAudio.paused = false; resolve(); }; });
const lateVoice = new TourNarrator(lateAudio, lateClock);
lateClock.start(); const pendingPlay = lateVoice.play(); lateVoice.pause(); lateClock.explore();
resolvePlay(); await pendingPlay;
assert.equal(lateAudio.paused, true); assert.equal(lateClock.mode, 'free');
media.ended = false; mediaClock.start(); media.play = () => Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' }));
await voice.play();
assert.equal(mediaClock.mode, 'paused'); assert.equal(media.paused, true); assert.match(errors.at(-1), /浏览器/);
media.play = FakeAudio.prototype.play; mediaClock.toggle(); await voice.play(); media.currentTime = 9;
media.dispatchEvent(new Event('error'));
assert.equal(mediaClock.elapsed, 9); assert.equal(mediaClock.mode, 'paused'); assert.equal(media.paused, true);

const manifest = JSON.parse(await readFile(new URL('../../notes/tour-voice-generation.json', import.meta.url), 'utf8'));
const audioBytes = await readFile(new URL('../src/tour/audio/tour-zh.mp3', import.meta.url));
assert.equal(createHash('sha256').update(audioBytes).digest('hex'), manifest.finalSha256, '打包音频必须匹配实际 MiniMax 生成记录');
assert.equal(manifest.provider, 'MiniMax'); assert.equal(manifest.segments.length, 6);
assert.ok(Math.abs(manifest.encodedDuration - 60) < .1);
for (const segment of manifest.segments) {
  assert.ok(segment.speechUntil < segment.until, '讲解必须完整落在自己的镜头/字幕段落内');
  assert.equal(sampleTour(segment.at).caption, segment.text, '字幕与实际合成文本一致');
}
console.log('导览检查通过：路线与状态；音频主时钟、暂停/回看/自由探索、静音、异步 seek、迟到播放、播放拒绝与加载错误、60 秒结束；MiniMax 音频摘要和六段字幕匹配。');
