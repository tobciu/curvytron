var EventEmitter = require('events').EventEmitter,
    WebSocket = require('faye-websocket'),
    http = require('http'),
    express = require('express'),
    md5,
    usage,
    influx;

try {
    md5 = require('MD5');
} catch (error) {
    md5 = false;
}

try {
    usage = require('usage');
} catch (error) {
    usage = false;
}

try {
    influx = require('influx');
} catch (error) {
    influx = false;
}

/**
 * Collection
 *
 * @param {Array} items
 * @param {String} key
 * @param {Boolean} index
 */
function Collection(items, key, index)
{
    this.ids   = [];
    this.items = [];
    this.key   = typeof(key) !== 'undefined' && key ? key : 'id';
    this.index = typeof(index) !== 'undefined' && index;
    this.id    = 0;

    if (items) {
        for (var i = items.length - 1; i >= 0; i--) {
            this.add(items[i]);
        }
    }
}

/**
 * Clear
 */
Collection.prototype.clear = function()
{
    this.ids.length   = 0;
    this.items.length = 0;
    this.id           = 0;
};

/**
 * Count the size of the collection
 *
 * @return {Number}
 */
Collection.prototype.count = function()
{
    return this.ids.length;
};

/**
 * Is the collection empty?
 *
 * @return {Boolean}
 */
Collection.prototype.isEmpty = function()
{
    return this.ids.length === 0;
};

/**
 * Add an element
 *
 * @param {mixed} element
 * @param {Number} ttl
 *
 * @return {Boolean}
 */
Collection.prototype.add = function(element, ttl)
{
    this.setId(element);

    if (this.exists(element)) { return false; }

    this.ids.push(element[this.key]);

    var index = this.ids.indexOf(element[this.key]);

    this.items[index] = element;

    if (typeof(ttl) !== 'undefined' && ttl) {
        var collection = this;
        setTimeout(function () { collection.remove(element); }, ttl);
    }

    return true;
};

/**
 * Remove an element
 *
 * @param {mixed} element
 *
 * @return {Boolean}
 */
Collection.prototype.remove = function(element)
{
    var index = this.ids.indexOf(element[this.key]);

    if (index >= 0) {
        this.deleteIndex(index);
        return true;
    }

    return false;
};

/**
 * Remove an element by its id
 *
 * @param {mixed} id
 *
 * @return {Boolean}
 */
Collection.prototype.removeById = function(id)
{
    var index = this.ids.indexOf(id);

    if (index >= 0) {
        this.deleteIndex(index);
        return true;
    }

    return false;
};

/**
 * Set the id of an element
 *
 * @param {mixed} element
 */
Collection.prototype.setId = function(element)
{
    if (this.index) {
        if (typeof(element[this.key]) !== 'undefined' && element[this.key]) {
            if (element[this.key] > this.id) {
                this.id = element[this.key];
            }
        } else {
            element[this.key] = ++this.id;
        }
    }
};

/**
 * Get the index for the given element
 *
 * @param {mixed} element
 *
 * @return {Number}
 */
Collection.prototype.getElementIndex = function(element)
{
    return this.ids.indexOf(element[this.key]);
};

/**
 * Get the index fo the given id
 *
 * @param {Number} id
 *
 * @return {Number}
 */
Collection.prototype.getIdIndex = function(id)
{
    return this.ids.indexOf(id);
};

/**
 * Delete the element at the given index
 *
 * @param {Number} index
 */
Collection.prototype.deleteIndex = function(index)
{
    this.items.splice(index, 1);
    this.ids.splice(index, 1);
};

/**
 * Get an element by its id
 *
 * @param {Number} id
 *
 * @return {mixed}
 */
Collection.prototype.getById = function(id)
{
    var index = this.ids.indexOf(id);

    return index >= 0 ? this.items[index] : null;
};

/**
 * Get an element by its index
 *
 * @param {Number} index
 *
 * @return {mixed}
 */
Collection.prototype.getByIndex = function(index)
{
    return typeof(this.items[index]) !== 'undefined' ? this.items[index] : null;
};

/**
 * Test if an element is in the collection
 *
 * @param {mixed} element
 *
 * @return {Boolean}
 */
Collection.prototype.exists = function(element)
{
    return this.getElementIndex(element) >= 0;
};

/**
 * Test if the given index exists is in the collection
 *
 * @param {String} index
 *
 * @return {Boolean}
 */
Collection.prototype.indexExists = function(index)
{
    return this.ids.indexOf(index) >= 0;
};

/**
 * Map
 *
 * @param {Function} callable
 *
 * @return {Collection}
 */
Collection.prototype.map = function(callable)
{
    var elements = [];

    for (var i = this.items.length - 1; i >= 0; i--) {
        elements.push(callable.call(this.items[i]));
    }

    return new Collection(elements, this.key, this.index);
};

/**
 * Filter
 *
 * @param {Function} callable
 *
 * @return {Collection}
 */
Collection.prototype.filter = function(callable)
{
    var elements = [];

    for (var i = this.items.length - 1; i >= 0; i--) {
        if (callable.call(this.items[i])) {
            elements.push(this.items[i]);
        }
    }

    return new Collection(elements, this.key, this.index);
};

/**
 * Match
 *
 * @param {Function} callable
 *
 * @return {Collection}
 */
Collection.prototype.match = function(callable)
{
    var length = this.items.length;

    for (var i = 0; i < length; i++) {
        if (callable.call(this.items[i])) {
            return this.items[i];
        }
    }

    return null;
};

/**
 * Apply the given callback to all element
 *
 * @param {Function} callable
 */
Collection.prototype.walk = function(callable)
{
    for (var i = this.items.length - 1; i >= 0; i--) {
        callable.call(this.items[i]);
    }
};

/**
 * Get random item from the collection
 *
 * @return {mixed}
 */
Collection.prototype.getRandomItem = function()
{
    if (this.items.length === 0) {
        return null;
    }

    return this.items[Math.floor(Math.random() * this.items.length)];
};

/**
 * Get first item in collection
 *
 * @return {Mixed}
 */
Collection.prototype.getFirst = function()
{
    return this.items.length > 0 ? this.items[0] : null;
};

/**
 * Get last item in collection
 *
 * @return {Mixed}
 */
Collection.prototype.getLast = function()
{
    return this.items.length > 0 ? this.items[this.items.length - 1] : null;
};

/**
 * Sort
 *
 * @param {Function} callable
 */
Collection.prototype.sort = function(callable)
{
    this.items.sort(callable);
    this.rebuildIds();
};

/**
 * Rebuild Ids
 */
Collection.prototype.rebuildIds = function()
{
    var ids = new Array(this.items.length);

    for (var i = this.items.length - 1; i >= 0; i--) {
        ids[i] = this.items[i][this.key];
    }

    this.ids = ids;
};

/**
 * Base Socket Client
 *
 * @param {Object} socket
 * @param {Number} interval
 */
function BaseSocketClient(socket, interval)
{
    EventEmitter.call(this);

    this.socket    = socket;
    this.interval  = typeof(interval) === 'number' ? interval : 0;
    this.events    = [];
    this.callbacks = {};
    this.loop      = null;
    this.connected = true;
    this.callCount = 0;

    this.flush     = this.flush.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose   = this.onClose.bind(this);

    this.attachEvents();
    this.start();
}

BaseSocketClient.prototype = Object.create(EventEmitter.prototype);
BaseSocketClient.prototype.constructor = BaseSocketClient;

/**
 * On socket close
 */
BaseSocketClient.prototype.onClose = function()
{
    this.connected = false;
    this.emit('close', this);
    this.stop();
    this.detachEvents();
};


/**
 * Set interval
 *
 * @param {Number} interval
 */
BaseSocketClient.prototype.setInterval = function(interval)
{
    this.stop();
    this.flush();

    this.interval = typeof(interval) === 'number' ? interval : 0;

    this.start();
};

/**
 * Start
 */
BaseSocketClient.prototype.start = function()
{
    if (this.interval && !this.loop) {
        this.loop = setInterval(this.flush, this.interval);
        this.flush();
    }
};

/**
 * Stop
 */
BaseSocketClient.prototype.stop = function()
{
    if (this.loop) {
        clearInterval(this.loop);
        this.loop = null;
    }
};

/**
 * Attach events
 */
BaseSocketClient.prototype.attachEvents = function()
{
    this.socket.addEventListener('message', this.onMessage);
    this.socket.addEventListener('close', this.onClose);
};

/**
 * Detach Events
 */
BaseSocketClient.prototype.detachEvents = function()
{
    this.socket.removeEventListener('message', this.onMessage);
    this.socket.removeEventListener('close', this.onClose);
};

/**
 * Add an event to the list
 *
 * @param {String} name
 * @param {Object} data
 * @param {Function} callback
 * @param {Boolean} force
 */
BaseSocketClient.prototype.addEvent = function (name, data, callback, force)
{
    var event = [name];

    if (typeof(data) !== 'undefined') {
        event[1] = data;
    }

    if (typeof(callback) === 'function') {
        event[2] = this.indexCallback(callback);
    }

    if (!this.interval || (typeof(force) !== 'undefined' && force)) {
        this.sendEvents([event]);
    } else {
        this.events.push(event);
        this.start();
    }
};

/**
 * Add an event to the list
 *
 * @param {Array} events
 * @param {Boolean} force
 */
BaseSocketClient.prototype.addEvents = function (sources, force)
{
    var length = sources.length,
        events = [];

    for (var i = 0; i < length; i++) {
        events.push(sources[i]);
    }

    if (!this.interval || force) {
        this.sendEvents(events);
    } else {
        Array.prototype.push.apply(this.events, events);
        this.start();
    }
};

/**
 * Index a new callback
 *
 * @param {Function} callback
 *
 * @return {Number}
 */
BaseSocketClient.prototype.indexCallback = function(callback)
{
    var index = this.callCount++;

    this.callbacks[index] = callback;

    return index;
};

/**
 * Add a callback
 *
 * @param {Number} id
 * @param {Object} data
 */
BaseSocketClient.prototype.addCallback = function (id, data)
{
    var event = [id];

    if (typeof(data) !== 'undefined') {
        event[1] = data;
    }

    this.sendEvents([event]);
};

/**
 * Send an event
 *
 * @param {String} name
 * @param {String} data
 */
BaseSocketClient.prototype.sendEvents = function (events)
{
    this.socket.send(JSON.stringify(events));
};

/**
 * Send Events
 */
BaseSocketClient.prototype.flush = function ()
{
    if (this.events.length > 0) {
        this.sendEvents(this.events);
        this.events.length = 0;
    }
};

/**
 * On message
 *
 * @param {Event} e
 */
BaseSocketClient.prototype.onMessage = function (e)
{
    var data = JSON.parse(e.data),
        length = data.length,
        name, source;

    for (var i = 0; i < length; i++) {
        source = data[i];
        name = source[0];

        if (typeof(name) === 'string') {
            if (source.length === 3) {
                this.emit(name, [source[1], this.createCallback(source[2])]);
            } else {
                this.emit(name, source[1]);
            }
        } else {
            this.playCallback(name, typeof(source[1]) !== 'undefined' ? source[1] : null);
        }
    }
};

/**
 * Play an indexed callback
 *
 * @param {Number} id
 * @param {Object|null} data
 */
BaseSocketClient.prototype.playCallback = function(id, data)
{
    if (typeof(this.callbacks[id]) !== 'undefined') {
        this.callbacks[id](data);
        delete this.callbacks[id];
    }
};

/**
 * Create callback
 *
 * @param {Number} id
 *
 * @return {Function}
 */
BaseSocketClient.prototype.createCallback = function(id)
{
    var client = this;

    return function (data) { client.addCallback(id, data); };
};

/**
 * Object version of the client
 *
 * @return {Object}
 */
BaseSocketClient.prototype.serialize = function()
{
    return {id: this.id};
};

/**
 * Base Bonus Manager
 *
 * @param {Game} game
 */
function BaseBonusManager(game)
{
    EventEmitter.call(this);

    this.game    = game;
    this.bonuses = new Collection([], 'id', true);

    this.clear = this.clear.bind(this);
}

BaseBonusManager.prototype = Object.create(EventEmitter.prototype);
BaseBonusManager.prototype.constructor = BaseBonusManager;

/**
 * Maximum number of bonus on the map at the same time
 *
 * @type {Number}
 */
BaseBonusManager.prototype.bonusCap = 20;

/**
 * Interval between two bonus pop (will vary from a factor x1 to x3)
 *
 * @type {Number}
 */
BaseBonusManager.prototype.bonusPopingTime = 3000;

/**
 * Margin from bonus to trails
 *
 * @type {Number}
 */
BaseBonusManager.prototype.bonusPopingMargin = 0.01;

/**
 * Start
 */
BaseBonusManager.prototype.start = function()
{
    this.clear();
};

/**
 * Stop
 */
BaseBonusManager.prototype.stop = function()
{
    this.clear();
};

/**
 * Add bonus
 *
 * @param {Bonus} bonus
 */
BaseBonusManager.prototype.add = function(bonus)
{
    return this.bonuses.add(bonus);
};

/**
 * Remove bonus
 *
 * @param {Bonus} bonus
 */
BaseBonusManager.prototype.remove = function(bonus)
{
    bonus.clear();

    return this.bonuses.remove(bonus);
};

/**
 * Clear bonuses
 */
BaseBonusManager.prototype.clear = function()
{
    for (var i = this.bonuses.items.length - 1; i >= 0; i--) {
        this.bonuses.items[i].clear();
    }

    this.bonuses.clear();
};

/**
 * Base Avatar
 *
 * @param {Player} player
 */
function BaseAvatar(player)
{
    EventEmitter.call(this);

    this.id              = player.id;
    this.name            = player.name;
    this.color           = player.color;
    this.borderColor           = player.color;
    this.player          = player;
    this.x               = 0;
    this.y               = 0;
    this.trail           = new Trail(this);
    this.bonusStack      = new BonusStack(this);
    this.angle           = 0;
    this.velocityX       = 0;
    this.velocityY       = 0;
    this.angularVelocity = 0;
    this.alive           = true;
    this.printing        = false;
    this.score           = 0;
    this.roundScore      = 0;
    this.ready           = false;
    this.present         = true;

    // useless too? this.updateVelocities();
}

BaseAvatar.prototype = Object.create(EventEmitter.prototype);
BaseAvatar.prototype.constructor = BaseAvatar;

/**
 * Movement velocity
 *
 * @type {Number}
 */
BaseAvatar.prototype.velocity = 16;

/**
 * Turn velocity
 *
 * @type {Float}
 */
BaseAvatar.prototype.angularVelocityBase = 2.8/1000;

/**
 * Radius
 *
 * @type {Number}
 */
BaseAvatar.prototype.radius = 0.6;

/**
 * Number of trail points that don't kill the player
 *
 * @type {Number}
 */
BaseAvatar.prototype.trailLatency = 3;

/**
 * Inverted controls
 *
 * @type {Boolean}
 */
BaseAvatar.prototype.inverse = false;

/**
 * Invincible
 *
 * @type {Boolean}
 */
BaseAvatar.prototype.invincible = false;

/**
 * Invincible
 *
 * @type {Boolean}
 */
BaseAvatar.prototype.ghost = false;

/**
 * Type of tunrn: round or straight
 *
 * @type {Boolean}
 */
BaseAvatar.prototype.directionInLoop = true;

/**
 * Equal
 *
 * @param {Avatar} avatar
 *
 * @return {Boolean}
 */
BaseAvatar.prototype.equal = function(avatar)
{
    return this.id === avatar.id;
};

/**
 * Set Point
 *
 * @param {Float} x
 * @param {Float} y
 */
BaseAvatar.prototype.setPosition = function(x, y)
{
    this.x = x;
    this.y = y;
};

/**
 * Add point
 *
 * @param {Float} x
 * @param {Float} y
 */
BaseAvatar.prototype.addPoint = function(x, y)
{
    this.trail.addPoint(x, y);
};

/**
 * Update angular velocity
 *
 * @param {Number} factor
 */
BaseAvatar.prototype.updateAngularVelocity = function(factor)
{
    if (typeof(factor) === 'undefined') {
        if (this.angularVelocity === 0) { return; }
        factor = (this.angularVelocity > 0 ? 1 : -1) * (this.inverse ? -1 : 1);
    }

    this.setAngularVelocity(factor * this.angularVelocityBase * (this.inverse ? -1 : 1));
};

/**
 * Set angular velocity
 *
 * @param {Float} angularVelocity
 */
BaseAvatar.prototype.setAngularVelocity = function(angularVelocity)
{
    this.angularVelocity = angularVelocity;
};

/**
 * Set angle
 *
 * @param {Float} angle
 */
BaseAvatar.prototype.setAngle = function(angle)
{
    if (this.angle !== angle) {
        this.angle = angle;
        this.updateVelocities();
    }
};

/**
 * Update
 *
 * @param {Number} step
 */
BaseAvatar.prototype.update = function(step) {};

/**
 * Add angle
 *
 * @param {Number} step
 */
BaseAvatar.prototype.updateAngle = function(step)
{
    if (this.angularVelocity) {
        if (this.directionInLoop) {
            this.setAngle(this.angle + this.angularVelocity * step);
        } else {
            this.setAngle(this.angle + this.angularVelocity);
            this.updateAngularVelocity(0);
        }
    }
};

/**
 * Update position
 *
 * @param {Number} step
 */
BaseAvatar.prototype.updatePosition = function(step)
{
    this.setPosition(
        this.x + this.velocityX * step,
        this.y + this.velocityY * step
    );
};

/**
 * Set velocity
 *
 * @param {Number} step
 */
BaseAvatar.prototype.setVelocity = function(velocity)
{
    velocity = Math.max(velocity, BaseAvatar.prototype.velocity/2);

    if (this.velocity !== velocity) {
        this.velocity = velocity;
        this.updateVelocities();
    }
};

/**
 * Update velocities
 */
BaseAvatar.prototype.updateVelocities = function()
{
    var velocity = this.velocity/1000;

    this.velocityX = Math.cos(this.angle) * velocity;
    this.velocityY = Math.sin(this.angle) * velocity;

    this.updateBaseAngularVelocity();
};

/**
 * Update base angular velocity
 */
BaseAvatar.prototype.updateBaseAngularVelocity = function()
{
    if (this.directionInLoop) {
        var ratio = this.velocity / BaseAvatar.prototype.velocity;
        this.angularVelocityBase = ratio * BaseAvatar.prototype.angularVelocityBase + Math.log(1/ratio)/1000;
        this.updateAngularVelocity();
    }
};

/**
 * Set radius
 *
 * @param {Number} radius
 */
BaseAvatar.prototype.setRadius = function(radius)
{
    this.radius = Math.max(radius, BaseAvatar.prototype.radius/8);
};

/**
 * Set inverse
 *
 * @param {Number} inverse
 */
BaseAvatar.prototype.setInverse = function(inverse)
{
    if (this.inverse !== inverse) {
        this.inverse = inverse ? true : false;
        this.updateAngularVelocity();
    }
};

/**
 * Set invincible
 *
 * @param {Number} invincible
 */
BaseAvatar.prototype.setInvincible = function(invincible)
{
    this.invincible = invincible ? true : false;
};

/**
 * Set ghost
 *
 * @param {Number} ghost
 */
BaseAvatar.prototype.setGhost = function(ghost)
{
    this.ghost = ghost ? true : false;
};

/**
 * Get distance
 *
 * @param {Number} fromX
 * @param {Number} fromY
 * @param {Number} toX
 * @param {Number} toY
 *
 * @return {Number}
 */
BaseAvatar.prototype.getDistance = function(fromX, fromY, toX, toY)
{
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
};

/**
 * Die
 */
BaseAvatar.prototype.die = function()
{
    this.bonusStack.clear();
    this.alive = false;
    this.addPoint(this.x, this.y);
};

/**
 * Set printing
 *
 * @param {Boolean} printing
 */
BaseAvatar.prototype.setPrinting = function(printing)
{
    printing = printing ? true : false;

    if (this.printing !== printing) {
        this.printing = printing;

        this.addPoint(this.x, this.y, true);

        if (!this.printing) {
            this.trail.clear();
        }
    }
};

/**
 * This score
 *
 * @param {Number} score
 */
BaseAvatar.prototype.addScore = function(score)
{
    this.setRoundScore(this.roundScore + score);
};

/**
 * Resolve score
 *
 * @param {Number} score
 */
BaseAvatar.prototype.resolveScore = function()
{
    this.setScore(this.score + this.roundScore);
    this.roundScore = 0;
};

/**
 * This round score
 *
 * @param {Number} score
 */
BaseAvatar.prototype.setRoundScore = function(score)
{
    this.roundScore = score;
};

/**
 * This score
 *
 * @param {Number} score
 */
BaseAvatar.prototype.setScore = function(score)
{
    this.score = score;
};

