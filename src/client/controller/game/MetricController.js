import AbstractController from '../AbstractController.js';

/**
 * Metric controller
 */
class MetricController extends AbstractController {
    constructor($scope, client) {
        if (!$scope.game) { return; }

        super($scope);

        this.client = client;
        this.game = this.$scope.game;

        // Binding
        this.onFPS = this.onFPS.bind(this);
        this.onLatency = this.onLatency.bind(this);
        this.onSpectators = this.onSpectators.bind(this);
        this.detachEvents = this.detachEvents.bind(this);

        // Hydrate scope:
        this.$scope.fps = 0;
        this.$scope.fpsColor = 'gray';
        this.$scope.latency = 0;
        this.$scope.latencyColor = 'gray';
        this.$scope.spectators = 0;

        this.$scope.$on('$destroy', this.detachEvents);

        this.attachEvents();
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.client.on('latency', this.onLatency);
        this.client.on('game:spectators', this.onSpectators);
        this.game.fps.on('fps', this.onFPS);
    }

    /**
     * Detach events
     */
    detachEvents() {
        this.client.off('latency', this.onLatency);
        this.client.off('game:spectators', this.onSpectators);
        this.game.fps.off('fps', this.onFPS);
    }

    /**
     * On FPS
     *
     * @param {Event} event
     */
    onFPS(event) {
        const value = this.game.fps.frequency;

        if (this.$scope.fps !== value) {
            this.$scope.fps = value;
            this.$scope.fpsColor = this.getFPSColor(value);
            this.digestScope();
        }
    }

    /**
     * Get FPS color
     *
     * @param {Number} fps
     *
     * @return {String}
     */
    getFPSColor(fps) {
        if (fps >= 55) { return 'green'; }
        if (fps >= 40) { return 'orange'; }
        if (fps >= 1) { return 'red'; }

        return 'gray';
    }

    /**
     * On latency
     *
     * @param {Event} event
     */
    onLatency(event) {
        const value = event.detail;

        if (this.$scope.latency !== value) {
            this.$scope.latency = value;
            this.$scope.latencyColor = this.getLatencyColor(value);
            this.digestScope();
        }
    }

    /**
     * Get latency color
     *
     * @param {Number} latency
     *
     * @return {String}
     */
    getLatencyColor(latency) {
        if (latency <= 100) { return 'green'; }
        if (latency <= 250) { return 'orange'; }

        return 'red';
    }

    /**
     * On spectators
     *
     * @param {Event} event
     */
    onSpectators(event) {
        this.$scope.spectators = event.detail;
        this.digestScope();
    }
}

export default MetricController;
