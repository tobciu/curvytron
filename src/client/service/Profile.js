import EventEmitter from 'tom32i-event-emitter.js';

/**
 * Remembered profile
 */
class Profile extends EventEmitter {
    constructor() {
        super();

        this.name = null;
        this.color = null;
        this.sound = true;
        this.radio = false;
        this.loading = false;
        this.controls = [
            new PlayerControl(37, 'icon-left-dir'),
            new PlayerControl(39, 'icon-right-dir')
        ];

        // Binding
        this.onControlChange = this.onControlChange.bind(this);

        const labels = ['Left', 'Right'];

        for (let i = this.controls.length - 1; i >= 0; i--) {
            this.controls[i].label = labels[i];
            this.controls[i].on('change', this.onControlChange);
        }

        this.load();
        this.persist();
    }

    /**
     * Local storage key
     *
     * @type {String}
     */
    localKey = 'PROFILE';

    /**
     * Get data
     *
     * @return {Object}
     */
    serialize() {
        return {
            name: this.name,
            color: this.color,
            sound: this.sound,
            radio: this.radio,
            controls: this.getMapping()
        };
    }

    /**
     * Unserialize
     *
     * @param {Object} data
     */
    unserialize(data) {
        if (typeof(data.name) !== 'undefined') {
            this.setName(data.name);
        }

        if (typeof(data.color) !== 'undefined') {
            this.setColor(data.color);
        }

        if (typeof(data.sound) !== 'undefined') {
            this.setSound(data.sound);
        }

        if (typeof(data.radio) !== 'undefined') {
            this.setRadio(data.radio);
        }

        if (typeof(data.controls) !== 'undefined') {
            this.setControls(data.controls);
        }
    }

    /**
     * Persist
     */
    persist() {
        if (this.loading) { return; }

        if (this.isValid()) {
            window.localStorage.setItem(this.localKey, JSON.stringify(this.serialize()));
            this.emit('change');
        } else {
            this.load();
        }
    }

    /**
     * Persist
     */
    load() {
        this.loading = true;

        const data = window.localStorage.getItem(this.localKey);

        if (data) {
            this.unserialize(JSON.parse(data));
            this.emit('change');
        }

        if (!this.color) {
            this.setColor(BasePlayer.prototype.getRandomColor());
        }

        this.loading = false;
    }

    /**
     * Get mapping
     *
     * @return {Array}
     */
    getMapping() {
        const mapping = new Array(this.controls.length);

        for (let i = this.controls.length - 1; i >= 0; i--) {
            mapping[i] = this.controls[i].getMapping();
        }

        return mapping;
    }

    /**
     * Set name
     *
     * @param {Name} name
     */
    setName(name) {
        name = name.trim();

        if (name.length && this.name !== name) {
            this.name = name;
            this.persist();
        }
    }

    /**
     * Set color
     *
     * @param {String} color
     */
    setColor(color) {
        if (BasePlayer.prototype.validateColor(color)) {
            this.color = color;
            this.persist();
        }
    }

    /**
     * Set controls
     *
     * @param {Object} controls
     */
    setControls(controls) {
        for (let i = controls.length - 1; i >= 0; i--) {
            this.controls[i].loadMapping(controls[i]);
        }
        this.persist();
    }

    /**
     * Set sound
     *
     * @param {Boolean} sound
     */
    setSound(sound) {
        if (this.sound !== sound) {
            this.sound = sound;
            this.persist();
        }
    }

    /**
     * Set radio
     *
     * @param {Boolean} radio
     */
    setRadio(radio) {
        if (this.radio !== radio) {
            this.radio = radio;
            this.persist();
        }
    }

    /**
     *
     * Profile
     *
     * @param {Event} e
     */
    onControlChange(e) {
        this.persist();
    }

    /**
     * Is profile complete?
     *
     * @return {Boolean}
     */
    isComplete() {
        return this.name && this.color;
    }

    /**
     * Is profile valid?
     *
     * @return {Boolean}
     */
    isValid() {
        if (!this.name || !this.name.trim().length) { return false; }
        if (!this.color || !BasePlayer.prototype.validateColor(this.color)) { return false; }

        return true;
    }
}

export default Profile;
