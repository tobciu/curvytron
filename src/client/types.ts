/**
 * Types of the (still plain JavaScript) game model, as far as the Vue UI uses them.
 * Keep them small: the goal is to document and check what the UI relies on.
 */

export interface Emitter {
    on(name: string, callback: (event: any) => void): void;
    off(name: string, callback: (event: any) => void): void;
    emit(name: string, data?: unknown): void;
}

export interface Collection<T> {
    items: T[];
    count(): number;
    isEmpty(): boolean;
    getById(id: unknown): T | null;
    getFirst(): T | null;
    getRandomItem(): T | null;
    match(callable: (this: T) => unknown): T | null;
    filter(callable: (this: T) => unknown): Collection<T>;
}

export interface PlayerControl extends Emitter {
    label: string;
    listening: boolean;
    mapper: { view: string; listening: boolean };
    toggle(): void;
    start(): void;
    stop(): void;
    getMapping(): unknown;
    loadMapping(mapping: unknown): void;
}

export interface Client {
    id: number;
    active: boolean;
}

export interface Player extends Emitter {
    id: number;
    name: string;
    color: string;
    ready: boolean;
    local: boolean;
    profile: boolean;
    vote: boolean;
    kicked: boolean;
    client: Client;
    controls: PlayerControl[] | null;
    isMaster(): boolean;
    setName(name: string): void;
    setColor(color: string): boolean;
    setLocal(local: boolean): void;
    setTouch(): void;
    getMapping(): unknown;
}

export interface Preset {
    name: string;
    hasBonus(bonus: string): boolean;
    calculateRandom?(): void;
}

export interface RoomConfig extends Emitter {
    maxScore: number | null;
    open: boolean;
    password: string | null;
    variables: Record<string, number>;
    variablesNames: Record<string, string>;
    bonuses: Record<string, boolean>;
    bonusClasses: Record<string, string>;
    presets: Preset[];
    preset: Preset;
    customPreset: Preset;
    getDefaultMaxScore(): number;
    getDefaultPreset(): Preset;
    getVariable(variable: string): number;
    variableExists(variable: string): boolean;
    bonusExists(bonus: string): boolean;
    setOpen(open: boolean): void;
    setPassword(password: string | null): void;
    setMaxScore(maxScore: number): void;
    setVariable(variable: string, value: number): void;
    setBonus(bonus: string, enabled: boolean): void;
}

export interface Avatar extends Emitter {
    id: number;
    name: string;
    color: string;
    score: number;
    roundScore: number;
    local: boolean;
    player: Player;
    input?: Emitter & { useGamepad(): boolean };
    elements: Record<string, HTMLElement | null>;
    setScore(score: number): void;
    setRoundScore(score: number): void;
}

export interface Game extends Emitter {
    name: string;
    room: Room;
    maxScore: number;
    started: boolean;
    borderless: boolean;
    warmupTime: number;
    roundWinner: Avatar | null;
    avatars: Collection<Avatar>;
    bonusManager: Emitter & { loaded: boolean };
    fps: Emitter & { frequency: number };
    isReady(): boolean;
    isTieBreak(): boolean;
    loadDOM(): void;
    sortAvatars(): Collection<Avatar>;
}

export interface Room extends Emitter {
    name: string;
    open: boolean;
    players: Collection<Player>;
    config: RoomConfig;
    game: Game | null;
    launchTime: number;
    getUrl(): string;
    getGameUrl(): string;
    getLocalPlayers(): Collection<Player>;
    isNameAvailable(name: string): boolean;
}

export interface RoomListItem {
    name: string;
    players: number;
    game: boolean;
    open: boolean;
    password: string;
    getUrl(): string;
}

export type Callback<T = any> = (result: T) => void;

export interface SocketClient extends Emitter {
    id: number | null;
    connected: boolean;
    addEvent(name: string, data?: unknown, callback?: Callback): void;
}

export interface Profile extends Emitter {
    name: string | null;
    color: string | null;
    sound: boolean;
    radio: boolean;
    controls: PlayerControl[];
    persist(): void;
    isComplete(): boolean;
    setName(name: string): void;
    setColor(color: string): void;
    setControls(controls: unknown): void;
}

export interface SoundManager {
    active: boolean;
    toggle(): void;
    play(sound: string): void;
    stop(sound: string): void;
}

export interface Radio {
    enabled: boolean;
    toggle(): void;
    setActive(active: boolean): void;
}

export interface ActivityWatcher {
    isActive(): boolean;
    isFocused(): boolean;
}

export interface Notifier {
    notify(message: string, duration?: number | null, sound?: string): void;
    notifyInactive(message: string, duration?: number | null, sound?: string): void;
}

export interface RoomRepository extends Emitter {
    room: Room | null;
    start(): void;
    stop(): void;
    amIMaster(): boolean;
    join(name: string, password: string | null, callback: Callback): void;
    leave(): void;
    launch(): void;
    addPlayer(name: string, color: string | null, callback: Callback): void;
    removePlayer(player: Player, callback: Callback): void;
    kickPlayer(player: Player, callback: Callback): void;
    setColor(player: Player, color: string, callback: Callback): void;
    setName(player: number, name: string, callback: Callback): void;
    setReady(player: number, callback: Callback): void;
    setConfigOpen(open: boolean, callback: Callback): void;
    setConfigMaxScore(maxScore: number, callback: Callback): void;
    setConfigVariable(variable: string, value: number, callback: Callback): void;
    setConfigBonus(bonus: string, callback: Callback): void;
}

export interface RoomsRepository extends Emitter {
    rooms: Collection<RoomListItem>;
    start(): void;
    stop(): void;
    create(name: string, callback: Callback): void;
    createRoom(data: unknown): RoomListItem;
}

export interface GameRepository extends Emitter {
    game: Game | null;
    parent: RoomRepository;
    start(): void;
}

export interface ChatMessage {
    id: number;
    date: string;
    type: string;
    icon: string | null;
    content?: string;
    client?: number;
    player?: { name: string; color: string };
    target?: Player;
    getTarget?(): { name: string; color: string };
}

export interface Chat extends Emitter {
    messages: Collection<ChatMessage>;
    message: { content: string; maxLength: number };
    talk(): void;
    setElement(element: HTMLElement): void;
    setPlayer(player: Player | null): void;
    toggleMute(client: number): boolean;
    addMessage(message: ChatMessage): void;
    removeMessage(message: ChatMessage): void;
    clear(): void;
}
