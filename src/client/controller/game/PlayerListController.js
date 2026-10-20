import { AbstractController } from '../AbstractController.js';

/**
 * Player List Controller
 *
 * @param {Object} $scope
 * @param {Object} $element
 * @param {SocketClient} client
 */
export class PlayerListController extends AbstractController {
    constructor($scope, $element, client) {
        super($scope);

        if (!$scope.game) {
            return;
        }

        this.element = $element[0];
        this.client = client;
        this.game = this.$scope.game;

        // Binding
        this.onScore = this.onScore.bind(this);
        this.onRoundScore = this.onRoundScore.bind(this);
        this.onRoundNew = this.onRoundNew.bind(this);
        this.onRoundEnd = this.onRoundEnd.bind(this);
        this.onDie = this.onDie.bind(this);
        this.detachEvents = this.detachEvents.bind(this);

        this.$scope.$on('$destroy', this.detachEvents);

        this.attachEvents();
    }

    /**
     * Attach socket Events
     */
    attachEvents() {
        this.client.on('score', this.onScore);
        this.client.on('score:round', this.onRoundScore);
        this.client.on('game:leave', this.requestDigestScope);
        this.client.on('round:new', this.onRoundNew);
        this.client.on('round:end', this.onRoundEnd);
        this.client.on('die', this.onDie);
    }

    /**
     * Attach socket Events
     */
    detachEvents() {
        this.client.off('score', this.onScore);
        this.client.off('score:round', this.onRoundScore);
        this.client.off('game:leave', this.requestDigestScope);
        this.client.off('round:new', this.onRoundNew);
        this.client.off('round:end', this.onRoundEnd);
        this.client.off('die', this.onDie);
    }

    /**
     * Get avatar related elements in DOM
     *
     * @param {Avatar} avatar
     */
    getElements(avatar) {
        if (!avatar.elements.root) {
            avatar.elements.root = document.getElementById(`avatar-${avatar.id}`);
            avatar.elements.score = document.getElementById(`avatar-score-${avatar.id}`);
            avatar.elements.roundScore = document.getElementById(`avatar-round-score-${avatar.id}`);

            if (avatar.local) {
                avatar.elements.root.classList.add('local');
            }
        }

        return avatar.elements;
    }

    /**
     * On score
     *
     * @param {Event} e
     */
    onScore(e) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            avatar.setScore(e.detail[1]);
            this.updateScore(avatar);
        }
    }

    /**
     * On round score
     *
     * @param {Event} e
     */
    onRoundScore(e) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            avatar.setRoundScore(e.detail[1]);
            this.updateRoundScore(avatar);
        }
    }

    /**
     * On round new
     *
     * @param {Event} e
     */
    onRoundNew(e) {
        this.element.classList.add('in-round');

        for (let i = this.game.avatars.items.length - 1; i >= 0; i--) {
            this.getElements(this.game.avatars.items[i]).root.classList.remove('dead');
        }
    }

    /**
     * On round dnd
     *
     * @param {Event} e
     */
    onRoundEnd(e) {
        this.element.classList.remove('in-round');
        this.reorder();
    }

    /**
     * On die
     *
     * @param {Event} e
     */
    onDie(e) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            this.getElements(avatar).root.classList.add('dead');
        }
    }

    /**
     * Update score
     *
     * @param {Avatar} avatar
     */
    updateScore(avatar) {
        this.getElements(avatar).score.innerHTML = avatar.score;
    }

    /**
     * Update round score
     *
     * @param {Avatar} avatar
     */
    updateRoundScore(avatar) {
        this.getElements(avatar).roundScore.innerHTML = avatar.roundScore ? `+${avatar.roundScore}` : '';
    }

    /**
     * Reorder player list
     */
    reorder() {
        const length = this.game.sortAvatars().items.length;

        for (let elements, i = 0; i < length; i++) {
            elements = this.getElements(this.game.avatars.items[i]);
            elements.root.parentNode.appendChild(elements.root);
        }
    }
}
