var playerDao = require('../../../dao/playerDao');
var Code = require('../../../consts/code');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');
var async = require('async');
var active = require('../../../domain/hall/active');
var sync2HallType = require('../../../consts/consts').Sync2HallType;
var messageService = require('../../../services/messageService');
var Event = require('../../../consts/consts').HALL;
var playerGameRecord = require('../../../domain/hall/playerGameRecord');
var QPPlayer = require('../../../domain/entity/player');
var qpgames = require('../../../../config/qpgames.json').games;
var fangKa = require('../../../domain/hall/fangKa');

module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
    this.app = app;
};

var pro = Remote.prototype;

/*
进入消息大厅服务器
* */
pro.enterMsgHall = function(msg, cb)
{
    var self = this;
    var hall = this.app.get('hall');
    if (!!msg.player){
        var player = new QPPlayer(msg.player);
        player["serverId"] = msg.serverId;
        player["ip"] = msg.ip;
        if (!hall.addPlayer(player))
        {
            if (hall.getPlayer(player.uid) == null) { // 对于大厅已经存在的玩家 可以直接利用已有数据继续流程
                cb(null, Code.FAIL, "");
                return;
            } else {
                hall.updatePlayer(player.uid, msg.serverId, msg.ip);
            }
        }

        var _servers = [];
        if (!!msg.gameServerType && msg.gameServerType != "") {
            var servers = this.app.getServersByType(msg.gameServerType);
            if (servers.length > 0) {
                _servers = _servers.concat(servers);
            }
        } else {
            for (var g in qpgames) {
                var serverType = qpgames[g].serverType;
                var servers = this.app.getServersByType(serverType);
                if (servers.length > 0) {
                    _servers = _servers.concat(servers);
                }
            }
        }

        var rpcs = [];
        if (_servers.length > 0) {
            var j = 0;
            for (var i=0; i<_servers.length; i++) {
                rpcs.push(function (cb) {
                    var serverId = _servers[j++].id;
                    var serverType = serverId.split('-')[0];
                    logger.debug("serverId:", serverId, serverType);
                    self.app.rpc[serverType].gRemote.checkGameing(serverId, {"uid": msg.uid}, cb);
                });
            }
        }

        async.parallel(rpcs, function(err, results){
            logger.debug(err, results);

            var gameing = 0;
            var serverId = undefined;
            for (var j=0; j<results.length; j++) {
                if(results[j]==undefined )
                {
                    logger.error("结果有空值：%j",results);
                }

                if (results[j][1].gameing == 1) {
                    gameing = 1;
                    serverId = results[j][1].serverId;
                    break;
                }
            }

            // 登录时如果有创建过比赛场,通知比赛场id
            var arenaId = 0;
            if (hall.arenasByUid[msg.uid] != undefined)
                arenaId = hall.arenasByUid[msg.uid].id;

            var pack = self.app.get('packTableMgr');
            if (pack) {
                logger.debug('enterPackHall');
                pack.enterPackHall(player, gameing);
            }

            //客户端收到此协议才可以算是登陆成功
            messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallLogin,
              {"code":Code.OK, arenaId: arenaId});
            //活动相关信息
            active.sendEveryLogin(player);
            //模拟玩家广播大厅信息 闲来模式专用
            setTimeout(function(){
                hall.sendNotifyMsg(player);
            }.bind(this), 3000);


            logger.debug("新玩家进入游戏大厅,当前大厅人数:" + hall.PlayerNum);
            cb(null, Code.OK, (serverId != undefined ? serverId : ""),gameing);

            //延迟推送玩家是否在游戏中
            setTimeout(function(){
                if(gameing==1)
                    messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallGameIng, {"gameing":gameing, 'serverId': serverId});
               // else if()
            }.bind(this), 100);
        });
    }else{
        logger.error("为啥大厅玩家没有传过来：%j",msg.player );
        cb(null, Code.FAIL, "");
    }
};
/*
离开消息大厅服务器（下线）
* */
pro.leaveMsgHall = function(msg, cb)
{
    var hall = pomelo.app.get('hall');
    if (!hall.removePlayer(msg.uid, msg.isSync))
    {
        utils.invokeCallback(cb);
        logger.error("玩家离开，移除玩家失败");
        return;
    }
    var pack = pomelo.app.get('packTableMgr');
    if (pack) {
        pack.leavePackHall(msg.uid);
    }
    logger.debug("有玩家离开大厅:" + msg.uid);
    utils.invokeCallback(cb);
};

