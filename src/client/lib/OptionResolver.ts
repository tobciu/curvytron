/**
 * Option Resolver
 */
export class OptionResolver {
    allowExtra: boolean;
    defaults: Record<string, any>;
    types: Record<string, string>;
    optional: string[];
    required: string[];

    constructor(allowExtra?: boolean) {
        this.allowExtra = allowExtra !== undefined && allowExtra;
        this.defaults = {};
        this.types = {};
        this.optional = [];
        this.required = [];
    }

    /**
     * Set defaults
     */
    setDefaults(defaults: any) {
        for (const name in defaults) {
            if (Object.hasOwn(defaults, name)) {
                this.defaults[name] = defaults[name];
            }
        }

        return this;
    }

    /**
     * Set types
     */
    setTypes(types: any) {
        for (const name in types) {
            if (Object.hasOwn(types, name)) {
                this.types[name] = types[name];
            }
        }

        return this;
    }

    /**
     * Set optional
     */
    setOptional(values: any[]) {
        if (this.allowExtra) {
            return;
        }

        this.addToArray(this.optional, values);

        return this;
    }

    /**
     * Set required
     */
    setRequired(values: any[]) {
        this.addToArray(this.required, values);

        return this;
    }

    /**
     * Resolve
     */
    resolve(source: any): Record<string, any> {
        const options: Record<string, any> = {};

        let name;

        for (name in this.defaults) {
            if (Object.hasOwn(this.defaults, name)) {
                options[name] = this.getValue(source, name);
            }
        }

        for (let i = this.required.length - 1; i >= 0; i--) {
            name = this.required[i];
            if (options[name] === undefined) {
                throw new Error(`Option "${name}" is required.`);
            }
        }

        return options;
    }

    /**
     * Get value
     */
    getValue(options: any, name: string) {
        let value = null;

        if (!this.optionExists(name)) {
            throw new Error(`Unkown option "${name}".`);
        }

        if (options[name] !== undefined) {
            value = options[name];
        } else if (this.defaults[name] !== undefined) {
            value = this.defaults[name];
        }

        return this.checkType(name, value);
    }

    /**
     * Is type valid
     */
    checkType(name: string, value?: any): any {
        const expectedType = this.types[name] ?? false;
        let givenType = typeof value;

        // An option without value (and without default) stays empty
        if (value !== null && expectedType && givenType !== expectedType) {
            if (expectedType === 'string') {
                value = String(value);
            }

            if (expectedType === 'boolean') {
                value = Boolean(value);
            }

            if (expectedType === 'number') {
                value = Number(value);
            }

            givenType = typeof value;

            if (expectedType !== givenType) {
                throw new Error(
                    `Wrong type for option "${name}". Expected ${this.types[name]} but got ${typeof value}`
                );
            }
        }

        return value;
    }

    /**
     * Does this option exists?
     */
    optionExists(name: string): boolean {
        if (this.allowExtra) {
            return true;
        }

        return this.defaults[name] !== undefined || this.optional.includes(name) || this.required.includes(name);
    }

    /**
     * Set defaults
     */
    addToArray(array: string[], values: string[]) {
        let value;

        for (let i = values.length - 1; i >= 0; i--) {
            value = values[i];

            if (!array.includes(value)) {
                array.push(value);
            }
        }
    }
}
