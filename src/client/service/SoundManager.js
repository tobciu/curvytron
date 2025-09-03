/**
 * Sound Manager
 */
class SoundManager {
    constructor(profile) {
        this.profile = profile;
        this.active = this.profile.sound;

        this.toggle = this.toggle.bind(this);

        createjs.Sound.alternateExtensions = ['mp3'];
        createjs.Sound.registerSounds(this.sounds, this.directory);
        createjs.Sound.setVolume(this.active ? this.volume : 0);
    }

    /**
     * Volume
     *
     * @type {Number}
     */
    volume = 0.5;

    /**
     * Sounds
     *
     * @type {Array}
     */
    sounds = [
        {id: 'death', src: 'death.ogg'},
        {id: 'win', src: 'win.ogg'},
        {id: 'notice', src: 'notice.ogg'},
        {id: 'bonus-clear', src: 'bonus-clear.ogg'},
        {id: 'bonus-pop', src: 'bonus-pop.ogg'}
    ];

    /**
     * Directory
     *
     * @type {String}
     */
    directory = 'sounds/';

    /**
     * Play a sound
     *
     * @param {String} sound
     */
    play(sound) {
        if (this.active) {
            createjs.Sound.play(sound);
        }
    }

    /**
     * Sound manager
     *
     * @param {String} sound
     */
    stop(sound) {
        createjs.Sound.stop(sound);
    }

    /**
     * Toggle active
     */
    toggle() {
        this.setActive(!this.active);
    }

    /**
     * Set active/inactive
     *
     * @param {Boolean} active
     */
    setActive(active) {
        this.active = active ? true : false;
        this.setVolume(this.active ? this.volume : 0);
        this.profile.setSound(this.active);
    }

    /**
     * Set volume
     *
     * @param {Number} volume
     */
    setVolume(volume) {
        createjs.Sound.setVolume(typeof(volume) !== 'undefined' ? volume : this.volume);
    }
}

export default SoundManager;