/**
 * Set color
 *
 * @param {Number} color
 */
BaseAvatar.prototype.setColor = function(color)
{
    this.color = color;
};

/**
 * Set borderColor
 *
 * @param {Number} color
 */
BaseAvatar.prototype.setBorderColor = function(borderColor)
{
    this.borderColor = borderColor;
};

/**
 * Clear
 */
BaseAvatar.prototype.clear = function()
{
    this.bonusStack.clear();

    this.x                   = this.radius;
    this.y                   = this.radius;
    this.angle               = 0;
    this.velocityX           = 0;
    this.velocityY           = 0;
    this.angularVelocity     = 0;
    this.roundScore          = 0;
    this.velocity            = BaseAvatar.prototype.velocity;
    this.alive               = true;
    this.ghost               = false;
    this.printing            = false;
    this.color               = this.player.color;
    this.borderColor         = this.player.color;
    this.radius              = BaseAvatar.prototype.radius;
    this.inverse             = BaseAvatar.prototype.inverse;
    this.invincible          = BaseAvatar.prototype.invincible;
    this.directionInLoop     = BaseAvatar.prototype.directionInLoop;
    this.angularVelocityBase = BaseAvatar.prototype.angularVelocityBase;

    if (this.body) {
        this.body.radius = BaseAvatar.prototype.radius;
    }

    // useless? this.updateVelocities();
};

/**
 * Destroy
 */
BaseAvatar.prototype.destroy = function()
{
    this.clear();
    this.present = false;
    this.alive   = false;
};

/**
 * Serialize
 *
 * @return {Object}
 */
BaseAvatar.prototype.serialize = function()
{
    return {
        id: this.id,
        name: this.name,
        color: this.color,
        borderColor: this.borderColor,
        score: this.score
    };
};

/**
 * BaseBonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BaseBonus(x, y)
{
    EventEmitter.call(this);

    this.x  = x;
    this.y  = y;
    this.id = null;
}

BaseBonus.prototype = Object.create(EventEmitter.prototype);
BaseBonus.prototype.constructor = BaseBonus;

/**
 * Target affected
 *
 * @type {String}
 */
BaseBonus.prototype.affect = 'self';

/**
 * Radius
 *
 * @type {Number}
 */
BaseBonus.prototype.radius = 3;

/**
 * Effect duration
 *
 * @type {Number}
 */
BaseBonus.prototype.duration = 5000;

/**
 * Probability to appear
 *
 * @type {Number}
 */
BaseBonus.prototype.probability = 1;

/**
 * Clear
 *
 * @param {Array} point
 */
BaseBonus.prototype.clear = function () {};

/**
 * Apply to target(s)
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Number}
 */
BaseBonus.prototype.applyTo = function (avatar, game) {};

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BaseBonus.prototype.getProbability = function (game)
{
    return BaseBonus.prototype.probability;
};

/**
 * Base Bonus Stack
 *
 * @param {Object} target
 */
function BaseBonusStack (target)
{
    EventEmitter.call(this);

    this.target  = target;
    this.bonuses = new Collection();
}

BaseBonusStack.prototype = Object.create(EventEmitter.prototype);
BaseBonusStack.prototype.constructor = BaseBonusStack;

/**
 * Add bonus to the stack
 *
 * @param {Bonus} bonus
 */
BaseBonusStack.prototype.add = function(bonus)
{
    if (this.bonuses.add(bonus)) {
        this.resolve();
    }
};

/**
 * Remove bonus from the stack
 *
 * @param {Bonus} bonus
 */
BaseBonusStack.prototype.remove = function(bonus)
{
    if (this.bonuses.remove(bonus)) {
        this.resolve(bonus);
    }
};

/**
 * Clear
 */
BaseBonusStack.prototype.clear = function()
{
    this.bonuses.clear();
};

/**
 * Resolve
 */
BaseBonusStack.prototype.resolve = function(bonus)
{
    var properties = {},
        effects, property, i, j;

    if (typeof(bonus) !== 'undefined') {
        effects = bonus.getEffects(this.target);
        for (i = effects.length - 1; i >= 0; i--) {
            property = effects[i][0];
            properties[property] = this.getDefaultProperty(property);
        }
    }

    for (i = this.bonuses.items.length - 1; i >= 0; i--) {
        effects = this.bonuses.items[i].getEffects(this.target);
        for (j = effects.length - 1; j >= 0; j--) {
            property = effects[j][0];

            if (typeof(properties[property]) === 'undefined') {
                properties[property] = this.getDefaultProperty(property);
            }

            this.append(properties, property, effects[j][1]);
        }
    }

    for (property in properties) {
        if (properties.hasOwnProperty(property)) {
            this.apply(property, properties[property]);
        }
    }
};

/**
 * Apply the value to target's property
 *
 * @param {String} property
 * @param {Number} value
 */
BaseBonusStack.prototype.apply = function(property, value)
{
    this.target[property] = value;
};

/**
 * Get default property
 *
 * @param {String} property
 *
 * @return {Number}
 */
BaseBonusStack.prototype.getDefaultProperty = function(property)
{
    return 0;
};

/**
 * Append
 *
 * @param {Object} properties
 * @param {String} property
 * @param {Number} value
 */
BaseBonusStack.prototype.append = function(properties, property, value)
{
    properties[property] += value;
};

/**
 * BaseGame
 *
 * @param {Room} room
 */
function BaseGame(room)
{
    EventEmitter.call(this);

    this.room         = room;
    this.name         = this.room.name;
    this.frame        = null;
    this.avatars      = this.room.players.map(function () { return this.getAvatar(); });
    this.size         = this.getSize(this.avatars.count());
    this.rendered     = null;
    this.maxScore     = room.config.getMaxScore();
    this.fps          = new FPSLogger();
    this.started      = false;
    this.bonusManager = new BonusManager(this, room.config.getBonuses(), room.config.getVariable('bonusRate'));
    this.inRound      = false;

    this.start    = this.start.bind(this);
    this.stop     = this.stop.bind(this);
    this.loop     = this.loop.bind(this);
    this.newRound = this.newRound.bind(this);
    this.endRound = this.endRound.bind(this);
    this.end      = this.end.bind(this);
    this.onFrame  = this.onFrame.bind(this);
}

BaseGame.prototype = Object.create(EventEmitter.prototype);
BaseGame.prototype.constructor = BaseGame;

/**
 * Loop frame rate
 *
 * @type {Number}
 */
BaseGame.prototype.framerate = 1/60 * 1000;

/**
 * Map size factor per player
 *
 * @type {Number}
 */
BaseGame.prototype.perPlayerSize = 80;

/**
 * Time before round start
 *
 * @type {Number}
 */
BaseGame.prototype.warmupTime = 3000;

/**
 * Time after round end
 *
 * @type {Number}
 */
BaseGame.prototype.warmdownTime = 5000;

/**
 * Margin from borders
 *
 * @type {Number}
 */
BaseGame.prototype.spawnMargin = 0.05;

/**
 * Angle margin from borders
 *
 * @type {Number}
 */
BaseGame.prototype.spawnAngleMargin = 0.3;

/**
 * Borderless
 *
 * @type {Boolean}
 */
BaseGame.prototype.borderless = false;

/**
 * Update
 *
 * @param {Number} step
 */
BaseGame.prototype.update = function(step) {};

/**
 * Remove a avatar from the game
 *
 * @param {Avatar} avatar
 */
BaseGame.prototype.removeAvatar = function(avatar)
{
    if (this.avatars.exists(avatar)) {
        avatar.die();
        avatar.destroy();
    }
};

/**
 * Start loop
 */
BaseGame.prototype.start = function()
{
    if (!this.frame) {
        this.onStart();
        this.loop();
    }
};

/**
 * Stop loop
 */
BaseGame.prototype.stop = function()
{
    if (this.frame) {
        this.clearFrame();
        this.onStop();
    }
};

/**
 * Animation loop
 */
BaseGame.prototype.loop = function()
{
    this.newFrame();

    var now  = new Date().getTime(),
        step = now - this.rendered;

    this.rendered = now;

    this.onFrame(step);
    this.fps.onFrame();
};

/**
 * On start
 */
BaseGame.prototype.onStart = function()
{
    this.rendered = new Date().getTime();
    this.bonusManager.start();
    this.fps.start();
};

/**
 * Onn stop
 */
BaseGame.prototype.onStop = function()
{
    this.rendered = null;
    this.bonusManager.stop();
    this.fps.stop();

    var size = this.getSize(this.getPresentAvatars().count());

    if (this.size !== size) {
        this.setSize(size);
    }
};

/**
 * On round new
 */
BaseGame.prototype.onRoundNew = function()
{
    this.borderless = BaseGame.prototype.borderless;

    this.bonusManager.clear();

    for (var i = this.avatars.items.length - 1; i >= 0; i--) {
        if (this.avatars.items[i].present) {
            this.avatars.items[i].clear();
        }
    }
};

/**
 * On round end
 */
BaseGame.prototype.onRoundEnd = function() {};

/**
 * Get new frame
 */
BaseGame.prototype.newFrame = function()
{
    this.frame = setTimeout(this.loop, this.framerate);
};

/**
 * Clear frame
 */
BaseGame.prototype.clearFrame = function()
{
    clearTimeout(this.frame);
    this.frame = null;
};

/**
 * On frame
 *
 * @param {Number} step
 */
BaseGame.prototype.onFrame = function(step)
{
    this.update(step);
};

/**
 * Update game size
 */
BaseGame.prototype.setSize = function()
{
    this.size = this.getSize(this.getPresentAvatars().count());
};

/**
 * Get size by players
 *
 * @param {Number} players
 *
 * @return {Number}
 */
BaseGame.prototype.getSize = function(players)
{
    var square = this.perPlayerSize * this.perPlayerSize,
        size   = Math.sqrt(square + ((players - 1) * square / 5));

    return Math.round(size);
};

/**
 * Are all avatars ready?
 *
 * @return {Boolean}
 */
BaseGame.prototype.isReady = function()
{
    return this.getLoadingAvatars().isEmpty();
};

/**
 * Get still loading avatars
 *
 * @return {Collection}
 */
BaseGame.prototype.getLoadingAvatars = function()
{
    return this.avatars.filter(function () { return this.present && !this.ready; });
};

/**
 * Get alive avatars
 *
 * @return {Collection}
 */
BaseGame.prototype.getAliveAvatars = function()
{
    return this.avatars.filter(function () { return this.alive; });
};

/**
 * Get present avatars
 *
 * @return {Collection}
 */
BaseGame.prototype.getPresentAvatars = function()
{
    return this.avatars.filter(function () { return this.present; });
};

/**
 * Sort avatars
 *
 * @param {Object} avatars
 *
 * @return {Object}
 */
BaseGame.prototype.sortAvatars = function(avatars)
{
    avatars = typeof(avatars) !== 'undefined' ? avatars : this.avatars;

    avatars.sort(function (a, b) { return a.score > b.score ? -1 : (a.score < b.score ? 1 : 0); });

    return avatars;
};

/**
 * Set borderless
 *
 * @param {Boolean} borderless
 */
BaseGame.prototype.setBorderless = function(borderless)
{
    this.borderless = borderless ? true : false;
};

/**
 * Serialize
 *
 * @return {Object}
 */
BaseGame.prototype.serialize = function()
{
    return {
        name: this.name,
        players: this.avatars.map(function () { return this.serialize(); }).items,
        maxScore: this.maxScore
    };
};

/**
 * New round
 */
BaseGame.prototype.newRound = function(time)
{
    this.started = true;

    if (!this.inRound) {
        this.inRound = true;
        this.onRoundNew();
        setTimeout(this.start, typeof(time) !== 'undefined' ? time : this.warmupTime);
    }
};

/**
 * Check end of round
 */
BaseGame.prototype.endRound = function()
{
    if (this.inRound) {
        this.inRound = false;
        this.onRoundEnd();
        setTimeout(this.stop, this.warmdownTime);
    }
};

/**
 * FIN DU GAME
 */
BaseGame.prototype.end = function()
{
    if (this.started) {
        this.started = false;
        this.stop();
        this.emit('end', {game: this});

        return true;
    }

    return false;
};

/**
 * BasePlayer
 *
 * @param {String} client
 * @param {String} name
 * @param {String} color
 */
function BasePlayer(client, name, color, ready)
{
    EventEmitter.call(this);

    this.client = client;
    this.name   = name;
    this.color  = typeof(color) !== 'undefined' && this.validateColor(color) ? color : this.getRandomColor();
    this.ready  = typeof(ready) !== 'undefined' && ready;
    this.id     = null;
    this.avatar = null;
}

BasePlayer.prototype = Object.create(EventEmitter.prototype);
BasePlayer.prototype.constructor = BasePlayer;

/**
 * Max length for name
 *
 * @type {Number}
 */
BasePlayer.prototype.maxLength = 25;

/**
 * Max length for color
 *
 * @type {Number}
 */
BasePlayer.prototype.colorMaxLength = 20;

/**
 * Set name
 *
 * @param {String} name
 */
BasePlayer.prototype.setName = function(name)
{
    this.name = name;
};

/**
 * Set name
 *
 * @param {String} name
 */
BasePlayer.prototype.setColor = function(color)
{
    if (!this.validateColor(color, true)) { return false; }

    this.color = color;

    return true;
};

/**
 * Equal
 *
 * @param {Player} player
 *
 * @return {Boolean}
 */
BasePlayer.prototype.equal = function(player)
{
    return this.id === player.id;
};

/**
 * Toggle Ready
 *
 * @param {Boolean} toggle
 */
BasePlayer.prototype.toggleReady = function(toggle)
{
    this.ready = typeof(toggle) !== 'undefined' ? (toggle ? true : false) : !this.ready;
};

/**
 * Get avatar
 *
 * @return {Avatar}
 */
BasePlayer.prototype.getAvatar = function()
{
    if (!this.avatar) {
        this.avatar = new Avatar(this);
    }

    return this.avatar;
};

/**
 * Reset player after a game
 */
BasePlayer.prototype.reset = function()
{
    this.avatar.destroy();
    this.avatar = null;
    this.ready  = false;
};

/**
 * Serialize
 *
 * @return {Object}
 */
BasePlayer.prototype.serialize = function()
{
    return {
        client: this.client.id,
        id: this.id,
        name: this.name,
        color: this.color,
        ready: this.ready
    };
};

/**
 * Get random Color
 *
 * @return {String}
 */
BasePlayer.prototype.getRandomColor = function()
{
    var color = '',
        randomNum = function () { return Math.ceil(Math.random() * 255).toString(16); };

    while (!this.validateColor(color, true)) {
        color = '#' + randomNum() + randomNum() + randomNum();
    }

    return color;
};

/**
 * Validate color
 *
 * @param {String} color
 *
 * @return {Boolean}
 */
BasePlayer.prototype.validateColor = function(color, yiq)
{
    if (typeof(color) !== 'string') { return false; }

    var matches = color.match(new RegExp('^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$'));

    if (matches && yiq) {
        var ratio = ((parseInt(matches[1], 16) * 0.4) + (parseInt(matches[2], 16) * 0.5) + (parseInt(matches[3], 16) * 0.3)) / 255;

        return ratio > 0.3;
    }

    return matches ? true : false;
};

/**
 * Base Room
 */
function BaseRoom(name)
{
    EventEmitter.call(this);

    this.name    = name;
    this.players = new Collection([], 'id', true);
    this.config  = new RoomConfig(this);

    this.closeGame = this.closeGame.bind(this);
}

BaseRoom.prototype = Object.create(EventEmitter.prototype);
BaseRoom.prototype.constructor = BaseRoom;

/**
 * Number of player needed to start a room
 *
 * @type {Number}
 */
BaseRoom.prototype.minPlayer = 1;

/**
 * Max length for name
 *
 * @type {Number}
 */
BaseRoom.prototype.maxLength = 25;

/**
 * Launch time
 *
 * @type {Number}
 */
BaseRoom.prototype.launchTime = 5000;

/**
 * Add player
 *
 * @param {Player} player
 */
BaseRoom.prototype.addPlayer = function(player)
{
    return this.players.add(player);
};

/**
 * Equal
 *
 * @param {Room} room
 *
 * @return {Boolean}
 */
BaseRoom.prototype.equal = function(room)
{
    return room ? this.name === room.name : false;
};

/**
 * Is name available?
 *
 * @param {String} name
 */
BaseRoom.prototype.isNameAvailable = function(name)
{
    return !this.players.match(function () { return this.name === name; });
};

/**
 * Remove player
 *
 * @param {Player} player
 */
BaseRoom.prototype.removePlayer = function(player)
{
    return this.players.remove(player);
};

/**
 * Is ready
 *
 * @return {Boolean}
 */
BaseRoom.prototype.isReady = function()
{
    return !this.game && this.players.count() >= this.minPlayer  && this.players.filter(function () { return !this.ready; }).isEmpty();
};

/**
 * Start warmpup
 */
BaseRoom.prototype.newGame = function()
{
    if (!this.game) {
        this.game = new Game(this);

        this.game.on('end', this.closeGame);
        this.emit('game:new', {room: this, game: this.game});

        return this.game;
    }

    return null;
};

/**
 * Close game
 */
BaseRoom.prototype.closeGame = function()
{
    if (this.game) {

        delete this.game;

        this.emit('game:end', {room: this});

        this.players = this.players.filter(function () { return this.client; });

        for (var i = this.players.items.length - 1; i >= 0; i--) {
            this.players.items[i].reset();
        }
    }
};

/**
 * Serialize
 *
 * @return {Object}
 */
BaseRoom.prototype.serialize = function(full)
{
    full = typeof(full) === 'undefined' || full;

    var data = {
        name: this.name,
        players: full ? this.players.map(function () { return this.serialize(); }).items : this.players.count(),
        game: this.game ? true : false,
        open: this.config.open
    };

    if (full) {
        data.config = this.config.serialize();
    }

    return data;
};

/**
 * Base room configuration
 */
function BaseRoomConfig(room)
{
    EventEmitter.call(this);

    this.room     = room;
    this.maxScore = null;
    this.open     = true;
    this.password = null;

    this.variables = {
        bonusRate: 0
    };

    this.bonuses  = {
        BonusSelfSmall: true,
        BonusSelfSlow: true,
        BonusSelfFast: true,
        BonusSelfMaster: true,
        BonusEnemySlow: true,
        BonusEnemyFast: true,
        BonusEnemyBig: true,
        BonusEnemyInverse: true,
        BonusEnemyStraightAngle: true,
        BonusGameBorderless: true,
        BonusAllColor: true,
        BonusGameClear: true,
        BonusSelfRandom: false,
        BonusLeaderRandom: false,
        BonusEnemyRandom: false,
        BonusLeaderFast: true,
        BonusLeaderInverse: true,
        BonusLeaderSlow: true,
        BonusSelfBorderless: true
    };
}

BaseRoomConfig.prototype = Object.create(EventEmitter.prototype);
BaseRoomConfig.prototype.constructor = BaseRoomConfig;

/**
 * Password length
 *
 * @type {Number}
 */
BaseRoomConfig.prototype.passwordLength = 4;

/**
 * Set max score
 *
 * @param {Number} maxScore
 */
BaseRoomConfig.prototype.setMaxScore = function(maxScore)
{
    maxScore = parseInt(maxScore, 10);

    this.maxScore = maxScore ? maxScore : null;

    return true;
};

/**
 * Variable exists
 *
 * @param {String} variable
 *
 * @return {Boolean}
 */
BaseRoomConfig.prototype.variableExists = function(variable)
{
    return typeof(this.variables[variable]) !== 'undefined';
};

/**
 * Set variable
 *
 * @param {String} variable
 * @param {Float} value
 */
BaseRoomConfig.prototype.setVariable = function(variable, value)
{
    if (!this.variableExists(variable)) { return false; }

    value = parseFloat(value);

    if (-1 > value || value > 1 ) { return false; }

    this.variables[variable] = value;

    return true;
};

/**
 * Get variable
 *
 * @param {String} variable
 *
 * @return {Float}
 */
BaseRoomConfig.prototype.getVariable = function(variable)
{
    if (!this.variableExists(variable)) { return; }

    return this.variables[variable];
};

/**
 * Bonus exists
 *
 * @param {String} bonus
 *
 * @return {Boolean}
 */
BaseRoomConfig.prototype.bonusExists = function(bonus)
{
    return typeof(this.bonuses[bonus]) !== 'undefined';
};

/**
 * Toggle bonus
 *
 * @param {String} bonus
 *
 * @return {Boolean}
 */
BaseRoomConfig.prototype.toggleBonus = function(bonus)
{
    if (!this.bonusExists(bonus)) { return false; }

    this.bonuses[bonus] = !this.bonuses[bonus];

    return true;
};

/**
 * Get bonus value
 *
 * @param {String} bonus
 *
 * @return {Boolean}
 */
