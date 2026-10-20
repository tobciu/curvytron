import { GamepadListener } from './lib/GamepadListener.js';

/**
 * Shared gamepad listener
 */
export const gamepadListener = new GamepadListener({ analog: false, deadZone: 0.4 });
