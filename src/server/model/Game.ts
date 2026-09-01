import { BaseGame, type GameRoom } from '@shared/model/BaseGame.ts';
import type { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import { Collection } from '@shared/Collection.ts';
import { World } from '../core/World.ts';
import { AvatarBody } from '../core/AvatarBody.ts';
import { FPSLogger } from '../service/FPSLogger.ts';
import { BonusManager } from '../manager/BonusManager.ts';
import { GameBonusStack } from './GameBonusStack.ts';
import { Avatar } from './Avatar.ts';
import { GameController } from '../controller/GameController.ts';

/** The authoritative simulation: the per-tick update, kills, scoring and rounds. */
export class Game extends BaseGame {
  static override FpsLoggerClass = FPSLogger;
  static override BonusManagerClass = BonusManager as unknown as new (g: unknown, b: unknown[], r: number) => import('@shared/manager/BaseBonusManager.ts').BaseBonusManager;

  declare avatars: Collection<Avatar>;
  world: World;
  deaths = new Collection<Avatar>([], 'id');
  controller: GameController;
  bonusStack: GameBonusStack;
  roundWinner: Avatar | null = null;
  gameWinner: Avatar | null = null;
  deathInFrame = false;

  constructor(room: GameRoom) {
    super(room);

    this.world = new World(this.size);
    this.controller = new GameController(this);
    this.bonusStack = new GameBonusStack(this);

    this.onPoint = this.onPoint.bind(this);

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.avatars.items[i]!;
      avatar.clear();
      avatar.on('point', this.onPoint);
    }
  }

  override update(_step: number): void {
    const score = this.deaths.count();
    this.deathInFrame = false;

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.avatars.items[i]!;

      if (avatar.alive) {
        avatar.update(_step);

        const border = this.world.getBoundIntersect(
          avatar.body,
          this.borderless || avatar.ghost ? 0 : avatar.radius,
        );

        if (border) {
          if (this.borderless || avatar.ghost) {
            const position = this.world.getOposite(border[0], border[1]);
            avatar.setPosition(position[0], position[1]);
          } else {
            this.kill(avatar, null, score);
          }
        } else if (!avatar.invincible) {
          const killer = this.world.getBody(avatar.body);
          if (killer) {
            this.kill(avatar, killer, score);
          }
        }

        if (avatar.alive) {
          avatar.printManager.test();
          (this.bonusManager as BonusManager).testCatch(avatar);
        }
      }
    }

    if (this.deathInFrame) {
      this.checkRoundEnd();
    }
  }

  kill(avatar: Avatar, killer: any, score: number): void {
    avatar.die(killer);
    avatar.addScore(score);
    this.deaths.add(avatar);
    this.deathInFrame = true;
  }

  override removeAvatar(avatar: BaseAvatar): void {
    super.removeAvatar(avatar);
    this.emit('player:leave', { player: avatar.player });
    this.checkRoundEnd();
  }

  onPoint(data: any): void {
    if (this.started && this.world.active) {
      this.world.addBody(new AvatarBody(data.x, data.y, data.avatar));
    }
  }

  isWon(): Avatar | null | true {
    const present = this.getPresentAvatars().count();

    if (present <= 0) {
      return true;
    }
    if (this.avatars.count() > 1 && present <= 1) {
      return true;
    }

    const maxScore = this.maxScore;
    const players = this.avatars.filter(function (this: Avatar) {
      return this.present && this.score >= maxScore;
    });

    if (players.count() === 0) {
      return null;
    }
    if (players.count() === 1) {
      return players.getFirst();
    }

    this.sortAvatars(players);

    return players.items[0]!.score === players.items[1]!.score ? null : players.getFirst();
  }

  checkRoundEnd(): void {
    if (!this.inRound) {
      return;
    }

    let alive = false;
    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      if (this.avatars.items[i]!.alive) {
        if (!alive) {
          alive = true;
        } else {
          return;
        }
      }
    }

    this.endRound();
  }

  resolveScores(): void {
    let winner: Avatar | null;

    if (this.avatars.count() === 1) {
      winner = this.avatars.getFirst();
    } else {
      winner = this.avatars.match(function (this: Avatar) {
        return this.alive;
      });
    }

    if (winner) {
      winner.addScore(Math.max(this.avatars.count() - 1, 1));
      this.roundWinner = winner;
    }

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      this.avatars.items[i]!.resolveScore();
    }
  }

  clearTrails(): void {
    this.world.clear();
    this.world.activate();
    this.emit('clear', { game: this });
  }

  override setSize(): void {
    super.setSize();
    this.world.clear();
    this.world = new World(this.size);
    (this.bonusManager as BonusManager).setSize();
  }

  override onRoundEnd(): void {
    this.resolveScores();
    this.emit('round:end', { winner: this.roundWinner });
  }

  override onRoundNew(): void {
    this.emit('round:new', { game: this });
    super.onRoundNew();

    this.roundWinner = null;
    this.world.clear();
    this.deaths.clear();
    this.bonusStack.clear();

    const scoreLeader = this.sortAvatars(this.avatars).getFirst()!.score;

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.avatars.items[i]!;
      if (avatar.present) {
        const position = this.world.getRandomPosition(avatar.radius, BaseGame.spawnMargin);
        avatar.setPosition(position[0], position[1]);
        avatar.setAngle(
          this.world.getRandomDirection(avatar.x, avatar.y, BaseGame.spawnAngleMargin),
        );
        if (scoreLeader !== 0 && avatar.score === scoreLeader) {
          avatar.setBorderColor('#FFD700');
        }
      } else {
        this.deaths.add(avatar);
      }
    }
  }

  override onStart(): void {
    this.emit('game:start', { game: this });

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      setTimeout(this.avatars.items[i]!.printManager.start, 3000);
    }

    this.world.activate();
    super.onStart();
  }

  override onStop(): void {
    this.emit('game:stop', { game: this });
    super.onStop();

    const won = this.isWon();

    if (won) {
      if (won instanceof Avatar) {
        this.gameWinner = won;
      }
      this.end();
    } else {
      this.newRound();
    }
  }

  override setBorderless(borderless: boolean): void {
    if (this.borderless !== borderless) {
      super.setBorderless(borderless);
      this.emit('borderless', this.borderless);
    }
  }

  override end(): boolean {
    if (super.end()) {
      this.avatars.clear();
      this.world.clear();
      return true;
    }
    return false;
  }
}
