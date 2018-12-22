var pomelo = require('pomelo');
var util =require('util');
var Event = require('../../consts/consts').MajhongEvent;

var MjBaseMessage = function (opts) {
    this.table = opts.table;
};

var pro = MjBaseMessage.prototype;
pro.__defineGetter__("logger", function () {
    return require('pomelo-logger').getLogger.apply(this, [pomelo.app.getServerType() , __filename, this.table.index]);
});

/*
 发送当前桌子所有人
 * */
pro.push2Channel = function (eventType, msg) {
    this.table.App.get('gameService').pushByChannel(eventType, this.table.ChannelName, msg, function (err, res) {
        if (err) {
            this.logger.error("广播玩家信息失败1,ID: %j", eventType);
            this.logger.error(err.stack);
            return false;
        } else {

            return true;
        }
    });

    //airebot
    if (Object.keys(this.table.AiRobotUids).length >= 1) {
        for (var uid in this.table.AiRobotUids) {
            this.table.AiRobotUids[uid].dispather(eventType, msg);
        }
    }
};
/*
 发送给某个人
 * */
pro.push2Player = function (eventType, uid, msg) {
    //logger.debug("push2Player:" + eventType);
    this.table.App.get('gameService').pushByPlayerUid(eventType, uid, msg, function (err, res) {
        if (err) {
            this.logger.error("发送给某人消息失败:" + uid);
            this.logger.error(err.stack);
        }
    });

    if (this.table.PlayerUids[uid].isRobot == true) {
        this.table.AiRobotUids[uid].dispather(eventType, msg);
    }
};
/*
 庄家
 * */
pro.mjBankerResult = function()
{
    var baker = this.table.BankerUid;
    var msg = {"banker":baker, "chairArr":this.table.chairArrBak};
    this.logger.debug("当前桌子庄家:%j", msg);
    this.push2Channel(Event.mjBankerResult,msg);
};
/*
 广播新玩家进入
 * */
pro.mjPlayerEnter = function(e)
{
    var msg = {"user": e};
    this.push2Channel(Event.mjPlayerEnter,msg);
};
/*
 广播新玩家离开
 * */
pro.mjPlayerLeave = function(e)
{
    if(Object.keys(this.table.PlayerUids).length > 0){
        var fangzhu = this.table.FangZhu;
        var msg = {"uid": e,"fangZhu":fangzhu};
        this.push2Channel(Event.mjPlayerLeave,msg);
    }
};
//
pro.mjPlayerOffLine = function(uid, status)
{
    if(Object.keys(this.table.PlayerUids).length > 0){
        var msg = {"uid": uid, "status":status};
        this.push2Channel(Event.mjPlayerOffLine,msg);
    }
};
pro.mjGameStart = function(e)
{
    if(Object.keys(this.table.PlayerUids).length > 0){
        var baker = this.table.BankerUid;
        var msg = {"banker":baker, "chairArr":this.table.chairArrBak,"currRounds": this.table.Data.roundsNum + 1};
        this.push2Channel(Event.mjGameStart,msg);
    }
}
/*
 广播玩家准备状态
 * */
pro.mjReadyStatus = function(e)
{
    var playerUids = this.table.PlayerUids;
    if(!e || !e.uid) {
        this.logger.error("同步准备状态失败UID");
        return false;
    }
    if(!playerUids[e.uid]){
        this.logger.error('同步准备状态失败没有此人信息:%j', e);
        this.logger.error("当前桌子玩家:%j", playerUids);
        return false;
    }
    if (this.table.TableStatus >= 3){
        this.logger.error("游戏过程中不处理准备消息");
        return false;
    }
    playerUids[e.uid].IsReady = 1;
    var msg = {"uid": e.uid , "readyStatus": e.readyStatus};
    if(Object.keys(this.table.PlayerUids).length > 0)
    {
        if (this.push2Channel(Event.mjReadyStatus,msg) == true)
            return true;
    }
    return true;
};
/*
 广播玩家聊天表情等内容原封不动转发即可
 * */
pro.mjChatStatus = function(e)
{
    //{"uid": uid , "chipIn": chipIn}
    var playerUids = this.table.PlayerUids;
    if(!e || !e.uid) {
        this.logger.error("同步聊天失败UID");
        return false;
    }
    if(!playerUids[e.uid]){
        this.logger.error('同步聊天失败没有此人信息:%j', e);
        this.logger.error("当前桌子玩家:%j", playerUids);
        return false;
    }
    //##GETPAI##T1 GM过滤下 content
    if (!!e.data && !!e.data.content && e.data.content.indexOf("##") != -1){
        return false;
    }

    if(Object.keys(this.table.PlayerUids).length > 0)
    {
        if (this.push2Channel(Event.mjChatStatus,e) == true)
            return true;
    }
    return true;
};
/*
 广播玩家聊天内容
 * */
pro.mjThrowStatus = function(e)
{
    //{"uid": uid , "chipIn": chipIn}
    var playerUids = this.table.PlayerUids;
    if(!e || !e.uid) {
        this.logger.error("同步聊天失败UID");
        return false;
    }
    if(!playerUids[e.uid]){
        this.logger.error('同步聊天失败没有此人信息:%j', e);
        this.logger.error("当前桌子玩家:%j", playerUids);
        return false;
    }
    if(Object.keys(this.table.PlayerUids).length > 0)
    {
        if (this.push2Channel(Event.mjThrowStatus,e) == true)
            return true;
    }
    return true;
};
/*
 发送开局的手牌 闲13 庄14
 * */
