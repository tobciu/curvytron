import AbstractController from './AbstractController.js';

/**
 * Curvytron Controller
 */
class CurvytronController extends AbstractController {
    constructor($scope, $window, $location, profile, analyser, watcher, client) {
        super($scope);

        this.$window = $window;
        this.$location = $location;
        this.analyser = analyser;
        this.watcher = watcher;
        this.client = client;

        // Bind
        this.onConnect = this.onConnect.bind(this);
        this.onDisconnect = this.onDisconnect.bind(this);
        this.reload = this.reload.bind(this);

        // Hydrate scope
        this.$scope.status = 'connecting';
        this.$scope.reload = this.reload;
        this.$scope.profile = false;

        this.client.on('connected', this.onConnect);
        this.client.on('disconnected', this.onDisconnect);
    }

    /**
     * On connect
     *
     * @param {Event} e
     */
    onConnect(e) {
        this.$scope.status = 'online';
        this.$scope.profile = true;
        this.digestScope();
    }

    /**
     * On disconnect
     *
     * @param {Event} e
     */
    onDisconnect(e) {
        document.body.classList.remove('game-mode');
        this.$scope.status = 'disconnected';
        this.digestScope();
    }

    /**
     * Reload
     */
    reload() {
        this.$window.location.href = '/';
    }
}

export default CurvytronController;
