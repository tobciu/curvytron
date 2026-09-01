import { BaseChat } from '@shared/service/BaseChat.ts';
import { FloodFilter } from './FloodFilter.ts';
import { Message } from '../model/Message.ts';

/** Server chat: rejects empty / over-long / flooding messages. */
export class Chat extends BaseChat {
  private readonly floodFilter = new FloodFilter(this.messages.items as any);

  override isValid(message: any): boolean {
    const length = message.content.length;
    return length > 0 && length <= Message.maxLength && this.floodFilter.isValid(message);
  }
}
