import { writable, type Readable } from 'svelte/store';
import { RoomListItem } from '../../model/RoomListItem.ts';
import { socket } from '../socket/client.ts';
import type { ServerToClient } from '../socket/events.ts';

/**
 * The lobby room list, kept in sync from room:open / room:close / room:players /
 * room:game while the list screen is mounted.
 */
function createRoomsStore() {
  const store = writable<RoomListItem[]>([]);
  const byName = new Map<string, RoomListItem>();
  let attached = false;

  const rebuild = () => store.set([...byName.values()]);

  const onOpen = (d: ServerToClient['room:open']) => {
    byName.set(d.name, new RoomListItem(d.name, d.players, d.game, d.open));
    rebuild();
  };
  const onClose = (d: ServerToClient['room:close']) => {
    byName.delete(d.name);
    rebuild();
  };
  const onPlayers = (d: ServerToClient['room:players']) => {
    const room = byName.get(d.name);
    if (room) {
      room.players = d.players;
      rebuild();
    }
  };
  const onGame = (d: ServerToClient['room:game']) => {
    const room = byName.get(d.name);
    if (room) {
      room.game = d.game;
      rebuild();
    }
  };

  return {
    subscribe: store.subscribe as Readable<RoomListItem[]>['subscribe'],
    /** Start syncing + ask the server for the current list. */
    start() {
      if (attached) {
        return;
      }
      attached = true;
      socket.on('room:open', onOpen);
      socket.on('room:close', onClose);
      socket.on('room:players', onPlayers);
      socket.on('room:game', onGame);
      socket.emit('room:fetch');
    },
    stop() {
      if (!attached) {
        return;
      }
      attached = false;
      socket.off('room:open', onOpen);
      socket.off('room:close', onClose);
      socket.off('room:players', onPlayers);
      socket.off('room:game', onGame);
      byName.clear();
      rebuild();
    },
  };
}

export const rooms = createRoomsStore();
