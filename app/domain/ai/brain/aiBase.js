var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var consts = require('../../../consts/consts');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var timer = require('../../../util/timerGame');

/*AIBase
* */
var Brain = function(player) {
    //logger.debug("机器人基类初始化");
    // EventEmitter.call(this, player);
    this.emitter = new EventEmitter();  // event object to sub/pub events

    this.events = [];
    this.robot = player;
    this.table = player["table"];

    this.timer = new timer(
        {
            delegate : this,
            interval : 3000
        });
};

// util.inherits(Brain, EventEmitter);

var pro = Brain.prototype;

pro.__defineGetter__("Robot", function() { return this.robot; });
pro.__defineGetter__("Table", function() { return this.table; });
pro.__defineGetter__("Timer", function() { return this.timer; });
pro.__defineGetter__("Events", function() { return this.events; });

pro.update = function() {};
pro.bindEvents = function() {};

pro.start = function() {
    logger.debug("机器人基类启动");
    this.timer.run();
};

pro.close = function() {
    logger.debug("机器人基类离开");
    this.timer.close();
    delete this;
};

pro.containEvent = function(event) {
    for (var i = 0; i < this.events.length; i++){
        if (this.events[i] == event)
            return true;
    }
    return false;
};

pro.dispather = function(eventType ,msg) {
    if (this.containEvent(eventType) == false){
        return;
    }
    this.emitter.emit(eventType, msg);
};

pro.on = function (event, cb) {
    this.emitter.on(event, cb.bind(this));
};

pro.getRandomNum = function(min,max)
{
  var Range = max - min;
  var Rand = Math.random();
  return(min + Math.round(Rand * Range));
};

// module.exports.clone = function(opts) {
//     return new Brain(opts.player);
// };

module.exports = Brain;
