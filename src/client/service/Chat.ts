import { Message } from '../model/message/Message.ts';
import { MessageKick } from '../model/message/MessageKick.ts';
import { MessagePlayer } from '../model/message/MessagePlayer.ts';
import { MessageRoomMaster } from '../model/message/MessageRoomMaster.ts';
import { MessageTip } from '../model/message/MessageTip.ts';
import { MessageVoteKick } from '../model/message/MessageVoteKick.ts';
import { Collection } from '../../shared/Collection.ts';
import { BaseChat } from '../../shared/service/BaseChat.ts';
import type { Player } from '../model/Player.ts';

/**
 * Chat system
 */
export class Chat extends BaseChat {
    client: any;
    repository: any;
    message: MessagePlayer;
    room: any;
    element: any;
    auto: boolean;
    sources: Collection;
    muted: any[];

    constructor(client: any, repository: any) {
        super();

        this.messages.index = false;

        this.client = client;
        this.repository = repository;
        this.message = new MessagePlayer(this.client);
        this.room = null;
        this.element = null;
        this.auto = true;
        this.sources = new Collection([], 'id', true);
        this.muted = [];

        this.talk = this.talk.bind(this);
        this.onTalk = this.onTalk.bind(this);
        this.onVoteNew = this.onVoteNew.bind(this);
        this.onKick = this.onKick.bind(this);
        this.onRoomMaster = this.onRoomMaster.bind(this);
        this.scrollDown = this.scrollDown.bind(this);
        this.onActivity = this.onActivity.bind(this);
        this.setRoom = this.setRoom.bind(this);

        this.attachEvents();
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.client.on('room:talk', this.onTalk);
        this.repository.on('room:join', this.setRoom);
        this.repository.on('room:leave', this.setRoom);
        this.repository.on('vote:new', this.onVoteNew);
        this.repository.on('room:kick', this.onKick);
        this.repository.on('room:master', this.onRoomMaster);
    }

    /**
     * Detach events
     */
    detachEvents() {
        this.client.off('room:talk', this.onTalk);
        this.repository.off('room:join', this.setRoom);
        this.repository.off('room:leave', this.setRoom);
        this.repository.off('vote:new', this.onVoteNew);
        this.repository.off('room:kick', this.onKick);
        this.repository.off('room:master', this.onRoomMaster);
    }

    /**
     * Set player
     */
    setPlayer(player: Player | null) {
        if (this.room) {
            this.message.player = player;
        }
    }

    /**
     * Set room
     */
    setRoom() {
        this.room = this.repository.room;

        if (this.room) {
            this.clearMessages();
        } else {
            this.clear();
        }
    }

    /**
     * Set DOM element
     */
    setElement(element: any) {
        this.element = element;
        this.element.addEventListener('scroll', this.onActivity);
        setTimeout(this.scrollDown, 0);
    }

    /**
     * Add message
     */
    override addMessage(message: Message): boolean {
        this.sources.add(message);

        const added = super.addMessage(message);

        if (added && this.auto) {
            this.scrollDown();
        }

        return added;
    }

    /**
     * Remove message
     */
    removeMessage(message: Message) {
        this.sources.remove(message);
        this.messages.remove(message);
    }

    /**
     * Scroll down
     */
    scrollDown() {
        if (this.element) {
            this.element.scrollTop = this.element.scrollHeight;
        }
    }

    /**
     * Talk
     */
    talk() {
        const chat = this;

        if (this.message.content && this.message.content.length) {
            this.client.addEvent(
                'room:talk',
                this.message.content.substr(0, Message.maxLength),
                function (result: any) {
                    if (result.success) {
                        chat.message.clear();
                    } else {
                        console.error('Could not send %s', chat.message);
                    }
                }
            );
        }
    }

    /**
     * On talk
     */
    onTalk(e?: any) {
        if (typeof e.detail !== 'undefined' && e.detail) {
            this.addMessage(
                new MessagePlayer(e.detail.client, e.detail.content, this.getPlayer(e.detail), e.detail.creation)
            );
        }
    }

    /**
     * Get player from message data
     */
    getPlayer(data?: any) {
        const player = this.room.getPlayerByClient(data.client);

        if (player) {
            return player;
        }

        return {
            name: typeof data.name === 'string' ? data.name : `${Message.anonymousName} ${data.client}`,
            color: typeof data.color === 'string' ? data.color : Message.anonymousColor
        };
    }

    /**
     * On new vote
     */
    onVoteNew(e: any) {
        this.addMessage(new MessageVoteKick(e.detail.target));
    }

    /**
     * On kick
     */
    onKick(e: any) {
        this.addMessage(new MessageKick(e.detail));
    }

    /**
     * On room master
     */
    onRoomMaster(e: any) {
        if (e.detail.master) {
            this.addMessage(new MessageRoomMaster(e.detail.master));
        }
    }

    /**
     * On activity
     */
    onActivity(e: any) {
        if (this.element) {
            this.auto = this.element.scrollTop === this.element.scrollHeight - this.element.clientHeight;
        }
    }

    /**
     * Add tutorial message
     */
    addTip() {
        this.addMessage(new MessageTip());
    }

    /**
     * Is message valid
     */
    override isValid(message: Message): boolean {
        if (!(message instanceof MessagePlayer)) {
            return true;
        }

        return this.isAllowed(message.client);
    }

    /**
     * Clear messages
     */
    override clearMessages() {
        super.clearMessages();
        this.sources.clear();
        this.addTip();
    }

    /**
     * Mute/Unmute a client
     */
    toggleMute(clientId: number) {
        const index = this.muted.indexOf(clientId),
            exists = index >= 0;

        if (exists) {
            this.muted.splice(index, 1);
        } else {
            this.muted.push(clientId);
        }

        this.filterMessages();

        return !exists;
    }

    /**
     * Is this client allowed to talk?
     */
    isAllowed(clientId: number): boolean {
        return this.muted.indexOf(clientId) < 0;
    }

    /**
     * Filter messages
     */
    filterMessages() {
        const length = this.sources.count();

        this.messages.clear();

        for (let message, i = 0; i < length; i++) {
            message = this.sources.items[i];
            if (!(message instanceof MessagePlayer) || this.isAllowed(message.client)) {
                this.messages.add(message);
            }
        }
    }

    /**
     * Clear
     */
    clear() {
        this.clearMessages();

        if (this.element) {
            this.element.removeEventListener('scroll', this.onActivity);
        }

        this.message.clear();
        this.muted.length = 0;
        this.room = null;
        this.element = null;
    }
}
