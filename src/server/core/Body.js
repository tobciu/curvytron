import Collection from '../../shared/Collection.js';

/**
 * Body
 */
class Body {
    constructor(x, y, radius, data) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.data = data;
        this.islands = new Collection();
        this.id = null;
    }

    /**
     * Match?
     *
     * @param {Body} body
     *
     * @return {Boolean}
     */
    match(body) {
        return true;
    }
}

export default Body;
