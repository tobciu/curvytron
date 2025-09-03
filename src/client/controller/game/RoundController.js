import AbstractController from '../AbstractController.js';

/**
 * Round Controller
 */
class RoundController extends AbstractController {
    constructor($scope, repository, notifier) {
        if (!$scope.game) { return; }

        super($scope);

        this.repository = repository;
        this.notifier = notifier;
        this.game = this.$scope.game;
        this.warmupElement = document.getElementById('warmup');
        this.tieBreakElement = document.getElementById('tie-break');
        this.countElement = document.getElementById('count');
        this.endElement = document.getElementById('end');
        this.renderElement = document.getElementById('render');
        this.warmupInterval = null;

        // Binding
        this.onRoundNew = this.onRoundNew.bind(this);
        this.onRoundEnd = this.onRoundEnd.bind(this);
        this.updateBorders = this.updateBorders.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.onWarmup = this.onWarmup.bind(this);
        this.endWarmup = this.endWarmup.bind(this);
        this.detachEvents = this.detachEvents.bind(this);

        this.$scope.roundWinner = null;
        this.$scope.gameWinner = null;

        this.$scope.$on('$destroy', this.detachEvents);

        this.attachEvents();
    }

    /**
     * Attach socket Events
     */
    attachEvents() {
        this.repository.on('borderless', this.updateBorders);
        this.repository.on('round:end', this.onRoundEnd);
        this.repository.on('round:new', this.onRoundNew);
        this.repository.on('end', this.onEnd);
    }

    /**
     * Attach socket Events
     */
    detachEvents() {
        this.repository.off('borderless', this.updateBorders);
        this.repository.off('round:end', this.onRoundEnd);
        this.repository.off('round:new', this.onRoundNew);
        this.repository.off('end', this.onEnd);
        this.clearWarmup();
    }

    /**
     * On round new
     *
     * @param {Event} e
     */
    onRoundNew(e) {
        this.updateBorders();
        this.endElement.style.display = 'none';

        if (this.game.isTieBreak()) {
            this.tieBreakElement.style.display = 'block';
        }

        this.displayWarmup(this.game.warmupTime);
    }

    /**
     * On round end
     *
     * @param {Event} e
     */
    onRoundEnd(e) {
        this.notifier.notifyInactive(this.game.roundWinner ? this.game.roundWinner.name + ' won round!' : 'Round end!');

        this.$scope.winner = this.game.roundWinner ? this.game.roundWinner : false;
        this.digestScope();

        this.endElement.style.display = 'block';
    }

    /**
     * On end
     *
     * @param {Event} e
     */
    onEnd(e) {
        this.notifier.notify('Game over!', null, 'win');
        this.$scope.winner = this.game.avatars.getFirst();
        this.digestScope();
        this.endElement.style.display = 'block';
    }

    /**
     * Update map borders
     */
    updateBorders() {
        this.renderElement.classList.toggle('borderless', this.game.borderless);
    }

    /**
     * Start warmup
     */
    displayWarmup(time) {
        this.warmupElement.style.display = 'block';
        this.countElement.innerHTML = time / 1000;
        this.warmupInterval = setInterval(this.onWarmup, 1000);
        setTimeout(this.endWarmup, time);
        this.notifier.notify('Round start in ' + this.countElement.innerHTML + '...');
    }

    /**
     * On warmup
     */
    onWarmup() {
        this.countElement.innerHTML--;
        this.notifier.notify('Round start in ' + this.countElement.innerHTML + '...');
    }

    /**
     * End warmup
     */
    endWarmup() {
        this.clearWarmup();
        this.warmupElement.style.display = 'none';
        this.notifier.notify('Go!', 1000);
    }

    /**
     * Clear warmup interval
     */
    clearWarmup() {
        if (this.warmupInterval) {
            clearInterval(this.warmupInterval);
            this.warmupInterval = null;
        }
    }
}

export default RoundController;
