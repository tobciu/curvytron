import AbstractController from '../AbstractController.js';

/**
 * Waiting players connection controller
 */
class WaitingController extends AbstractController {
    constructor($scope, client) {
        if (!$scope.game) { return; }

        super($scope);

        this.client = client;
        this.game = $scope.game;

        // Binding
        this.onReady = this.onReady.bind(this);
        this.onStart = this.onStart.bind(this);
        this.detachEvents = this.detachEvents.bind(this);

        // Hydrate scope
        this.$scope.list = this.game.avatars.items.slice(0);

        this.$scope.$on('$destroy', this.onStart);

        this.attachEvents();
    }

    /**
     * Attach socket Events
     */
    attachEvents() {
        this.client.on('ready', this.onReady);
    }

    /**
     * Attach socket Events
     */
    detachEvents() {
        this.client.off('ready', this.onReady);
    }

    /**
     * On avatar ready (client loaded)
     *
     * @param {Event} e
     */
    onReady(e) {
        const avatar = this.game.avatars.getById(e.detail);
        const index = this.$scope.list.indexOf(avatar);

        if (avatar && index) {
            this.$scope.list.splice(index, 1);
            this.digestScope();
        }
    }

    /**
     * On game start
     *
     * @param {Event} e
     */
    onStart(e) {
        this.$scope.list.length = 0;
        this.detachEvents();
    }
}

export default WaitingController;
