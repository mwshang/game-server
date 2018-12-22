
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var AttriChangeType = require('../../consts/consts').AttriChangeType;
var activeDao = require('../../dao/activeDao');
var active = module.exports;

/*
* */
active.getActiveData = function()
{
    var data = dataApi.everyLogin.all();
    //logger.debug("当前每日登陆信息:%j" ,data);
    return data;
};

active.getTodayReward = function(today)
{
    var data = dataApi.everyLogin.findById(today);
    return data.continuityReward;
};

/*通知客户端当前玩家vip 每日登陆信息
* */
active.sendEveryLogin = function(player)
{
    if (player == null || !player["active"] || !player.uid){
        logger.error("获取活动参数错误:%j", player);
        return false;
    }
    activeDao.getActiveByUid(player.uid, function(err, active){
        if(!!err || !active){
            logger.error("没有找到活动相关信息:" + player.uid);
            return false;
        }else{
            player["active"] = active;
            logger.debug("活动信息：%j", active);
            messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallDayLoginMsg,
                {"activeData":player["active"]});
            return true;
        }
    }.bind(this));
};

/*设置每日叠加登陆信息 例如 每日登陆
 * */
active.setEveryLogin = function(msg)
{
    //领取奖励
    this.useEveryLogin(msg);
};

/*请求每日登陆奖励
 * */
active.useEveryLogin = function(msg)
{
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null && !!player["active"])
    {
        //说明已经领取过了
        if (player["active"].dayLogin == 1)
        {
            logger.error("已经领过每日登陆奖励");
            return false;
        }
        //更新属性
        player["active"].loginTimes += 1;
        if (player["active"].loginTimes <= 0){
            player["active"].loginTimes = 1;
        }
        if (player["active"].loginTimes > 7){
            player["active"].loginTimes = 7;
        }

        var coin = this.getTodayReward(player["active"].loginTimes);
        logger.debug("当前玩家连续登陆天数:" + player["active"].loginTimes);

        //更新玩家属性变化
        player["active"].dayLogin = 1;
        player["coinNum"] += coin;
        player.save();
        player.updateActive();

        //通知客户端属性变化 [{uid: record.uid, sid: record.sid}]
        messageService.pushMessageToPlayer({uid:msg.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],"type":AttriChangeType.attrContinueLogin});
        return true;
    }

    return false;
};

/*
 type:1 2 3...
 每日分享:1 dayShareFriend
 邀请新好友进游戏输入邀请人的UID:2 dayReqFriend
 大转盘:3 dayBigWheel
 * */
active.activeFangka = function(player,msg)
{
    logger.debug("活动房卡操作:%j", player["active"]);
    if (msg.type == 1 && player["active"].dayShareFriend == 1){
        logger.error("已经领过每日分享奖励1");
        return false;
    }
    //更新属性
    if (msg.type == 1){
        player["active"].dayShareFriend = 1;
    }

    var cfg= pomelo.app.get("hall").activeCfg;
    logger.debug("分享奖励家配置%j",cfg);
    var fangKaNum = 3;
    if(!!cfg)
    {
        fangKaNum = cfg.shareLink;
    }
    player.updateRewardFangka(fangKaNum);
    player.updateActive();

    messageService.pushMessageToPlayer({uid:msg.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr,
        {"gemNum":player["gemNum"],"type":AttriChangeType.attrContinueLogin});


    return true;
};

/**
 *
 * @param msg
 * @param res
 */
active.everyDayGoldReward = function (msg) {
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null || !player["active"]) {
        logger.error('没有找到活动相关信息');
        return false;
    }

    if (player['active'].dayGold == 1) {
        logger.error('今日奖励已领取');
        return false;
    }

    //更新玩家属性变化
    player["active"].dayGold = 1;
    player.updateGoldNum(1000);
    player.updateActive();

    //通知客户端属性变化 [{uid: record.uid, sid: record.sid}]
    messageService.pushMessageToPlayer({uid:msg.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"goldNum":player["goldNum"],"type":AttriChangeType.attrContinueLogin});
    messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallDayLoginMsg, {"activeData":player["active"]});
    return true;
}

active.resetActive = function()
{
    logger.debug("重重每日活动信息1");
    var players = pomelo.app.get("hall").Players;
    for(var uid in players){
        var player = players[uid];
        player["active"].dayShareFriend = 0;
        player["active"].dayGold = 0;
        player["active"].dayLogin = 0;
    }
    logger.debug("重重每日活动信息2");
    activeDao.resetEveryDay(null,function(){

    });
    logger.debug("重重每日活动信息3");
    return true;
};