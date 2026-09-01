import { EventEmitter } from 'eventemitter3';
import { Collection } from '../Collection.ts';

export interface ChatMessage {
  id: number | null;
  serialize(): unknown;
}

/** Holds a room's chat log. The server subclass adds validation (length + flood). */
export class BaseChat extends EventEmitter {
  messages = new Collection<ChatMessage>([], 'id', true);

  addMessage(message: ChatMessage): boolean {
    if (!this.isValid(message)) {
      return false;
    }

    this.messages.add(message);
    this.emit('message', message);

    return true;
  }

  isValid(_message: ChatMessage): boolean {
    return true;
  }

  clearMessages(): void {
    this.messages.clear();
  }

  /**
   * The last `max` messages, serialized. NOTE legacy quirk: the returned array
   * keeps the full length with holes for the trimmed-off head (a sparse array),
   * not a compacted slice.
   */
  serialize(max?: number): unknown[] {
    const length = this.messages.items.length;
    const limit = typeof max === 'number' ? Math.min(max, length) : length;
    const min = length - limit;
    const messages = new Array<unknown>(length);

    for (let i = length - 1; i >= min; i--) {
      messages[i] = this.messages.items[i]!.serialize();
    }

    return messages;
  }
}
