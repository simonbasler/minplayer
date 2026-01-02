export class AudioEngine {
  private audio: HTMLAudioElement;
  private onTimeUpdate: ((currentTime: number) => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onDurationChange: ((duration: number) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener("timeupdate", () => {
      if (this.onTimeUpdate) this.onTimeUpdate(this.audio.currentTime);
    });
    this.audio.addEventListener("ended", () => {
      if (this.onEnded) this.onEnded();
    });
    this.audio.addEventListener("loadedmetadata", () => {
      if (this.onDurationChange) this.onDurationChange(this.audio.duration);
    });
    this.audio.addEventListener("error", () => {
      console.error("Audio Playback Error:", this.audio.error, this.audio.src);
    });
  }

  load(src: string) {
    // For local files in Tauri, we might need the "asset:" protocol or convertFileSrc
    // But for now, let's assume standard URL or converted path is passed
    this.audio.src = src;
    this.audio.load();
  }

  play() {
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  setHandlers(
    onTimeUpdate: (t: number) => void,
    onEnded: () => void,
    onDurationChange: (d: number) => void
  ) {
    this.onTimeUpdate = onTimeUpdate;
    this.onEnded = onEnded;
    this.onDurationChange = onDurationChange;
  }
}