BaseRoomConfig.prototype.getBonus = function(bonus)
{
    if (!this.bonusExists(bonus)) { return; }

    return this.bonuses[bonus];
};

/**
 * Set bonus value
 *
 * @param {String} bonus
 * @param {Boolean} value
 *
 * @return {Boolean}
 */
BaseRoomConfig.prototype.setBonus = function(bonus, value)
{
    if (!this.bonusExists(bonus)) { return; }

    this.bonuses[bonus] = value ? true : false;
};

/**
 * Get max score
 *
 * @return {Number}
 */
BaseRoomConfig.prototype.getMaxScore = function()
{
    return this.maxScore ? this.maxScore : this.getDefaultMaxScore();
};

/**
 * Get max score
 *
 * @param {Number} players
 *
 * @return {Number}
 */
BaseRoomConfig.prototype.getDefaultMaxScore = function()
{
    return Math.max(1, (this.room.players.count() - 1) * 10);
};

/**
 * Authorise joinning the room
 *
 * @param {String} password
 *
 * @return {Boolean}
 */
BaseRoomConfig.prototype.allow = function(password)
{
    return this.open || this.password === password;
};

/**
 * Generate password
 *
 * @return {String}
 */
BaseRoomConfig.prototype.generatePassword = function()
{
    var password = '';

    for (var i = 0; i < this.passwordLength; i++) {
        password += Math.ceil(Math.random() * 9).toString();
    }

    return password;
};

/**
 * Serialize
 *
 * @return {Object}
 */
BaseRoomConfig.prototype.serialize = function()
{
    return {
        maxScore: this.maxScore,
        variables: this.variables,
        bonuses: this.bonuses,
        open: this.open,
        password: this.password
    };
};

/**
 * BaseTrail
 */
function BaseTrail(avatar)
{
    EventEmitter.call(this);

    this.avatar = avatar;
    this.color  = this.avatar.color;
    this.radius = this.avatar.radius;
    this.points = [];
    this.lastX  = null;
    this.lastY  = null;
}

BaseTrail.prototype = Object.create(EventEmitter.prototype);
BaseTrail.prototype.constructor = BaseTrail;

/**
 * Add point
 *
 * @param {Number} x
 * @param {Number} y
 */
BaseTrail.prototype.addPoint = function(x, y)
{
    this.points.push([x, y]);
    this.lastX = x;
    this.lastY = y;
};

/**
 * Clear
 */
BaseTrail.prototype.clear = function()
{
    this.points.length = 0;
    this.lastX = null;
    this.lastY = null;
};

/**
 * Preset
 */
function Preset () {}

/**
 * Bonuses
 *
 * @type {Array}
 */
Preset.prototype.bonuses = [];

/**
 * Has onus
 *
 * @param {String} bonus
 *
 * @return {Boolean}
 */
Preset.prototype.hasBonus = function(bonus)
{
    return this.bonuses.indexOf(bonus) > -1;
};

/**
 * BaseChat system
 */
function BaseChat()
{
    EventEmitter.call(this);

    this.messages = new Collection([], 'id', true);
}

BaseChat.prototype = Object.create(EventEmitter.prototype);
BaseChat.prototype.constructor = BaseChat;

/**
 * Add message
 *
 * @param {Message} message
 */
BaseChat.prototype.addMessage = function(message)
{
    if (!this.isValid(message)) {
        return false;
    }

    this.messages.add(message);
    this.emit('message', message);

    return true;
};

/**
 * Is message valid?
 *
 * @param {Message} message
 *
 * @return {Boolean}
 */
BaseChat.prototype.isValid = function(message)
{
    return true;
};

/**
 * Clear messages
 */
BaseChat.prototype.clearMessages = function()
{
    this.messages.clear();
};

/**
 * Serialize
 *
 * @return {Array}
 */
BaseChat.prototype.serialize = function(max)
{
    var length   = this.messages.items.length,
        limit    = typeof(max) === 'number' ? Math.min(max, length) : length,
        min      = length - limit,
        messages = new Array(length);

    for (var i = length - 1; i >= min; i--) {
        messages[i] = this.messages.items[i].serialize();
    }

    return messages;
};

/**
 * FPS Logger
 */
function BaseFPSLogger()
{
    EventEmitter.call(this);

    this.interval  = null;
    this.frames    = 0;
    this.frequency = 0;

    this.onFrame = this.onFrame.bind(this);
    this.log     = this.log.bind(this);

    this.start();
}

BaseFPSLogger.prototype = Object.create(EventEmitter.prototype);
BaseFPSLogger.prototype.constructor = BaseFPSLogger;

/**
 * End frame
 */
BaseFPSLogger.prototype.onFrame = function ()
{
    this.frames++;
};

/**
 * Log
 */
BaseFPSLogger.prototype.log = function()
{
    this.frequency = this.frames;
    this.frames    = 0;
};

/**
 * Start
 */
BaseFPSLogger.prototype.start = function()
{
    if (!this.interval) {
        this.frames   = 0;
        this.interval = setInterval(this.log, 1000);
    }
};

/**
 * Stop
 */
BaseFPSLogger.prototype.stop = function()
{
    if (this.interval) {
        clearInterval(this.interval);
        this.interval  = null;
        this.frequency = 0;
    }
};

/**
 * Tickrate Logger
 */
function BaseTickrateLogger()
{
    this.interval  = null;
    this.frequency = 0;
    this.ticks     = [];

    this.log  = this.log.bind(this);
    this.tick = this.tick.bind(this);

    this.start();
}

/**
 * Tick
 */
BaseTickrateLogger.prototype.tick = function (data)
{
    this.ticks.push(data);
};

/**
 * Log
 */
BaseTickrateLogger.prototype.log = function()
{
    this.frequency    = this.ticks.length;
    this.ticks.length = 0;
};

/**
 * Start
 */
BaseTickrateLogger.prototype.start = function()
{
    if (!this.interval) {
        this.interval = setInterval(this.log, 1000);
    }
};

/**
 * Stop
 */
BaseTickrateLogger.prototype.stop = function()
{
    if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
    }
};

/**
 * Data compressor / decompressor for transport
 */
function Compressor() {}

/**
 * Float precision
 *
 * @type {Number}
 */
Compressor.prototype.precision = 100;

/**
 * Compress a float into an integer
 *
 * @param {Float} value
 *
 * @return {Integer}
 */
Compressor.prototype.compress = function(value)
{
    return (0.5 + value * this.precision) | 0;
};

/**
 * Decompress an integer into an float
 *
 * @param {Integer} value
 *
 * @return {Float}
 */
Compressor.prototype.decompress = function(value)
{
    return value / this.precision;
};

/**
 * Game Controller
 */
function GameController(game)
{
    var controller = this;

    this.game        = game;
    this.clients     = new Collection();
    this.socketGroup = new SocketGroup(this.clients);
    this.compressor  = new Compressor();
    this.waiting     = null;

    this.onGameStart   = this.onGameStart.bind(this);
    this.onGameStop    = this.onGameStop.bind(this);
    this.onDie         = this.onDie.bind(this);
    this.onPosition    = this.onPosition.bind(this);
    this.onAngle       = this.onAngle.bind(this);
    this.onPoint       = this.onPoint.bind(this);
    this.onScore       = this.onScore.bind(this);
    this.onRoundScore  = this.onRoundScore.bind(this);
    this.onProperty    = this.onProperty.bind(this);
    this.onBonusStack  = this.onBonusStack.bind(this);
    this.onBonusPop    = this.onBonusPop.bind(this);
    this.onBonusClear  = this.onBonusClear.bind(this);
    this.onRoundNew    = this.onRoundNew.bind(this);
    this.onRoundEnd    = this.onRoundEnd.bind(this);
    this.onPlayerLeave = this.onPlayerLeave.bind(this);
    this.onClear       = this.onClear.bind(this);
    this.onBorderless  = this.onBorderless.bind(this);
    this.onEnd         = this.onEnd.bind(this);
    this.stopWaiting   = this.stopWaiting.bind(this);

    this.callbacks = {
        onReady: function () { controller.onReady(this); },
        onMove: function (data) { controller.onMove(this, data); }
    };

    this.loadGame();
}

/**
 * Waiting time
 *
 * @type {Number}
 */
GameController.prototype.waitingTime = 30000;

/**
 * Load game
 */
GameController.prototype.loadGame = function()
{
    this.game.on('game:start', this.onGameStart);
    this.game.on('game:stop', this.onGameStop);
    this.game.on('end', this.onEnd);
    this.game.on('clear', this.onClear);
    this.game.on('player:leave', this.onPlayerLeave);
    this.game.on('round:new', this.onRoundNew);
    this.game.on('round:end', this.onRoundEnd);
    this.game.on('borderless', this.onBorderless);
    this.game.bonusManager.on('bonus:pop', this.onBonusPop);
    this.game.bonusManager.on('bonus:clear', this.onBonusClear);

    for (var i = this.game.room.controller.clients.items.length - 1; i >= 0; i--) {
        this.attach(this.game.room.controller.clients.items[i]);
    }

    this.waiting = setTimeout(this.stopWaiting, this.waitingTime);
};

/**
 * Remove game
 *
 * @param {Game} game
 */
GameController.prototype.unloadGame = function()
{
    this.game.removeListener('game:start', this.onGameStart);
    this.game.removeListener('game:stop', this.onGameStop);
    this.game.removeListener('end', this.onEnd);
    this.game.removeListener('clear', this.onClear);
    this.game.removeListener('player:leave', this.onPlayerLeave);
    this.game.removeListener('round:new', this.onRoundNew);
    this.game.removeListener('round:end', this.onRoundEnd);
    this.game.removeListener('borderless', this.onBorderless);
    this.game.bonusManager.removeListener('bonus:pop', this.onBonusPop);
    this.game.bonusManager.removeListener('bonus:clear', this.onBonusClear);

    for (var i = this.clients.items.length - 1; i >= 0; i--) {
        this.detach(this.clients.items[i]);
    }
};

/**
 * Attach events
 *
 * @param {SocketClient} client
 */
GameController.prototype.attach = function(client)
{
    if (this.clients.add(client)) {
        this.attachEvents(client);
        this.socketGroup.addEvent('game:spectators', this.countSpectators());
        client.pingLogger.start();
    }
};

/**
 * Attach events
 *
 * @param {SocketClient} client
 */
GameController.prototype.detach = function(client)
{
    this.detachEvents(client);

    if (this.clients.remove(client)) {
        for (var i = client.players.items.length - 1; i >= 0; i--) {
            if (client.players.items[i].avatar) {
                this.game.removeAvatar(client.players.items[i].avatar);
            }
        }
        this.socketGroup.addEvent('game:spectators', this.countSpectators());
        client.pingLogger.stop();
    }
};

/**
 * On player leave
 */
GameController.prototype.onPlayerLeave = function(data)
{
    this.socketGroup.addEvent('game:leave', data.player.id);
};

/**
 * Detach events
 *
 * @param {SocketClient} client
 */
GameController.prototype.attachEvents = function(client)
{
    client.on('ready', this.callbacks.onReady);

    if (!client.players.isEmpty()) {
        client.on('player:move', this.callbacks.onMove);
    }

    for (var avatar, i = client.players.items.length - 1; i >= 0; i--) {
        avatar = client.players.items[i].getAvatar();

        avatar.on('die', this.onDie);
        avatar.on('position', this.onPosition);
        avatar.on('angle', this.onAngle);
        avatar.on('point', this.onPoint);
        avatar.on('score', this.onScore);
        avatar.on('score:round', this.onRoundScore);
        avatar.on('property', this.onProperty);
        avatar.bonusStack.on('change', this.onBonusStack);
    }
};

/**
 * Detach events
 *
 * @param {SocketClient} client
 */
GameController.prototype.detachEvents = function(client)
{
    var avatar;

    client.removeListener('ready', this.callbacks.onReady);

    if (!client.players.isEmpty()) {
        client.removeListener('player:move', this.callbacks.onMove);
    }

    for (var i = client.players.items.length - 1; i >= 0; i--) {
        avatar = client.players.items[i].avatar;

        if (avatar) {
            avatar.removeListener('die', this.onDie);
            avatar.removeListener('position', this.onPosition);
            avatar.removeListener('point', this.onPoint);
            avatar.removeListener('score', this.onScore);
            avatar.removeListener('score:round', this.onRoundScore);
            avatar.removeListener('property', this.onProperty);
            avatar.bonusStack.removeListener('change', this.onBonusStack);
        }
    }
};

/**
 * Attach spectator
 *
 * @param {SocketClient} client
 */
GameController.prototype.attachSpectator = function(client)
{
    var properties = {
            angle: 'angle',
            radius: 'radius',
            color: 'color',
            printing: 'printing',
            score: 'score'
        },
        events = [['spectate', {
            inRound: this.game.inRound,
            rendered: this.game.rendered ? true : false,
            maxScore: this.game.maxScore
        }]],
        avatar, data, bonus, i;

    for (i = this.game.avatars.items.length - 1; i >= 0; i--) {
        avatar = this.game.avatars.items[i];
        events.push(['position', [avatar.id, this.compressor.compress(avatar.x), this.compressor.compress(avatar.y)]]);

        for (var property in properties) {
            if (properties.hasOwnProperty(property)) {
                events.push(['property', {avatar: avatar.id, property: property, value: avatar[properties[property]]}]);
            }
        }

        if (!avatar.alive) {
            events.push(['die', {avatar: avatar.id}]);
        }
    }

    if (this.game.inRound) {
        for (i = this.game.bonusManager.bonuses.items.length - 1; i >= 0; i--) {
            bonus = this.game.bonusManager.bonuses.items[i];
            events.push(['bonus:pop', [
                bonus.id,
                this.compressor.compress(bonus.x),
                this.compressor.compress(bonus.y),
                bonus.constructor.name
            ]]);
        }
    } else {
        this.socketGroup.addEvent('round:end', this.game.roundWinner ? this.game.roundWinner.id : null);
    }

    events.push(['game:spectators', this.countSpectators()]);

    client.addEvents(events);
};

/**
 * Count spectators
 *
 * @return {Number}
 */
GameController.prototype.countSpectators = function()
{
    return this.clients.filter(function () { return !this.isPlaying(); }).count();
};

/**
 * On game loaded
 *
 * @param {SocketClient} client
 */
GameController.prototype.onReady = function(client)
{
    if (this.game.started) {
        this.attachSpectator(client);
    } else {
        for (var avatar, i = client.players.items.length - 1; i >= 0; i--) {
            avatar = client.players.items[i].getAvatar();
            avatar.ready = true;
            this.socketGroup.addEvent('ready', avatar.id);
        }

        this.checkReady();
    }
};

/**
 * Check if all players are ready
 */
GameController.prototype.checkReady = function()
{
    if (this.game.isReady()) {
        this.waiting = clearTimeout(this.waiting);
        this.game.newRound();
    }
};

/**
 * Stop waiting for loading players
 */
GameController.prototype.stopWaiting = function()
{
    if (this.waiting && !this.game.isReady()) {
        this.waiting = clearTimeout(this.waiting);

        var avatars = this.game.getLoadingAvatars();

        for (var i = avatars.items.length - 1; i >= 0; i--) {
            this.detach(avatars.items[i].player.client);
        }

        this.checkReady();
    }
};

/**
 * On move
 *
 * @param {SocketClient} client
 * @param {Number} move
 */
GameController.prototype.onMove = function(client, data)
{
    var player = client.players.getById(data.avatar);

    if (player && player.avatar) {
        player.avatar.updateAngularVelocity(data.move);
    }
};

/**
 * On point
 *
 * @param {Object} data
 */
GameController.prototype.onPoint = function(data)
{
    if (data.important) {
        this.socketGroup.addEvent('point', data.avatar.id);
    }
};

/**
 * On position
 *
 * @param {Avatar} avatar
 */
GameController.prototype.onPosition = function(avatar)
{
    this.socketGroup.addEvent('position', [
        avatar.id,
        this.compressor.compress(avatar.x),
        this.compressor.compress(avatar.y)
    ]);
};

/**
 * On angle
 *
 * @param {Avatar} avatar
 */
GameController.prototype.onAngle = function(avatar)
{
    this.socketGroup.addEvent('angle', [
        avatar.id,
        this.compressor.compress(avatar.angle)
    ]);
};

/**
 * On die
 *
 * @param {Object} data
 */
GameController.prototype.onDie = function(data)
{
    this.socketGroup.addEvent('die', [
        data.avatar.id,
        data.killer ? data.killer.id : null,
        data.old
    ]);
};

/**
 * On bonus pop
 *
 * @param {Bonus} bonus
 */
GameController.prototype.onBonusPop = function(bonus)
{
    this.socketGroup.addEvent('bonus:pop', [
        bonus.id,
        this.compressor.compress(bonus.x),
        this.compressor.compress(bonus.y),
        bonus.constructor.name
    ]);
};

/**
 * On bonus clear
 *
 * @param {Bonus} bonus
 */
GameController.prototype.onBonusClear = function(bonus)
{
    this.socketGroup.addEvent('bonus:clear', bonus.id);
};

/**
 * On score
 *
 * @param {Avatar} avatar
 */
GameController.prototype.onScore = function(avatar)
{
    this.socketGroup.addEvent('score', [avatar.id, avatar.score]);
};

/**
 * On round score
 *
 * @param {Avatar} avatar
 */
GameController.prototype.onRoundScore = function(avatar)
{
    this.socketGroup.addEvent('score:round', [avatar.id, avatar.roundScore]);
};

/**
 * On property
 *
 * @param {Object} data
 */
GameController.prototype.onProperty = function(data)
{
    this.socketGroup.addEvent('property', [
        data.avatar.id,
        data.property,
        data.value
    ]);
};

/**
 * On bonus stack add
 *
 * @param {Object} data
 */
GameController.prototype.onBonusStack = function(data)
{
    this.socketGroup.addEvent('bonus:stack', [
        data.avatar.id,
        data.method,
        data.bonus.id,
        data.bonus.constructor.name,
        data.bonus.duration
    ]);
};

// Game events:

/**
 * On game start
 *
 * @param {Object} data
 */
GameController.prototype.onGameStart = function(data)
{
    this.socketGroup.addEvent('game:start');
};

/**
 * On game stop
 *
 * @param {Object} data
 */
GameController.prototype.onGameStop = function(data)
{
    this.socketGroup.addEvent('game:stop');
};

/**
 * On round new
 *
 * @param {Object} data
 */
GameController.prototype.onRoundNew = function(data)
{
    this.socketGroup.addEvent('round:new');
};

/**
 * On round end
 *
 * @param {Object} data
 */
GameController.prototype.onRoundEnd = function(data)
{
    this.socketGroup.addEvent('round:end', data.winner ? data.winner.id : null);
};

/**
 * On clear
 *
 * @param {Object} data
 */
GameController.prototype.onClear = function(data)
{
    this.socketGroup.addEvent('clear');
};

/**
 * On borderless
 *
 * @param {Object} data
 */
GameController.prototype.onBorderless = function(data)
{
    this.socketGroup.addEvent('borderless', data);
};

/**
 * On end
 *
 * @param {Object} data
 */
GameController.prototype.onEnd = function(data)
{
    this.socketGroup.addEvent('end');
    this.unloadGame();
};

/**
 * Room Controller
 *
 * @param {Room} room
 */
function RoomController(room)
{
    EventEmitter.call(this);

    var controller = this;

    this.room        = room;
    this.clients     = new Collection();
    this.socketGroup = new SocketGroup(this.clients);
    this.kickManager = new KickManager(this);
    this.chat        = new Chat();
    this.roomMaster  = null;
    this.launching   = null;

    this.onPlayerJoin     = this.onPlayerJoin.bind(this);
    this.onPlayerLeave    = this.onPlayerLeave.bind(this);
    this.onGame           = this.onGame.bind(this);
    this.loadRoom         = this.loadRoom.bind(this);
    this.unloadRoom       = this.unloadRoom.bind(this);
    this.onVoteNew        = this.onVoteNew.bind(this);
    this.onVoteClose      = this.onVoteClose.bind(this);
    this.onKick           = this.onKick.bind(this);
    this.checkForClose    = this.checkForClose.bind(this);
    this.removeRoomMaster = this.removeRoomMaster.bind(this);
    this.onPlayersClear   = this.onPlayersClear.bind(this);
    this.launch           = this.launch.bind(this);

    this.callbacks = {
        onTalk: function (data) { controller.onTalk(this, data[0], data[1]); },
        onPlayerAdd: function (data) { controller.onPlayerAdd(this, data[0], data[1]); },
        onPlayerRemove: function (data) { controller.onPlayerRemove(this, data[0], data[1]); },
        onReady: function (data) { controller.onReady(this, data[0], data[1]); },
        onKickVote: function (data) { controller.onKickVote(this, data[0], data[1]); },
        onName: function (data) { controller.onName(this, data[0], data[1]); },
        onColor: function (data) { controller.onColor(this, data[0], data[1]); },
        onLeave: function () { controller.onLeave(this); },
        onActivity: function () { controller.onActivity(this); },

        onConfigOpen: function (data) { controller.onConfigOpen(this, data[0], data[1]); },
        onConfigMaxScore: function (data) { controller.onConfigMaxScore(this, data[0], data[1]); },
        onConfigVariable: function (data) { controller.onConfigVariable(this, data[0], data[1]); },
        onConfigBonus: function (data) { controller.onConfigBonus(this, data[0], data[1]); },
        onLaunch: function (data) { controller.onLaunch(this); }
    };

    this.loadRoom();
    this.promptCheckForClose();
}

