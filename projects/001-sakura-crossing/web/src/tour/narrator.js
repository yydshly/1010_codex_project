import { TOUR_DURATION } from './route.js';

// The HTML media clock owns the timeline, including buffering and device pauses.
export class TourNarrator {
  wanted = false;
  pending = false;
  request = 0;
  constructor(audio, clock, onError = () => {}) {
    this.audio = audio; this.clock = clock; this.onError = onError;
    audio.addEventListener('error', () => this.fail('讲解音频加载失败，请刷新后重试。'));
    audio.addEventListener('pause', () => {
      if (this.wanted && !audio.ended) this.fail('语音已暂停，点击继续导览。');
    });
    audio.addEventListener('ended', () => {
      if (!this.wanted || clock.mode !== 'playing') return;
      clock.follow(TOUR_DURATION); this.stop();
    });
  }
  get waiting() { return this.wanted && (this.pending || this.audio.paused || this.audio.seeking || this.audio.readyState < 3); }
  sample() {
    if (this.wanted && this.clock.mode === 'playing' && !this.audio.seeking && !this.audio.paused) {
      this.clock.follow(this.audio.ended ? TOUR_DURATION : this.audio.currentTime);
    }
  }
  stop() {
    this.wanted = false; this.pending = false; this.request++;
    this.audio.pause();
  }
  pause() { this.sample(); this.stop(); }
  seek(value) { this.stop(); this.audio.currentTime = value; }
  play() {
    const request = ++this.request;
    this.wanted = true; this.pending = true;
    if (this.audio.error) { this.audio.load(); this.audio.currentTime = this.clock.elapsed; }
    // Called directly by Start / Continue, preserving the browser's user gesture.
    return Promise.resolve(this.audio.play()).then(() => {
      if (!this.wanted) this.audio.pause();
      if (request === this.request) this.pending = false;
    }).catch((error) => {
      if (request !== this.request || !this.wanted) return;
      this.fail(error.name === 'NotAllowedError' ? '浏览器暂未允许播放声音，请点击继续导览。' : '语音暂时无法播放，请点击继续导览重试。');
    });
  }
  fail(message) {
    this.sample(); this.stop(); this.clock.pause(); this.onError(message);
  }
}
