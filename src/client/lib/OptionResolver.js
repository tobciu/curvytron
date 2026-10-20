/**
 * Option Resolver
 *
 * @param {Boolean} allowExtra
 */
export class OptionResolver {
    constructor(allowExtra) {
        this.allowExtra = typeof allowExtra !== 'undefined' && allowExtra;
        this.defaults = {};
        this.types = {};
        this.optional = [];
        this.required = [];
    }

    /**
     * Set defaults
     *
     * @param {Object} defaults
     */
    setDefaults(defaults) {
        for (const name in defaults) {
            if (Object.hasOwn(defaults, name)) {
                this.defaults[name] = defaults[name];
            }
        }

        return this;
    }

    /**
     * Set types
     *
     * @param {Object} types
     */
    setTypes(types) {
        for (const name in types) {
            if (Object.hasOwn(types, name)) {
                this.types[name] = types[name];
            }
        }

        return this;
    }

    /**
     * Set optional
     *
     * @param {Array} values
     */
    setOptional(values) {
        if (this.allowExtra) {
            return;
        }

        this.addToArray(this.optionals, values);

        return this;
    }

    /**
     * Set required
     *
     * @param {Array} values
     */
    setRequired(values) {
        this.addToArray(this.required, values);

        return this;
    }

    /**
     * Resolve
     *
     * @param {Object} options
     *
     * @return {Object}
     */
    resolve(source) {
        const options = {};

        let name;

        for (name in this.defaults) {
            if (Object.hasOwn(this.defaults, name)) {
                options[name] = this.getValue(source, name);
            }
        }

        for (let i = this.required.length - 1; i >= 0; i--) {
            name = this.required[i];
            if (typeof options[name] === 'undefined') {
                throw `Option "${name}" is required.`;
            }
        }

        return options;
    }

    /**
     * Get value
     *
     * @param {Object} options
     * @param {String} name
     *
     * @return {mixed}
     */
    getValue(options, name) {
        let value = null;

        if (!this.optionExists(name)) {
            throw `Unkown option "${name}".`;
        }

        if (typeof options[name] !== 'undefined') {
            value = options[name];
        } else if (typeof this.defaults[name] !== 'undefined') {
            value = this.defaults[name];
        }

        this.checkType(name, value);

        return value;
    }

    /**
     * Is type valid
     *
     * @param {String} name
     * @param {mixed} value
     *
     * @return {Boolean}
     */
    checkType(name, value) {
        const expectedType = typeof this.types[name] !== 'undefined' ? this.types[name] : false;
        let givenType = typeof value;

        if (expectedType && givenType !== expectedType) {
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
                throw `Wrong type for option "${name}". Expected ${this.types[name]} but got ${typeof value}`;
            }
        }
    }

    /**
     * Does this option exists?
     *
     * @param {String} name
     *
     * @return {Boolean}
     */
    optionExists(name) {
        if (this.allowExtra) {
            return true;
        }

        return (
            typeof this.defaults[name] !== 'undefined' ||
            this.optional.indexOf(name) >= 0 ||
            this.required.indexOf(name) >= 0
        );
    }

    /**
     * Set defaults
     *
     * @param {Object} defaults
     */
    addToArray(array, values) {
        let value;

        for (let i = values.length - 1; i >= 0; i--) {
            value = values[i];

            if (array.indexOf(value) >= 0) {
                array.push(value);
            }
        }
    }
}