RoomController.prototype = Object.create(EventEmitter.prototype);
RoomController.prototype.constructor = RoomController;

/**
 * Time before closing an empty room
 *
 * @type {Number}
 */
RoomController.prototype.timeToClose = 10000;

/**
 * Load room
 */
RoomController.prototype.loadRoom = function()
{
    this.room.on('close', this.unloadRoom);
    this.room.on('player:join', this.onPlayerJoin);
    this.room.on('player:leave', this.onPlayerLeave);
    this.room.on('game:new', this.onGame);
    this.kickManager.on('kick', this.onKick);
    this.kickManager.on('vote:new', this.onVoteNew);
    this.kickManager.on('vote:close', this.onVoteClose);
};

/**
 * Load room
 */
RoomController.prototype.unloadRoom = function()
{
    this.room.removeListener('close', this.unloadRoom);
    this.room.removeListener('player:join', this.onPlayerJoin);
    this.room.removeListener('player:leave', this.onPlayerLeave);
    this.room.removeListener('game:new', this.onGame);
    this.kickManager.removeListener('kick', this.onKick);
    this.kickManager.removeListener('vote:new', this.onVoteNew);
    this.kickManager.removeListener('vote:close', this.onVoteClose);
    this.kickManager.clear();
};

/**
 * Attach events
 *
 * @param {SocketClient} client
 * @param {Function} callback
 */
RoomController.prototype.attach = function(client, callback)
{
    if (this.clients.add(client)) {
        this.attachEvents(client);
        this.onClientAdd(client);
        callback({
            success: true,
            room: this.room.serialize(),
            master: this.roomMaster ? this.roomMaster.id : null,
            clients: this.clients.map(function () { return this.serialize(); }).items,
            messages: this.chat.serialize(100),
            votes: this.kickManager.votes.map(function () { return this.serialize(); }).items
        });
        this.socketGroup.addEvent('client:add', client.id);
        this.emit('client:add', { room: this.room, client: client});
    } else {
        callback({success: false, error: 'Client ' + client.id + ' already in the room.'});
    }
    this.checkIntegrity();
};

/**
 * Attach events
 *
 * @param {SocketClient} client
 */
RoomController.prototype.detach = function(client)
{
    if (this.clients.remove(client)) {
        if (this.room.game) {
            this.room.game.controller.detach(client);
        }

        client.clearPlayers();
        this.detachEvents(client);
        this.promptCheckForClose();
        this.socketGroup.addEvent('client:remove', client.id);
        this.emit('client:remove', { room: this.room, client: client});
    }
    this.checkIntegrity();
};

/**
 * Detach events
 *
 * @param {SocketClient} client
 */
RoomController.prototype.attachEvents = function(client)
{
    client.on('close', this.callbacks.onLeave);
    client.on('activity', this.callbacks.onActivity);
    client.on('room:leave', this.callbacks.onLeave);
    client.on('room:talk', this.callbacks.onTalk);
    client.on('player:add', this.callbacks.onPlayerAdd);
    client.on('player:remove', this.callbacks.onPlayerRemove);
    client.on('player:kick', this.callbacks.onKickVote);
    client.on('room:ready', this.callbacks.onReady);
    client.on('room:color', this.callbacks.onColor);
    client.on('room:name', this.callbacks.onName);
    client.on('players:clear', this.onPlayersClear);
};

/**
 * Detach events
 *
 * @param {SocketClient} client
 */
RoomController.prototype.detachEvents = function(client)
{
    client.removeListener('close', this.callbacks.onLeave);
    client.removeListener('activity', this.callbacks.onActivity);
    client.removeListener('room:leave', this.callbacks.onLeave);
    client.removeListener('room:talk', this.callbacks.onTalk);
    client.removeListener('player:add', this.callbacks.onPlayerAdd);
    client.removeListener('player:remove', this.callbacks.onPlayerRemove);
    client.removeListener('player:kick', this.callbacks.onKickVote);
    client.removeListener('room:ready', this.callbacks.onReady);
    client.removeListener('room:color', this.callbacks.onColor);
    client.removeListener('room:name', this.callbacks.onName);
    client.removeListener('players:clear', this.onPlayersClear);
};

/**
 * Remove player
 *
 * @param {Player} player
 */
RoomController.prototype.removePlayer = function(player)
{
    var client = player.client;

    if (this.room.removePlayer(player) && client) {
        client.players.remove(player);

        if (!client.isPlaying()) {
            this.kickManager.removeClient(client);

            if (this.roomMaster && this.roomMaster.id === client.id) {
                this.removeRoomMaster();
            }
        }
    }
};

/**
 * Nominate game master
 */
RoomController.prototype.nominateRoomMaster = function()
{
    if (this.clients.isEmpty() || this.roomMaster) { return; }

    var roomMaster = this.clients.match(function () { return this.active && this.isPlaying(); });

    this.setRoomMaster(roomMaster);
};

/**
 * Set game master
 *
 * @param {SocketClient} client
 */
RoomController.prototype.setRoomMaster = function(client)
{
    if (!this.roomMaster && client) {
        this.roomMaster = client;
        this.roomMaster.on('close', this.removeRoomMaster);
        this.roomMaster.on('room:leave', this.removeRoomMaster);
        this.roomMaster.on('room:config:open', this.callbacks.onConfigOpen);
        this.roomMaster.on('room:config:max-score', this.callbacks.onConfigMaxScore);
        this.roomMaster.on('room:config:variable', this.callbacks.onConfigVariable);
        this.roomMaster.on('room:config:bonus', this.callbacks.onConfigBonus);
        this.roomMaster.on('room:launch', this.callbacks.onLaunch);
        this.socketGroup.addEvent('room:master', {client: client.id});
    }
};

/**
 * Remove game master
 */
RoomController.prototype.removeRoomMaster = function()
{
    if (this.roomMaster) {
        this.roomMaster.removeListener('close', this.removeRoomMaster);
        this.roomMaster.removeListener('room:leave', this.removeRoomMaster);
        this.roomMaster.removeListener('room:config:open', this.callbacks.onConfigOpen);
        this.roomMaster.removeListener('room:config:max-score', this.callbacks.onConfigMaxScore);
        this.roomMaster.removeListener('room:config:variable', this.callbacks.onConfigVariable);
        this.roomMaster.removeListener('room:config:bonus', this.callbacks.onConfigBonus);
        this.roomMaster.removeListener('room:launch', this.callbacks.onLaunch);
        this.roomMaster = null;
        this.nominateRoomMaster();
    }
};

/**
 * Is the given client the game master?
 *
 * @param {SocketClient} client
 *
 * @return {Boolean}
 */
RoomController.prototype.isRoomMaster = function(client)
{
    return this.roomMaster.id === client.id;
};

/**
 * Initialise a new client
 *
 * @param {SocketClient} client
 */
RoomController.prototype.onClientAdd = function(client)
{
    client.clearPlayers();

    if (this.room.game) {
        this.room.game.controller.attach(client);
        client.addEvent('room:game:start');
    }

    this.socketGroup.addEvent('client:add', {client: client.serialize()});
    this.nominateRoomMaster();
};

/**
 * Prompt a check for close
 */
RoomController.prototype.promptCheckForClose = function() {
    if (this.clients.isEmpty()) {
        setTimeout(this.checkForClose, this.timeToClose);
    }
};

/**
 * Check is room is empty and shoul be closed
 */
RoomController.prototype.checkForClose = function()
{
    if (this.clients.isEmpty()) {
        this.room.close();
    }
};

/**
 * Check integrity
 */
RoomController.prototype.checkIntegrity = function()
{
    for (var player, i = this.room.players.items.length - 1; i >= 0; i--) {
        player = this.room.players.items[i];
        if (!player.client || !this.clients.exists(player.client)) {
            console.error('"Lost" player removed.');
            this.removePlayer(player);
        }
    }
};

/**
 * Start launch
 */
RoomController.prototype.startLaunch = function()
{
    if (!this.launching) {
        this.launching = setTimeout(this.launch, this.room.launchTime);
        this.socketGroup.addEvent('room:launch:start');
    }
};

/**
 * Cancel launch
 */
RoomController.prototype.cancelLaunch = function()
{
    if (this.launching) {
        this.launching = clearTimeout(this.launching);
        this.socketGroup.addEvent('room:launch:cancel');
    }
};

/**
 * Launch
 */
RoomController.prototype.launch = function()
{
    if (this.launching) {
        this.launching = clearTimeout(this.launching);
    }

    this.room.newGame();
};

// Events:

/**
 * On client leave
 *
 * @param {SocketClient} client
 */
RoomController.prototype.onLeave = function(client)
{
    this.detach(client);
};

/**
 * On client clear players
 *
 * @param {SocketClient} client
 */
RoomController.prototype.onPlayersClear = function(client)
{
    for (var i = client.players.items.length - 1; i >= 0; i--) {
        this.removePlayer(client.players.items[i]);
    }
};

/**
 * On client activity change
 *
 * @param {SocketClient} client
 */
RoomController.prototype.onActivity = function(client)
{
    this.socketGroup.addEvent('client:activity', {
        client: client.id,
        active: client.active
    });
};

/**
 * On add player to room
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onPlayerAdd = function(client, data, callback)
{
    var name = data.name.substr(0, Player.prototype.maxLength).trim(),
        color = typeof(data.color) !== 'undefined' ? data.color : null;

    if (!name.length) {
        return callback({success: false, error: 'Invalid name.'});
    }

    if (this.room.game) {
        return callback({success: false, error: 'Game already started.'});
    }

    if (!this.room.isNameAvailable(name)) {
        return callback({success: false, error: 'This username is already used.'});
    }

    if (!this.clients.exists(client)) {
        console.error('Unknown client.');
        return callback({success: false, error: 'Unknown client'});
    }

    var player = new Player(client, name, color);

    if (this.room.addPlayer(player)) {
        client.players.add(player);
        this.emit('player:add', { room: this.room, player: player});
        callback({success: true});
        this.nominateRoomMaster();
    } else {
        return callback({success: false, error: 'Could not add player.'});
    }
};

/**
 * On remove player from room
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onPlayerRemove = function(client, data, callback)
{
    var player = client.players.getById(data.player);

    if (player) {
        this.removePlayer(player);
        this.emit('player:remove', { room: this.room, player: player});
    }

    callback({success: player ? true : false});
};

/**
 * On talk
 *
 * @param {SocketClient} client
 * @param {String} content
 * @param {Function} callback
 */
RoomController.prototype.onTalk = function(client, content, callback)
{
    var message = new Message(client, content.substr(0, Message.prototype.maxLength)),
        success = this.chat.addMessage(message);

    callback({success: success});

    if (success) {
        this.socketGroup.addEvent('room:talk', message.serialize());
    }
};

/**
 * On player change color
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onColor = function(client, data, callback)
{
    var player = client.players.getById(data.player),
        color = data.color;

    if (!player) {
        return callback({success: false});
    }

    if (player.setColor(color)) {
        callback({success: true, color: player.color});
        this.socketGroup.addEvent('player:color', { player: player.id, color: player.color });
    } else {
        callback({success: false, color: player.color});
    }
};

/**
 * On player change name
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onName = function(client, data, callback)
{
    var player = client.players.getById(data.player),
        name = data.name.substr(0, Player.prototype.maxLength).trim();

    if (!player) {
        return callback({success: false, error: 'Unknown player: "' + name + '"'});
    }

    if (!name.length) {
        return callback({success: false, error: 'Invalid name.', name: player.name});
    }

    if (!this.room.isNameAvailable(name)) {
        return callback({success: false, error: 'This username is already used.', name: player.name});
    }

    player.setName(name);
    callback({success: true, name: player.name});
    this.socketGroup.addEvent('player:name', { player: player.id, name: player.name });
};

/**
 * On player ready
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onReady = function(client, data, callback)
{
    var player = client.players.getById(data.player);

    if (player) {
        player.toggleReady();

        callback({success: true, ready: player.ready});
        this.socketGroup.addEvent('player:ready', { player: player.id, ready: player.ready });

        if (this.room.isReady()) {
            this.launch();
        }
    } else {
        callback({success: false, error: 'Player with id "' + data.player + '" not found'});
    }
};

/**
 * On kick vote
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onKickVote = function(client, data, callback)
{
    if (client.isPlaying()) {
        var player = this.room.players.getById(data.player);

        if (player) {
            if (this.isRoomMaster(client)) {
                this.onKick(player);

                return callback({success: true, kicked: true});
            } else {
                var kickVote = this.kickManager.vote(client, player);

                return callback({success: true, kicked: kickVote.hasVote(client)});
            }
        }
    }

    return callback({success: false, kicked: false});
};

/**
 * On config open
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onConfigOpen = function(client, data, callback)
{
    var success = this.isRoomMaster(client) && this.room.config.setOpen(data.open);

    callback({
        success: success,
        open: this.room.config.open,
        password: this.room.config.password
    });

    if (success) {
        this.socketGroup.addEvent('room:config:open', {
            open: this.room.config.open,
            password: this.room.config.password
        });
    }
};

/**
 * On config max score
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onConfigMaxScore = function(client, data, callback)
{
    var success = this.isRoomMaster(client) && this.room.config.setMaxScore(data.maxScore);

    callback({success: success, maxScore: this.room.config.maxScore });

    if (success) {
        this.socketGroup.addEvent('room:config:max-score', { maxScore: this.room.config.maxScore });
    }
};

/**
 * On config speed
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onConfigVariable = function(client, data, callback)
{
    var success = this.isRoomMaster(client) && this.room.config.setVariable(data.variable, data.value);

    callback({success: success, value: this.room.config.getVariable(data.variable) });

    if (success) {
        this.socketGroup.addEvent('room:config:variable', {
            variable: data.variable,
            value: this.room.config.getVariable(data.variable)
        });
    }
};

/**
 * On config bonus
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomController.prototype.onConfigBonus = function(client, data, callback)
{
    var success = this.isRoomMaster(client) && this.room.config.toggleBonus(data.bonus);

    callback({success: success, enabled: this.room.config.getBonus(data.bonus) });

    if (success) {
        this.socketGroup.addEvent('room:config:bonus', {
            bonus: data.bonus,
            enabled: this.room.config.getBonus(data.bonus)
        });
    }
};

/**
 * On launch
 *
 * @param {SocketClient} client
 */
RoomController.prototype.onLaunch = function(client)
{
    if (this.isRoomMaster(client)) {
        if (this.launching) {
            this.cancelLaunch();
        } else {
            this.startLaunch();
        }
    }
};

/**
 * On player join
 *
 * @param {Object} data
 */
RoomController.prototype.onPlayerJoin = function(data)
{
    this.socketGroup.addEvent('room:join', {player: data.player.serialize()});
};

/**
 * On player leave
 *
 * @param {Object} data
 */
RoomController.prototype.onPlayerLeave = function(data)
{
    this.socketGroup.addEvent('room:leave', {player: data.player.id});

    if (this.room.isReady()) {
        this.room.newGame();
    }
};

/**
 * Warmup room
 *
 * @param {Room} room
 */
RoomController.prototype.onGame = function()
{
    this.socketGroup.addEvent('room:game:start');
};

/**
 * On kick
 *
 * @param {Player} player
 */
RoomController.prototype.onKick = function(player)
{
    this.socketGroup.addEvent('room:kick', player.id);
    this.removePlayer(player);
};

/**
 * On new vote
 *
 * @param {kickVote} kickVote
 */
RoomController.prototype.onVoteNew = function(kickVote)
{
    this.socketGroup.addEvent('vote:new', kickVote.serialize());
};

/**
 * On vote close
 *
 * @param {kickVote} kickVote
 */
RoomController.prototype.onVoteClose = function(kickVote)
{
    this.socketGroup.addEvent('vote:close', kickVote.serialize());
};

/**
 * Rooms Controller
 *
 * @param {RoomRepository} repository
 */
function RoomsController(repository)
{
    EventEmitter.call(this);

    var controller = this;

    this.socketGroup = new SocketGroup();
    this.repository  = repository;

    this.onRoomOpen       = this.onRoomOpen.bind(this);
    this.onRoomClose      = this.onRoomClose.bind(this);
    this.onRoomPlayer     = this.onRoomPlayer.bind(this);
    this.onRoomGame       = this.onRoomGame.bind(this);
    this.onRoomConfigOpen = this.onRoomConfigOpen.bind(this);
    this.detach           = this.detach.bind(this);

    this.callbacks = {
        emitAllRooms: function () { controller.emitAllRooms(this); },
        onCreateRoom: function (data) { controller.onCreateRoom(this, data[0], data[1]); },
        onJoinRoom: function (data) { controller.onJoinRoom(this, data[0], data[1]); }
    };

    this.repository.on('room:open', this.onRoomOpen);
    this.repository.on('room:close', this.onRoomClose);
}

RoomsController.prototype = Object.create(EventEmitter.prototype);
RoomsController.prototype.constructor = RoomsController;

/**
 * Attach events
 *
 * @param {SocketClient} client
 */
RoomsController.prototype.attach = function(client)
{
    if (this.socketGroup.clients.add(client)) {
        this.attachEvents(client);
    }
};

/**
 * Attach events
 *
 * @param {SocketClient} client
 */
RoomsController.prototype.detach = function(client)
{
    if (this.socketGroup.clients.remove(client)) {
        this.detachEvents(client);
    }
};

/**
 * Detach events
 *
 * @param {SocketClient} client
 */
RoomsController.prototype.attachEvents = function(client)
{
    client.on('close', this.detach);
    client.on('room:fetch', this.callbacks.emitAllRooms);
    client.on('room:create', this.callbacks.onCreateRoom);
    client.on('room:join', this.callbacks.onJoinRoom);
};

/**
 * Detach events
 *
 * @param {SocketClient} client
 */
RoomsController.prototype.detachEvents = function(client)
{
    client.removeListener('close', this.detach);
    client.removeListener('room:fetch', this.callbacks.emitAllRooms);
    client.removeListener('room:create', this.callbacks.onCreateRoom);
    client.removeListener('room:join', this.callbacks.onJoinRoom);
};

/**
 * Emit all rooms to the given client
 *
 * @param {SocketClient} client
 */
RoomsController.prototype.emitAllRooms = function(client)
{
    var events = [];

    for (var i = this.repository.rooms.items.length - 1; i >= 0; i--) {
        events.push(['room:open', this.repository.rooms.items[i].serialize(false)]);
    }

    client.addEvents(events);
};

// Events:

/**
 * On new room
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomsController.prototype.onCreateRoom = function(client, data, callback)
{
    var name = data.name.substr(0, Room.prototype.maxLength).trim(),
        room = this.repository.create(name);

    callback(room ? {success: true, room: room.serialize(false)} : {success: false});

    if (room) {
        this.emit('room:new', {room: room});
    }
};

/**
 * On join room
 *
 * @param {SocketClient} client
 * @param {Object} data
 * @param {Function} callback
 */
RoomsController.prototype.onJoinRoom = function(client, data, callback)
{
    var room = this.repository.get(data.name);

    if (!room) {
        return callback({success: false, error: 'Unknown room "' + data.name + '".'});
    }

    var password = typeof(data.password) !== 'undefined' ? data.password : null;

    if (!room.config.allow(password)) {
        return callback({success: false, error: 'Wrong password.'});
    }

    room.controller.attach(client, callback);
};

/**
 * On new room open
 *
 * @param {Object} data
 */
RoomsController.prototype.onRoomOpen = function(data)
{
    var room = data.room;

    room.on('game:new', this.onRoomGame);
    room.on('game:end', this.onRoomGame);
    room.on('player:join', this.onRoomPlayer);
    room.on('player:leave', this.onRoomPlayer);
    room.config.on('room:config:open', this.onRoomConfigOpen);

    this.socketGroup.addEvent('room:open', room.serialize(false));
};

/**
 * On room close
 *
 * @param {Object} data
 */
RoomsController.prototype.onRoomClose = function(data)
{
    var room = data.room;

    room.removeListener('game:new', this.onRoomGame);
    room.removeListener('game:end', this.onRoomGame);
    room.removeListener('player:join', this.onRoomPlayer);
    room.removeListener('player:leave', this.onRoomPlayer);
    room.config.on('room:config:open', this.onRoomConfigOpen);

    this.socketGroup.addEvent('room:close', {name: room.name});
};

