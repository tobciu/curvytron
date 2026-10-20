/**
 * Types the Vue UI relies on: the classes of the game model, plus a few shapes that are not classes.
 */
import type { Collection } from '../shared/Collection.ts';
import type { Preset } from '../shared/model/Preset.ts';
import type { Client } from './model/Client.ts';
import type { Message } from './model/message/Message.ts';

export type { Collection, Preset, Client };
export type { Avatar } from './model/Avatar.ts';
export type { Game } from './model/Game.ts';
export type { Player } from './model/Player.ts';
export type { PlayerControl } from './model/PlayerControl.ts';
export type { Room } from './model/Room.ts';
export type { RoomConfig } from './model/RoomConfig.ts';
export type { RoomListItem } from './model/RoomListItem.ts';
export type { GameRepository } from './repository/GameRepository.ts';
export type { RoomRepository } from './repository/RoomRepository.ts';
export type { RoomsRepository } from './repository/RoomsRepository.ts';
export type { ActivityWatcher } from './service/ActivityWatcher.ts';
export type { Chat } from './service/Chat.ts';
export type { Notifier } from './service/Notifier.ts';
export type { Profile } from './service/Profile.ts';
export type { SoundManager } from './service/SoundManager.ts';
export type { SocketClient } from './core/SocketClient.ts';

export interface Emitter {
    on(name: string, callback: (event: any) => void): void;
    off(name: string, callback: (event: any) => void): void;
    emit(name: string, data?: unknown): void;
}

export type Callback<T = any> = (result: T) => void;

/** A message of the chat, whatever its kind */
export type ChatMessage = Message & Record<string, any>;
