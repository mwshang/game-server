var Code = require('../../../consts/code');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var room = require('../../../domain/wuhan/room');
var pomelo = require('pomelo');
var handlerUtil = require('../../../domain/base/handlerUtil');

/**
* private handler.
*/
module.exports = function(app)
{
    return new Handler(app);
};

var Handler = function(app)
{
    this.app = app;

    if(!this.app)
        logger.error(app);
};

/*
申请创建私人房间 密码可以为空 返回房间ID以及房主UID直接把此人拉进创建成功的桌子内
changsha.changshaPRoomHandler.createPrivateTable
msg.tableName;
msg.uid
banker   0不分庄闲 1分庄闲
niao     2  4  6
rounds   局数 8  16
menQing  0 不带门清 1带门清
* */
Handler.prototype.createPrivateTable = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid || !msg.rounds ) {

        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    logger.debug("玩家创建麻将房间");
    handlerUtil.createPrivateTable(session, self.app, msg, next);
    //logger.debug(session);
    //首先请求Msghall大厅 获得玩家详细数据
    //async.waterfall([
    //    function(cb)
    //    {
    //        // 向大厅请求用户信息
    //        self.app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
    //    }, function(code, user, cb)
    //    {
    //        logger.debug("joinGame user serverId = " + session.get("serverId"));
    //        //logger.debug(user);
    //        //user["player"]["serverId"] = session.get("serverId");
    //        if(code !== Code.OK){
    //            next(null, {code: code, err:Code.MAJHONG.FA_USER_NOT_EXIST});
    //            return;
    //        }
    //        if(!user){
    //            next(null, {code: code, err:Code.MAJHONG.FA_USER_NOT_EXIST});
    //            return;
    //        }
    //        //创建房间并进入房间
    //        var priTable = self.app.get("roomMgr").createPrivateTable(msg,user["player"]);
    //        if (priTable == null || !!priTable.error){
    //            logger.error("创建私人房间失败");
    //            next(null, {code: Code.FAIL, error:priTable !== null ? priTable.error : "创建房间失败,房卡不足"});
    //            return;
    //        }
    //
    //        cb(null, Code.OK);
    //
    //        // // 向大厅请求保存玩家所在游戏服务器id
    //        // self.app.rpc.msghall.msgRemote.addPlayerInGameServer(session, {uid: uid, serverId: self.app.get('serverId')}, cb);
    //    },
    //    function (code, cb) {
    //        //注册当前玩家在玩哪个游戏 后面同步数据用
    //        session.set('backupGameId', "0");
    //        session.set('gameId', self.app.get('serverId'));
    //        session.pushAll(cb);
    //    },
    //    function (code, cb) {
    //        next(null, {code: Code.OK});
    //    }
    //], function(err){
    //    if(err) {
    //        next(err, {code: code, err: Code.FAIL});
    //        return;
    //    }
    //});
};

/*
请求进入房间  协带房间ID
changsha.changshaPRoomHandler.joinPrivateTable
tableId
uid
* */
Handler.prototype.joinPrivateTable = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }

    handlerUtil.joinPrivateTable(session, self.app, msg, next);

    //首先请求Msghall大厅 获得玩家详细数据
    //async.waterfall([
    //    function(cb)
    //    {
    //        // 向大厅请求用户信息
    //        self.app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
    //    }, function(code, user, cb)
    //    {
    //        //user["player"]["serverId"] = session.get("serverId");
    //        if(code !== Code.OK){
    //            next(null, {code: code, err:Code.MAJHONG.FA_USER_NOT_EXIST});
    //            return;
    //        }
    //        if(!user){
    //            next(null, {code: code, err:Code.MAJHONG.FA_USER_NOT_EXIST});
    //            return;
    //        }
    //        var tableInfo = self.app.get("roomMgr").enterPrivateTable(user["player"], msg);
    //        if (tableInfo == null || !!tableInfo.error){
    //            logger.error("加入私人房间失败");
    //            next(null, {code: Code.FAIL, error:tableInfo == null ? "加入失败" : tableInfo.error});
    //            return;
    //        }
    //
    //        cb(null, Code.OK);
    //        // // 向大厅请求保存玩家所在游戏服务器id
    //        // self.app.rpc.hall.msgRemote.addPlayerInGameServer(session, {uid: uid, serverId: self.app.get('serverId')}, cb);
    //    },
    //    function (code, cb) {
    //        //注册当前玩家在玩哪个游戏 后面同步数据用
    //        session.set('backupGameId', "0");
    //        session.set('gameId', self.app.get('serverId'));
    //        session.pushAll(cb);
    //    },
    //    function (code, cb) {
    //        next(null, {code: Code.OK});
    //    }
    //], function(err){
    //    if(err) {
    //        next(err, {code: Code.FAIL});
    //        return;
    //    }
    //
    //});
};

