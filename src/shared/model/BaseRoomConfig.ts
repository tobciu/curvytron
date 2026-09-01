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
    const parsed = parseInt(String(maxScore), 10);
    this.maxScore = parsed ? parsed : null;
    return true;
  }

  variableExists(variable: string): boolean {
    return typeof this.variables[variable] !== 'undefined';
  }

  setVariable(variable: string, value: number | string): boolean {
    if (!this.variableExists(variable)) {
      return false;
    }

    const parsed = parseFloat(String(value));

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
    return typeof this.bonuses[bonus] !== 'undefined';
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

  setBonus(bonus: string, value: unknown): void {
    if (!this.bonusExists(bonus)) {
      return;
    }
    this.bonuses[bonus] = value ? true : false;
  }

  getMaxScore(): number {
    return this.maxScore ? this.maxScore : this.getDefaultMaxScore();
  }

  getDefaultMaxScore(): number {
    return Math.max(1, (this.room.players.count() - 1) * 10);
  }

  allow(password: string | null): boolean {
    return this.open || this.password === password;
  }

  generatePassword(): string {
    let password = '';
    for (let i = 0; i < BaseRoomConfig.passwordLength; i++) {
      password += Math.ceil(Math.random() * 9).toString();
    }
    return password;
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
