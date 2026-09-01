import { readable } from 'svelte/store';

export interface Route {
  name: 'rooms' | 'about' | 'room' | 'game' | 'notfound';
  param: string | null;
}

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/' || path === '') {
    return { name: 'rooms', param: null };
  }
  if (path === '/about') {
    return { name: 'about', param: null };
  }
  const room = /^\/room\/(.+)$/.exec(path);
  if (room) {
    return { name: 'room', param: decodeURIComponent(room[1]!) };
  }
  const game = /^\/game\/(.+)$/.exec(path);
  if (game) {
    return { name: 'game', param: decodeURIComponent(game[1]!) };
  }
  return { name: 'notfound', param: null };
}

/** Current route, derived from `location.hash`. */
export const route = readable<Route>(parse(location.hash), (set) => {
  const update = () => set(parse(location.hash));
  window.addEventListener('hashchange', update);
  return () => window.removeEventListener('hashchange', update);
});

export function go(path: string): void {
  location.hash = path;
}

export const href = {
  rooms: () => '#/',
  about: () => '#/about',
  room: (name: string) => `#/room/${encodeURIComponent(name)}`,
  game: (name: string) => `#/game/${encodeURIComponent(name)}`,
};
