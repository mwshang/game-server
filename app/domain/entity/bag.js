var util = require('util');
var Persistent = require('./persistent');
var logger = require('pomelo-logger').getLogger('majhong-log', __filename);
var Event = require('../../consts/consts');
/**
 * Initialize a new 'Bag' with the given 'opts'
 * Bag inherits Persistent
 *
 * @param {Object} opts
 * @api public
 */
var Bag = function(opts) {
    Persistent.call(this, opts);
    this.itemCount = opts.itemCount || 20;
    this.items = opts.items || [];
};

util.inherits(Bag, Persistent);

module.exports = Bag;


Bag.prototype.get = function(index) {
    return this.items[index];
};

Bag.prototype.getData = function() {
    var data = {};

    data.uid = this.uid;
    data.itemCount = this.itemCount;

    data.items = [];
    logger.error("this.itemsArray:");
    logger.error(this.items);
    for (var i = 0; i < this.items.length; i++){
        var item = {
            id : this.items[i].id,
            type : this.items[i].type,
            count : this.items[i].count
        };
        logger.error("item:");
        logger.error(item);
        data.items.push(item);
    }

    return data;
};

/**
 * add item
 *
 * @param {obj} item {id: 123, type: 'item', count: 100}
 * @return {number}
 * @api public
 */
Bag.prototype.addItem = function(item) {
    var index = -1;

    //!item.type.match(/item|equipment/)
    if (!item || !item.id || !item.type) {
        return index;
    }

    if (!item.count){
        item.count = 1;
    }

    //查找之前是否有记录 有则叠加
    for (var i = 0; i < this.items.length; i++){
        var p = this.items[i];
        if (p.id == item.id && p.type == item.type) {
            p.count += item.count;
            index = i;
            break;
        }
    }
    //新增
    if (index == -1){
        this.items.push({id: item.id, type: item.type, count:item.count});
        index = this.items.length;
    }

    if (index > 0) {
        this.save();
    }

    return index;
};


/*使用道具*/
Bag.prototype.useItem = function(index) {
    var status = false;
    for (var i = 0; i < this.items.length; i++){
        var p = this.items[i];
        if (p.id == index) {
            this.items[i].count -= 1;
            status = true;
            if (this.items[i].count < 0){
                this.items[i].count = 0;
            }
            this.save();
            break;
        }
    }

    return status;
};

/**
 * remove item
 *
 * @param {number} index
 * @return {Boolean}
 * @api public
 */
Bag.prototype.removeItem = function(index) {
    var status = false;
    for (var i = 0; i < this.items.length; i++){
        var p = this.items[i];
        if (p.id == index) {
            delete this.items[i];
            status = true;
            break;
        }
    }

    return status;
};

//Check out item by id and type
Bag.prototype.checkItem = function(id, type) {
    var result = null;
    for (var i = 0; i < this.items.length; i++){
        var item = this.items[i];
        if (item.id == id && item.type === type) {
            result = i;
            break;
        }
    }

    return result;
};

//是否有聊天道具
Bag.prototype.isCanChat = function() {
    var status = false;

    for (var i = 0; i < this.items.length; i++) {
        var p = this.items[i];
        logger.debug('isCanChat:');
        logger.debug(p);
        if (p.type == Event.ItemType.itemChat) {
            logger.debug("有聊天道具");
            status = true;
            break;
        }
    }

    return status;
};

//Get all the items
Bag.prototype.all = function() {
    return this.items;
};
