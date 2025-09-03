import EventEmitter from 'tom32i-event-emitter.js';

/**
 * Abstract Controller
 */
class AbstractController extends EventEmitter {
    constructor($scope) {
        super();

        this.$scope = $scope;
        this.digestTimeout = null;

        this.applyScope = this.applyScope.bind(this);
        this.digestScope = this.digestScope.bind(this);
        this.requestDigestScope = this.requestDigestScope.bind(this);
    }

    /**
     * Digest timeout
     *
     * @type {Number}
     */
    digestTimeoutValue = 1000 / 25;

    /**
     * Apply scope
     */
    applyScope() {
        const phase = this.$scope && this.$scope.$root ? this.$scope.$root.$$phase : null;

        if (phase !== '$apply' && phase !== '$digest') {
            this.$scope.$apply();
        }
    }

    /**
     * Digest scope
     */
    digestScope() {
        this.clearDigestTiemout();

        const phase = this.$scope && this.$scope.$root ? this.$scope.$root.$$phase : null;

        if (phase !== '$apply' && phase !== '$digest') {
            this.$scope.$digest();
        }
    }

    /**
     * Request a digest scope
     */
    requestDigestScope() {
        if (!this.digestTimeout) {
            this.digestTimeout = setTimeout(this.digestScope, this.digestTimeoutValue);
        }
    }

    /**
     * Clear digest timeout
     *
     * @return {boolean}
     */
    clearDigestTiemout() {
        if (this.digestTimeout) {
            this.digestTimeout = clearTimeout(this.digestTimeout);
        }
    }
}

export default AbstractController;
