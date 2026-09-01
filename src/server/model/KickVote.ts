import { EventEmitter } from 'eventemitter3';
import { Collection } from '@shared/Collection.ts';

/** A vote to kick one player; passes at > total/2, auto-closes when empty. */
export class KickVote extends EventEmitter {
  static readonly timeToClose = 10000;

  id: string | number;
  target: any;
  votes = new Collection<any>();
  total: number;
  closed = false;
  result = false;
  timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(player: any, total: number | string) {
    super();
    this.id = player.id;
    this.target = player;
    this.total = parseInt(String(total), 10);
    this.close = this.close.bind(this);
  }

  setTotal(total: number): this {
    if (this.closed) {
      return this;
    }
    this.total = total;
    this.check();
    return this;
  }

  toggleVote(client: any): this {
    if (this.closed) {
      return this;
    }
    if (this.hasVote(client)) {
      this.votes.remove(client);
    } else {
      this.votes.add(client);
    }
    this.check();
    return this;
  }

  removeClient(client: any): boolean {
    const result = this.votes.remove(client);
    this.check();
    return result;
  }

  check(): void {
    if (this.closed) {
      return;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (this.votes.count() > this.total / 2) {
      this.result = true;
      this.close();
    } else if (this.votes.isEmpty()) {
      this.timeout = setTimeout(this.close, KickVote.timeToClose);
    }
  }

  close(): void {
    this.closed = true;
    this.votes.clear();
    this.emit('close', this);
  }

  hasVote(client: any): boolean {
    return this.votes.exists(client);
  }

  serialize(): { target: string | number; result: boolean } {
    return { target: this.target.id, result: this.result };
  }
}
