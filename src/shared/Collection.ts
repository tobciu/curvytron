/**
 * An ordered set of objects keyed by one of their properties.
 *
 * Faithful port of the legacy `Collection` — behaviour (including the reverse
 * iteration in {@link map}/{@link filter}/{@link walk}) is preserved.
 */
export class Collection<T = any> {
  ids: Array<string | number> = [];
  items: T[] = [];
  key: string;
  index: boolean;
  id = 0;

  constructor(items?: T[] | null, key?: string, index?: boolean) {
    this.key = key ? key : 'id';
    this.index = Boolean(index);

    if (items) {
      for (let i = items.length - 1; i >= 0; i--) {
        this.add(items[i] as T);
      }
    }
  }

  private prop(element: T): string | number {
    return (element as Record<string, unknown>)[this.key] as string | number;
  }

  clear(): void {
    this.ids.length = 0;
    this.items.length = 0;
    this.id = 0;
  }

  count(): number {
    return this.ids.length;
  }

  isEmpty(): boolean {
    return this.ids.length === 0;
  }

  add(element: T, ttl?: number): boolean {
    this.setId(element);

    if (this.exists(element)) {
      return false;
    }

    this.ids.push(this.prop(element));

    const index = this.ids.indexOf(this.prop(element));

    this.items[index] = element;

    if (ttl) {
      setTimeout(() => {
        this.remove(element);
      }, ttl);
    }

    return true;
  }

  remove(element: T): boolean {
    const index = this.ids.indexOf(this.prop(element));

    if (index >= 0) {
      this.deleteIndex(index);
      return true;
    }

    return false;
  }

  removeById(id: string | number): boolean {
    const index = this.ids.indexOf(id);

    if (index >= 0) {
      this.deleteIndex(index);
      return true;
    }

    return false;
  }

  setId(element: T): void {
    if (this.index) {
      const current = this.prop(element) as unknown as number | undefined;

      if (current) {
        if (current > this.id) {
          this.id = current;
        }
      } else {
        (element as Record<string, unknown>)[this.key] = ++this.id;
      }
    }
  }

  getElementIndex(element: T): number {
    return this.ids.indexOf(this.prop(element));
  }

  getIdIndex(id: string | number): number {
    return this.ids.indexOf(id);
  }

  deleteIndex(index: number): void {
    this.items.splice(index, 1);
    this.ids.splice(index, 1);
  }

  getById(id: string | number): T | null {
    const index = this.ids.indexOf(id);

    return index >= 0 ? (this.items[index] as T) : null;
  }

  getByIndex(index: number): T | null {
    return typeof this.items[index] !== 'undefined' ? (this.items[index] as T) : null;
  }

  exists(element: T): boolean {
    return this.getElementIndex(element) >= 0;
  }

  indexExists(index: string | number): boolean {
    return this.ids.indexOf(index) >= 0;
  }

  map<R = any>(callable: (this: T) => R): Collection<R> {
    const elements: R[] = [];

    for (let i = this.items.length - 1; i >= 0; i--) {
      elements.push(callable.call(this.items[i] as T));
    }

    return new Collection<R>(elements, this.key, this.index);
  }

  filter(callable: (this: T) => unknown): Collection<T> {
    const elements: T[] = [];

    for (let i = this.items.length - 1; i >= 0; i--) {
      if (callable.call(this.items[i] as T)) {
        elements.push(this.items[i] as T);
      }
    }

    return new Collection<T>(elements, this.key, this.index);
  }

  match(callable: (this: T) => unknown): T | null {
    const length = this.items.length;

    for (let i = 0; i < length; i++) {
      if (callable.call(this.items[i] as T)) {
        return this.items[i] as T;
      }
    }

    return null;
  }

  walk(callable: (this: T) => void): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      callable.call(this.items[i] as T);
    }
  }

  getRandomItem(): T | null {
    if (this.items.length === 0) {
      return null;
    }

    return this.items[Math.floor(Math.random() * this.items.length)] as T;
  }

  getFirst(): T | null {
    return this.items.length > 0 ? (this.items[0] as T) : null;
  }

  getLast(): T | null {
    return this.items.length > 0 ? (this.items[this.items.length - 1] as T) : null;
  }

  sort(callable: (a: T, b: T) => number): void {
    this.items.sort(callable);
    this.rebuildIds();
  }

  rebuildIds(): void {
    const ids = new Array(this.items.length);

    for (let i = this.items.length - 1; i >= 0; i--) {
      ids[i] = this.prop(this.items[i] as T);
    }

    this.ids = ids;
  }
}
