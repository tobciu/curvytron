import AbstractController from './AbstractController.js';

/**
 * Chat Controller
 */
class ChatController extends AbstractController {
    constructor($scope, chat) {
        super($scope);

        this.chat = chat;

        this.onLoaded = this.onLoaded.bind(this);
        this.mute = this.mute.bind(this);

        this.$scope.onLoaded = this.onLoaded;
        this.$scope.mute = this.mute;
        this.$scope.messages = this.chat.messages.items;
        this.$scope.currentMessage = this.chat.message;
        this.$scope.submitTalk = this.chat.talk;

        this.chat.on('message', this.digestScope);
        this.chat.on('filtered', this.digestScope);
    }

    /**
     * On chat DOM element loaded
     */
    onLoaded() {
        this.chat.setElement(document.getElementById('chat-feed'));
    }

    /**
     * Mute client from the given message
     *
     * @param {MessagePlayer} message
     */
    mute(message) {
        if (this.chat.toggleMute(message.client)) {
            this.chat.addMessage(new MessageMute(message.client, message.player));
        } else {
            this.chat.removeMessage(message);
        }

        this.digestScope();
    }
}

export default ChatController;