/**
 * On room config open
 *
 * @param {Object} data
 */
RoomsController.prototype.onRoomConfigOpen = function(data)
{
    this.socketGroup.addEvent('room:config:open', {name: data.room.name, open: data.open});
};

/**
 * On player leave/join a room
 *
 * @param {Object} data
 */
RoomsController.prototype.onRoomPlayer = function(data)
{
    var room = data.room.serialize(false);

    this.socketGroup.addEvent('room:players', { name: room.name,  players: room.players });
};

/**
 * On room start/end a game
 *
 * @param {Object} data
 */
RoomsController.prototype.onRoomGame = function(data)
{
    var room = data.room.serialize(false);

    this.socketGroup.addEvent('room:game', { name: room.name,  game: room.game });
};

/**
 * Avatar body
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Avatar} avatar
 */
function AvatarBody(x, y, avatar)
{
    Body.call(this, x, y, avatar.radius, avatar);

    this.num   = avatar.bodyCount++;
    this.birth = new Date().getTime();
}

AvatarBody.prototype = Object.create(Body.prototype);
AvatarBody.prototype.constructor = AvatarBody;

/**
 * Age considered old
 *
 * @type {Number}
 */
AvatarBody.prototype.oldAge = 2000;

/**
 * Match?
 *
 * @param {Body} body
 *
 * @return {Boolean}
 */
AvatarBody.prototype.match = function(body)
{
    if ((body instanceof AvatarBody) && this.data.equal(body.data)) {
        return body.num - this.num > this.data.trailLatency;
    }

    return true;
};

/**
 * Is old?
 *
 * @return {Boolean}
 */
AvatarBody.prototype.isOld = function()
{
    return new Date().getTime() - this.birth >= this.oldAge;
};


/**
 * Body
 *
 * @param {Float} x
 * @param {Float} y
 * @param {Number} radius
 * @param {Object} data
 */
function Body (x, y, radius, data)
{
    this.x       = x;
    this.y       = y;
    this.radius  = radius;
    this.data    = data;
    this.islands = new Collection();
    this.id      = null;
}

/**
 * Match?
 *
 * @param {Body} body
 *
 * @return {Boolean}
 */
Body.prototype.match = function(body)
{
    return true;
};

/**
 * Inspector
 *
 * @param {Server} server
 * @param {Object} config
 */
function Inspector (server, config)
{
    this.server = server;
    this.client = influx({
        host: config.host,
        username: config.username,
        password: config.password,
        database: config.database
    });

    console.info('Inspector activated on %s', config.host);

    this.trackers = {
        client: new Collection(),
        room:   new Collection(),
        game:   new Collection()
    };

    this.onClientOpen    = this.onClientOpen.bind(this);
    this.onClientClose   = this.onClientClose.bind(this);
    this.onClientLatency = this.onClientLatency.bind(this);
    this.onRoomOpen      = this.onRoomOpen.bind(this);
    this.onRoomClose     = this.onRoomClose.bind(this);
    this.onGameNew       = this.onGameNew.bind(this);
    this.onGameEnd       = this.onGameEnd.bind(this);
    this.onGameFPS       = this.onGameFPS.bind(this);
    this.onLog           = this.onLog.bind(this);
    this.logUsage        = this.logUsage.bind(this);

    this.server.on('client', this.onClientOpen);
    this.server.roomRepository.on('room:open', this.onRoomOpen);
    this.server.roomRepository.on('room:close', this.onRoomClose);

    this.client.writePoint(this.DEPLOY, { version: packageInfo.version }, {}, {});
    this.client.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});
    this.client.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

    this.logInterval = setInterval(this.onLog, this.logFrequency);
}

Inspector.prototype.DEPLOY             = 'deploy';
Inspector.prototype.CLIENT             = 'client';
Inspector.prototype.CLIENTS            = 'client.total';
Inspector.prototype.CLIENT_PLAYER      = 'client.player';
Inspector.prototype.CLIENT_GAME_PLAYER = 'client.game.player';
Inspector.prototype.CLIENT_LATENCY     = 'client.latency';
Inspector.prototype.ROOM               = 'room';
Inspector.prototype.ROOMS              = 'room.total';
Inspector.prototype.GAME               = 'game';
Inspector.prototype.GAME_FPS           = 'game.fps';
Inspector.prototype.USAGE_MEMORY       = 'usage.memory';
Inspector.prototype.USAGE_CPU          = 'usage.cpu';

/**
 * Usage log frequency
 *
 * @type {Number}
 */
Inspector.prototype.logFrequency = 1000;

/**
 * On client open
 *
 * @param {SocketClient} client
 */
Inspector.prototype.onClientOpen = function(client)
{
    var tracker = new ClientTracker(this, client);

    this.trackers.client.add(tracker);

    tracker.on('latency', this.onClientLatency);
    client.on('close', this.onClientClose);

    this.client.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});
};

/**
 * On client close
 *
 * @param {SocketClient} client
 */
Inspector.prototype.onClientClose = function(client)
{
    var tracker = this.trackers.client.getById(client.id);

    this.client.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});

    if (tracker) {
        client.removeListener('close', this.onClientClose);
        tracker.removeListener('latency', this.onClientLatency);
        this.client.writePoint(this.CLIENT, tracker.getValues(), tracker.getTags(), {});
        this.trackers.client.remove(tracker.destroy());
    }
};

/**
 * On client latency
 *
 * @param {Object} data
 */
Inspector.prototype.onClientLatency = function(data)
{
    this.client.writePoint(this.CLIENT_LATENCY, data.latency, {game: data.tracker.uniqId}, {});
};

/**
 * On room open
 *
 * @param {Object} data
 */
Inspector.prototype.onRoomOpen = function(data)
{
    var room = data.room;

    this.trackers.room.add(new RoomTracker(this, room));

    this.client.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

    room.on('game:new', this.onGameNew);
};

/**
 * On room open
 *
 * @param {Object} data
 */
Inspector.prototype.onRoomClose = function(data)
{
    var room = data.room,
        tracker = this.trackers.room.getById(room.name);

    room.removeListener('game:new', this.onGameNew);

    this.client.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

    if (tracker) {
        this.client.writePoint(this.ROOM, tracker.getValues(), tracker.getTags(), {});
        this.trackers.room.remove(tracker.destroy());
    }
};

/**
 * On game add
 *
 * @param {Game} game
 */
Inspector.prototype.onGameNew = function(data)
{
    var game = data.game,
        tracker = new GameTracker(this, game),
        avatar, client, clientTracker;

    this.trackers.game.add(tracker);

    for (var i = game.avatars.items.length - 1; i >= 0; i--) {
        avatar        = game.avatars.items[i];
        client        = avatar.player.client;
        clientTracker = this.trackers.client.getById(client.id);

        if (clientTracker) {
            this.client.writePoint(
                this.CLIENT_GAME_PLAYER,
                {
                    color: avatar.color,
                    player: md5(avatar.name),
                    game: tracker.uniqId,
                    client: clientTracker.uniqId
                },
                {
                    player: md5(avatar.name),
                    game: tracker.uniqId,
                    client: clientTracker.uniqId
                },
                {}
            );
        }
    }

    tracker.on('fps', this.onGameFPS);
    game.on('end', this.onGameEnd);
};

/**
 * On game end
 *
 * @param {Game} game
 */
Inspector.prototype.onGameEnd = function(data)
{
    var game    = data.game,
        tracker = this.trackers.game.getById(game.name);

    game.removeListener('end', this.onGameEnd);

    if (tracker) {
        tracker.removeListener('fps', this.onGameFPS);
        this.collectGameTrackerData(tracker);
    }
};

/**
 * On game FPS
 *
 * @param {Object} data
 */
Inspector.prototype.onGameFPS = function(data)
{
    this.client.writePoint(this.GAME_FPS, data.fps, {game: data.tracker.uniqId}, {});
};

/**
 * Collect data from the given tracker
 *
 * @param {GameTracker} tracker
 */
Inspector.prototype.collectGameTrackerData = function(tracker)
{
    this.client.writePoint(this.GAME, tracker.getValues(), tracker.getTags(), {});
    this.trackers.game.remove(tracker.destroy());
};

/**
 * On every frame
 */
Inspector.prototype.onLog = function()
{
    usage.lookup(process.pid, this.logUsage);
};

/**
 * Log usage
 */
Inspector.prototype.logUsage = function (err, result)
{
    if (result) {
        this.client.writePoint(this.USAGE_CPU, result.cpu, {}, {});
        this.client.writePoint(this.USAGE_MEMORY, result.memory, {}, {});
    }
};

/**
 * Island
 *
 * @param {Number} id
 * @param {Number} size
 * @param {Number} x
 * @param {Number} y
 */
function Island(id, size, x, y)
{
    this.id     = id;
    this.size   = size;
    this.fromX  = x;
    this.fromY  = y;
    this.toX    = x + size;
    this.toY    = y + size;
    this.bodies = new Collection([], 'id');
}

/**
 * Add a body
 *
 * @param {Body} body
 */
Island.prototype.addBody = function(body)
{
    if (this.bodies.add(body)) {
        body.islands.add(this);
    }
};

/**
 * Remove a body
 *
 * @param {Body} body
 */
Island.prototype.removeBody = function(body)
{
    this.bodies.remove(body);
    body.islands.remove(this);
};

/**
 * Test if the given body position is free (doesn't collide with any other)
 *
 * @param {Body} body
 *
 * @return {Boolean}
 */
Island.prototype.testBody = function(body)
{
    return this.getBody(body) === null;
};

/**
 * Get collinding body for the given body
 *
 * @param {Body} body
 *
 * @return {Body|null}
 */
Island.prototype.getBody = function(body)
{
    if (this.bodyInBound(body, this.fromX, this.fromY, this.toX, this.toY)) {
        for (var i = this.bodies.items.length - 1; i >= 0; i--) {
            if (this.bodiesTouch(this.bodies.items[i], body)) {
                return this.bodies.items[i];
            }
        }
    }

    return null;
};

/**
 * Does the given bodies touch each other?
 *
 * @param {Body} bodyA
 * @param {Body} bodyB
 *
 * @return {Boolean}
 */
Island.prototype.bodiesTouch = function(bodyA, bodyB)
{
    var distance = this.getDistance(bodyA.x, bodyA.y, bodyB.x, bodyB.y),
        radius   = bodyA.radius + bodyB.radius,
        match    = bodyA.match(bodyB);

    return distance < radius && match;
};

/**
 * Is point in bound?
 *
 * @param {Body} body
 * @param {Number} fromX
 * @param {Number} fromY
 * @param {Number} toX
 * @param {Number} toY
 *
 * @return {Boolean}
 */
Island.prototype.bodyInBound = function(body, fromX, fromY, toX, toY)
{
    return body.x + body.radius > fromX &&
           body.x - body.radius < toX   &&
           body.y + body.radius > fromY &&
           body.y - body.radius < toY;
};

/**
 * Get distance between two points
 *
 * @param {Number} fromX
 * @param {Number} fromY
 * @param {Number} toX
 * @param {Number} toY
 *
 * @return {Number}
 */
Island.prototype.getDistance = function(fromX, fromY, toX, toY)
{
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
};

/**
 * Clear the island
 */
Island.prototype.clear = function()
{
    this.bodies.clear();
};

/**
 * Ping logger
 *
 * @param {Socket} socket
 */
function PingLogger(socket)
{
    EventEmitter.call(this);

    this.socket   = socket;
    this.interval = null;

    this.ping = this.ping.bind(this);
}

PingLogger.prototype = Object.create(EventEmitter.prototype);
PingLogger.prototype.constructor = PingLogger;

/**
 * Ping frequency in milliseconds
 *
 * @type {Number}
 */
PingLogger.prototype.frequency = 1000;

/**
 * Start ping
 */
PingLogger.prototype.start = function()
{
    if (!this.interval) {
        this.interval = setInterval(this.ping, this.frequency);
    }
};

/**
 * Stop ping
 */
PingLogger.prototype.stop = function()
{
    if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
    }
};

/**
 * Ping
 */
PingLogger.prototype.ping = function()
{
    var logger = this,
        ping   = new Date().getTime();

    this.socket.ping(null, function () { logger.pong(ping); });
};

/**
 * Pong
 *
 * @param {Number} ping
 */
PingLogger.prototype.pong = function(ping)
{
    this.emit('latency', new Date().getTime() - ping);
};

/**
 * Server
 */
function Server(config)
{
    EventEmitter.call(this);

    this.config  = config;
    this.app     = express();
    this.server  = new http.Server(this.app);
    this.clients = new Collection([], 'id', true);

    this.roomRepository  = new RoomRepository();
    this.roomsController = new RoomsController(this.roomRepository);

    this.authorizationHandler  = this.authorizationHandler.bind(this);
    this.onSocketConnection    = this.onSocketConnection.bind(this);
    this.onSocketDisconnection = this.onSocketDisconnection.bind(this);
    this.onError               = this.onError.bind(this);

    this.app.use(express['static']('web'));

    this.server.on('error', this.onError);
    this.server.on('upgrade', this.authorizationHandler);
    this.server.listen(config.port);

    console.info('Listening on port %s', config.port);
}

Server.prototype = Object.create(EventEmitter.prototype);
Server.prototype.constructor = Server;

/**
 * Authorization Handler
 *
 * @param {Object} request
 * @param {Object} socket
 * @param {Buffer} body
 */
Server.prototype.authorizationHandler = function(request, socket, head)
{
    if (!WebSocket.isWebSocket(request)) {
        return socket.end();
    }

    var websocket = new WebSocket(request, socket, head, ['websocket'], {ping: 30}),
        ip = request.headers['x-real-ip'] || request.connection.remoteAddress;

    return this.onSocketConnection(websocket, ip);
};

/**
 * On socket connection
 *
 * @param {Socket} socket
 * @param {String} ip
 */
Server.prototype.onSocketConnection = function(socket, ip)
{
    var client = new SocketClient(socket, 1, ip);
    this.clients.add(client);

    client.on('close', this.onSocketDisconnection);
    this.roomsController.attach(client);
    this.emit('client', client);

    console.info('Client %s connected.', client.id);
};

/**
 * On socket connection
 *
 * @param {SocketClient} client
 */
Server.prototype.onSocketDisconnection = function(client)
{
    console.info('Client %s disconnected.', client.id);

    this.clients.remove(client);
};

/**
 * On error
 *
 * @param {Error} error
 */
Server.prototype.onError = function(error)
{
    console.error('Server Error:', error.stack);
};

/**
 * Socket Client
 *
 * @param {Socket} socket
 * @param {Number} interval
 * @param {String} ip
 */
function SocketClient(socket, interval, ip)
{
    BaseSocketClient.call(this, socket, interval);

    this.ip         = ip;
    this.id         = null;
    this.active     = true;
    this.players    = new Collection([], 'id');
    this.pingLogger = new PingLogger(this.socket);
    this.tickrate   = new BaseTickrateLogger();

    this.identify   = this.identify.bind(this);
    this.onActivity = this.onActivity.bind(this);
    this.onLatency  = this.onLatency.bind(this);

    this.on('whoami', this.identify);
    this.on('activity', this.onActivity);
    this.pingLogger.on('latency', this.onLatency);
}

SocketClient.prototype = Object.create(BaseSocketClient.prototype);
SocketClient.prototype.constructor = SocketClient;

/**
 * Ping interval
 *
 * @type {Number}
 */
SocketClient.prototype.pingInterval = 1000;

/**
 * On ping logger latency value
 *
 * @param {Number} latency
 */
SocketClient.prototype.onLatency = function(latency)
{
    this.addEvent('latency', latency, null, true);
};

/**
 * Is this client playing?
 *
 * @return {Boolean}
 */
SocketClient.prototype.isPlaying = function()
{
    return !this.players.isEmpty();
};

/**
 * Clear players
 */
SocketClient.prototype.clearPlayers = function()
{
    this.emit('players:clear', this);
    this.players.clear();
};

/**
 * Who am I?
 */
SocketClient.prototype.identify = function(event)
{
    event[1](this.id);
};

/**
 * On activity change
 *
 * @param {Event} event
 */
SocketClient.prototype.onActivity = function(active)
{
    this.active = active;
};

/**
 * Send an event
 *
 * @param {String} name
 * @param {String} data
 */
SocketClient.prototype.sendEvents = function (events)
{
    this.tickrate.tick(events);
    BaseSocketClient.prototype.sendEvents.call(this, events);
};

/**
 * Stop
 */
SocketClient.prototype.stop = function()
{
    BaseSocketClient.prototype.stop.call(this);
    this.pingLogger.stop();
    this.tickrate.stop();
};

/**
 * Object version of the client
 *
 * @return {Object}
 */
SocketClient.prototype.serialize = function()
{
    var data = BaseSocketClient.prototype.serialize.call(this);

    data.active = this.active;

    return data;
};

/**
 * Socket group
 *
 * @param {Object} clients
 */
function SocketGroup(clients)
{
    this.clients = typeof(clients) !== 'undefined' ? clients : new Collection();
}

/**
 * Add a listener
 *
 * @param {String} name
 * @param {Function} callback
 */
SocketGroup.prototype.on = function(name, callback)
{
    for (var i = this.clients.items.length - 1; i >= 0; i--) {
        this.clients.items[i].on(name, callback);
    }
};

/**
 * Remove a listener
 *
 * @param {String} name
 * @param {Function} callback
 */
SocketGroup.prototype.removeListener = function(name, callback)
{
    for (var i = this.clients.items.length - 1; i >= 0; i--) {
        this.clients.items[i].removeListener(name, callback);
    }
};

/**
 * Add a group of events event to the list
 *
 * @param {Array} events
 * @param {Boolean} force
 */
SocketGroup.prototype.addEvents = function(events, force)
{
    for (var i = this.clients.items.length - 1; i >= 0; i--) {
        this.clients.items[i].addEvents(events, force);
    }
};

/**
 * Add an event to the list
 *
 * @param {String} name
 * @param {Object} data
 * @param {Function} callback
 * @param {Boolean} force
 */
SocketGroup.prototype.addEvent = function(name, data, callback, force)
{
    for (var i = this.clients.items.length - 1; i >= 0; i--) {
        this.clients.items[i].addEvent(name, data, callback, force);
    }
};
/**
 * World
 */
function World(size, islands)
{
    islands = typeof(islands) === 'number' ? islands : Math.round(size / this.islandGridSize);

    this.size       = size;
    this.islands    = new Collection();
    this.islandSize = this.size / islands;
    this.active     = false;
    this.bodyCount  = 0;

    for (var id, x, y = islands - 1; y >= 0; y--) {
        for (x = islands- 1; x >= 0; x--) {
            id = x.toString() + ':' + y.toString();
            this.islands.add(new Island(id, this.islandSize, x * this.islandSize, y * this.islandSize));
        }
    }
}

/**
 * Island grid size (width of the island)
 *
 * @type {Number}
 */
World.prototype.islandGridSize = 40;

/**
 * Get the island responsible for the given point
 *
 * @param {Number} x
 * @param {Number} y
 *
 * @return {Island}
 */
World.prototype.getIslandByPoint = function(pX, pY)
{
    var x  = Math.floor(pX/this.islandSize),
        y  = Math.floor(pY/this.islandSize),
        id = x.toString() + ':' + y.toString();

    return this.islands.getById(id);
};

/**
 * Add a body to all concerned islands
 *
 * @param {Body} body
 */
World.prototype.addBody = function(body)
{
    if (!this.active) {
        return;
    }

    body.id = this.bodyCount++;

    this.addBodyByPoint(body, body.x - body.radius, body.y - body.radius);
    this.addBodyByPoint(body, body.x + body.radius, body.y - body.radius);
    this.addBodyByPoint(body, body.x - body.radius, body.y + body.radius);
    this.addBodyByPoint(body, body.x + body.radius, body.y + body.radius);
};

/**
 * Add a body to an island if it's concerned by the given point
 *
 * @param {Body} body
 * @param {Number} x
 * @param {Number} y
 */
World.prototype.addBodyByPoint = function(body, x, y)
{
    var island = this.getIslandByPoint(x, y);

    if (island) {
        island.addBody(body);
    }
};

/**
 * Remove a body from islands
 *
 * @param {Body} body
 */
World.prototype.removeBody = function(body)
{
    if (!this.active) {
        return;
    }

    for (var i = body.islands.items.length - 1; i >= 0; i--) {
        body.islands.items[i].removeBody(body);
    }
};

/**
 * Get one or no body coliding with the given body
 *
 * @param {Body} body
 *
 * @return {Body|null}
 */
World.prototype.getBody = function(body)
{
    return this.getBodyByPoint(body, body.x - body.radius, body.y - body.radius) ||
        this.getBodyByPoint(body, body.x + body.radius, body.y - body.radius) ||
        this.getBodyByPoint(body, body.x - body.radius, body.y + body.radius) ||
        this.getBodyByPoint(body, body.x + body.radius, body.y + body.radius);
};

