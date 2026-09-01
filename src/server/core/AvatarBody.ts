import { Body } from './Body.ts';

export interface AvatarBodyOwner {
  radius: number;
  bodyCount: number;
  trailLatency: number;
  equal(other: unknown): boolean;
}

/**
 * A trail point. Two bodies of the *same* avatar only collide once they are
 * `trailLatency` points apart (so you don't die on your own neck).
 */
export class AvatarBody extends Body {
  /** Age (ms) past which a body is "old" and cheap to skip. */
  static readonly oldAge = 2000;

  num: number;
  birth: number;
  declare data: AvatarBodyOwner;

  constructor(x: number, y: number, avatar: AvatarBodyOwner) {
    super(x, y, avatar.radius, avatar);

    this.num = avatar.bodyCount++;
    this.birth = new Date().getTime();
  }

  match(body: Body): boolean {
    if (body instanceof AvatarBody && this.data.equal(body.data)) {
      return body.num - this.num > this.data.trailLatency;
    }

    return true;
  }

  isOld(): boolean {
    return new Date().getTime() - this.birth >= AvatarBody.oldAge;
  }
}
