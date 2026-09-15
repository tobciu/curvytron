import { EventEmitter } from 'eventemitter3';

export interface RoomConfigRoom {
  players: { count(): number };
}

/** The room's tunable rules: max score, per-bonus on/off, the `bonusRate` variable, privacy. */
export class BaseRoomConfig extends EventEmitter {
  static readonly passwordLength = 4;

  room: RoomConfigRoom;
  maxScore: number | null = null;
  open = true;
  password: string | null = null;

  variables: Record<string, number> = {
    bonusRate: 0,
  };

  bonuses: Record<string, boolean> = {
    BonusSelfSmall: true,
    BonusSelfSlow: true,
    BonusSelfFast: true,
    BonusSelfMaster: true,
    BonusEnemySlow: true,
    BonusEnemyFast: true,
    BonusEnemyBig: true,
    BonusEnemyInverse: true,
    BonusEnemyStraightAngle: true,
    BonusGameBorderless: true,
    BonusAllColor: true,
    BonusGameClear: true,
    BonusSelfRandom: false,
    BonusLeaderRandom: false,
    BonusEnemyRandom: false,
    BonusLeaderFast: true,
    BonusLeaderInverse: true,
    BonusLeaderSlow: true,
    BonusSelfBorderless: true,
  };

  constructor(room: RoomConfigRoom) {
    super();
    this.room = room;
  }

  setMaxScore(maxScore: number | string): boolean {
    const parsed = Number.parseInt(String(maxScore), 10);
    // `||` (not `??`) is deliberate: 0/NaN are invalid max scores too, both fall through to null.
    this.maxScore = parsed || null;
    return true;
  }

  variableExists(variable: string): boolean {
    return this.variables[variable] !== undefined;
  }

  setVariable(variable: string, value: number | string): boolean {
    if (!this.variableExists(variable)) {
      return false;
    }

    const parsed = Number.parseFloat(String(value));

    if (-1 > parsed || parsed > 1) {
      return false;
    }

    this.variables[variable] = parsed;
    return true;
  }

  getVariable(variable: string): number | undefined {
    if (!this.variableExists(variable)) {
      return undefined;
    }
    return this.variables[variable];
  }

  bonusExists(bonus: string): boolean {
    return this.bonuses[bonus] !== undefined;
  }

  toggleBonus(bonus: string): boolean {
    if (!this.bonusExists(bonus)) {
      return false;
    }
    this.bonuses[bonus] = !this.bonuses[bonus];
    return true;
  }

  getBonus(bonus: string): boolean | undefined {
    if (!this.bonusExists(bonus)) {
      return undefined;
    }
    return this.bonuses[bonus];
  }

  /**
   * The enabled bonus names, sorted. The **server** `RoomConfig` overrides this
   * to return the bonus classes instead (via its `bonusTypes` map).
   */
  getBonuses(): unknown[] {
    const bonuses: string[] = [];
    for (const bonus in this.bonuses) {
      if (this.bonuses[bonus]) {
        bonuses.push(bonus);
      }
    }
    return bonuses.sort((a, b) => a.localeCompare(b));
  }

  setBonus(bonus: string, value: unknown): void {
    if (!this.bonusExists(bonus)) {
      return;
    }
    this.bonuses[bonus] = !!value;
  }

  getMaxScore(): number {
    return this.maxScore ?? this.getDefaultMaxScore();
  }

  getDefaultMaxScore(): number {
    return Math.max(1, (this.room.players.count() - 1) * 10);
  }

  allow(password: string | null): boolean {
    return this.open || this.password === password;
  }

  generatePassword(): string {
    // Gates private-room access, so use the Web Crypto CSPRNG (global in both
    // browser and Node 24) rather than Math.random(). Same 1-9 digit format
    // as before; the tiny modulo bias is irrelevant at this digit count.
    const bytes = new Uint8Array(BaseRoomConfig.passwordLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => (1 + (b % 9)).toString()).join('');
  }

  serialize(): {
    maxScore: number | null;
    variables: Record<string, number>;
    bonuses: Record<string, boolean>;
    open: boolean;
    password: string | null;
  } {
    return {
      maxScore: this.maxScore,
      variables: this.variables,
      bonuses: this.bonuses,
      open: this.open,
      password: this.password,
    };
  }
}
