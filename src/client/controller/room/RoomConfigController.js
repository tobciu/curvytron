import AbstractController from '../AbstractController.js';

/**
 * Room Controller
 */
class RoomConfigController extends AbstractController {
    constructor($scope, repository) {
        super($scope);

        this.repository = repository;
        this.config = null;

        // Binding:
        this.onJoined = this.onJoined.bind(this);
        this.toggleBonus = this.toggleBonus.bind(this);
        this.togglePreset = this.togglePreset.bind(this);
        this.setOpen = this.setOpen.bind(this);
        this.setMaxScore = this.setMaxScore.bind(this);
        this.setVariable = this.setVariable.bind(this);

        // Hydrating scope
        this.$scope.toggleBonus = this.toggleBonus;
        this.$scope.togglePreset = this.togglePreset;
        this.$scope.setOpen = this.setOpen;
        this.$scope.setMaxScore = this.setMaxScore;
        this.$scope.setVariable = this.setVariable;

        this.repository.on('config:open', this.digestScope);
        this.repository.on('config:max-score', this.digestScope);
        this.repository.on('config:variable', this.digestScope);
        this.repository.on('config:bonus', this.digestScope);

        this.$scope.$parent.$watch('room', this.onJoined);
    }

    /**
     * On room joined
     */
    onJoined() {
        if (this.$scope.$parent.room) {
            this.config = this.$scope.$parent.room.config;
            this.$scope.config = this.config;
        }
    }

    /**
     * Toggle bonus
     *
     * @param {String} bonus
     */
    toggleBonus(bonus) {
        if (this.config.bonusExists(bonus) && this.repository.amIMaster()) {
            const config = this.config;

            this.repository.setConfigBonus(bonus, function (result) {
                config.setBonus(bonus, result.enabled);
            });
        } else {
            console.error('Unknown bonus: %s', bonus.type);
        }
    }

    /**
     * Toggle preset
     *
     * @param {String} bonus
     */
    togglePreset(preset) {
        if (this.config.preset === preset && preset.name && preset.name != "Random") {
            if (preset === this.config.getDefaultPreset()) {
                return;
            }

            return this.applyPreset(this.config.getDefaultPreset());
        }

        this.applyPreset(preset);
    }

    /**
     * Apply the given preset
     *
     * @param {Preset} preset
     */
    applyPreset(preset) {
        if (this.repository.amIMaster()) {
            if (preset.name && preset.name == "Random") {
                preset.calculateRandom();
            }

            for (const bonus in this.config.bonuses) {
                if (this.config.bonuses[bonus] !== preset.hasBonus(bonus)) {
                    this.toggleBonus(bonus);
                }
            }

            this.config.preset = preset;
        }
    }

    /**
     * Set open
     */
    setOpen(open) {
        if (this.repository.amIMaster()) {
            const config = this.config;

            this.repository.setConfigOpen(open, function (result) {
                config.setOpen(result.open);
                config.setPassword(result.password);
            });
        }
    }

    /**
     * Set max score
     */
    setMaxScore(maxScore) {
        if (this.repository.amIMaster()) {
            const config = this.config;

            this.repository.setConfigMaxScore(maxScore, function (result) {
                config.setMaxScore(result.maxScore);
            });
        }
    }

    /**
     * Set variable
     */
    setVariable(variable) {
        if (this.config.variableExists(variable) && this.repository.amIMaster()) {
            const config = this.config;

            this.repository.setConfigVariable(variable, this.config.getVariable(variable), function (result) {
                config.setVariable(result.variable, result.value);
            });
        }
    }
}

export default RoomConfigController;
