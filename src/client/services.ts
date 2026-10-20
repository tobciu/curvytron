import { inject, type App, type InjectionKey } from 'vue';
import { SocketClient } from './core/SocketClient.js';
import { Profile } from './service/Profile.js';
import { SoundManager } from './service/SoundManager.js';
import { ActivityWatcher } from './service/ActivityWatcher.js';
import { RoomRepository } from './repository/RoomRepository.js';
import { GameRepository } from './repository/GameRepository.js';
import { Chat } from './service/Chat.js';
import { Notifier } from './service/Notifier.js';
import { ProfilePanel } from './service/ProfilePanel';
import type * as T from './types';

/** The singletons of the game, shared by all the views. */
export interface Services {
    client: T.SocketClient;
    profile: T.Profile;
    profilePanel: ProfilePanel;
    sound: T.SoundManager;
    watcher: T.ActivityWatcher;
    roomRepository: T.RoomRepository;
    gameRepository: T.GameRepository;
    chat: T.Chat;
    notifier: T.Notifier;
}

export const servicesKey: InjectionKey<Services> = Symbol('services');

/** Instantiate and wire the services (opens the socket to the server). */
export function createServices(): Services {
    const client = new SocketClient();
    const profile = new Profile();
    const profilePanel = new ProfilePanel(profile as unknown as T.Profile);
    const sound = new SoundManager(profile);
    const watcher = new ActivityWatcher(client);
    const roomRepository = new RoomRepository(client);
    const gameRepository = new GameRepository(client, roomRepository, sound);
    const chat = new Chat(client, roomRepository);
    const notifier = new Notifier(sound, watcher);

    return {
        client,
        profile,
        profilePanel,
        sound,
        watcher,
        roomRepository,
        gameRepository,
        chat,
        notifier
    } as unknown as Services;
}

export function installServices(app: App, services: Services): void {
    app.provide(servicesKey, services);
}

export function useServices(): Services {
    const services = inject(servicesKey);

    if (!services) {
        throw new Error('Services are not installed');
    }

    return services;
}
