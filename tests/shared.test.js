import { describe, expect, it } from 'vitest';
import { Collection } from '../src/shared/Collection.ts';
import { Compressor } from '../src/shared/service/Compressor.ts';
import { BaseSocketClient } from '../src/shared/core/BaseSocketClient.ts';
import { EventEmitter } from '#event-emitter';

describe('Collection', () => {
    it('indexes items by id', () => {
        const collection = new Collection([], 'id', true);
        const first = { id: null };
        const second = { id: null };

        expect(collection.add(first)).toBe(true);
        expect(collection.add(second)).toBe(true);
        expect(collection.count()).toBe(2);
        expect(first.id).not.toBe(second.id);
        expect(collection.getById(second.id)).toBe(second);

        collection.remove(first);

        expect(collection.exists(first)).toBe(false);
        expect(collection.count()).toBe(1);
    });

    it('can be cleared', () => {
        const collection = new Collection([{ id: 1 }, { id: 2 }]);

        collection.clear();

        expect(collection.isEmpty()).toBe(true);
    });
});

describe('Compressor', () => {
    it('keeps two decimals when compressing floats', () => {
        const compressor = new Compressor();

        expect(compressor.compress(12.3456)).toBe(1235);
        expect(compressor.decompress(1235)).toBe(12.35);
    });
});

describe('BaseSocketClient', () => {
    function createSocket() {
        const socket = new EventEmitter();

        socket.readyState = 1;
        socket.sent = [];
        socket.send = (message) => socket.sent.push(JSON.parse(message));
        socket.addEventListener = (name, callback) => socket.on(name, callback);
        socket.removeEventListener = (name, callback) => socket.removeListener(name, callback);

        return socket;
    }

    it('sends events immediately when no interval is set', () => {
        const socket = createSocket();
        const client = new BaseSocketClient(socket);

        client.addEvent('hello', { a: 1 });

        expect(socket.sent).toEqual([[['hello', { a: 1 }]]]);
    });

    it('batches events when an interval is set', () => {
        const socket = createSocket();
        const client = new BaseSocketClient(socket, 1000);

        client.addEvent('a');
        client.addEvent('b', 2);

        expect(socket.sent).toEqual([]);

        client.flush();
        client.stop();

        expect(socket.sent).toEqual([[['a'], ['b', 2]]]);
    });

    it('dispatches received events and answers callbacks', () => {
        const socket = createSocket();
        const client = new BaseSocketClient(socket);
        const received = [];

        client.on('ping', ([data, callback]) => {
            received.push(data);
            callback('pong');
        });

        socket.emit('message', { data: JSON.stringify([['ping', 'hi', 7]]) });

        expect(received).toEqual(['hi']);
        expect(socket.sent).toEqual([[[7, 'pong']]]);
    });

    it('ignores malformed messages and does not send on a closed socket', () => {
        const socket = createSocket();
        const client = new BaseSocketClient(socket);

        expect(() => socket.emit('message', { data: 'not json' })).not.toThrow();
        expect(() => socket.emit('message', { data: '{"a":1}' })).not.toThrow();

        socket.readyState = 3;
        client.addEvent('late');

        expect(socket.sent).toEqual([]);
    });

    it('plays the callback of an event once its answer is received', () => {
        const socket = createSocket();
        const client = new BaseSocketClient(socket);
        const answers = [];

        client.addEvent('question', null, (answer) => answers.push(answer));
        socket.emit('message', {
            data: JSON.stringify([
                [0, 42],
                [0, 43]
            ])
        });

        expect(answers).toEqual([42]);
    });
});
