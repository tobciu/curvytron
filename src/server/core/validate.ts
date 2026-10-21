/**
 * Validation of the data sent by the clients
 *
 * The clients send whatever they want: before a handler uses `data.name`, it checks that the data has the expected shape.
 */

export type Rule = (value: unknown) => boolean;

export const rules = {
    /** A text of at most `max` characters */
    string: (max: number = 200): Rule => {
        return (value) => typeof value === 'string' && value.length <= max;
    },
    /** An identifier: a whole number, not negative */
    id: ((value) => Number.isSafeInteger(value) && (value as number) >= 0) as Rule,
    /** A finite number */
    number: ((value) => typeof value === 'number' && Number.isFinite(value)) as Rule,
    /** A whole number between `min` and `max` */
    integer: (min: number, max: number): Rule => {
        return (value) => Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
    },
    boolean: ((value) => typeof value === 'boolean') as Rule,
    /** The value can be missing or null */
    optional: (rule: Rule): Rule => {
        return (value) => value === undefined || value === null || rule(value);
    },
    /** One of the rules is satisfied */
    either: (...alternatives: Rule[]): Rule => {
        return (value) => alternatives.some((rule) => rule(value));
    }
};

/**
 * Is the data an object with the properties of the shape?
 */
export function isShape(data: unknown, shape: Record<string, Rule>): boolean {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
    }

    const object = data as Record<string, unknown>;

    return Object.entries(shape).every(([key, rule]) => rule(object[key]));
}

/** What the handlers answer when the data is wrong */
export const invalidData = { success: false, error: 'Invalid data.' } as const;