/*
 获得玩家详细信息
 * */
pro.getPlayerFromHall = function(msg, cb)
{
    logger.debug("getPlayerFromHall uid = " +  msg.uid);
    var hall = pomelo.app.get('hall');
    if (hall != null){
        var user = hall.getPlayer(msg.uid,"jsJson");
        //logger.debug("getPlayerFromHall");
        //logger.debug(user);
        if (user != null){
            cb(null, Code.OK, {"player": user});
        }
        else {
            logger.error("getPlayerFromHall error");
            cb(null, Code.FAIL);
        }
    }
};
/*
 更新玩家详细信息
 * */
pro.updatePlayerFromGame = function(msg, cb)
{
    logger.debug("收到更新玩家信息" ,  msg.msg, msg.type);
    var hall = pomelo.app.get('hall');
    var type = msg.type;

    //系统消息
    if (type == sync2HallType.mailMsg){
        //hall.addUserRecord(msg.msg);
    }
    //玩家信息
    else if (type == sync2HallType.playerInfoMsg){
        var user =  hall.getPlayer(msg.msg["uid"]);
        if (!!user){
            user.updatePlayerInfo(msg.msg);
        }
    }
    //房卡消耗
    else if (type == sync2HallType.fangKa){
        var user =  hall.getPlayer(msg.msg["uid"]);
        if (!!user){
            user.updateFangka(msg.msg["fangKa"], true);
            messageService.pushMessageToPlayer({uid:user["uid"], sid : user.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":user.gemNum});
        }
    }
    else if (type == sync2HallType.playedTime){
      var user =  hall.getPlayer(msg.msg["uid"]);
      if (!!user){
        user.updatePlayedTime(msg.msg["times"]);
        messageService.pushMessageToPlayer({uid:user["uid"], sid : user.serverId}, Event.hallUpdatePlayerAttr, {"playedTime":user.playedTime});
      }
    }
    else if (type == sync2HallType.goldNum){
        var user =  hall.getPlayer(msg.msg["uid"]);
        if (!!user){
            user.updateGoldNum(msg.msg["addGold"]);
            messageService.pushMessageToPlayer({uid:user["uid"], sid : user.serverId}, Event.hallUpdatePlayerAttr, {"goldNum":user.goldNum});
        }
    }
    //代开房卡消耗
    else if (type == sync2HallType.fangKaOffline){
        logger.debug("代开扣费3:");
        if (!!msg.uid && !!msg.fangKa){
            fangKa.changeFangKa(msg.uid,msg.fangKa, true);
        }
    }
    //支付相关
//    else if (type == sync2HallType.pingxx){
//        if (shop.buyShopItem(msg.msg) == false)
//        {
//            logger.error("购买失败");
//        }
//    }
    //游戏行为金币下注等记录
//    else if (type == sync2HallType.gameRecord){
//        playerGameRecord.updateGameRecord(msg.msg);
//    }

    cb(null, Code.OK,"");
};

/**
 * 玩家是否拥有足够的钻石
 * @param msg
 * @param cb
 */
pro.checkPlayerEnoughGem = function (msg, cb) {
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    var needNum = parseInt(msg.needNum);
    if (player != null){
        //玩家在线
        logger.debug('checkPlayerEnoughGem', msg.uid,'玩家在线', player.gemNum >= needNum);
        utils.invokeCallback(cb, null, player.gemNum >= needNum);
    }else{
        //玩家不在线 也可能没有这个玩家
        playerDao.getPlayerByUid(msg.uid, function(err, user){
            if (!!err || !user) {
                utils.invokeCallback(cb, '找不到玩家');
                return;
            }
            var givePlayer = user[0];
            logger.debug('checkPlayerEnoughGem', msg.uid,'玩家不在线', givePlayer.gemNum >= needNum);
            utils.invokeCallback(cb, null, givePlayer.gemNum >= needNum);
        }.bind(this));
    }
}
/**
 * 更新系统广播消息
 * @param msg {uid, type=>(10:维护信息设置, 1:代理界面设置, 11:游戏跑马灯设置, 12:循环公告), content, startTime:'2017-1-1: 00:00:00', endTime: '2017-1-1: 00:00:00', intervalTime:(秒)}
 * @param cb
 */
pro.updateMsgHall = function(msg, cb){
    logger.debug('updateMsgHall', msg);
    var type = msg.type;
    var hall = pomelo.app.get('hall');
    if (type && type == 10){
        hall.sendTempNotifyMsg(msg);
    } else if (!type || type == 11) {
        hall.messageInit(msg);
    } else if (type == 12) {
        // 循环公共
        hall.intervalMessageInit(msg);
    }
    cb(null, Code.OK, "");
};

pro.getHallPlayerNum = function(msg, cb)
{
    var hall = pomelo.app.get('hall');

    logger.debug("当前大厅人数:" + hall.PlayerNum);
    cb(null, Code.OK,hall.PlayerNum);

};

pro.updatePlayerHuifang = function(msg, cb){
    logger.debug("updatePlayerHuifang=%j",  msg);
    var self = this;

    var timeValue = msg.time == undefined ? 180 : msg.time;
    var hall = pomelo.app.get('hall');

    var _servers = [];
    for (var g in qpgames) {
        var serverType = qpgames[g].serverType;
        var servers = self.app.getServersByType(serverType);
        if (servers.length > 0) {
            _servers = _servers.concat(servers);
        }
    }

    var rpcs = [];
    if (_servers.length > 0) {
        var j = 0;
        for (var i=0; i<_servers.length; i++) {
            rpcs.push(function (_cb) {
                // logger.debug("serverI:", _servers, serverType, j);
                var serverId = _servers[j++].id;
                var serverType = serverId.split('-')[0];
                logger.debug("serverId:", serverId);
                self.app.rpc[serverType].gRemote.updatePlayerHuifang(serverId,{time:timeValue * 1000}, _cb);
            });
        }
    }

    async.parallel(rpcs, function(err, results){
        logger.debug(err, results);
    });
    cb(null, Code.OK,"");
};

/**
 * 获取一个房间号并分配一个游戏服
 * @param msg
 * @param cb
 */
pro.getRandTableNum = function(msg, cb)
{
    var hall = pomelo.app.get('hall');

    var servers = pomelo.app.getServersByType(msg.gameServerType);
    if (!servers) {
        cb(new Error('can not find servers.'));
        return;
    }

    var tableNum = hall.popTableNum();
    var serverId = servers[msg.uid % servers.length]['id'];
    hall.updateTableServer(tableNum, serverId);

    logger.debug("获取一个房间号并关联到服务器:" + tableNum + ':' + serverId);

    // 根据一局的圈数获取回放号数组
    var huiFangNums = hall.popHuiFangNum(msg.rounds);
    logger.debug(huiFangNums);

    cb(null, Code.OK, {tableNum: tableNum, serverId: serverId, huiFangNums: huiFangNums});
};

/**
 * 查询房间号对应的游戏服
 * @param msg
 * @param cb
 */
pro.getTableServer = function(msg, cb)
{
    var hall = pomelo.app.get('hall');

    var serverId = hall.getTableServer(msg.tableId);
    logger.debug("获取房间号关联的服务器:" + msg.tableId + ':' + serverId);
    cb(null, Code.OK, serverId);
};

/**
 * 房间解散回收房间号
 * @param msg
 * @param cb
 */
pro.recycleTableNum = function (msg, cb) {
    var hall = pomelo.app.get('hall');

    hall.recycleTableNum(msg.tableId);
    logger.debug("回收房间号:" + msg.tableId);
    cb(null, Code.OK);
}