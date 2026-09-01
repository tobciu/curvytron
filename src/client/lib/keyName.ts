/** Human label for a keyboard `keyCode` (enough for the arrows / WASD / common keys). */
const NAMES: Record<number, string> = {
  8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
  27: 'Esc', 32: 'Space', 37: '←', 38: '↑', 39: '→', 40: '↓',
};

export function keyName(code: number | null | undefined): string {
  if (code == null) {
    return '—';
  }
  if (NAMES[code]) {
    return NAMES[code]!;
  }
  if (code >= 48 && code <= 90) {
    return String.fromCharCode(code); // 0-9, A-Z
  }
  if (code >= 96 && code <= 105) {
    return 'Num ' + (code - 96);
  }
  return 'Key ' + code;
}