/**
 * Get one or no body coliding with the given body for the given point
 *
 * @param {Body} body
 * @param {Number} x
 * @param {Number} y
 *
 * @return {Body|null}
 */
World.prototype.getBodyByPoint = function(body, x, y)
{
    var island = this.getIslandByPoint(x, y);

    return island ? island.getBody(body) : null;
};

/**
 * Test if the body position is free (there are no bodies for this position)
 *
 * @param {Body} body
 *
 * @return {Boolean}
 */
World.prototype.testBody = function(body)
{
    return this.testBodyByPoint(body, body.x - body.radius, body.y - body.radius) &&
        this.testBodyByPoint(body, body.x + body.radius, body.y - body.radius) &&
        this.testBodyByPoint(body, body.x - body.radius, body.y + body.radius) &&
        this.testBodyByPoint(body, body.x + body.radius, body.y + body.radius);
};

/**
 * Test if the body position is free for the given point
 *
 * @param {Body} Body
 * @param {Number} x
 * @param {Number} y
 */
World.prototype.testBodyByPoint = function(body, x, y)
{
    var island = this.getIslandByPoint(x, y);

    return island ? island.testBody(body) : false;
};

/**
 * Random a random, free of bodies, position
 *
 * @param {Number} radius
 * @param {Number} border
 *
 * @return {Array}
 */
World.prototype.getRandomPosition = function(radius, border)
{
    var margin = radius + border * this.size,
        body   = new Body(this.getRandomPoint(margin), this.getRandomPoint(margin), margin);

    while (!this.testBody(body)) {
        body.x = this.getRandomPoint(margin);
        body.y = this.getRandomPoint(margin);
    }

    return [body.x, body.y];
};

/**
 * Random random direction
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Number} tolerance
 *
 * @return {Float}
 */
World.prototype.getRandomDirection = function(x, y, tolerance)
{
    var direction = this.getRandomAngle(),
        margin    = tolerance * this.size;

    while (!this.isDirectionValid(direction, x, y, margin)) {
        direction = this.getRandomAngle();
    }

    return direction;
};

/**
 * Is direction valid
 *
 * @param {Float} angle
 * @param {Number} x
 * @param {Number} y
 * @param {Float} margin
 *
 * @return {Boolean}
 */
World.prototype.isDirectionValid = function(angle, x, y, margin)
{
    var quarter = Math.PI/2,
        from,
        to;

    for (var i = 0; i < 4; i++) {
        from = quarter * i;
        to   = quarter * (i+1);

        if (angle >= from && angle < to) {
            if (this.getHypotenuse(angle - from, this.getDistanceToBorder(i, x, y)) < margin) {
                return false;
            }

            if (this.getHypotenuse(to - angle, this.getDistanceToBorder(i < 3 ? i+1 : 0, x, y)) < margin) {
                return false;
            }

            return true;
        }
    }
};

/**
 * Get hypotenuse from adjacent side
 *
 * @param {Float} angle
 * @param {Number} adjacent
 *
 * @return {Float}
 */
World.prototype.getHypotenuse = function(angle, adjacent)
{
    return adjacent / Math.cos(angle);
};

/**
 * Get random angle
 *
 * @return {Float}
 */
World.prototype.getRandomAngle = function()
{
    return Math.random() * Math.PI * 2;
};

/**
 * Get random point
 *
 * @param {Number} margin
 *
 * @return {Array}
 */
World.prototype.getRandomPoint = function(margin)
{
    return margin + Math.random() * (this.size - margin * 2);
};

/**
 * Get intersection between given body and the map borders
 *
 * @param {Body} body
 * @param {Number} margin
 *
 * @return {Boolean}
 */
World.prototype.getBoundIntersect = function(body, margin)
{
    if (body.x - margin < 0) {
        return [0, body.y];
    }

    if (body.x + margin > this.size) {
        return [this.size, body.y];
    }

    if (body.y - margin < 0) {
        return [body.x, 0];
    }

    if (body.y + margin > this.size) {
        return [body.x, this.size];
    }

    return null;
};

/**
 * Get oposite point
 *
 * @param {Number} x
 * @param {Number} y
 *
 * @return {Array}
 */
World.prototype.getOposite = function(x, y)
{
    if (x === 0) {
        return [this.size, y];
    }

    if (x === this.size) {
        return [0, y];
    }

    if (y === 0) {
        return [x, this.size];
    }

    if (y === this.size) {
        return [x, 0];
    }

    return [x, y];
};

/**
 * Get the distance of a point to the border
 *
 * @param {Number} border
 * @param {Number} x
 * @param {Number} y
 *
 * @return {Float}
 */
World.prototype.getDistanceToBorder = function(border, x, y)
{
    if (border === 0) {
        return this.size - x;
    }

    if (border === 1) {
        return this.size - y;
    }

    if (border === 2) {
        return x;
    }

    if (border === 3) {
        return y;
    }
};

/**
 * Clear the world
 */
World.prototype.clear = function()
{
    this.active    = false;
    this.bodyCount = 0;

    for (var i = this.islands.items.length - 1; i >= 0; i--) {
        this.islands.items[i].clear();
    }
};

/**
 * Activate
 */
World.prototype.activate = function()
{
    this.active = true;
};

/**
 * Bonus Manager
 *
 * @param {Game} game
 */
function BonusManager(game, bonuses, rate)
{
    BaseBonusManager.call(this, game);

    this.world           = new World(this.game.size, 1);
    this.popingTimeout   = null;
    this.bonusTypes      = bonuses;
    this.bonusPopingTime = this.bonusPopingTime - ((this.bonusPopingTime/2) * rate);

    this.popBonus = this.popBonus.bind(this);
}

BonusManager.prototype = Object.create(BaseBonusManager.prototype);
BonusManager.prototype.constructor = BonusManager;

/**
 * Start
 */
BonusManager.prototype.start = function()
{
    BaseBonusManager.prototype.start.call(this);

    this.world.activate();

    if (this.bonusTypes.length) {
        this.popingTimeout = setTimeout(this.popBonus, this.getRandomPopingTime());
    }
};

/**
 * Stop
 */
BonusManager.prototype.stop = function()
{
    if (this.popingTimeout) {
        this.popingTimeout = clearTimeout(this.popingTimeout);
    }

    BaseBonusManager.prototype.stop.call(this);
};

/**
 * Clear
 */
BonusManager.prototype.clear = function()
{
    this.world.clear();
    BaseBonusManager.prototype.clear.call(this);
};

/**
 * Make a bonus 'pop'
 */
BonusManager.prototype.popBonus = function ()
{
    if (this.bonusTypes.length) {
        this.popingTimeout = setTimeout(this.popBonus, this.getRandomPopingTime());

        if (this.bonuses.count() < this.bonusCap) {
            var bonusType = this.getRandomBonusType();

            if (bonusType) {
                var position = this.getRandomPosition(BaseBonus.prototype.radius, this.bonusPopingMargin),
                    bonus    = new (bonusType)(position[0], position[1]);
                this.add(bonus);
            }
        }
    }
};

/**
 * Get random position
 *
 * @param {Number} radius
 * @param {Number} border
 *
 * @return {Array}
 */
BonusManager.prototype.getRandomPosition = function(radius, border)
{
    var margin = radius + border * this.game.world.size,
        body   = new Body(
            this.game.world.getRandomPoint(margin),
            this.game.world.getRandomPoint(margin),
            margin
        );

    while (!this.game.world.testBody(body) || !this.world.testBody(body)) {
        body.x = this.game.world.getRandomPoint(margin);
        body.y = this.game.world.getRandomPoint(margin);
    }

    return [body.x, body.y];
};

/**
 * Test if an avatar catches a bonus
 *
 * @param {Avatar} avatar
 */
BonusManager.prototype.testCatch = function(avatar)
{
    if (avatar.body) {
        var body  = this.world.getBody(avatar.body),
            bonus = body ? body.data : null;

        if (bonus && this.remove(bonus)) {
            bonus.applyTo(avatar, this.game);
        }
    }
};

/**
 * Add bonus
 *
 * @param {Bonus} bonus
 */
BonusManager.prototype.add = function (bonus)
{
    if (BaseBonusManager.prototype.add.call(this, bonus)) {
        this.world.addBody(bonus.body);
        this.emit('bonus:pop', bonus);

        return true;
    }

    return false;
};

/**
 *  Remove bonus
 *
 * @param {Bonus} bonus
 */
BonusManager.prototype.remove = function(bonus)
{
    if (BaseBonusManager.prototype.remove.call(this, bonus)) {
        this.world.removeBody(bonus.body);
        this.emit('bonus:clear', bonus);

        return true;
    }

    return false;
};

/**
 * Get random printing time
 *
 * @return {Number}
 */
BonusManager.prototype.getRandomPopingTime  = function()
{
    return this.bonusPopingTime * (1 +  Math.random());
};

/**
 * Get random bonus type
 *
 * @return {Bonus}
 */
BonusManager.prototype.getRandomBonusType = function()
{
    if (!this.bonusTypes.length) { return null; }

    var total   = this.bonusTypes.length,
        pot     = [],
        bonuses = [],
        bonus,
        probability,
        bonusType;

    for (var i = 0; i < total; i++) {
        bonusType   = this.bonusTypes[i];
        probability = bonusType.prototype.getProbability(this.game);

        if (probability > 0) {
            bonuses.push(bonusType);
            pot.push(probability + (i > 0 ? pot[pot.length-1] : 0));
        }
    }

    var value = Math.random() * pot[pot.length - 1];

    for (i = 0; i < total; i++) {
        if (value < pot[i]) {
            return bonuses[i];
        }
    }

    return null;
};

/**
 * Update size
 */
BonusManager.prototype.setSize = function()
{
    this.world.clear();
    this.world = new World(this.game.size, 1);
};

/**
 * Kick vote manager
 *
 * @param {RoomController} controller
 */
function KickManager (controller)
{
    this.controller = controller;
    this.room       = this.controller.room;
    this.votes      = new Collection();

    this.updateVotes   = this.updateVotes.bind(this);
    this.onClientLeave = this.onClientLeave.bind(this);
    this.onPlayerLeave = this.onPlayerLeave.bind(this);
    this.onVoteClose   = this.onVoteClose.bind(this);
    this.clear         = this.clear.bind(this);

    this.controller.on('client:add', this.updateVotes);
    this.controller.on('client:remove', this.onClientLeave);
    this.controller.on('player:add', this.updateVotes);
    this.controller.on('player:remove', this.onPlayerLeave);
    this.room.on('game:new', this.clear);
}

KickManager.prototype = Object.create(EventEmitter.prototype);
KickManager.prototype.constructor = KickManager;

/**
 * Vote
 *
 * @param {SocketClient} client
 * @param {Player} player
 */
KickManager.prototype.vote = function(client, player)
{
    return this.getVote(player).toggleVote(client);
};

/**
 * Get vote for the given player
 *
 * @param {Player} player
 */
KickManager.prototype.getVote = function(player)
{
    if (this.votes.indexExists(player.id)) {
        return this.votes.getById(player.id);
    }

    var kickVote = new KickVote(player, this.getTotalClients());

    this.votes.add(kickVote);
    kickVote.on('close', this.onVoteClose);
    this.emit('vote:new', kickVote);

    return kickVote;
};

/**
 * On vote close
 *
 * @param {KickVote} kickVote
 */
KickManager.prototype.onVoteClose = function(kickVote)
{
    kickVote.removeListener('close', this.onVoteClose);
    this.votes.remove(kickVote);

    if (kickVote.result) {
        this.emit('kick', kickVote.target);
    }

    this.emit('vote:close', kickVote);
};

/**
 * On player leave
 *
 * @param {Object} data
 */
KickManager.prototype.onPlayerLeave = function(data)
{
    var player = data.player,
        kickVote = this.votes.getById(player.id);

    if (kickVote) {
        kickVote.close();
    }
};

/**
 * On player leave
 *
 * @param {Object} data
 */
KickManager.prototype.onClientLeave = function(data)
{
    this.removeClient(data.client);
};

/**
 * Remove client
 *
 * @param {SocketClient} client
 */
KickManager.prototype.removeClient = function(client)
{
    var total = this.getTotalClients(),
        kickVote;

    for (var i = this.votes.items.length - 1; i >= 0; i--) {
        kickVote = this.votes.items[i];

        if (kickVote) {
            kickVote.removeClient(client);
            kickVote.setTotal(total);
        }
    }
};

/**
 * Get total clients
 *
 * @return {Number}
 */
KickManager.prototype.getTotalClients = function()
{
    return this.controller.clients.filter(function () { return this.isPlaying(); }).count();
};

/**
 * Update votes
 */
KickManager.prototype.updateVotes = function()
{
    var total = this.getTotalClients();

    for (var i = this.votes.items.length - 1; i >= 0; i--) {
        this.votes.items[i].setTotal(total);
    }
};

/**
 * Clear
 */
KickManager.prototype.clear = function()
{
    for (var i = this.votes.items.length - 1; i >= 0; i--) {
        this.votes.items[i].removeListener('close', this.onVoteClose);
    }

    this.votes.clear();
};

/**
 * Print Manager
 *
 * @param {Avatar} avatar
 */
function PrintManager(avatar)
{
    this.avatar   = avatar;
    this.active   = false;
    this.lastX    = 0;
    this.lastY    = 0;
    this.distance = 0;

    this.start = this.start.bind(this);
}

/**
 * Hole distance
 *
 * @type {Number}
 */
PrintManager.prototype.holeDistance  = 5;

/**
 * Print distance
 *
 * @type {Number}
 */
PrintManager.prototype.printDistance = 60;

/**
 * Toggle print
 */
PrintManager.prototype.togglePrinting = function()
{
    this.setPrinting(!this.avatar.printing);
};

/**
 * Set print
 */
PrintManager.prototype.setPrinting = function(printing)
{
    this.avatar.setPrinting(printing);
    this.distance = this.getRandomDistance();
};

/**
 * Get random printing time
 *
 * @return {Number}
 */
PrintManager.prototype.getRandomDistance = function()
{
    if (this.avatar.printing) {
        return this.printDistance * (0.3 + Math.random() * 0.7);
    } else {
        return this.holeDistance * (0.8 + Math.random() * 0.5);
    }
};

/**
 * Start
 */
PrintManager.prototype.start = function()
{
    if (!this.active) {
        this.active = true;
        this.lastX  = this.avatar.x;
        this.lastY  = this.avatar.y;
        this.setPrinting(true);
    }
};

/**
 * Stop
 */
PrintManager.prototype.stop = function()
{
    if (this.active) {
        this.active = false;
        this.setPrinting(false);
        this.clear();
    }
};

/**
 * Test
 */
PrintManager.prototype.test = function()
{
    if (this.active) {
        this.distance -= this.getDistance(this.lastX, this.lastY, this.avatar.x, this.avatar.y);

        this.lastX = this.avatar.x;
        this.lastY = this.avatar.y;

        if (this.distance <= 0) {
            this.togglePrinting();
        }
    }

};

/**
 * Get distance
 *
 * @param {Number} fromX
 * @param {Number} fromY
 * @param {Number} toX
 * @param {Number} toY
 *
 * @return {Number}
 */
PrintManager.prototype.getDistance = function(fromX, fromY, toX, toY)
{
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
};

/**
 * Clear
 */
PrintManager.prototype.clear = function()
{
    this.active   = false;
    this.distance = 0;
    this.lastX    = 0;
    this.lastY    = 0;
};

/**
 * Avatar
 *
 * @param {Player} player
 */
function Avatar(player)
{
    BaseAvatar.call(this, player);

    this.bodyCount    = 0;
    this.body         = new AvatarBody(this.x, this.y, this);
    this.printManager = new PrintManager(this);
}

Avatar.prototype = Object.create(BaseAvatar.prototype);
Avatar.prototype.constructor = Avatar;

/**
 * Update
 *
 * @param {Number} step
 */
Avatar.prototype.update = function(step)
{
    if (this.alive) {
        this.updateAngle(step);
        this.updatePosition(step);

        if (this.printing && this.isTimeToDraw()) {
            this.addPoint(this.x, this.y);
        }
    }
};

/**
 * Is time to draw?
 *
 * @return {Boolean}
 */
Avatar.prototype.isTimeToDraw = function()
{
    if (this.trail.lastX === null) {
        return true;
    }

    return this.getDistance(this.trail.lastX, this.trail.lastY, this.x, this.y) > this.radius;
};

/**
 * Set position
 *
 * @param {Number} x
 * @param {Number} y
 */
Avatar.prototype.setPosition = function(x, y)
{
    BaseAvatar.prototype.setPosition.call(this, x, y);

    this.body.x   = this.x;
    this.body.y   = this.y;
    this.body.num = this.bodyCount;

    this.emit('position', this);
};

/**
 * Set velocity
 *
 * @param {Number} step
 */
Avatar.prototype.setVelocity = function(velocity)
{
    if (this.velocity !== velocity) {
        BaseAvatar.prototype.setVelocity.call(this, velocity);
        this.emit('property', {avatar: this, property: 'velocity', value: this.velocity});
    }
};

/**
 * Set angle
 *
 * @param {Array} point
 */
Avatar.prototype.setAngle = function(angle)
{
    if (this.angle !== angle) {
        BaseAvatar.prototype.setAngle.call(this, angle);
        this.emit('angle', this);
    }
};

/**
 * Set angular velocity
 *
 * @param {Number} velocity
 */
Avatar.prototype.setAngularVelocity = function(angularVelocity)
{
    if (this.angularVelocity !== angularVelocity) {
        BaseAvatar.prototype.setAngularVelocity.call(this, angularVelocity);
    }
};

/**
 * Set angular velocity
 *
 * @param {Float} velocity
 */
Avatar.prototype.setRadius = function(radius)
{
    if (this.radius !== radius) {
        BaseAvatar.prototype.setRadius.call(this, radius);
        this.body.radius = this.radius;
        this.emit('property', {avatar: this, property: 'radius', value: this.radius});
    }
};

/**
 * Set invincible
 *
 * @param {Number} invincible
 */
Avatar.prototype.setInvincible = function(invincible)
{
    BaseAvatar.prototype.setInvincible.call(this, invincible);
    this.emit('property', {avatar: this, property: 'invincible', value: this.invincible});
};

/**
 * Set ghost
 *
 * @param {Number} ghost
 */
Avatar.prototype.setGhost = function(ghost)
{
    BaseAvatar.prototype.setGhost.call(this, ghost);
    this.emit('property', {avatar: this, property: 'ghost', value: this.ghost});
};

/**
 * Set inverse
 *
 * @param {Number} inverse
 */
Avatar.prototype.setInverse = function(inverse)
{
    BaseAvatar.prototype.setInverse.call(this, inverse);
    this.emit('property', {avatar: this, property: 'inverse', value: this.inverse});
};

/**
 * Set color
 *
 * @param {Number} color
 */
Avatar.prototype.setColor = function(color)
{
    this.color = color;
    this.emit('property', {avatar: this, property: 'color', value: this.color});
};

/**
 * Set borderColor
 *
 * @param {Number} borderColor
 */
Avatar.prototype.setBorderColor = function(borderColor)
{
    this.borderColor = borderColor;
    this.emit('property', {avatar: this, property: 'borderColor', value: this.borderColor});
};

/**
 * Add point
 *
 * @param {Float} x
 * @param {Float} y
 * @param {Boolean} important
 */
Avatar.prototype.addPoint = function(x, y, important)
{
    BaseAvatar.prototype.addPoint.call(this, x, y);
    this.emit('point', {avatar: this, x: x, y: y, important: important});
};

/**
 * Set printing
 *
 * @param {Boolean} printing
 */
Avatar.prototype.setPrinting = function(printing)
{
    BaseAvatar.prototype.setPrinting.call(this, printing);
    this.emit('property', {avatar: this, property: 'printing', value: this.printing});
};

/**
 * Die
 *
 * @param {Bodynull} body
 */
Avatar.prototype.die = function(body)
{
    BaseAvatar.prototype.die.call(this);
    this.printManager.stop();
    this.emit('die', {
        avatar: this,
        killer: body ? body.data : null,
        old: body ? body.isOld() : null
    });
};

/**
 * Set score
 *
 * @param {Number} score
 */
Avatar.prototype.setScore = function(score)
{
    BaseAvatar.prototype.setScore.call(this, score);
    this.emit('score', this);
};

/**
 * Set round score
 *
 * @param {Number} score
 */
Avatar.prototype.setRoundScore = function(score)
{
    BaseAvatar.prototype.setRoundScore.call(this, score);
    this.emit('score:round', this);
};

/**
 * Clear
 */
