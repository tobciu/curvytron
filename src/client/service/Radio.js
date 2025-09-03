/**
 * Radio
 */
class Radio {
    constructor(profile) {
        this.profile = profile;
        this.active = false;
        this.enabled = this.profile.radio;
        this.element = this.getVideo();

        this.toggle = this.toggle.bind(this);

        this.resolve();
    }

    /**
     * Source URL
     *
     * @type {String}
     */
    source = 'http://streaming.radionomy.com/Curvyradio';

    /**
     * Volume
     *
     * @type {Number}
     */
    volume = 0.8;

    /**
     * Get video
     *
     * @param {String} src
     *
     * @return {DOMElement}
     */
    getVideo() {
        const video = document.createElement('video');
        const source = document.createElement('source');

        video.appendChild(source);

        video.name = 'media';
        video.autoplay = true;
        video.volume = this.volume;
        source.type = 'audio/mpeg';

        return video;
    }

    /**
     * Toggle enabled
     */
    toggle() {
        this.setEnabled(!this.enabled);
    }

    /**
     * Set enabled/disabled (controlled by the user)
     *
     * @param {Boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled ? true : false;

        this.profile.setRadio(this.enabled);
        this.resolve();
    }

    /**
     * Set active/inactive (controlled by the game)
     *
     * @param {Boolean} enabled
     */
    setActive(active) {
        this.active = active ? true : false;

        this.resolve();
    }

    /**
     * Set volume
     *
     * @param {Number} volume
     */
    setVolume(volume) {
        this.element.volume = typeof(volume) !== 'undefined' ? volume : this.volume;
    }

    /**
     * Resolve radio status
     */
    resolve() {
        if (this.active && this.enabled) {
            this.play();
        } else {
            this.stop();
        }
    }

    /**
     * Play
     */
    play() {
        this.element.src = this.source;
    }

    /**
     * Stop
     */
    stop() {
        this.element.src = '';
    }
}

export default Radio;
