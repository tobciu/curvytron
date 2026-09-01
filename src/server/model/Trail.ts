import { BaseTrail } from '@shared/model/BaseTrail.ts';

/**
 * Server trail — clearing also notifies the game controller.
 */
export class Trail extends BaseTrail {
  clear(): void {
    super.clear();
    this.emit('clear', { avatar: this.avatar });
  }
}
