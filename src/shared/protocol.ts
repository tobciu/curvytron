/**
 * The network protocol, as TypeScript types
 *
 * A message is a list of events: `[name, data?, callbackId?]`. An answer to an event with a callback is `[callbackId,
 * data]`. `ClientEvents` are sent by the client (with the answer of the server), `ServerEvents` are sent by the server.
 * Both sides use them, so that a change of the data shows up as a type error on the other side.
 */
import type { GameStatsData } from './model/GameStats.ts';

// Data

/** A room, as the list of the rooms and the room parameters show it */
export interface RoomData {
    name: string;
    /** The players of the room, or only their number in the list of the rooms */
    players: PlayerData[] | number;
    game: boolean;
    open: boolean;
    config?: RoomConfigData;
}

export interface RoomConfigData {
    maxScore: number | null;
    variables: Record<string, number>;
    bonuses: Record<string, boolean>;
    open: boolean;
    password: string | null;
}

export interface PlayerData {
    client: number | null;
    id: number | null;
    name: string;
    color: string;
    ready: boolean;
    /** Is the client of the player active (its window has the focus)? */
    active?: boolean;
    /** Is the player connected? A player whose connection dropped stays in the game until it ends */
    online?: boolean;
}

export interface ClientData {
    id: number | null;
    active?: boolean;
}

export interface MessageData {
    client: number | null;
    content: string;
    creation: number;
    name: string | null;
    color: string | null;
}

export interface VoteData {
    target: number | null;
    result: boolean | number | null;
}

/** What most answers have */
export interface Result {
    success: boolean;
    error?: string;
}

/** The answer when the event could not be handled (wrong data, not allowed...) */
export interface Failure {
    success: false;
    error?: string;
}

// Client => server

export interface ClientEvents {
    whoami: { data: void; reply: number };
    activity: { data: boolean; reply: void };
    'room:fetch': { data: void; reply: void };
    'room:create': { data: { name: string }; reply: Failure | (Result & { room?: RoomData }) };
    'room:join': {
        data: { name: string; password: string | null };
        reply:
            | {
                  success: true;
                  room: RoomData;
                  master: number | null;
                  clients: ClientData[];
                  messages: MessageData[];
                  votes: VoteData[];
              }
            | { success: false; error?: string };
    };
    'room:leave': { data: void; reply: void };
    'player:add': { data: { name: string; color?: string | null }; reply: Result };
    'player:remove': { data: { player: number }; reply: Result };
    'player:kick': { data: { player: number }; reply: Failure | (Result & { kicked: boolean }) };
    'room:ready': { data: { player: number }; reply: Failure | (Result & { ready?: boolean }) };
    'room:name': { data: { player: number; name: string }; reply: Failure | (Result & { name?: string }) };
    'room:color': { data: { player: number; color: string }; reply: Failure | (Result & { color?: string }) };
    'room:talk': { data: string; reply: Result };
    'room:config:open': {
        data: { open: boolean };
        reply: Failure | (Result & { open: boolean; password: string | null });
    };
    'room:config:max-score': {
        data: { maxScore: number | string };
        reply: Failure | (Result & { maxScore: number | null });
    };
    'room:config:variable': {
        data: { variable: string; value: number | string };
        reply: Failure | (Result & { value?: number });
    };
    'room:config:bonus': { data: { bonus: string }; reply: Failure | (Result & { enabled?: boolean }) };
    'room:launch': { data: void; reply: void };
    /** The client has loaded the game and is ready to play, or to watch */
    ready: { data: void; reply: void };
    /** `move`: -1 left, 0 straight, 1 right */
    'player:move': { data: { avatar: number; move: -1 | 0 | 1 }; reply: void };
}

// Server => client

/** `[avatar id, ...]`: the positions and the sizes are compressed (see `shared/service/Compressor.ts`) */
export interface ServerEvents {
    latency: number;
    'client:add': number | { client: ClientData };
    'client:remove': number;
    'client:activity': { client: number; active: boolean };
    'room:open': RoomData;
    'room:close': { name: string };
    'room:game': { name: string; game: boolean };
    'room:players': { name: string; players: number };
    'room:config:open': { name?: string; open: boolean; password?: string | null };
    'room:config:max-score': { maxScore: number | null };
    'room:config:variable': { variable: string; value: number | undefined };
    'room:config:bonus': { bonus: string; enabled: boolean | undefined };
    'room:join': { player: PlayerData };
    'room:leave': { player: number };
    'room:master': { client: number | null };
    'room:kick': number;
    'room:talk': MessageData;
    'room:launch:start': void;
    'room:launch:cancel': void;
    'room:game:start': void;
    'player:ready': { player: number; ready: boolean };
    'player:name': { player: number; name: string };
    'player:color': { player: number; color: string };
    /** A player lost the connection (`online: false`) or came back */
    'player:connection': { player: number; online: boolean };
    'vote:new': VoteData;
    'vote:close': VoteData;
    // In the game
    'game:start': void;
    'game:stop': void;
    /** The avatar sits out from now on: its player left or is away */
    'game:leave': number;
    /** The avatar takes part again: its player is back, or came in the middle of the game */
    'game:join': number;
    'game:spectators': number;
    'game:stats': GameStatsData;
    /** Statistics are sent at the end of every round */
    ready: number;
    'round:new': void;
    'round:end': number | null;
    end: void;
    clear: void;
    borderless: boolean;
    /** `[id, x, y]` */
    position: [number, number, number];
    /** `[id, angle]` */
    angle: [number, number];
    /** Id of the avatar that leaves a trail point */
    point: number;
    /** `[id, property, value]` */
    property: [number, string, unknown];
    /** `[id, killer id, old]` */
    die: [number, number | null, boolean | null];
    /** `[id, score]` */
    score: [number, number];
    'score:round': [number, number];
    /** `[id, x, y, type]` */
    'bonus:pop': [number, number, number, string];
    'bonus:clear': number;
    /** `[avatar id, method, bonus id, type, duration]` */
    'bonus:stack': [number, string, number, string, number];
    /** What a client that comes in the middle of a game needs to know */
    spectate: {
        inRound: boolean;
        rendered: boolean;
        maxScore: number;
        /** Size of the map, which depends on the number of avatars that take part */
        size: number;
        /** Avatars that do not take part for now */
        away: number[];
    };
}

/** The callback of a handler: answers an event of the client */
export type Reply<K extends ClientEventName> = (reply: ClientEvents[K]['reply']) => void;

/** An event as it is in a message: `[name, data]` */
export type ServerMessage = { [K in ServerEventName]: [K, ServerEvents[K]] }[ServerEventName];

export type ClientEventName = keyof ClientEvents;
export type ServerEventName = keyof ServerEvents;

/** An event of the server, as the client receives it */
export interface ServerEvent<K extends ServerEventName = ServerEventName> {
    type: K;
    detail: ServerEvents[K];
}
