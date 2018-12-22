var logger = require('pomelo-logger').getLogger('douniu-log', __filename);
var consts = require('../../../consts/consts');
var aiBase = require('./aiBase');
var timer = require('../../../util/timerGame');
var util = require('util');
var Event = require('../../../consts/consts').MajhongEvent;
var PKEvent = require('../../../consts/consts').PuKeEVENT;

var Brain = function(player) {

    aiBase.call(this, player);

    this.bindEvents();

    this.start();
};

util.inherits(Brain, aiBase);
module.exports = Brain;

var pro = Brain.prototype;

pro.bindEvents = function() {
    this.Events.push(Event.mjGameStart);
    this.Events.push(PKEvent.pkChipInStart);
    this.Events.push(PKEvent.pkChipInResult);
    this.Events.push(Event.mjSendHandCards);
    this.Events.push(Event.mjGameResult);
    this.Events.push(Event.mjDissolutionTable);
};

pro.update = function() {

};

pro.start = function() {
    logger.debug("机器人启动");
    this.robot["ip"] = "192.168.1.10";

    /*****************具体游戏逻辑start*************************/
    this.on('mjGameStart', function(msg){
        var _msg = {};
        _msg["uid"] = this.Robot.uid;
        _msg["readyStatus"] = 1;
        setTimeout(function(){
            this.Table.Message.mjReadyStatus(_msg);
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    this.on('pkChipInStart', function(msg) {
        logger.debug("AI收到开始下注通知:%j", msg);
        var _msg = {};
        _msg["uid"] = this.Robot.uid;
        _msg["bei"] = msg.bei[0];
        setTimeout(function () {
            if (this.Table.Data.wanFa != 1 && this.Table.bankerUid != this.Robot.uid) { // 牛牛上庄
                this.Table.playerUids[this.Robot.uid].chipInStatus(_msg);
            }
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    this.on('mjGameResult', function(msg){
        var _msg = {};
        _msg["uid"] = this.Robot.uid;
        _msg["readyStatus"] = 1;
        setTimeout(function(){
            this.Table.Message.mjReadyStatus(_msg);
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    this.on('mjSendHandCards', function(msg){
        logger.debug("AI收到发牌通知:%j", msg);
        var _msg = {};
        _msg["uid"] = this.Robot.uid;
        _msg["pai"] = [];
        _msg["bei"] = 0;
        setTimeout(function(){
            if (this.Table.Data.wanFa == 3)
                this.Table.gamblingBanker(_msg);
            else
                this.Table.updatePlayerDelCard(_msg);
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    this.on('pkChipInResult', function(msg){
        logger.debug("AI收到下注完成通知:%j", msg);
        var _msg = {};
        _msg["uid"] = this.Robot.uid;
        _msg["pai"] = [];
        logger.debug("AI 打牌:%j", _msg);
        setTimeout(function(){
            this.Table.updatePlayerDelCard(_msg);
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    this.on('mjDissolutionTable', function(msg){
        var _msg = {};
        _msg["uid"] = this.Robot.uid;
        _msg["status"] = 2;
        setTimeout(function(){
            this.Table.dissolutionTable(_msg);
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    //主动请求加入桌子
    this.Table.addRobotEnter(this);
    this.emitter.emit("mjGameResult","1"); // 触发机器人默认准备
};

/*****************具体游戏逻辑end*************************/
module.exports.clone = function(opts) {
    return new Brain(opts.player);
};

module.exports.name = 'aiDouNiu';