Avatar.prototype.clear = function()
{
    BaseAvatar.prototype.clear.call(this);
    this.printManager.stop();
    this.bodyCount = 0;
};

/**
 * Bonus Stack
 *
 * @param {Avatar} avatar
 */
function BonusStack(avatar)
{
    BaseBonusStack.call(this, avatar);
}

BonusStack.prototype = Object.create(BaseBonusStack.prototype);
BonusStack.prototype.constructor = BonusStack;

/**
 * Add bonus to the stack
 *
 * @param {Bonus} bonus
 */
BonusStack.prototype.add = function(bonus)
{
    BaseBonusStack.prototype.add.call(this, bonus);
    this.emit('change', {avatar: this.target, method: 'add', bonus: bonus});
};

/**
 * Remove bonus from the stack
 *
 * @param {Bonus} bonus
 */
BonusStack.prototype.remove = function(bonus)
{
    BaseBonusStack.prototype.remove.call(this, bonus);
    this.emit('change', {avatar: this.target, method: 'remove', bonus: bonus});
};

/**
 * Apply the value to target's property
 *
 * @param {String} property
 * @param {Number} value
 */
BonusStack.prototype.apply = function(property, value)
{
    switch (property) {
        case 'radius':
            this.target.setRadius(Avatar.prototype.radius * Math.pow(2, value));
            break;
        case 'velocity':
            this.target.setVelocity(value);
            break;
        case 'inverse':
            this.target.setInverse(value%2 !== 0);
            break;
        case 'invincible':
            this.target.setInvincible(value ? true : false);
            break;
        case 'ghost':
            this.target.setGhost(value ? true : false);
            break;
        case 'printing':
            this.target.printManager[value > 0 ? 'start' : 'stop']();
            break;
        case 'color':
            this.target.setColor(value);
            break;
        default:
            BaseBonusStack.prototype.apply.call(this, property, value);
            break;
    }
};

/**
 * Get default property
 *
 * @param {String} property
 *
 * @return {Number}
 */
BonusStack.prototype.getDefaultProperty = function(property)
{
    switch (property) {
        case 'printing':
            return 1;
        case 'radius':
            return 0;
        case 'color':
            return this.target.player.color;
        default:
            return Avatar.prototype[property];
    }
};

/**
 * Append
 *
 * @param {Object} properties
 * @param {String} property
 * @param {Number} value
 */
BonusStack.prototype.append = function(properties, property, value)
{
    switch (property) {
        case 'directionInLoop':
        case 'angularVelocityBase':
        case 'color':
            properties[property] = value;
            break;

        default:
            BaseBonusStack.prototype.append.call(this, properties, property, value);
            break;
    }
};

/**
 * Game
 *
 * @param {Room} room
 */
function Game(room)
{
    BaseGame.call(this, room);

    this.world        = new World(this.size);
    this.deaths       = new Collection([], 'id');
    this.controller   = new GameController(this);
    this.bonusStack   = new GameBonusStack(this);
    this.roundWinner  = null;
    this.gameWinner   = null;
    this.deathInFrame = false;

    this.onPoint = this.onPoint.bind(this);

    var avatar, i;

    for (i = this.avatars.items.length - 1; i >= 0; i--) {
        avatar = this.avatars.items[i];
        avatar.clear();
        avatar.on('point', this.onPoint);
    }
}

Game.prototype = Object.create(BaseGame.prototype);
Game.prototype.constructor = Game;

/**
 * Update
 *
 * @param {Number} step
 */
Game.prototype.update = function(step)
{
    var score = this.deaths.count(),
        avatar, border, i, borderX, borderY, borderAxis, position, killer;

    this.deathInFrame = false;

    for (i = this.avatars.items.length - 1; i >= 0; i--) {
        avatar = this.avatars.items[i];
        dead   = false;

        if (avatar.alive) {
            avatar.update(step);

            border = this.world.getBoundIntersect(avatar.body, this.borderless || avatar.ghost ? 0 : avatar.radius);

            if (border) {
                if (this.borderless || avatar.ghost) {
                    position = this.world.getOposite(border[0], border[1]);
                    avatar.setPosition(position[0], position[1]);
                } else {
                    this.kill(avatar, null, score);
                }
            } else {
                if (!avatar.invincible) {
                    killer = this.world.getBody(avatar.body);

                    if (killer) {
                        this.kill(avatar, killer, score);
                    }
                }
            }

            if (avatar.alive) {
                avatar.printManager.test();
                this.bonusManager.testCatch(avatar);
            }
        }
    }

    if (this.deathInFrame) {
        this.checkRoundEnd();
    }
};

/**
 * Kill an avatar
 *
 * @param {Avatar} avatar
 * @param {Body|null} killer
 * @param {Number} score
 */
Game.prototype.kill = function(avatar, killer, score) {
    avatar.die(killer);
    avatar.addScore(score);
    this.deaths.add(avatar);
    this.deathInFrame = true;
};

/**
 * Remove a avatar from the game
 *
 * @param {Avatar} avatar
 */
Game.prototype.removeAvatar = function(avatar)
{
    BaseGame.prototype.removeAvatar.call(this, avatar);
    this.emit('player:leave', {player: avatar.player});
    this.checkRoundEnd();
};

/**
 * On avatar add point
 *
 * @param {Object} data
 */
Game.prototype.onPoint = function(data)
{
    if (this.started && this.world.active) {
        this.world.addBody(new AvatarBody(data.x, data.y, data.avatar));
    }
};

/**
 * Is done
 *
 * @return {Boolean}
 */
Game.prototype.isWon = function()
{
    var present = this.getPresentAvatars().count();

    if (present <= 0) { return true; }
    if (this.avatars.count() > 1 && present <= 1) { return true; }

    var maxScore = this.maxScore,
        players = this.avatars.filter(function () { return this.present && this.score >= maxScore; });

    if (players.count() === 0) {
        return null;
    }

    if (players.count() === 1) {
        return players.getFirst();
    }

    this.sortAvatars(players);

    return players.items[0].score === players.items[1].score ? null : players.getFirst();
};

/**
 * Check if the round should end
 */
Game.prototype.checkRoundEnd = function()
{
    if (!this.inRound) {
        return;
    }

    var alive = false;

    for (var i = this.avatars.items.length - 1; i >= 0; i--) {
        if (this.avatars.items[i].alive) {
            if (!alive) {
                alive = true;
            } else {
                return;
            }
        }
    }

    this.endRound();
};

/**
 * Resolve scores
 */
Game.prototype.resolveScores = function()
{
    var winner;

    if (this.avatars.count() === 1) {
        winner = this.avatars.getFirst();
    } else {
        winner = this.avatars.match(function () { return this.alive; });
    }

    if (winner) {
        winner.addScore(Math.max(this.avatars.count() - 1, 1));
        this.roundWinner = winner;
    }

    for (var i = this.avatars.items.length - 1; i >= 0; i--) {
        this.avatars.items[i].resolveScore();
    }
};

/**
 * Clear trails
 */
Game.prototype.clearTrails = function()
{
    this.world.clear();
    this.world.activate();
    this.emit('clear', {game: this});
};

/**
 * Update size
 */
Game.prototype.setSize = function()
{
    BaseGame.prototype.setSize.call(this);

    this.world.clear();
    this.world = new World(this.size);

    this.bonusManager.setSize();
};

/**
 * Check end of round
 */
Game.prototype.onRoundEnd = function()
{
    this.resolveScores();
    this.emit('round:end', {winner: this.roundWinner});
};

/**
 * New round
 */
Game.prototype.onRoundNew = function()
{
    this.emit('round:new', {game: this});
    BaseGame.prototype.onRoundNew.call(this);

    var avatar, position, i;

    this.roundWinner = null;
    this.world.clear();
    this.deaths.clear();
    this.bonusStack.clear();

    var scoreLeader = this.sortAvatars(this.avatars).getFirst().score;
    for (i = this.avatars.items.length - 1; i >= 0; i--) {
        avatar = this.avatars.items[i];
        if (avatar.present) {
            position = this.world.getRandomPosition(avatar.radius, this.spawnMargin);
            avatar.setPosition(position[0], position[1]);
            avatar.setAngle(this.world.getRandomDirection(avatar.x, avatar.y, this.spawnAngleMargin));
            if (scoreLeader !== 0 && avatar.score === scoreLeader) {
                avatar.setBorderColor('#FFD700');
            }
        } else {
            this.deaths.add(avatar);
        }
    }
};

/**
 * On start
 */
Game.prototype.onStart = function()
{
    this.emit('game:start', {game: this});

    for (var avatar, i = this.avatars.items.length - 1; i >= 0; i--) {
        avatar = this.avatars.items[i];
        setTimeout(avatar.printManager.start, 3000);
    }

    this.world.activate();

    BaseGame.prototype.onStart.call(this);
};

/**
 * On stop
 */
Game.prototype.onStop = function()
{
    this.emit('game:stop', {game: this});

    BaseGame.prototype.onStop.call(this);

    var won = this.isWon();

    if (won) {
        if (won instanceof Avatar) {
            this.gameWinner = won;
        }
        this.end();
    } else {
        this.newRound();
    }
};

/**
 * Set borderless
 *
 * @param {Boolean} borderless
 */
Game.prototype.setBorderless = function(borderless)
{
    if (this.borderless !== borderless) {
        BaseGame.prototype.setBorderless.call(this, borderless);
        this.emit('borderless', this.borderless);
    }
};

/**
 * FIN DU GAME
 */
Game.prototype.end = function()
{
    if (BaseGame.prototype.end.call(this)) {
        this.avatars.clear();
        this.world.clear();

        delete this.world;
        delete this.avatars;
        delete this.deaths;
        delete this.bonusManager;
        delete this.controller;
    }
};

/**
 * Game Bonus Stack
 *
 * @param {Game} game
 */
function GameBonusStack(game)
{
    BaseBonusStack.call(this, game);
}

GameBonusStack.prototype = Object.create(BaseBonusStack.prototype);
GameBonusStack.prototype.constructor = GameBonusStack;

/**
 * Add bonus to the stack
 *
 * @param {Bonus} bonus
 */
GameBonusStack.prototype.add = function(bonus)
{
    BaseBonusStack.prototype.add.call(this, bonus);
};

/**
 * Remove bonus from the stack
 *
 * @param {Bonus} bonus
 */
GameBonusStack.prototype.remove = function(bonus)
{
    BaseBonusStack.prototype.remove.call(this, bonus);
};

/**
 * Apply the value to target's property
 *
 * @param {String} property
 * @param {Number} value
 */
GameBonusStack.prototype.apply = function(property, value)
{
    switch (property) {
        case 'borderless':
            this.target.setBorderless(value ? true : false);
            break;
        default:
            BaseBonusStack.prototype.apply.call(this, property, value);
            break;
    }
};

/**
 * Kick vote
 *
 * @param {Player} player
 * @param {Number} total
 */
function KickVote(player, total)
{
    this.id      = player.id;
    this.target  = player;
    this.votes   = new Collection();
    this.total   = parseInt(total, 10);
    this.closed  = false;
    this.result  = false;
    this.timeout = null;

    this.close = this.close.bind(this);
}

KickVote.prototype = Object.create(EventEmitter.prototype);
KickVote.prototype.constructor = KickVote;

/**
 * Time before an empty vote is closed
 *
 * @type {Number}
 */
KickVote.prototype.timeToClose = 10000;

/**
 * Set total
 *
 * @param {Number} total
 */
KickVote.prototype.setTotal = function(total)
{
    if (this.closed) { return this; }

    this.total = total;

    this.check();

    return this;
};

/**
 * Toggle vote
 *
 * @param {Client} client
 */
KickVote.prototype.toggleVote = function(client)
{
    if (this.closed) { return this; }

    if (this.hasVote(client)) {
        this.votes.remove(client);
    } else {
        this.votes.add(client);
    }

    this.check();

    return this;
};

/**
 * Remove client
 *
 * @param {SocketClient} client
 */
KickVote.prototype.removeClient = function(client)
{
    var result = this.votes.remove(client);

    this.check();

    return result;
};

/**
 * Check
 */
KickVote.prototype.check = function()
{
    if (this.closed) { return; }

    if (this.timeout) {
        clearTimeout(this.timeout);
    }

    if (this.votes.count() > this.total/2) {
        this.result = true;
        this.close();
    } else if (this.votes.isEmpty()) {
        this.timeout = setTimeout(this.close, this.timeToClose);
    }
};

/**
 * Close the vote
 */
KickVote.prototype.close = function ()
{
    this.closed = true;
    this.votes.clear();
    this.emit('close', this);
};

/**
 * Has vote
 *
 * @param {SocketClient} client
 *
 * @return {Boolean}
 */
KickVote.prototype.hasVote = function(client)
{
    return this.votes.exists(client);
};

/**
 * Serialize
 *
 * @return {Object}
 */
KickVote.prototype.serialize = function()
{
    return {
        target: this.target.id,
        result: this.result
    };
};

/**
 * Message
 *
 * @param {String} content
 * @param {SocketClient} client
 */
function Message(client, content)
{
    this.client   = client;
    this.content  = content;
    this.creation = new Date();
    this.name     = null;
    this.color    = null;

    this.buildPlayer();
}

/**
 * Message max length
 *
 * @type {Number}
 */
Message.prototype.maxLength = 140;

/**
 * Build player
 */
Message.prototype.buildPlayer = function()
{
    var player = this.client.players.getFirst();

    if (player) {
        this.name  = player.name;
        this.color = player.color;
    }
};

/**
 * Serialize
 *
 * @return {Object}
 */
Message.prototype.serialize = function()
{
    if (this.name === null) {
        this.buildPlayer();
    }

    return {
        client: this.client.id,
        content: this.content,
        creation: this.creation.getTime(),
        name: this.name,
        color: this.color
    };
};

/**
 * Player
 *
 * @param {SocketClient} client
 * @param {String} name
 * @param {String} color
 */
function Player(client, name, color)
{
    BasePlayer.call(this, client, name, color);
}

Player.prototype = Object.create(BasePlayer.prototype);
Player.prototype.constructor = Player;

/**
 * Serialize
 *
 * @return {Object}
 */
Player.prototype.serialize = function()
{
    var data = BasePlayer.prototype.serialize.call(this);

    data.active = this.client.active;

    return data;
};

/**
 * Room
 *
 * @param {String} name
 */
function Room(name)
{
    BaseRoom.call(this, name);

    this.controller = new RoomController(this);
}

Room.prototype = Object.create(BaseRoom.prototype);
Room.prototype.constructor = Room;

/**
 * Close
 */
Room.prototype.close = function()
{
    this.emit('close', {room: this});
};

/**
 * Add player
 *
 * @param {Player} player
 */
Room.prototype.addPlayer = function(player)
{
    var result = BaseRoom.prototype.addPlayer.call(this, player);

    if (result) {
        this.emit('player:join', {room: this, player: player});
    }

    return result;
};


/**
 * Remove player
 *
 * @param {Player} player
 */
Room.prototype.removePlayer = function(player)
{
    var result = BaseRoom.prototype.removePlayer.call(this, player);

    if (result) {
        this.emit('player:leave', {room: this, player: player});
    }

    return result;
};

/**
 * Room Configuration
 *
 * @param {Room} room
 */
function RoomConfig(room)
{
    BaseRoomConfig.call(this, room);
}

RoomConfig.prototype = Object.create(BaseRoomConfig.prototype);
RoomConfig.prototype.constructor = RoomConfig;

/**
 * Bonus types
 *
 * @type {Array}
 */
RoomConfig.prototype.bonusTypes = {
    BonusSelfSmall: BonusSelfSmall,
    BonusSelfSlow: BonusSelfSlow,
    BonusSelfFast: BonusSelfFast,
    BonusSelfMaster: BonusSelfMaster,
    BonusEnemySlow: BonusEnemySlow,
    BonusEnemyFast: BonusEnemyFast,
    BonusEnemyBig: BonusEnemyBig,
    BonusEnemyInverse: BonusEnemyInverse,
    BonusGameBorderless: BonusGameBorderless,
    BonusAllColor: BonusAllColor,
    BonusGameClear: BonusGameClear,
    BonusEnemyStraightAngle: BonusEnemyStraightAngle,
    BonusSelfRandom: BonusSelfRandom,
    BonusLeaderRandom: BonusLeaderRandom,
    BonusEnemyRandom: BonusEnemyRandom,
    BonusLeaderFast: BonusLeaderFast,
    BonusLeaderInverse: BonusLeaderInverse,
    BonusLeaderSlow: BonusLeaderSlow,
    BonusSelfBorderless: BonusSelfBorderless

};

/**
 * Set open
 *
 * @param {Boolean} open
 */
RoomConfig.prototype.setOpen = function(open)
{
    if (this.open !== open) {
        this.open     = open;
        this.password = this.open ? null : this.generatePassword();

        this.emit('room:config:open', {room: this.room, open: this.open});

        return true;
    }

    return false;
};

/**
 * Get available bonuses
 *
 * @return {Array}
 */
RoomConfig.prototype.getBonuses = function()
{
    var bonuses = [];

    for (var bonus in this.bonuses) {
        if (this.bonuses[bonus]) {
            bonuses.push(this.bonusTypes[bonus]);
        }
    }

    return bonuses;
};

/**
 * Trail
 */
function Trail(avatar)
{
    BaseTrail.call(this, avatar);
}

Trail.prototype = Object.create(BaseTrail.prototype);
Trail.prototype.constructor = Trail;

/**
 * Clear
 */
Trail.prototype.clear = function()
{
    BaseTrail.prototype.clear.call(this);
    this.emit('clear', {avatar: this.avatar});
};
/**
 * Room Repository
 */
function RoomRepository()
{
    EventEmitter.call(this);

    this.generator = new RoomNameGenerator();
    this.rooms     = new Collection([], 'name');

    this.onRoomClose = this.onRoomClose.bind(this);

}

RoomRepository.prototype = Object.create(EventEmitter.prototype);
RoomRepository.prototype.constructor = RoomRepository;

/**
 * Create a room
 *
 * @param {String} name
 *
 * @return {Room}
 */
RoomRepository.prototype.create = function(name)
{
    if (typeof(name) === 'undefined' || !name) {
        name = this.getRandomRoomName();
    }

    var room = new Room(name);

    if (!this.rooms.add(room)) { return false; }

    room.on('close', this.onRoomClose);
    this.emit('room:open', {room: room});

    return room;
};

/**
 * Delete a room
 *
 * @param {Room} room
 */
RoomRepository.prototype.remove = function(room)
{
    if (this.rooms.remove(room)) {
        this.emit('room:close', {room: room});

        return true;
    }

    return false;
};

/**
 * Get by name
 *
 * @param {String} name
 *
 * @return {Room}
 */
RoomRepository.prototype.get = function(name)
{
    return this.rooms.getById(name);
};

/**
 * Get all
 *
 * @return {Array}
 */
RoomRepository.prototype.all = function()
{
    return this.rooms.items;
};

/**
 * On room close
 *
 * @param {Object} data
 */
RoomRepository.prototype.onRoomClose = function(data)
{
    this.remove(data.room);
};

/**
 * Get random room name
 *
 * @return {String}
 */
RoomRepository.prototype.getRandomRoomName = function()
{
    var name = this.generator.getName();

    while (this.rooms.ids.indexOf(name) >= 0) {
        name = this.generator.getName();
    }

    return name;
};

/**
 * Chat system
 */
function Chat()
{
    BaseChat.call(this);

    this.floodFilter = new FloodFilter(this.messages);
}

Chat.prototype = Object.create(BaseChat.prototype);
Chat.prototype.constructor = Chat;

/**
 * Is message valid?
 *
 * @param {Message} message
 *
 * @return {Boolean}
 */
Chat.prototype.isValid = function(message)
{
    var length = message.content.length;

    return length > 0 && length <= Message.prototype.maxLength && this.floodFilter.isValid(message);
};

/**
 * FPS Logger
 */
function FPSLogger()
{
    BaseFPSLogger.call(this);
}

FPSLogger.prototype = Object.create(BaseFPSLogger.prototype);
FPSLogger.prototype.constructor = FPSLogger;

/**
 * Chat flood filter
 *
 * @param {Array} messages
 */
function FloodFilter(messages)
{
    this.messages = messages;
}

/**
 * Number of message allowed
 *
 * @type {Number}
 */
FloodFilter.prototype.toleranceTotal = 3;

/**
 * Range of time for tolerance
 *
 * @type {Number}
 */
FloodFilter.prototype.toleranceRange = 2000;

/**
 * Is message valid?
 *
 * @param {Message} message
 *
 * @return {Boolean}
 */
FloodFilter.prototype.isValid = function(message)
{
    var history = this.getClientHistory(message.client.id, new Date().getTime() - this.toleranceRange);

    return history < this.toleranceTotal;
};

/**
 * Get client history
 *
 * @param {Number} id
 * @param {Date} maxDate
 *
 * @return {[type]}
 */
