import { Collection } from '../../shared/Collection.ts';

/**
 * Body
 */
export class Body {
    x: any;
    y: any;
    radius: any;
    data: any;
    islands: Collection;
    id: any;

    constructor(x: any, y: any, radius: any, data?: any) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.data = data;
        this.islands = new Collection();
        this.id = null;
    }

    /**
     * Match?
     */
    match(body: Body): boolean {
        return true;
    }
}
