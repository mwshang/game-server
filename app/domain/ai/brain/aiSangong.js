var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var consts = require('../../../consts/consts');
var aiBase = require('./aiBase');
var timer = require('../../../util/timerGame');
var util = require('util');
var Event = require('../../../consts/consts').SanGongEvent;

var Brain = function(player) {

    aiBase.call(this, player);

    this.bindEvents();

    this.start();
};

util.inherits(Brain, aiBase);
module.exports = Brain;

var pro = Brain.prototype;

pro.bindEvents = function() {
    this.Events.push(Event.sgReadyStart);
    this.Events.push(Event.sgBankerStart);
    this.Events.push(Event.sgChipInStart);
    this.Events.push(Event.sgOpenCardStart);
};

pro.update = function() {
    //logger.debug("我是机器人:" + this.Robot.userName + "桌子ID：" + this.Table.Index);
};

pro.start = function() {
    logger.debug("机器人启动");

    /*****************具体游戏逻辑start*************************/
    this.on('sgReadyStart', function(msg){
        //{"uid": uid , "readyStatus": readyStatus}
        var msg = {};
        msg["uid"] = this.Robot.uid;
        msg["readyStatus"] = 1;

        setTimeout(function(){
            this.Table.Message.sgReadyStatus(msg);
        }.bind(this), this.getRandomNum(1, this.Table.TimeConfig["readyTime"]) * 1000);

    });
    this.on('sgBankerStart', function(msg){
        var msg = {};
        msg["uid"] = this.Robot.uid;
        msg["banker"] = 0;

        setTimeout(function(){
            this.Table.Message.sgBankerStatus(msg);
        }.bind(this), this.getRandomNum(1, this.Table.TimeConfig["bankerTime"]) * 1000);

    });
    this.on('sgChipInStart', function(msg){
        var msg = {};
        var delay = this.getRandomNum(1, 8) * 1000;
        msg["uid"] = this.Robot.uid;
        msg["chipIn"] = this.Table.BaseBet * this.getRandomNum(1, 3);

        logger.debug("延迟发送下注:" + delay);
        setTimeout(function(){
            this.Table.Message.sgChipInStatus(msg);
        }.bind(this), delay);

    });
    this.on('sgOpenCardStart', function(msg){
        var msg = {};
        var delay = this.getRandomNum(3, this.Table.TimeConfig["openCardTime"]) * 1000;
        msg["uid"] = this.Robot.uid;
        msg["score"] = 'G0';
        setTimeout(function(){
            this.Table.Message.sgOpenCardStatus(msg);
        }.bind(this), delay);

    });

    this.Timer.run();

    //主动请求加入桌子
    this.Table.addRobotEnter(this);
};

/*****************具体游戏逻辑end*************************/
module.exports.clone = function(opts) {
    return new Brain(opts.player);
};

module.exports.name = 'aiSangong';
