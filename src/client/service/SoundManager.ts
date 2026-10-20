/**
 * Sound Manager
 *
 * Plays the short sound effects of the game through the Web Audio API.
 */
export class SoundManager {
    profile: any;
    active: any;
    buffers: Map<string, AudioBuffer>;
    sources: Map<string, Set<AudioBufferSourceNode>>;
    context: any;
    gain: any;
    extension: any;

    /**
     * Volume
     */
    volume: number = 0.5;

    /**
     * Sounds (files in public/sounds, in .ogg and .mp3)
     */
    sounds: any[] = ['death', 'win', 'notice', 'bonus-clear', 'bonus-pop'];

    /**
     * Directory
     */
    directory: string = 'sounds/';

    constructor(profile: any) {
        this.profile = profile;
        this.active = this.profile.sound;
        this.buffers = new Map();
        this.sources = new Map();

        this.toggle = this.toggle.bind(this);

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

        if (AudioContext) {
            this.context = new AudioContext();
            this.gain = this.context.createGain();
            this.gain.connect(this.context.destination);
            this.setVolume(this.active ? this.volume : 0);
            this.extension = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';

            this.sounds.forEach((sound) => this.load(sound));
        }
    }

    /**
     * Load a sound
     */
    async load(sound: string) {
        try {
            const response = await fetch(`${this.directory}${sound}.${this.extension}`);
            const data = await response.arrayBuffer();

            this.buffers.set(sound, await this.context.decodeAudioData(data));
        } catch (error) {
            console.warn('Could not load sound "%s":', sound, error);
        }
    }

    /**
     * Play a sound
     */
    play(sound: string) {
        const buffer = this.buffers.get(sound);

        if (!this.active || !buffer) {
            return;
        }

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const source = this.context.createBufferSource();

        source.buffer = buffer;
        source.connect(this.gain);
        source.onended = () => this.sources.get(sound)?.delete(source);
        source.start();

        if (!this.sources.has(sound)) {
            this.sources.set(sound, new Set());
        }

        this.sources.get(sound)!.add(source);
    }

    /**
     * Stop every running instance of a sound
     */
    stop(sound: string) {
        for (const source of this.sources.get(sound) ?? []) {
            source.stop();
        }

        this.sources.delete(sound);
    }

    /**
     * Toggle active
     */
    toggle() {
        this.setActive(!this.active);
    }

    /**
     * Set active/inactive
     */
    setActive(active: boolean) {
        this.active = Boolean(active);
        this.setVolume(this.active ? this.volume : 0);
        this.profile.setSound(this.active);
    }

    /**
     * Set volume
     */
    setVolume(volume: number = this.volume) {
        if (this.gain) {
            this.gain.gain.value = volume;
        }
    }
}
