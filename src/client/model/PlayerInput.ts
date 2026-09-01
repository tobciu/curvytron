import { EventEmitter } from 'eventemitter3';

/** A binding is a keyCode, a `Touch`, or a `gamepad:…` string. */
export type Binding = number | string | Touch;

interface InputAvatar {
  id: string | number;
}

/**
 * Turns the two-key (left / right) binding for one avatar into edge-triggered
 * `move` events (`-1` left, `1` right, `false` release). Keyboard + touch are
 * live; gamepad axis/button capture is deferred.
 */
export class PlayerInput extends EventEmitter {
  static readonly defaultBinding: Binding[] = [37, 39];

  avatar: InputAvatar;
  active: [boolean, boolean] = [false, false];
  move: -1 | 1 | false = false;
  width = 0;
  binding: Binding[];

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const index = this.binding.indexOf(e.keyCode);
    if (index >= 0) {
      this.setActive(index, true);
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const index = this.binding.indexOf(e.keyCode);
    if (index >= 0) {
      this.setActive(index, false);
    }
  };

  private readonly onTouch = (e: TouchEvent): void => {
    e.preventDefault();

    const center = this.width / 2;
    const tests: { index: number; result: boolean }[] = [];

    for (let i = this.binding.length - 1; i >= 0; i--) {
      if (typeof Touch !== 'undefined' && this.binding[i] instanceof Touch) {
        tests.push({ index: i, result: false });
      }
    }

    for (let i = e.touches.length - 1; i >= 0; i--) {
      for (let t = tests.length - 1; t >= 0; t--) {
        const x = e.touches[i]!.screenX;
        if (tests[t]!.index === 0 ? x < center : x >= center) {
          tests[t]!.result = true;
        }
      }
    }

    for (let i = tests.length - 1; i >= 0; i--) {
      this.setActive(tests[i]!.index, tests[i]!.result);
    }
  };

  constructor(avatar: InputAvatar, binding?: Binding[]) {
    super();
    this.avatar = avatar;
    this.binding = binding ?? PlayerInput.defaultBinding;
    this.attachEvents();
  }

  attachEvents(): void {
    for (const type of this.listeningTypes()) {
      if (type === 'keyboard') {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
      } else if (type === 'touch') {
        for (const ev of ['touchstart', 'touchend', 'touchleave', 'touchcancel']) {
          window.addEventListener(ev, this.onTouch as EventListener);
        }
      }
      // gamepad bindings: deferred
    }
  }

  detachEvents(): void {
    for (const type of this.listeningTypes()) {
      if (type === 'keyboard') {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
      } else if (type === 'touch') {
        for (const ev of ['touchstart', 'touchend', 'touchleave', 'touchcancel']) {
          window.removeEventListener(ev, this.onTouch as EventListener);
        }
      }
    }
  }

  private listeningTypes(): string[] {
    const seen = new Set<string>();
    for (const b of this.binding) {
      seen.add(this.getBindingType(b));
    }
    return [...seen];
  }

  getBindingType(binding: Binding): string {
    if (typeof Touch !== 'undefined' && binding instanceof Touch) {
      return 'touch';
    }
    const matches = /^(gamepad:(\d+):(button|axis):(\d+))/.exec(String(binding));
    return matches ? matches[1]! : 'keyboard';
  }

  setActive(index: number, pressed: boolean): void {
    if (this.active[index] !== pressed) {
      this.active[index] = pressed as never;
      this.resolve();
    }
  }

  resolve(): void {
    const move: -1 | 1 | false =
      this.active[0] !== this.active[1] ? (this.active[0] ? -1 : 1) : false;
    if (this.move !== move) {
      this.setMove(move);
    }
  }

  useGamepad(): boolean {
    return this.binding.some((b) => /^gamepad:/.test(this.getBindingType(b)));
  }

  setMove(move: -1 | 1 | false): void {
    this.move = move;
    this.emit('move', { avatar: this.avatar, move });
  }

  setWidth(width: number): void {
    this.width = width;
  }
}
