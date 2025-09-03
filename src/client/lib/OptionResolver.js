/**
 * OptionResolver
 */
class OptionResolver {
    constructor(allowExtra) {
        this.allowExtra = typeof allowExtra !== 'undefined' && allowExtra;
        this.defaults = {};
        this.types = {};
        this.optional = [];
        this.required = [];
    }

    setDefaults(defaults) {
        for (const key in defaults) {
            if (defaults.hasOwnProperty(key)) {
                this.defaults[key] = defaults[key];
            }
        }
        return this;
    }

    setTypes(types) {
        for (const key in types) {
            if (types.hasOwnProperty(key)) {
                this.types[key] = types[key];
            }
        }
        return this;
    }

    setOptional(optionals) {
        if (this.allowExtra) {
            return;
        }
        this.addToArray(this.optional, optionals);
        return this;
    }

    setRequired(required) {
        this.addToArray(this.required, required);
        return this;
    }

    resolve(options) {
        const resolved = {};
        for (const key in this.defaults) {
            if (this.defaults.hasOwnProperty(key)) {
                resolved[key] = this.getValue(options, key);
            }
        }
        for (let i = this.required.length - 1; i >= 0; i--) {
            const key = this.required[i];
            if (typeof resolved[key] === 'undefined') {
                throw `Option "${key}" is required.`;
            }
        }
        return resolved;
    }

    getValue(options, key) {
        let value = null;
        if (!this.optionExists(key)) {
            throw `Unkown option "${key}".`;
        }
        if (typeof options[key] !== 'undefined') {
            value = options[key];
        } else if (typeof this.defaults[key] !== 'undefined') {
            value = this.defaults[key];
        }
        this.checkType(key, value);
        return value;
    }

    checkType(key, value) {
        let type = typeof this.types[key] !== 'undefined' ? this.types[key] : false;
        let valueType = typeof value;
        if (type && valueType !== type) {
            if (type === 'string') {
                value = String(value);
            }
            if (type === 'boolean') {
                value = Boolean(value);
            }
            if (type === 'number') {
                value = Number(value);
            }
            valueType = typeof value;
            if (type !== valueType) {
                throw `Wrong type for option "${key}". Expected ${this.types[key]} but got ${typeof value}`;
            }
        }
    }

    optionExists(key) {
        return this.allowExtra ? true : (typeof this.defaults[key] !== 'undefined' || this.optional.indexOf(key) >= 0 || this.required.indexOf(key) >= 0);
    }

    addToArray(array, elements) {
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];
            if (array.indexOf(element) < 0) {
                array.push(element);
            }
        }
    }
}

export default OptionResolver;
