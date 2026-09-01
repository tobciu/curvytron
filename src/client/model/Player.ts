import { BasePlayer, type PlayerClient } from '@shared/model/BasePlayer.ts';
import { PlayerControl } from './PlayerControl.ts';

/** Client-side player: adds local/rebindable controls and master detection. */
export class Player extends BasePlayer {
  local = false;
  controls: PlayerControl[] | null = null;
  vote = false;
  kicked = false;
  position: string;

  constructor(
    id: string | number,
    client: PlayerClient,
    name: string,
    color?: string,
    ready?: boolean,
  ) {
    super(client, name, color, ready);
    this.id = id;
    this.position = `${this.client.id}-${this.id}`;

    this.onControlChange = this.onControlChange.bind(this);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.client as any).players.add(this);
  }

  setLocal(local: boolean): void {
    this.local = local;
    this.initControls();
  }

  initControls(): void {
    if (!this.controls) {
      this.controls = [
        new PlayerControl(37, 'icon-left-dir'),
        new PlayerControl(39, 'icon-right-dir'),
      ];
      for (const control of this.controls) {
        control.on('change', this.onControlChange);
      }
    }
  }

  getMapping(): Array<{ mapper: string; value: unknown }> {
    return (this.controls ?? []).map((c) => c.getMapping());
  }

  onControlChange(): void {
    this.emit('control:change');
  }

  getBinding(): unknown[] {
    return [this.controls?.[0]?.mapper.value, this.controls?.[1]?.mapper.value];
  }

  isMaster(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = this.client as any;
    return client.master && client.players.getIdIndex(this.id) === 0;
  }
}
