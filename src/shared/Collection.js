/**
 * Collection
 */
class Collection {
    constructor(items, key, index) {
        this.ids = [];
        this.items = [];
        this.key = typeof (key) !== 'undefined' && key ? key : 'id';
        this.index = typeof (index) !== 'undefined' && index;
        this.id = 0;

        if (items) {
            for (let i = items.length - 1; i >= 0; i--) {
                this.add(items[i]);
            }
        }
    }

    /**
     * Clear
     */
    clear() {
        this.ids.length = 0;
        this.items.length = 0;
        this.id = 0;
    }

    /**
     * Count the size of the collection
     *
     * @return {Number}
     */
    count() {
        return this.ids.length;
    }

    /**
     * Is the collection empty?
     *
     * @return {Boolean}
     */
    isEmpty() {
        return this.ids.length === 0;
    }

    /**
     * Add an element
     *
     * @param {mixed} element
     * @param {Number} ttl
     *
     * @return {Boolean}
     */
    add(element, ttl) {
        this.setId(element);

        if (this.exists(element)) { return false; }

        this.ids.push(element[this.key]);

        const index = this.ids.indexOf(element[this.key]);
        this.items[index] = element;

        if (typeof (ttl) !== 'undefined' && ttl) {
            setTimeout(() => this.remove(element), ttl);
        }

        return true;
    }

    /**
     * Remove an element
     *
     * @param {mixed} element
     *
     * @return {Boolean}
     */
    remove(element) {
        const index = this.ids.indexOf(element[this.key]);
        if (index >= 0) {
            this.deleteIndex(index);
            return true;
        }
        return false;
    }

    /**
     * Remove an element by its id
     *
     * @param {mixed} id
     *
     * @return {Boolean}
     */
    removeById(id) {
        const index = this.ids.indexOf(id);
        if (index >= 0) {
            this.deleteIndex(index);
            return true;
        }
        return false;
    }

    /**
     * Set the id of an element
     *
     * @param {mixed} element
     */
    setId(element) {
        if (this.index) {
            if (typeof (element[this.key]) !== 'undefined' && element[this.key]) {
                if (element[this.key] > this.id) {
                    this.id = element[this.key];
                }
            } else {
                element[this.key] = ++this.id;
            }
        }
    }

    /**
     * Get the index for the given element
     *
     * @param {mixed} element
     *
     * @return {Number}
     */
    getElementIndex(element) {
        return this.ids.indexOf(element[this.key]);
    }

    /**
     * Get the index fo the given id
     *
     * @param {Number} id
     *
     * @return {Number}
     */
    getIdIndex(id) {
        return this.ids.indexOf(id);
    }

    /**
     * Delete the element at the given index
     *
     * @param {Number} index
     */
    deleteIndex(index) {
        this.items.splice(index, 1);
        this.ids.splice(index, 1);
    }

    /**
     * Get an element by its id
     *
     * @param {Number} id
     *
     * @return {mixed}
     */
    getById(id) {
        const index = this.ids.indexOf(id);
        return index >= 0 ? this.items[index] : null;
    }

    /**
     * Get an element by its index
     *
     * @param {Number} index
     *
     * @return {mixed}
     */
    getByIndex(index) {
        return typeof (this.items[index]) !== 'undefined' ? this.items[index] : null;
    }

    /**
     * Test if an element is in the collection
     *
     * @param {mixed} element
     *
     * @return {Boolean}
     */
    exists(element) {
        return this.getElementIndex(element) >= 0;
    }

    /**
     * Test if the given index exists is in the collection
     *
     * @param {String} index
     *
     * @return {Boolean}
     */
    indexExists(index) {
        return this.ids.indexOf(index) >= 0;
    }

    /**
     * Map
     *
     * @param {Function} callable
     *
     * @return {Collection}
     */
    map(callable) {
        const elements = [];
        for (let i = this.items.length - 1; i >= 0; i--) {
            elements.push(callable.call(this.items[i]));
        }
        return new Collection(elements, this.key, this.index);
    }

    /**
     * Filter
     *
     * @param {Function} callable
     *
     * @return {Collection}
     */
    filter(callable) {
        const elements = [];
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (callable.call(this.items[i])) {
                elements.push(this.items[i]);
            }
        }
        return new Collection(elements, this.key, this.index);
    }

    /**
     * Match
     *
     * @param {Function} callable
     *
     * @return {Collection}
     */
    match(callable) {
        const length = this.items.length;
        for (let i = 0; i < length; i++) {
            if (callable.call(this.items[i])) {
                return this.items[i];
            }
        }
        return null;
    }

    /**
     * Apply the given callback to all element
     *
     * @param {Function} callable
     */
    walk(callable) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            callable.call(this.items[i]);
        }
    }

    /**
     * Get random item from the collection
     *
     * @return {mixed}
     */
    getRandomItem() {
        if (this.items.length === 0) {
            return null;
        }
        return this.items[Math.floor(Math.random() * this.items.length)];
    }

    /**
     * Get first item in collection
     *
     * @return {Mixed}
     */
    getFirst() {
        return this.items.length > 0 ? this.items[0] : null;
    }

    /**
     * Get last item in collection
     *
     * @return {Mixed}
     */
    getLast() {
        return this.items.length > 0 ? this.items[this.items.length - 1] : null;
    }

    /**
     * Sort
     *
     * @param {Function} callable
     */
    sort(callable) {
        this.items.sort(callable);
        this.rebuildIds();
    }

    /**
     * Rebuild Ids
     */
    rebuildIds() {
        const ids = new Array(this.items.length);
        for (let i = this.items.length - 1; i >= 0; i--) {
            ids[i] = this.items[i][this.key];
        }
        this.ids = ids;
    }
}

export default Collection;
