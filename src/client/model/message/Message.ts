/**
 * Message
 */
export class Message {
    id: any = null;
    creation: any;
    date: any;

    /**
     * Message type
     */
    type: string = 'default';

    /**
     * Default color
     */
    static anonymousColor: any = '#75858c';

    static anonymousName: any = 'Anonymous';

    static maxLength: any = 140;

    color: any = Message.anonymousColor;

    /**
     * Default name
     */
    name: any = Message.anonymousName;

    /**
     * Default icon
     */
    icon: any = null;

    /**
     * Message max length
     */
    maxLength: any = Message.maxLength;

    constructor(creation?: any) {
        this.creation = typeof creation === 'number' ? new Date(creation) : new Date();
        this.date = this.getDate();
    }

    /**
     * Get date to text
     */
    getDate(): string {
        if (!this.creation) {
            return '';
        }

        let hours = this.creation.getHours().toString(),
            minutes = this.creation.getMinutes().toString();

        if (hours.length === 1) {
            hours = `0${hours}`;
        }

        if (minutes.length === 1) {
            minutes = `0${minutes}`;
        }

        return `${hours}:${minutes}`;
    }
}