FloodFilter.prototype.getClientHistory = function(id, max)
{
    var history = 0,
        message;

    for (var i = this.messages.length - 1; i >= 0; i--) {
        message = this.messages[i];

        if (message.client.id === id) {
            history++;
        }

        if (message.creation < max) {
            break;
        }
    }

    return history;
};

/**
 * Room Name Generator
 */
function RoomNameGenerator() {}

/**
 * Adjectives
 *
 * @type {Array}
 */
RoomNameGenerator.prototype.adjectives = [
    'awesome',
    'amazing',
    'great',
    'fantastic',
    'super',
    'admirable',
    'famous',
    'fine',
    'gigantic',
    'grand',
    'marvelous',
    'mighty',
    'outstanding',
    'splendid',
    'wonderful',
    'big',
    'super',
    'smashing',
    'sensational'
];

RoomNameGenerator.prototype.nouns = [
    'game',
    'adventure',
    'fun zone',
    'arena',
    'party',
    'tournament',
    'league',
    'gala',
    'gathering',
    'bunch',
    'fight',
    'battle',
    'conflict',
    'encounter',
    'clash',
    'combat',
    'confrontation',
    'challenge'
];

/**
 * Get random name
 *
 * @return {String}
 */
RoomNameGenerator.prototype.getName = function()
{
    return 'The ' + this.getAdjective() + ' ' + this.getNoun();
};

/**
 * Get random adjective
 *
 * @return {String}
 */
RoomNameGenerator.prototype.getAdjective = function ()
{
    return this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
};

/**
 * Get random noun
 *
 * @return {String}
 */
RoomNameGenerator.prototype.getNoun = function ()
{
    return this.nouns[Math.floor(Math.random() * this.nouns.length)];
};

/**
 * Tracker
 *
 * @param {Inspector} inspector
 * @param {String} id
 */
function Tracker (inspector, id)
{
    EventEmitter.call(this);

    this.inspector = inspector;
    this.id        = id;
    this.creation  = new Date().getTime();
    this.uniqId    = md5(this.creation + '-' + this.id);
}

Tracker.prototype = Object.create(EventEmitter.prototype);
Tracker.prototype.constructor = Tracker;

/**
 * Destroy tracker
 *
 * @return {Tracker}
 */
Tracker.prototype.destroy = function()
{
    return this;
};

/**
 * Get duration
 *
 * @return {Number}
 */
Tracker.prototype.getDuration = function()
{
    return new Date().getTime() - this.creation;
};

/**
 * Object version of the tracker
 *
 * @return {Object}
 */
Tracker.prototype.getValues = function()
{
    return {
        mesuredDuration: this.getDuration(),
        id: this.uniqId
    };
};

/**
 * Get tags
 *
 * @return {Object}
 */
Tracker.prototype.getTags = function()
{
    return {};
};

/**
 * Client tracker
 *
 * @param {Inspector} inspector
 * @param {Client} client
 */
function ClientTracker (inspector, client)
{
    Tracker.call(this, inspector, client.id);

    this.client = client;
    this.ip     = client.ip;

    this.onLatency = this.onLatency.bind(this);

    this.client.pingLogger.on('latency', this.onLatency);
}

ClientTracker.prototype = Object.create(Tracker.prototype);
ClientTracker.prototype.constructor = ClientTracker;

/**
 * On latency
 *
 * @param {Number} latency
 */
ClientTracker.prototype.onLatency = function(latency)
{
    this.emit('latency', {tracker: this, latency: latency});
};

/**
 * @inheritDoc
 */
ClientTracker.prototype.getValues = function()
{
    var data = Tracker.prototype.getValues.call(this);

    data.ip = md5(this.ip);

    return data;
};

/**
 * Game tracker
 *
 * @param {Inspector} inspector
 * @param {Game} game
 */
function GameTracker (inspector, game)
{
    Tracker.call(this, inspector, game.name);

    this.game        = game;
    this.size        = this.game.avatars.count();
    this.rounds      = 0;
    this.finished    = false;
    this.fpsInterval = null;

    this.onRound = this.onRound.bind(this);
    this.onStart = this.onStart.bind(this);
    this.onStop  = this.onStop.bind(this);
    this.onEnd   = this.onEnd.bind(this);
    this.sendFPS = this.sendFPS.bind(this);

    this.game.on('round:new', this.onRound);
    this.game.on('game:start', this.onStart);
    this.game.on('game:stop', this.onStop);
    this.game.on('end', this.onEnd);
}

GameTracker.prototype = Object.create(Tracker.prototype);
GameTracker.prototype.constructor = GameTracker;

/**
 * FPS log frequency
 *
 * @type {Number}
 */
GameTracker.prototype.fpsFrequency = 1000;

/**
 * On round
 */
GameTracker.prototype.onRound = function()
{
    this.rounds++;
};

/**
 * On round
 */
GameTracker.prototype.onEnd = function()
{
    this.finished = this.game.gameWinner !== null;
};

/**
 * On start
 */
GameTracker.prototype.onStart = function()
{
    if (!this.fpsInterval) {
        this.fpsInterval = setInterval(this.sendFPS, this.fpsFrequency);
    }
};

/**
 * On start
 */
GameTracker.prototype.onStop = function()
{
    if (this.fpsInterval) {
        clearInterval(this.fpsInterval);
        this.fpsInterval = null;
    }
};

/**
 * On round
 */
GameTracker.prototype.sendFPS = function()
{
    if (this.game.fps.frequency) {
        this.emit('fps', { tracker: this, fps: this.game.fps.frequency });
    }
};

/**
 * @inheritDoc
 */
GameTracker.prototype.destroy = function()
{
    this.onStop();

    this.game.removeListener('end', this.onEnd);
    this.game.removeListener('round:new', this.onRound);

    return Tracker.prototype.destroy.call(this);
};

/**
 * @inheritDoc
 */
GameTracker.prototype.getValues = function()
{
    var data = Tracker.prototype.getValues.call(this);

    data.size     = this.size;
    data.rounds   = this.rounds;
    data.finished = this.finished;

    return data;
};

/**
 * Room tracker
 *
 * @param {Inspector} inspector
 * @param {Room} room
 */
function RoomTracker (inspector, room)
{
    Tracker.call(this, inspector, room.name);

    this.room  = room;
    this.games = 0;

    this.onGame = this.onGame.bind(this);

    this.room.on('game:new', this.onGame);
}

RoomTracker.prototype = Object.create(Tracker.prototype);
RoomTracker.prototype.constructor = RoomTracker;

/**
 * On game
 */
RoomTracker.prototype.onGame = function()
{
    this.games++;
};
/**
 * @inheritDoc
 */
RoomTracker.prototype.destroy = function()
{
    this.room.removeListener('game:new', this.onGame);

    return Tracker.prototype.destroy.call(this);
};

/**
 * @inheritDoc
 */
RoomTracker.prototype.getValues = function()
{
    var data = Tracker.prototype.getValues.call(this);

    data.games = this.games;

    return data;
};

/**
 * Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function Bonus(x, y)
{
    BaseBonus.call(this, x, y);

    this.body    = new Body(this.x, this.y, this.radius, this);
    this.target  = null;
    this.timeout = null;
}

Bonus.prototype = Object.create(BaseBonus.prototype);
Bonus.prototype.constructor = Bonus;

/**
 * Apply bonus callback
 */
Bonus.prototype.applyTo = function(avatar, game)
{
    this.target = this.getTarget(avatar, game);

    if (this.duration) {
        this.timeout = setTimeout(this.off, this.duration);
    }

    this.on();
};

/**
 * All Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusAll(x, y)
{
    Bonus.call(this, x, y);

    this.off = this.off.bind(this);
}

BonusAll.prototype = Object.create(Bonus.prototype);
BonusAll.prototype.constructor = BonusAll;

/**
 * Affect all
 *
 * @type {String}
 */
BonusAll.prototype.affect = 'all';

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusAll.prototype.getTarget = function(avatar, game)
{
    return game.avatars.filter(function () { return this.alive; }).items;
};

/**
 * Apply on
 */
BonusAll.prototype.on = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.add(this);
    }
};

/**
 * Apply on
 */
BonusAll.prototype.off = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.remove(this);
    }
};

/**
 * Big All Color
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusAllColor(x, y)
{
    BonusAll.call(this, x, y);

    this.getColor = this.getColor.bind(this);
}

BonusAllColor.prototype = Object.create(BonusAll.prototype);
BonusAllColor.prototype.constructor = BonusAllColor;

/**
 * Duration
 *
 * @type {Number}
 */
BonusAllColor.prototype.duration = 7500;

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusAllColor.prototype.getTarget = function(avatar, game)
{
    var targets = BonusAll.prototype.getTarget.call(this, avatar, game);

    this.avatars = new Array(targets.length);
    this.colors  = new Array(targets.length);

    for (var i = targets.length - 1; i >= 0; i--) {
        this.avatars[i] = targets[i].id;
        this.colors[i]  = targets[i].color;
    }

    return targets;
};

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusAllColor.prototype.getEffects = function(avatar)
{
    return [['color', this.getColor(avatar)]];
};

/**
 * Get color
 *
 * @param {Avatar} avatar
 *
 * @return {String}
 */
BonusAllColor.prototype.getColor = function(avatar)
{
    var index = this.avatars.indexOf(avatar.id);

    return this.colors[(index + 1) % this.colors.length];
};

/**
 * Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemy(x, y)
{
    Bonus.call(this, x, y);

    this.off = this.off.bind(this);
}

BonusEnemy.prototype = Object.create(Bonus.prototype);
BonusEnemy.prototype.constructor = BonusEnemy;

/**
 * Affect enemy
 *
 * @type {String}
 */
BonusEnemy.prototype.affect = 'enemy';

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusEnemy.prototype.getTarget = function(avatar, game)
{
    return game.avatars.filter(function () { return this.alive && !this.equal(avatar); }).items;
};

/**
 * Apply on
 */
BonusEnemy.prototype.on = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.add(this);
    }
};

/**
 * Apply on
 */
BonusEnemy.prototype.off = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.remove(this);
    }
};

/**
 * Big Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemyBig(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemyBig.prototype = Object.create(BonusEnemy.prototype);
BonusEnemyBig.prototype.constructor = BonusEnemyBig;

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyBig.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemyBig.prototype.getEffects = function(avatar)
{
    return [['radius', 1]];
};

/**
 * Fast Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemyFast(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemyFast.prototype = Object.create(BonusEnemy.prototype);
BonusEnemyFast.prototype.constructor = BonusEnemyFast;

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyFast.prototype.duration = 6000;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemyFast.prototype.getEffects = function(avatar)
{
    return [['velocity', 0.75 * BaseAvatar.prototype.velocity]];
};

/**
 * Inverse Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemyInverse(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemyInverse.prototype = Object.create(BonusEnemy.prototype);
BonusEnemyInverse.prototype.constructor = BonusEnemyInverse;

/**
 * Probability
 *
 * @type {Number}
 */
BonusEnemyInverse.prototype.probability = 0.8;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemyInverse.prototype.getEffects = function(avatar)
{
    return [['inverse', 1]];
};

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusEnemyInverse.prototype.getProbability = function (game)
{
    return BonusEnemyInverse.prototype.probability;
};

/**
 * Random Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemyRandom(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemyRandom.prototype = Object.create(BonusEnemy.prototype);
BonusEnemyRandom.prototype.constructor = BonusEnemyRandom;

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyRandom.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemyRandom.prototype.getEffects = function(avatar)
{
    return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
};

/**
 * Slow Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemySlow(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemySlow.prototype = Object.create(BonusEnemy.prototype);
BonusEnemySlow.prototype.constructor = BonusEnemySlow;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemySlow.prototype.getEffects = function(avatar)
{
    return [['velocity', -BaseAvatar.prototype.velocity/2]];
};

/**
 * Inverse Enemy Straight Angle
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemyStraightAngle(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemyStraightAngle.prototype = Object.create(BonusEnemy.prototype);
BonusEnemyStraightAngle.prototype.constructor = BonusEnemyStraightAngle;

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyStraightAngle.prototype.duration = 5000;

/**
 * Probability
 *
 * @type {Number}
 */
BonusEnemyStraightAngle.prototype.probability = 0.6;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemyStraightAngle.prototype.getEffects = function(avatar)
{
    return [
        ['directionInLoop', false],
        ['angularVelocityBase', Math.PI/2]
    ];
};

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusEnemyStraightAngle.prototype.getProbability = function (game)
{
    return BonusEnemyStraightAngle.prototype.probability;
};

/**
 * Game Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusGame(x, y)
{
    Bonus.call(this, x, y);

    this.off = this.off.bind(this);
}

BonusGame.prototype = Object.create(Bonus.prototype);
BonusGame.prototype.constructor = BonusGame;

/**
 * Affect game
 *
 * @type {String}
 */
BonusGame.prototype.affect = 'game';

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusGame.prototype.getTarget = function(avatar, game)
{
    return game;
};

/**
 * Apply on
 */
BonusGame.prototype.on = function()
{
    if (this.target) {
        this.target.bonusStack.add(this);
    }
};

/**
 * Apply on
 */
BonusGame.prototype.off = function()
{
    if (this.target) {
        this.target.bonusStack.remove(this);
    }
};

/**
 * Borderless Game Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusGameBorderless(x, y)
{
    BonusGame.call(this, x, y);
}

BonusGameBorderless.prototype = Object.create(BonusGame.prototype);
BonusGameBorderless.prototype.constructor = BonusGameBorderless;

/**
 * Duration
 *
 * @type {Number}
 */
BonusGameBorderless.prototype.duration = 10000;

/**
 * Probability
 *
 * @type {Number}
 */
BonusGameBorderless.prototype.probability = 0.8;

/**
 * Get effects
 *
 * @param {Game} game
 *
 * @return {Array}
 */
BonusGameBorderless.prototype.getEffects = function(game)
{
    return [
        ['borderless', true]
    ];
};

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusGameBorderless.prototype.getProbability = function (game)
{
    return BonusGameBorderless.prototype.probability;
};

/**
 * Master Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusGameClear(x, y)
{
    BonusGame.call(this, x, y);
}

BonusGameClear.prototype = Object.create(BonusGame.prototype);
BonusGameClear.prototype.constructor = BonusGameClear;

/**
 * Duration
 *
 * @type {Number}
 */
BonusGameClear.prototype.duration = 0;

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusGameClear.prototype.getProbability = function (game)
{
    var ratio = 1 - game.getAliveAvatars().count() / game.getPresentAvatars().count();

    return Math.round(ratio * 10) / 10;
};

/**
 * Apply on
 */
BonusGameClear.prototype.on = function()
{
    this.target.clearTrails();
};

/**
 * Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeader(x, y)
{
    Bonus.call(this, x, y);

    this.off = this.off.bind(this);
}

BonusLeader.prototype = Object.create(Bonus.prototype);
BonusLeader.prototype.constructor = BonusLeader;

/**
 * Affect leader
 *
 * @type {String}
 */
BonusLeader.prototype.affect = 'leader';

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusLeader.prototype.getTarget = function(avatar, game)
{
    var sortAvatars = game.sortAvatars(game.avatars.filter(function () {
        return this.alive && !this.equal(avatar);
    }));
    var leader = sortAvatars.getFirst();
    if (leader !== null) {
        return sortAvatars.filter(function () {
            return this.score === leader.score;
        }).items;
    }
    return [];
};

/**
 * Apply on
 */
BonusLeader.prototype.on = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.add(this);
    }
};

/**
 * Apply on
 */
BonusLeader.prototype.off = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.remove(this);
    }
};

/**
 * Probability
 *
 * @type {Number}
 */
BonusLeader.prototype.probability = 0.5;

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusLeader.prototype.getProbability = function (game)
{
    var leader = game.sortAvatars(game.avatars.filter(function () {
        return this.alive;
    })).getFirst();
    if (leader === null) {
        return 0;
    } else if (leader.score === 0) {
        return 0;
    }
    return BonusLeader.prototype.probability;
};
/**
 * Fast Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderFast(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderFast.prototype = Object.create(BonusLeader.prototype);
BonusLeaderFast.prototype.constructor = BonusLeaderFast;

/**
 * Duration
 *
 * @type {Number}
 */
BonusLeaderFast.prototype.duration = 6000;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderFast.prototype.getEffects = function(avatar)
{
    return [['velocity', 0.75 * BaseAvatar.prototype.velocity]];
};

/**
 * Inverse Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderInverse(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderInverse.prototype = Object.create(BonusLeader.prototype);
BonusLeaderInverse.prototype.constructor = BonusLeaderInverse;

/**
 * Probability
 *
 * @type {Number}
 */
BonusLeaderInverse.prototype.probability = 0.8;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderInverse.prototype.getEffects = function(avatar)
{
    return [['inverse', 1]];
};

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusLeaderInverse.prototype.getProbability = function (game)
{
    return BonusLeader.prototype.probability * BonusLeaderInverse.prototype.probability;
};

/**
 * Random Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderRandom(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderRandom.prototype = Object.create(BonusLeader.prototype);
BonusLeaderRandom.prototype.constructor = BonusLeaderRandom;

/**
 * Duration
 *
 * @type {Number}
 */
BonusLeaderRandom.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderRandom.prototype.getEffects = function(avatar)
{
    return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
};

/**
 * Slow Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderSlow(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderSlow.prototype = Object.create(BonusLeader.prototype);
BonusLeaderSlow.prototype.constructor = BonusLeaderSlow;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderSlow.prototype.getEffects = function(avatar)
{
    return [['velocity', -BaseAvatar.prototype.velocity/2]];
};

/**
 * Self Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelf(x, y)
{
    Bonus.call(this, x, y);

    this.off = this.off.bind(this);
}

BonusSelf.prototype = Object.create(Bonus.prototype);
BonusSelf.prototype.constructor = BonusSelf;

/**
 * Affect self
 *
 * @type {String}
 */
BonusSelf.prototype.affect = 'self';

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusSelf.prototype.getTarget = function(avatar, game)
{
    return avatar.alive ? avatar : null;
};

/**
 * Apply on
 */
BonusSelf.prototype.on = function()
{
    if (this.target) {
        this.target.bonusStack.add(this);
    }
};

/**
 * Apply on
 */
BonusSelf.prototype.off = function()
{
    if (this.target) {
        this.target.bonusStack.remove(this);
    }
};

/**
 * Ghost Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfBorderless(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfBorderless.prototype = Object.create(BonusSelf.prototype);
BonusSelfBorderless.prototype.constructor = BonusSelfBorderless;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfBorderless.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfBorderless.prototype.getEffects = function(avatar)
{
    return [
        ['ghost', true]
    ];
};

/**
 * Fast Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfFast(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfFast.prototype = Object.create(BonusSelf.prototype);
BonusSelfFast.prototype.constructor = BonusSelfFast;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfFast.prototype.duration = 4000;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfFast.prototype.getEffects = function(avatar)
{
    return [['velocity', 0.75 * BaseAvatar.prototype.velocity]];
};

/**
 * Godzilla Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfGodzilla(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfGodzilla.prototype = Object.create(BonusSelf.prototype);
BonusSelfGodzilla.prototype.constructor = BonusSelfGodzilla;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfGodzilla.prototype.getEffects = function(avatar)
{
    return [
        ['invincible', true],
        ['printing', 100],
        ['radius', 10],
        ['velocity', 6]
    ];
};

/**
 * Master Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfMaster(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfMaster.prototype = Object.create(BonusSelf.prototype);
BonusSelfMaster.prototype.constructor = BonusSelfMaster;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfMaster.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfMaster.prototype.getEffects = function(avatar)
{
    return [
        ['invincible', true],
        ['printing', -1]
    ];
};

/**
 * Random Self Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfRandom(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfRandom.prototype = Object.create(BonusSelf.prototype);
BonusSelfRandom.prototype.constructor = BonusSelfRandom;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfRandom.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfRandom.prototype.getEffects = function(avatar)
{
    return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
};

/**
 * Slow Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfSlow(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfSlow.prototype = Object.create(BonusSelf.prototype);
BonusSelfSlow.prototype.constructor = BonusSelfSlow;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfSlow.prototype.getEffects = function(avatar)
{
    return [['velocity', -BaseAvatar.prototype.velocity/2]];
};

/**
 * Small Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfSmall(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfSmall.prototype = Object.create(BonusSelf.prototype);
BonusSelfSmall.prototype.constructor = BonusSelfSmall;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfSmall.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfSmall.prototype.getEffects = function(avatar)
{
    return [['radius', -1]];
};

var config,
    packageInfo = require('../package.json');

try {
    config = require('../config.json');
} catch (error) {
    config = {
        port: 8080,
        inspector: { enabled: false }
    };
}

var server = new Server({ port: config.port });

if (config.inspector.enabled) {
    try {
      new Inspector(server, config.inspector);
    } catch (error) {
        console.error('Inspector error:', error);
    }
}

module.exports = server;