/*
 玩家发送切换场景到桌子了 ，回复当前桌子状态
 uid
 changsha.changshaPRoomHandler.initSeat
 * */
Handler.prototype.initSeat = function(msg, session, next)
{
    var uid = msg.uid,self = this;
    if(!uid) {
        next(null, {code: Code.Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table){
        logger.error("桌子找不到");

        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    var player = self.app.get("roomMgr").getPlayer(uid);
    if (player == null){
        logger.error("没有此人UID：" + uid);

        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }

    self.app.get('roomMgr').updatePlayerServerInfo(uid, session.get('serverId'), session.get('ip'));
    table.updatePlayerServerInfo(uid, session.get('serverId'), session.get('ip'));

    var tableStatus =  table.getTableStatus(uid);
    if (table.isOffLinePlayer(uid) == true){
        session.pushAll();
        table.removeOffLinePlayer(uid);
    }

    next(null, {code: Code.OK, tableStatus:tableStatus});

};

/*
 玩家发送 出牌
 changsha.changshaPRoomHandler.updateDelCards
 opCard {type:value}
 uid
*/
Handler.prototype.updateDelCards = function(msg, session, next)
{
    var uid = msg.uid,self = this;
    if(!uid) {
        next(null, {code: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table){
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    var player = self.app.get("roomMgr").getPlayer(uid);
    if (player == null){
        logger.error("没有此人UID：" + uid);
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_USER_NOT_EXIST});
    }
    if (table.updatePlayerDelCard(msg) == true){
        next(null, {code: Code.OK});
    }else{
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_ERROR_MYSQL});
    }

};

/*
玩家发送离开游戏请求如果是房主离开则游戏解散
uid
changsha.changshaPRoomHandler.leavePrivateTable
isGameover 收到总结算mjGameOver 回复给我为 1 其他时候为0
* */
Handler.prototype.leavePrivateTable = function(msg, session, next)
{
    //玩家发送当前玩家状态 服务器回复当前玩家状态结果
    var uid = msg.uid,self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    //1代表正常离开  2代表杀进程
    if (self.app.get("roomMgr").leavePrivateRoom(uid,1) == false){
        if (!!msg.isGameover && msg.isGameover == 1){
            session.set('gameId', "0");
            session.set('backupGameId', self.app.get('serverId'));
            session.pushAll(function () {

                next(null, {code: Code.OK});
            });
            return;
        }
        next(null, {code: Code.FAIL});
    }else{
        session.set('gameId', "0");
        session.set('backupGameId', self.app.get('serverId'));
        session.pushAll(function () {

            next(null, {code: Code.OK});
        });
    }
};

/*
 玩家发送操作请求
 吃碰杠补胡过 天胡
 changsha.changshaPRoomHandler.updatePlayerOp
 "opType":"chi"
  opCard:{type:"B", value:"1"}
 "index":index
 uid
 * */
Handler.prototype.updatePlayerOp = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (table != null){
        async.waterfall([
            function(cb){
                next(null, {code: Code.OK});
                cb();
            },function(cb){
                logger.error("updatePlayerOp:");
                table.updatePlayerOp(msg);
            }
        ], function(err){
            if(err) {
                logger.error("updatePlayerOp同步错误");
                next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_ERROR_MYSQL});
            }
        });
    }else{
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_ERROR_MYSQL});
    }
};

/*
 uid:
 status: 1 代表加 0代表减少
 changsha.changshaPRoomHandler.addRobot
 * */
Handler.prototype.addRobot = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var status = msg.status;
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table)
    {
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_ERROR_MYSQL});
        return;
    }
    if (status == 1){
        table.addAIRobot();
    }else if (status == 0){
        table.popRobot();
    }
    next(null, {code: Code.OK});
};

/*
 玩家发送准备状态
 uid
 status(1:准备 0：未准备（默认五秒之后就直接准备状态)
 changsha.changshaPRoomHandler.readyGame
 * */
Handler.prototype.readyGame = function(msg, session, next)
{
    var uid = msg.uid, self = this, readyStatus = msg.status;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table)
    {
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    table.Message.mjReadyStatus({"uid": uid , "readyStatus": readyStatus});

    next(null, {code: Code.OK});
};

/*
 玩家发送海底选择
 uid
 status(1:抢 0：不抢
 changsha.changshaPRoomHandler.haiDiGame
 * */
Handler.prototype.haiDiGame = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table)
    {
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    table.updatePlayerHaiDiCard(msg);
    next(null, {code: Code.OK});
};

