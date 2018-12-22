var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var consts = require('../../../consts/consts');
var aiBase = require('./aiBase');
var timer = require('../../../util/timerGame');
var util = require('util');
var Event = require('../../../consts/consts').MajhongEvent;

var Brain = function(player) {

    aiBase.call(this, player);

    this.bindEvents();

    this.start();
};

util.inherits(Brain, aiBase);
module.exports = Brain;

var pro = Brain.prototype;

pro.bindEvents = function() {
    this.Events.push(Event.mjNotifyPlayerOP);
    this.Events.push(Event.mjGameResult);
    this.Events.push(Event.mjNotifyDelCards);
    this.Events.push(Event.mjHaiDiPai);
    this.Events.push(Event.mjDissolutionTable);
    this.Events.push(Event.mjSendHandCards);
};

pro.update = function() {
    //logger.debug("我是机器人:" + this.Robot.userName + "桌子ID：" + this.Table.Index);
};

pro.start = function() {
    logger.debug("机器人启动");
    //this.Timer.run();//暂时不需要Update操作
    this.robot["ip"] = "192.168.1.10";

    /*****************具体游戏逻辑start*************************/
    this.on('mjNotifyPlayerOP', function(msg){

    });
    this.on('mjGameResult', function(msg){
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["readyStatus"] = 1;
        setTimeout(function(){
            this.Table.Message.mjReadyStatus(msg1);
        }.bind(this), this.getRandomNum(5, 8) * 1000);
    });
    this.on('mjHaiDiPai', function(msg){
    });

    //模拟打牌 {"msg":{"type":"T","value":3},"uid":100000},
    this.on('mjSendHandCards', function(msg){
        logger.debug("AI收到发牌通知:%j", msg);
        var delcard = {};
        delcard["uid"] = this.Robot.uid;

        var uPai = {};
        var pai = this.Table.PlayerUids[this.Robot.uid].parsePai();
        if (pai.length > 0){
            uPai = this.Table.PlayerUids[this.Robot.uid].transfomAutoPai();
        }
        if (uPai == {}){
            logger.debug("牌分析错误");
            return false;
        }
        delcard["pai"] = uPai;
        logger.debug("AI 打牌:%j", delcard);
        setTimeout(function(){
            this.Table.updatePlayerDelCard(delcard);
        }.bind(this), this.getRandomNum(3, 5) * 1000);

    });
    this.on('mjDissolutionTable', function(msg){

        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["status"] = 2;
        setTimeout(function(){
            this.Table.dissolutionTable(msg1);
        }.bind(this), this.getRandomNum(3, 5) * 1000);
    });

    //主动请求加入桌子
    this.Table.addRobotEnter(this);

    this.emitter.emit("mjGameResult","1");
};

/*****************具体游戏逻辑end*************************/
module.exports.clone = function(opts) {
    return new Brain(opts.player);
};

module.exports.name = 'aiShiSanShui';
