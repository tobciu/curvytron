import { AbstractController } from '../AbstractController.js';
import { MessageDie } from '../../model/message/MessageDie.js';

/**
 * Kill Log Controller
 *
 * @param {Object} $scope
 * @param {SocketClient} client
 */
export class KillLogController extends AbstractController {
    constructor($scope, client) {
        super($scope);

        if (!$scope.game) {
            return;
        }

        this.client = client;
        this.game = $scope.game;
        this.element = document.getElementById('kill-log-feed');
        this.templates = {
            suicide: ({ deadPlayer }) => [this.player(deadPlayer), ' committed suicide'],
            kill: ({ deadPlayer, killerPlayer }) => [
                this.player(deadPlayer),
                ' was killed by ',
                this.player(killerPlayer)
            ],
            crash: ({ deadPlayer, killerPlayer }) => [
                this.player(deadPlayer),
                ' crashed on ',
                this.player(killerPlayer)
            ],
            wall: ({ deadPlayer }) => [this.player(deadPlayer), ' crashed on the wall']
        };

        this.clear = this.clear.bind(this);
        this.onDie = this.onDie.bind(this);

        this.client.on('die', this.onDie);
        this.client.on('round:new', this.clear);
    }

    /**
     * On die
     *
     * @param {Event} e
     */
    onDie(e) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            this.display(
                new MessageDie(avatar, e.detail[1] ? this.game.avatars.getById(e.detail[1]) : null, e.detail[2])
            );
        }
    }

    /**
     * Colored player name
     *
     * @param {Avatar} avatar
     *
     * @return {HTMLElement}
     */
    player(avatar) {
        const element = document.createElement('span');

        element.style.color = avatar.color;
        element.textContent = avatar.name;

        return element;
    }

    /**
     * Display the given message
     *
     * @param {string} message
     */
    display(message) {
        const icon = document.createElement('span'),
            item = this.element.children[0];

        icon.className = 'message-icon icon-dead';

        // Player names and colors are user input: build text nodes, never HTML.
        item.replaceChildren(icon, ...this.templates[message.type](message));
        this.element.appendChild(item);
    }

    /**
     * Clear
     */
    clear() {
        for (let i = this.element.children.length - 1; i >= 0; i--) {
            this.element.children[i].innerHTML = '';
        }
    }
}
