import { ref } from 'vue';
import type { Profile } from '../types';

/**
 * State of the profile side panel.
 *
 * The profile emits `open` and `close`: rooms wait for the `close` of an incomplete profile before joining.
 */
export class ProfilePanel {
    /** Is the panel displayed? */
    readonly open = ref(false);
    /** Is the "what we need to know" tutorial displayed? (decided when the panel opens) */
    readonly tutorial = ref(false);

    constructor(private readonly profile: Profile) {}

    openProfile(): void {
        if (!this.open.value) {
            this.open.value = true;
            this.tutorial.value = !this.profile.isComplete();
            this.profile.emit('open');
        }
    }

    /** The panel can only be closed once the profile is complete. */
    closeProfile(): void {
        if (this.open.value && this.profile.isComplete()) {
            this.open.value = false;
            this.tutorial.value = !this.profile.isComplete();
            this.profile.emit('close');
        }
    }

    toggleProfile(): void {
        if (this.open.value) {
            this.closeProfile();
        } else {
            this.openProfile();
        }
    }

    /** Reset without notifying (the panel is removed from the page). */
    reset(): void {
        this.open.value = false;
        this.tutorial.value = false;
    }
}