pro.mjSendHandCards = function(msg, uid)
{
    this.push2Player(Event.mjSendHandCards ,uid, JSON.parse(JSON.stringify(msg)));
};
/*发送给玩家一张牌并同步给其他人*/
pro.mjSendQiPai = function(msg, uid)
{
    //自己摸到具体的牌
    this.push2Player(Event.mjPlayerMoCards ,uid, JSON.parse(JSON.stringify(msg)));

    //其他人看不到具体的牌
    var msgnull = {"uid": uid};
    this.push2Channel(Event.mjSyncPlayerMocards,msgnull );

    //同步牌数量
    this.mjSyncParams();
};

pro.mjSyncParams = function()
{
    //同步牌数量
    var havePai = {"havePai": this.table.Card.leftPaiCount()};
    this.push2Channel(Event.mjSyncParams,havePai);
};

//通知某玩家出牌
pro.mjNotifyDelCards = function(uid)
{
    //this.mjNotifyTingChoice(uid, this.table.getTingChoice(uid));
    //this.table.getTingChoice(uid);
    //this.table.playerUids[uid].getTingChoice();

    this.table.nextChuPai = uid;
    var msgnull = {"uid":uid};
    if (this.table.PlayerUids[uid].noDelPai.length > 0){
        msgnull["noDel"] = this.table.PlayerUids[uid].noDelPai;
    }
    this.logger.debug("通知出牌:"+uid);
    this.push2Channel(Event.mjNotifyDelCards , msgnull);
};
pro.mjNotifyTingChoice = function (uid, tingChoice) {
    var msg = {"uid":uid, "tingChoice": tingChoice};
    if (tingChoice.length > 0)
        this.push2Player(Event.mjNotifyTingChoice, uid, msg);
}
//某玩家打了一张牌 同步给其他人
pro.mjSyncDelCards = function(msg, uid)
{
    var msgnull = {msg:msg, uid:uid};
    this.logger.debug("mjSyncDelCards:%j", msgnull);
    this.push2Channel(Event.mjSyncDelCards,JSON.parse(JSON.stringify(msgnull)) );
};

//通知某玩家可以天胡吃碰杠胡过等操作
pro.mjNotifyPlayerOP = function(msg, uid)
{
    this.logger.debug("通知玩家操作:%j", msg);
    this.push2Player(Event.mjNotifyPlayerOP ,uid, JSON.parse(JSON.stringify(msg)));
};

//同步某玩家可以天胡吃碰杠胡过等操作
pro.mjSyncPlayerOP = function(msg, uid)
{
    var msgnull = {msg:msg, uid:uid};
    this.push2Channel(Event.mjSyncPlayerOP,JSON.parse(JSON.stringify(msgnull)));
};


pro.mjJinPai = function(msg)
{
    this.push2Channel(Event.mjJinPai, msg);
};

//当前牌局结果
pro.mjGameResult = function(msg)
{
    this.push2Channel(Event.mjGameResult, JSON.parse(JSON.stringify(msg)));
};

//牌局总结果
pro.mjGameOver = function(msg)
{
    this.push2Channel(Event.mjGameOver, JSON.parse(JSON.stringify(msg)));
};

pro.mjDissolutionTable = function(msg){
    msg["disArr"] = this.table.dissolutionTableUids;//同意解散人数组
    msg["time"] = 180;
    if (msg.status == 3){
        msg["result"] = 0; //继续游戏了 有人拒绝
    }else{
        if (this.table.dissolutionTableUids.length >= Object.keys(this.table.PlayerUids).length) {
            msg["result"] = 1; //结束成功
        }else{
            msg["result"] = -1;//还处于等待其他玩家选择状态
        }
    }

    this.push2Channel(Event.mjDissolutionTable, msg);
}


//msg 补花的数量当前补了几个 具体换成了哪几个牌 一共几个花牌了
pro.mjSendHuaPai = function(msg,uid)
{
    //自己补花
    this.push2Player(Event.mjHuaPai ,uid, msg);

    //其他人看不到具体补到的花牌
    var msgnull = {"uid": uid,"huaNum":msg.huaNum,"huaPai":msg.huaPai,"paiQiNum":msg.paiQiNum};
    this.push2Channel(Event.mjSyncHuaPai,msgnull );

    //同步牌数量
    this.mjSyncParams();
};
//
pro.mjLocalPosition = function(e)
{
    var playerUids = this.table.PlayerUids;
    if(!e || !e.uid) {
        this.logger.error("同步聊天失败UID");
        return false;
    }
    if(!playerUids[e.uid]){
        this.logger.error('同步导航失败没有此人信息:%j', e);
        return false;
    }

    playerUids[e.uid]["player"]["nav"] = e.nav;
    if(Object.keys(this.table.PlayerUids).length > 0){
        this.push2Channel(Event.mjLocalPosition,e)
    }
};
//扔道具
pro.throwStatus = function(e)
{
    var playerUids = this.table.PlayerUids;
    if(!e || !e.uid) {
        return false;
    }
    if(!playerUids[e.uid]){
        return false;
    }
    if(Object.keys(this.table.PlayerUids).length > 0)
    {
        if (this.push2Channel(Event.mjThrowStatus,e) == true)
            return true;
    }
};
module.exports = MjBaseMessage;