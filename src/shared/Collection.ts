/** An element is indexed by the property named `key` (`id` by default) */
type Indexed = Record<string, any>;

/**
 * Collection of elements, indexed by one of their properties.
 *
 * Callbacks of `map`, `filter`, `match` and `walk` receive the element as `this`.
 */
export class Collection<T = any> {
    ids: any[] = [];
    items: T[] = [];
    key: string;
    /** When true, elements without id get the next free one */
    index: boolean;
    id = 0;

    /**
     * @param items Initial elements
     * @param key Name of the property that identifies an element
     * @param index Give an id to the elements that have none
     */
    constructor(items?: T[] | null, key?: string | null, index?: boolean) {
        this.key = key ? key : 'id';
        this.index = typeof index !== 'undefined' && index;

        if (items) {
            for (let i = items.length - 1; i >= 0; i--) {
                this.add(items[i]);
            }
        }
    }

    /**
     * Clear
     */
    clear(): void {
        this.ids.length = 0;
        this.items.length = 0;
        this.id = 0;
    }

    /**
     * Count the size of the collection
     */
    count(): number {
        return this.ids.length;
    }

    /**
     * Is the collection empty?
     */
    isEmpty(): boolean {
        return this.ids.length === 0;
    }

    /**
     * Add an element
     *
     * @param ttl Remove the element after this delay (ms)
     * @return false when the element is already in the collection
     */
    add(element: T, ttl?: number): boolean {
        this.setId(element);

        if (this.exists(element)) {
            return false;
        }

        const id = (element as Indexed)[this.key];

        this.ids.push(id);

        const index = this.ids.indexOf(id);

        this.items[index] = element;

        if (ttl) {
            setTimeout(() => {
                this.remove(element);
            }, ttl);
        }

        return true;
    }

    /**
     * Remove an element
     */
    remove(element: T): boolean {
        const index = this.ids.indexOf((element as Indexed)[this.key]);

        if (index >= 0) {
            this.deleteIndex(index);

            return true;
        }

        return false;
    }

    /**
     * Remove an element by its id
     */
    removeById(id: any): boolean {
        const index = this.ids.indexOf(id);

        if (index >= 0) {
            this.deleteIndex(index);

            return true;
        }

        return false;
    }

    /**
     * Set the id of an element
     */
    setId(element: T): void {
        if (this.index) {
            const indexed = element as Indexed;

            if (typeof indexed[this.key] !== 'undefined' && indexed[this.key]) {
                if (indexed[this.key] > this.id) {
                    this.id = indexed[this.key];
                }
            } else {
                indexed[this.key] = ++this.id;
            }
        }
    }

    /**
     * Get the index for the given element
     */
    getElementIndex(element: T): number {
        return this.ids.indexOf((element as Indexed)[this.key]);
    }

    /**
     * Get the index fo the given id
     */
    getIdIndex(id: any): number {
        return this.ids.indexOf(id);
    }

    /**
     * Delete the element at the given index
     */
    deleteIndex(index: number): void {
        this.items.splice(index, 1);
        this.ids.splice(index, 1);
    }

    /**
     * Get an element by its id
     */
    getById(id: any): T | null {
        const index = this.ids.indexOf(id);

        return index >= 0 ? this.items[index] : null;
    }

    /**
     * Get an element by its index
     */
    getByIndex(index: number): T | null {
        return typeof this.items[index] !== 'undefined' ? this.items[index] : null;
    }

    /**
     * Test if an element is in the collection
     */
    exists(element: T): boolean {
        return this.getElementIndex(element) >= 0;
    }

    /**
     * Test if the given id is in the collection
     */
    indexExists(id: any): boolean {
        return this.ids.indexOf(id) >= 0;
    }

    /**
     * Map
     */
    map<U>(callable: (this: T) => U): Collection<U> {
        const elements: U[] = [];

        for (let i = this.items.length - 1; i >= 0; i--) {
            elements.push(callable.call(this.items[i]));
        }

        return new Collection<U>(elements, this.key, this.index);
    }

    /**
     * Filter
     */
    filter(callable: (this: T) => unknown): Collection<T> {
        const elements: T[] = [];

        for (let i = this.items.length - 1; i >= 0; i--) {
            if (callable.call(this.items[i])) {
                elements.push(this.items[i]);
            }
        }

        return new Collection<T>(elements, this.key, this.index);
    }

    /**
     * First element for which the callback is true
     */
    match(callable: (this: T) => unknown): T | null {
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
     */
    walk(callable: (this: T) => void): void {
        for (let i = this.items.length - 1; i >= 0; i--) {
            callable.call(this.items[i]);
        }
    }

    /**
     * Get random item from the collection
     */
    getRandomItem(): T | null {
        if (this.items.length === 0) {
            return null;
        }

        return this.items[Math.floor(Math.random() * this.items.length)];
    }

    /**
     * Get first item in collection
     */
    getFirst(): T | null {
        return this.items.length > 0 ? this.items[0] : null;
    }

    /**
     * Get last item in collection
     */
    getLast(): T | null {
        return this.items.length > 0 ? this.items[this.items.length - 1] : null;
    }

    /**
     * Sort
     */
    sort(callable: (a: T, b: T) => number): void {
        this.items.sort(callable);
        this.rebuildIds();
    }

    /**
     * Rebuild Ids
     */
    rebuildIds(): void {
        this.ids = this.items.map((item) => (item as Indexed)[this.key]);
    }
}
