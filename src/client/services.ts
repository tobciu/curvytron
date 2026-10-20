import { inject, type App, type InjectionKey } from 'vue';
import { SocketClient } from './core/SocketClient.ts';
import { Profile } from './service/Profile.ts';
import { SoundManager } from './service/SoundManager.ts';
import { ActivityWatcher } from './service/ActivityWatcher.ts';
import { RoomRepository } from './repository/RoomRepository.ts';
import { GameRepository } from './repository/GameRepository.ts';
import { Chat } from './service/Chat.ts';
import { Notifier } from './service/Notifier.ts';
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
