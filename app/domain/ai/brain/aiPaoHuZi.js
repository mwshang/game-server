var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var consts = require('../../../consts/consts');
var aiBase = require('./aiBase');
var timer = require('../../../util/timerGame');
var util = require('util');
var utils = require('../../../util/utils');
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
        //{"opType":"chi", opCard:{type:"B", value:"1"} ,"index":index};
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["opType"] = "guo";
        msg1["opCard"] = {};
        setTimeout(function(){
            this.Table.updatePlayerOp(msg1);
        }.bind(this), this.getRandomNum(1, 2) * 1000);

    });
    this.on('mjGameResult', function(msg){

        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["readyStatus"] = 1;
        setTimeout(function(){
            this.Table.Message.mjReadyStatus(msg1);
        }.bind(this), this.getRandomNum(1, 2) * 1000);
    });
    this.on('mjHaiDiPai', function(msg){

        if (!!msg.pai || msg.pai != undefined){
            return;
        }
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["status"] = 0;
        setTimeout(function(){
            this.Table.updatePlayerHaiDiCard(msg1);
        }.bind(this), 1000);
    });
    //模拟打牌 {"msg":{"type":"T","value":3},"uid":100000},
    this.on('mjNotifyDelCards', function(msg){
        //logger.debug("AI收到打牌通知:%j", msg);
        if (msg.uid == undefined){
            return;
        }
        if (msg.uid != this.Robot.uid){
            return;
        }
        var delcard = {};
        delcard["uid"] = this.Robot.uid;
        var pais = this.Table.PlayerUids[this.Robot.uid].paiQi;
        var pai = null;
        if (pais['1'].length > 0 && pais['2'].length > 0) {
            var pais = pais[utils.random(0, 1) == 0 ? '1':'2'];
            pai = pais[pais.length-1];
        } else if (pais['1'].length > 0) {
            var pais = pais['1'];
            pai = pais[pais.length-1];
        } else {
            var pais = pais['2'];
            pai = pais[pais.length-1];
        }

        delcard["opCard"] = pai.type+pai.value;
        logger.debug("AI 打牌:%j", delcard);
        setTimeout(function(){
            this.Table.updatePlayerDelCard(delcard);
        }.bind(this), this.getRandomNum(1, 2) * 1000);

    });
    this.on('mjDissolutionTable', function(msg){
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["status"] = 2;
        setTimeout(function(){
            this.Table.dissolutionTable(msg1);
        }.bind(this), this.getRandomNum(1, 3) * 1000);
    });

    //主动请求加入桌子
    this.Table.addRobotEnter(this);

    this.emitter.emit("mjGameResult","1");
};

/*****************具体游戏逻辑end*************************/
module.exports.clone = function(opts) {
    return new Brain(opts.player);
};

module.exports.name = 'aiPaoHuZi';
