import { writable } from 'svelte/store';

export interface Profile {
  name: string;
  color: string;
  /** [left, right] key codes (keyboard mapper values). */
  controls: [number, number];
  sound: boolean;
  radio: boolean;
}

const KEY = 'curvytron.profile';

const DEFAULT: Profile = {
  name: '',
  color: '#ff6b6b',
  controls: [37, 39],
  sound: true,
  radio: false,
};

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return { ...DEFAULT, ...(JSON.parse(raw) as Partial<Profile>) };
    }
  } catch {
    /* private mode / blocked storage */
  }
  return { ...DEFAULT };
}

function createProfileStore() {
  const store = writable<Profile>(load());

  store.subscribe((value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  });

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    patch: (partial: Partial<Profile>) => store.update((p) => ({ ...p, ...partial })),
    isComplete: () => {
      let name = '';
      store.subscribe((p) => (name = p.name))();
      return name.trim().length > 0;
    },
  };
}

export const profile = createProfileStore();
