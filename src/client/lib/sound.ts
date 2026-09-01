import { get } from 'svelte/store';
import { profile } from './stores/profile.ts';

/** Short in-game cues. Files live in `web/sounds/<name>.{mp3,ogg}`. */
export type SoundName = 'death' | 'bonus-pop' | 'bonus-clear' | 'win' | 'notice' | 'tap';

const NAMES: SoundName[] = ['death', 'bonus-pop', 'bonus-clear', 'win', 'notice', 'tap'];

/**
 * Tiny sound-effect player over `HTMLAudioElement`. One preloaded template per
 * cue; each `play()` clones it so overlapping hits don't cut each other off.
 * Honours the profile `sound` toggle. No-ops when Audio is unavailable (SSR / tests).
 */
class Sound {
  private templates = new Map<SoundName, HTMLAudioElement>();
  private unlocked = false;

  constructor() {
    if (typeof Audio === 'undefined') {
      return;
    }
    const canOgg =
      !!document.createElement('audio').canPlayType &&
      document.createElement('audio').canPlayType('audio/ogg') !== '';
    const ext = canOgg ? 'ogg' : 'mp3';
    for (const name of NAMES) {
      const el = new Audio(`sounds/${name}.${ext}`);
      el.preload = 'auto';
      this.templates.set(name, el);
    }
  }

  /** Some browsers need a user gesture before audio can start. Call from a click/keydown. */
  unlock(): void {
    if (this.unlocked || !this.templates.size) {
      return;
    }
    this.unlocked = true;
  }

  enabled(): boolean {
    try {
      return get(profile).sound;
    } catch {
      return false;
    }
  }

  play(name: SoundName): void {
    if (!this.enabled()) {
      return;
    }
    const template = this.templates.get(name);
    if (!template) {
      return;
    }
    const el = template.cloneNode() as HTMLAudioElement;
    el.volume = name === 'win' ? 0.6 : 0.4;
    void el.play().catch(() => {
      /* autoplay blocked until first gesture — ignore */
    });
  }
}

export const sound = new Sound();