/*
 玩家申请解散房间
 uid
 status 1 2 3  (1代表申请者申请者肯定同意的  2代表同意 3代表拒绝)
 changsha.changshaPRoomHandler.dissolutionTable
 * */
Handler.prototype.dissolutionTable = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table)
    {
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    table.dissolutionTable(msg);
    next(null, {code: Code.OK});
};

/*
 玩家发送聊天 表情等内容
 changsha.changshaPRoomHandler.chatGame
 uid
 * */
Handler.prototype.chatGame = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table)
    {
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_NO_TABLE});
        return;
    }

    table.Message.mjChatStatus(msg);

    next(null, {code: Code.OK});
};

/*
 uid:
 pai:B4
 changsha.changshaPRoomHandler.gmQiPai
 * */
Handler.prototype.gmQiPai = function(msg, session, next)
{
    var uid = msg.uid, self = this;
   // logger.error("gmQiPai 收到gm 命令");
    if(!uid) {
        next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table)
    {
        logger.error("桌子找不到");
        next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_ERROR_MYSQL});
        return;
    }
    table.gmQiPai(msg);
    next(null, {code: Code.OK});
};

// /*
//  uid:
//  quanzhou.quanzhouPRoomHandler.localPosition
//  * */
Handler.prototype.localPosition = function(msg, session, next)
{
     var uid = msg.uid, self = this;
     if(!uid) {
         next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_UID_INVALID});
         return;
     }
     var table = self.app.get("roomMgr").getTableByUid(uid);
     if (!table){
         logger.error("桌子找不到");
         next(null, {code: Code.FAIL, err:Code.MAJHONG.FA_ERROR_MYSQL});
         return;
     }

     table.Message.mjLocalPosition(msg);
     next(null, {code: Code.OK});
};

Handler.prototype.updateGdGangOp = function(msg, session, next)
{
    var uid = msg.uid,self = this;
    if(!uid) {
        next(null, {code: Code.Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    var table = self.app.get("roomMgr").getTableByUid(uid);
    if (!table){
        logger.error("桌子找不到");

        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }
    var player = self.app.get("roomMgr").getPlayer(uid);
    if (player == null){
        logger.error("没有此人UID：" + uid);

        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_NO_TABLE});
        return;
    }

    player.gdGangBuPai = msg.gdGangBuPai;
    logger.debug("%j 固定杠是否补牌%j",player.uid,player.gdGangBuPai);

    next(null, {code: Code.OK});

};

//替他人开房
Handler.prototype.reCreatePrivateTable = function(msg, session, next)
{
    var uid = msg.uid, self = this;
    if(!uid || !msg.rounds ) {

        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    logger.debug("玩家代开创建麻将房间");

    async.waterfall([
        function(cb)
        {
            //查看比赛 改玩家是否已经在比赛场中了
            self.app.rpc.hall.arenaRemote.checkPlayerInArenaRPC(session, {uid: uid},cb);
        },
        function(code,ret,cb)
        {
            if(code !== Code.OK){
                next(null, {code: Code.FAIL, error:""});
                return;
            }
            logger.debug(" createPrivateTable 检查 玩家是否在比赛场中:%j",ret);
            if(ret.aid>0){
                next(null, {code: Code.FAIL, error:"玩家已经在"+ret.aid+"比赛中，不能创建房间，必须先退出比赛场"});
                return;
            }
            // 向大厅请求用户信息
            self.app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
        }, function(code, user, cb)
        {
            logger.debug("joinGame user serverId = " + session.get("serverId"));
            if(code !== Code.OK){
                next(null, {code: code, error:Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            if(!user){
                next(null, {code: code, error:Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }

            //创建房间并进入房间
            var priTable = self.app.get("roomMgr").reCreatePrivateTable(msg,user["player"]);
            if (priTable == null || !!priTable.error){
                logger.error("创建私人房间失败");
                next(null, {code: Code.FAIL, error:priTable !== null ? priTable.error : "创建房间失败,房卡不足"});
                return;
            }

            cb(null, Code.OK);

        },
        function (code, cb) {
            next(null, {code: Code.OK});
        }
    ], function(err){
        if(err) {
            next(err, {code: Code.OK, error: Code.FAIL});
            return;
        }
    });
};

//解散代开房间 tableId
Handler.prototype.deleteRePrivateTable = function(msg, session, next)
{
    //玩家发送当前玩家状态 服务器回复当前玩家状态结果 tableId
    var uid = msg.uid,self = this;
    if(!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    //1代表正常离开  2代表杀进程
    self.app.get("roomMgr").deleteRePrivateTable(msg);
    next(null, {code: Code.OK});
};

