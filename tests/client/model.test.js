import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '#event-emitter';
import { Profile } from '../../src/client/service/Profile.js';
import { Chat } from '../../src/client/service/Chat.js';
import { Room } from '../../src/client/model/Room.js';
import { MessagePlayer } from '../../src/client/model/message/MessagePlayer.js';
import { Message } from '../../src/client/model/message/Message.js';
import { MessageDie } from '../../src/client/model/message/MessageDie.js';

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('Profile', () => {
    it('starts empty, with a random color', () => {
        const profile = new Profile();

        expect(profile.name).toBeNull();
        expect(profile.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(profile.isComplete()).toBeFalsy();
    });

    it('is saved once it is valid, and loaded on the next visit', () => {
        const profile = new Profile();

        profile.setName('  Alice ');
        profile.setColor('#ff0000');
        profile.setSound(false);

        const saved = JSON.parse(window.localStorage.getItem('PROFILE'));

        expect(saved).toMatchObject({ name: 'Alice', color: '#ff0000', sound: false });

        const again = new Profile();

        expect(again.name).toBe('Alice');
        expect(again.color).toBe('#ff0000');
        expect(again.sound).toBe(false);
        expect(again.isComplete()).toBeTruthy();
    });

    it('refuses an empty name and an invalid color', () => {
        const profile = new Profile();

        profile.setName('Alice');
        profile.setColor('#ff0000');
        profile.setName('   ');
        profile.setColor('red');

        expect(profile.name).toBe('Alice');
        expect(profile.color).toBe('#ff0000');
    });

    it('tells when it changes', () => {
        const profile = new Profile();
        const changed = vi.fn();

        profile.on('change', changed);
        profile.setName('Alice');

        expect(changed).toHaveBeenCalled();
    });

    it('does not save an incomplete profile', () => {
        const profile = new Profile();

        profile.setColor('#ff0000');
        profile.persist();

        expect(window.localStorage.getItem('PROFILE')).toBeNull();
    });
});

describe('Chat', () => {
    function createChat() {
        const client = new EventEmitter();
        const repository = new EventEmitter();

        repository.room = new Room('test');
        client.addEvent = vi.fn();

        const chat = new Chat(client, repository);

        chat.setRoom();

        return { chat, client, repository };
    }

    const texts = (chat) => chat.messages.items.filter((m) => m instanceof MessagePlayer).map((m) => m.content);

    it('starts a room with a tip', () => {
        const { chat } = createChat();

        expect(chat.messages.count()).toBe(1);
        expect(chat.messages.items[0].type).toBe('tip');
    });

    it('shows the messages of the other players, with their name and color', () => {
        const { chat, client } = createChat();

        client.emit('room:talk', { client: 7, content: 'hello', name: 'Bob', color: '#00ff00', creation: Date.now() });

        const message = chat.messages.items.at(-1);

        expect(message.content).toBe('hello');
        expect(message.player).toEqual({ name: 'Bob', color: '#00ff00' });
        expect(message.date).toMatch(/^\d\d:\d\d$/);
    });

    it('hides the messages of a muted client, and shows them again when unmuted', () => {
        const { chat, client } = createChat();

        client.emit('room:talk', { client: 7, content: 'one', creation: Date.now() });
        client.emit('room:talk', { client: 8, content: 'two', creation: Date.now() });

        expect(texts(chat)).toEqual(['one', 'two']);

        expect(chat.toggleMute(7)).toBe(true);
        expect(texts(chat)).toEqual(['two']);

        client.emit('room:talk', { client: 7, content: 'three', creation: Date.now() });
        expect(texts(chat)).toEqual(['two']);

        expect(chat.toggleMute(7)).toBe(false);
        expect(texts(chat)).toEqual(['one', 'two', 'three']);
    });

    it('sends what is typed to the server and clears it on success', () => {
        const { chat, client } = createChat();

        chat.message.content = 'hi there';
        chat.talk();

        expect(client.addEvent).toHaveBeenCalledWith('room:talk', 'hi there', expect.any(Function));

        client.addEvent.mock.calls[0][2]({ success: true });

        expect(chat.message.content).toBe('');
    });

    it('does not send an empty message, nor more than 140 characters', () => {
        const { chat, client } = createChat();

        chat.talk();
        expect(client.addEvent).not.toHaveBeenCalled();

        chat.message.content = 'x'.repeat(300);
        chat.talk();

        expect(client.addEvent.mock.calls[0][1]).toHaveLength(140);
    });

    it('forgets everything when the room is left', () => {
        const { chat, client, repository } = createChat();

        client.emit('room:talk', { client: 7, content: 'one', creation: Date.now() });
        chat.toggleMute(7);
        repository.room = null;
        chat.setRoom();

        expect(chat.room).toBeNull();
        expect(chat.muted).toEqual([]);
        expect(texts(chat)).toEqual([]);
    });
});

describe('Messages', () => {
    it('formats the time with two digits', () => {
        expect(new Message(new Date(2024, 0, 1, 7, 5).getTime()).date).toBe('07:05');
        expect(new Message(new Date(2024, 0, 1, 17, 45).getTime()).date).toBe('17:45');
    });

    it('describes how an avatar died', () => {
        const alice = { equal: (other) => other === alice };
        const bob = { equal: (other) => other === bob };

        expect(new MessageDie(alice, null, false).type).toBe('wall');
        expect(new MessageDie(alice, alice, false).type).toBe('suicide');
        expect(new MessageDie(alice, bob, false).type).toBe('kill');
        expect(new MessageDie(alice, bob, true).type).toBe('crash');
    });
});

describe('RoomConfig (client)', () => {
    function config() {
        const room = new Room('test');

        return room.config;
    }

    it('finds the preset that matches the enabled bonuses, or the custom one', () => {
        const room = config();
        const [defaultPreset, , , solo] = room.presets;

        for (const preset of [defaultPreset, solo]) {
            Object.keys(room.bonuses).forEach((bonus) => room.setBonus(bonus, preset.hasBonus(bonus)));

            expect(room.preset).toBe(preset);
        }

        room.setBonus('BonusSelfFast', !room.bonuses.BonusSelfFast);
        expect(room.preset).toBe(room.customPreset);
    });

    it('knows the css class of every bonus', () => {
        const room = config();

        for (const bonus of Object.keys(room.bonuses)) {
            expect(room.bonusClasses[bonus]).toMatch(/^bonus-/);
        }
    });

    it('builds the urls of the room', () => {
        const room = new Room('The great room!');

        expect(room.getUrl()).toBe('/room/The%20great%20room!');
        expect(room.getGameUrl()).toBe('/game/The%20great%20room!');
    });
});
