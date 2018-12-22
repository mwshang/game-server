var Code = require('../../../consts/code');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var playerDao = require('../../../dao/playerDao');
var pomelo = require('pomelo');
var MailType = require('../../../consts/consts').MailType;
var Event = require('../../../consts/consts').HALL;
var GameRoomType = require('../../../consts/consts').GameRoomType;
var bagItem = require('../../../domain/hall/bagItem');

/**
 * hall handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

/*广播
msgHandler.talk2broadcast
uid
msg
itemId
* */
Handler.prototype.talk2broadcast = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null)
    {
        next(null, {code: Code.FAIL});
        return;
    }
    //是否有大喇叭
    if (!player.bag || player.bag.isCanChat() == false){
        logger.debug("权限不够无法发言");
        next(null, {code: Code.FAIL});
        return;
    }
    //broadcast
    var broMsg ={};
    broMsg["uid"] = msg.uid;
    broMsg["userName"] = player.userName;
    broMsg["serverId"] = pomelo.app.get('serverId');
    broMsg["type"] = MailType.mailChat;
    broMsg["record"] = msg.msg;
    var channelService = this.app.get('channelService');
    channelService.broadcast('connector' ,Event.hallBroadcastMsg , broMsg, {binded: true}, function(err){
        if(err){
            next(null, {code: Code.FAIL});
            logger.error("talk2broadcast广播大厅消息失败:%j", err);
            return;
        }
    });

    next(null, {code: Code.OK});

    //减少大喇叭次数 通知玩家属性中大喇叭减少1
    bagItem.useBagItem(msg);
};
/*
 uid
 gameId example:com.qp.hall.douniu //com.qp.hall.sangong
 hall.msgHandler.getGameConfig
 * */
Handler.prototype.getGameConfig = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid || !msg.gameId) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null)
    {
        next(null, {code: Code.FAIL});
        return;
    }
    logger.debug("gameId == " + msg.gameId);
    var gameList = null;
    if (msg.gameId == GameRoomType["qpdouniu"]){
        gameList = require('../../../../config/pkdouniu.json')
    }else if (msg.gameId == GameRoomType["qpsangong"]){
        gameList = require('../../../../config/pksangong.json')
    }

    next(null, {code: Code.OK, areaList:gameList});
};

// 将废弃, 把心跳移到connector减少rpc
Handler.prototype.hallHeart = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid ) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null){
        next(null, {code: Code.FAIL});
        return;
    }
    next(null, {code: Code.OK, hallHeart:1});
};

// 查询房间号属于哪个游戏
Handler.prototype.getTableServerType = function(msg, session, next) {
    logger.debug("getTableServerType：", msg.uid, msg.tableId);
    var uid = msg.uid;
    if(!uid ) {
        next(null, {code: Code.FAIL, error: '加入房间失败!'});
        return;
    }
    var serverId = pomelo.app.get("hall").getTableServer(msg.tableId);
    if (serverId == null || serverId == undefined){
        next(null, {code: Code.FAIL, error: '房间号不存在!'});
        return;
    }

    var serverType = serverId.split('-')[0];
    pomelo.app.rpc[serverType].gRemote.getTableConfig(serverId, msg, function (err, cnf) {
        if (!!err) {
            next(null, {code: Code.FAIL, error: err});
            return;
        }
        next(null, {code: Code.OK, serverType: serverType, config: cnf});
    });
};

Handler.prototype.getTaskInfo = function (msg, session, next) {
    var uid = msg.uid;
    if(!uid ) {
        next(null, {code: Code.FAIL, error: '获取失败!'});
        return;
    }

    var hall = pomelo.app.get("hall");
    if (!hall || !hall.task) {
        next(null, {code: Code.FAIL, error: '获取失败!'});
        return;
    }

    hall.task.getTaskInfo(msg, function (err, data) {
        if (!! err || !data) {
            next(null, {code: Code.FAIL, error: '获取失败!'});
            return;
        }
        next(null, {code: Code.OK, data: data});
    });
}