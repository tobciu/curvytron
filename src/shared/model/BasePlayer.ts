import { EventEmitter } from 'eventemitter3';
import { BaseAvatar, type AvatarPlayer } from './BaseAvatar.ts';

export interface PlayerClient {
  id: string | number;
}

/** A named, coloured participant belonging to a socket client. */
export class BasePlayer extends EventEmitter {
  static readonly maxLength = 25;
  static readonly colorMaxLength = 20;

  /** Concrete Avatar — overridden by the client/server Player subclasses. */
  static AvatarClass: new (player: any) => BaseAvatar = BaseAvatar;

  client: PlayerClient;
  name: string;
  color: string;
  ready: boolean;
  id: string | number | null = null;
  avatar: BaseAvatar | null = null;

  constructor(client: PlayerClient, name: string, color?: string, ready?: boolean) {
    super();

    this.client = client;
    this.name = name;
    this.color =
      typeof color !== 'undefined' && this.validateColor(color) ? color : this.getRandomColor();
    this.ready = typeof ready !== 'undefined' && ready;
  }

  setName(name: string): void {
    this.name = name;
  }

  setColor(color: string): boolean {
    if (!this.validateColor(color, true)) {
      return false;
    }
    this.color = color;
    return true;
  }

  equal(player: BasePlayer): boolean {
    return this.id === player.id;
  }

  toggleReady(toggle?: boolean): void {
    this.ready = typeof toggle !== 'undefined' ? (toggle ? true : false) : !this.ready;
  }

  getAvatar(): BaseAvatar {
    if (!this.avatar) {
      this.avatar = new (this.constructor as typeof BasePlayer).AvatarClass(this as unknown as AvatarPlayer);
    }
    return this.avatar;
  }

  reset(): void {
    this.avatar?.destroy();
    this.avatar = null;
    this.ready = false;
  }

  serialize(): {
    client: string | number;
    id: string | number | null;
    name: string;
    color: string;
    ready: boolean;
  } {
    return {
      client: this.client.id,
      id: this.id,
      name: this.name,
      color: this.color,
      ready: this.ready,
    };
  }

  getRandomColor(): string {
    let color = '';
    const randomNum = () => Math.ceil(Math.random() * 255).toString(16);

    while (!this.validateColor(color, true)) {
      color = '#' + randomNum() + randomNum() + randomNum();
    }

    return color;
  }

  validateColor(color: string, yiq?: boolean): boolean {
    if (typeof color !== 'string') {
      return false;
    }

    const matches = color.match(/^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/);

    if (matches && yiq) {
      const ratio =
        (parseInt(matches[1]!, 16) * 0.4 +
          parseInt(matches[2]!, 16) * 0.5 +
          parseInt(matches[3]!, 16) * 0.3) /
        255;

      return ratio > 0.3;
    }

    return matches ? true : false;
  }
}
