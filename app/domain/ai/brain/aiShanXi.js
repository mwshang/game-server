var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var consts = require('../../../consts/consts');
var aiBase = require('./aiBase');
var timer = require('../../../util/timerGame');
var util = require('util');
var Event = require('../../../consts/consts').MajhongEvent;

var Brain = function(player) {

    logger.debug("绑定托管:"+player.uid);
    aiBase.call(this, player);

    this.bindEvents();
    if(!player.isAuto)
      this.start();

    this.timeOut=undefined;
    this.delCardsTimeOut= undefined;
    this.notifyPlayerOPTimeOut =undefined;
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
pro.close= function(){
    logger.debug("清理机器人关闭:"+this.Robot.uid);
    clearTimeout(this.timeOut);
    clearTimeout(this.delCardsTimeOut);
    clearTimeout(this.notifyPlayerOPTimeOut);
}
pro.start = function() {
    logger.debug("机器人启动:"+this.Robot.uid);
    //this.Timer.run();//暂时不需要Update操作
    if(!this.robot["ip"])
      this.robot["ip"] = "192.168.1.10";

    /*****************具体游戏逻辑start*************************/
    this.on('mjNotifyPlayerOP', function(msg){
        //{"opType":"chi", opCard:{type:"B", value:"1"} ,"index":index};
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["opType"] = "guo";
        msg1["opCard"] = {};
        clearTimeout(this.notifyPlayerOPTimeOut);
        this.notifyPlayerOPTimeOut = setTimeout(function(){
            this.Table.updatePlayerOp(msg1);
        }.bind(this),  10);

    });
    this.on('mjGameResult', function(msg){

        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["readyStatus"] = 1;
        clearTimeout(this.timeOut);
        if(this.Robot.isAuto)
        {
            this.timeOut=setTimeout(function(){
                this.Table.Message.mjReadyStatus(msg1);
            }.bind(this), 10 * 1000);
        }
        else
        {
            this.timeOut=setTimeout(function(){
                this.Table.Message.mjReadyStatus(msg1);
            }.bind(this),  100);
        }

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

        if (msg.uid == undefined){
            return;
        }
        if (msg.uid != this.Robot.uid){
            return;
        }
        logger.debug("AI收到打牌通知:%j", msg);
        var delcard = {};
        delcard["uid"] = this.Robot.uid;
        var pai = this.Table.PlayerUids[this.Robot.uid].getOnePai();
        delcard["opCard"] = pai;
        logger.debug("AI 打牌:%j", delcard);
        clearTimeout(this.delCardsTimeOut);
        this.delCardsTimeOut=setTimeout(function(){
            logger.debug("AI 延迟打牌:%j", delcard);
            this.Table.updatePlayerDelCard(delcard);
        }.bind(this), 300);
    });
    this.on('mjDissolutionTable', function(msg){
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["status"] = 2;

        setTimeout(function(){
            this.Table.dissolutionTable(msg1);
        }.bind(this), this.getRandomNum(3, 5) * 1000);
    });

    //clearTimeout(this.timeOut);
    //做托管
    //主动请求加入桌子
    if(this.Robot.isAuto)
    {
        logger.debug("Ai 当前打牌玩家："+this.Table.nextChuPai);
        var msg=this.Table.getAIOp(this.Robot.uid);

        if(msg["currOp"]["isOp"]==1)
        {
            var msg1 = {};
            msg1["uid"] = this.Robot.uid;
            msg1["opType"] = "guo";
            msg1["opCard"] = {};
            this.Table.updatePlayerOp(msg1);
        }

        if(msg.nextChuPai == this.Robot.uid)
        {
            //logger.debug("出牌")
            var delcard = {};
            delcard["uid"] = this.Robot.uid;
            var pai = this.Table.PlayerUids[this.Robot.uid].getOnePai();
            delcard["opCard"] = pai;
            logger.debug("AI 打牌:%j", delcard);
            this.Table.updatePlayerDelCard(delcard);
        }
        var msg1 = {};
        msg1["uid"] = this.Robot.uid;
        msg1["readyStatus"] = 1;
        this.Table.Message.mjReadyStatus(msg1);
    }
    else{
        this.Table.addRobotEnter(this);
    }

    this.emitter.emit("mjGameResult","1");
};

/*****************具体游戏逻辑end*************************/
module.exports.clone = function(opts) {
    return new Brain(opts.player);
};

module.exports.name = 'aiShanXi';
