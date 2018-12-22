var async = require('async');
var _ = require('lodash');
var Code = require('../../consts/code');
var logger = require('pomelo-logger').getLogger('handlerUtil-log', __filename);

/**
 *
 * @param app
 * @param msg
 * @param next
 */
var getPlayerPackIds = function (app, msg, next) {
    if (!app.get("packMgr")) {
        logger.debug('joinPrivateTable==1');
        msg.pids = [];
        next();
    } else {
        app.rpc.hall.packRemote.getPlayerPackIds(null, {uid: msg.uid}, function (err, data) {
            if (!!err) {
                logger.debug('joinPrivateTable==2', err);
                msg.pids = [];
                next();
            } else {
                logger.debug('joinPrivateTable==3', data);
                msg.pids = data;
                next();
            }
        });
    }
};

var checkCanJoinTable = function (app, msg, code, user, next, cb) {
    //user["player"]["serverId"] = session.get("serverId");
    if (code !== Code.OK) {
        next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
        return;
    }
    if (!user) {
        next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
        return;
    }
    var tableInfo = app.get("roomMgr").enterPrivateTable(user["player"], msg);

    if (tableInfo == null || !!tableInfo.error) {
        logger.error("加入私人房间失败", tableInfo);
        next(null, {code: Code.FAIL, error: tableInfo == null ? "加入失败" : tableInfo.error});
        return;
    }
    cb(null, Code.OK);
};

/**
 * 服务器维护状态下(serverState > 2) 白名单 可以进入游戏
 * @param vipLevel
 * @param uid
 * @returns {boolean}
 */
var serverStateFilter = function (app, vipLevel, uid) {
    var serverState = app.get(app.getServerType())['serverState'] || 1;
    logger.debug('serverStateFilter', app.get(app.getServerType())['serverState'], vipLevel);
    if(serverState == 2){
        //next(null,{code:500, error:'服务器正在维护'});
        return true;
    }
    if (serverState > 2 /*&& vipLevel < 30*/) {
        //next(null,{code:500, error:'服务器正在维护'});
        var whites = app.get('whites');
        return whites.indexOf(uid) == -1;
    }
    return false;
}

var createPrivateTable = function (session, app, msg, next) {
    var uid = msg.uid, self = this;
    async.waterfall([
        function (cb) {
            // 向大厅请求用户信息
            app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
        },
        function (code, user, cb) {
            //logger.debug("joinGame user serverId = " + session.get("serverId"));
            //logger.debug(user);
            //user["player"]["serverId"] = session.get("serverId");
            if (code !== Code.OK) {
                next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            if (!user) {
                next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }

            // 封号
            if (user["player"].locked == 1) {
                next(null, {code: 500, error: Code.REGLOGIN.FA_ACCOUNTD_LOCKED});
                return;
            }

            // 维护状态玩家过滤
            if (serverStateFilter(app, user["player"].vipLevel, uid)) {
                next(null,{code:500, error:'服务器正在维护'});
                return;
            }

            //创建房间并进入房间
            var priTable = app.get("roomMgr").createPrivateTable(msg, user["player"]);
            if (priTable == null || !!priTable.error) {
                logger.error("创建私人房间失败");
                next(null, {code: Code.FAIL, error: priTable !== null ? priTable.error : "创建房间失败,钻石不足"});
                return;
            }

            cb(null, Code.OK);
        },
        function (code, cb) {
            //注册当前玩家在玩哪个游戏 后面同步数据用
            session.set('backupGameId', "0");
            session.set('gameId', app.get('serverId'));
            session.pushAll(cb);
        },
        function (code, cb) {
            next(null, {code: Code.OK});
        }
    ], function (err) {
        if (err) {
            next(err, {code: code, err: Code.FAIL});
            return;
        }
    });
};

var reCreatePrivateTable = function (session, app, msg, next) {
    var uid = msg.uid, self = this;
    async.waterfall([
        function(cb)
        {
            //查看比赛 改玩家是否已经在比赛场中了
            app.rpc.hall.arenaRemote.checkPlayerInArenaRPC(session, {uid: uid},cb);
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
            app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
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
            if (serverStateFilter(app, user["player"].vipLevel, uid)) {
                next(null,{code:500, error:'服务器正在维护'});
                return;
            }
            //创建房间并进入房间
            var priTable = app.get("roomMgr").reCreatePrivateTable(msg,user["player"]);
            if (priTable == null || !!priTable.error){
                logger.error("创建私人房间失败");
                next(null, {code: Code.FAIL, error:priTable !== null ? priTable.error : "创建房间失败,钻石不足"});
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

var joinPrivateTable = function (session, app, msg, next) {
    var uid = msg.uid, self = this;
    async.waterfall([
        function (cb) {
            exports.getPlayerPackIds(app, msg, cb);
        },
        function (cb) {
            //查看比赛 改玩家是否已经在比赛场中了
            app.rpc.hall.arenaRemote.checkPlayerInArenaRPC(session, {uid: uid}, cb);
        },
        function (code, ret, cb) {
            if (code !== Code.OK) {
                next(null, {code: Code.FAIL, error: ""});
                return;
            }
            logger.debug("检查 玩家是否在比赛场中:%j", ret);
            if (ret.aid > 0) {
                next(null, {code: Code.FAIL, error: "玩家已经在" + ret.aid + "比赛中，不能加入房间，必须先退出比赛场"});
                return;
            }
            // 向大厅请求用户信息
            app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
        },
        function (code, user, cb) {
            //user["player"]["serverId"] = session.get("serverId");
            if (code !== Code.OK) {
                next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            if (!user) {
                next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            if (user["player"].locked == 1) {
                next(null, {code: 500, error: Code.REGLOGIN.FA_ACCOUNTD_LOCKED});
                return;
            }

            if (serverStateFilter(app, user["player"].vipLevel, uid)) {
                next(null,{code:500, error:'服务器正在维护'});
                return;
            }

            var tableInfo = app.get("roomMgr").enterPrivateTable(user["player"], msg);
            if (tableInfo == null || !!tableInfo.error) {
                logger.error("加入私人房间失败");
                next(null, {code: Code.FAIL, error: tableInfo == null ? "加入失败" : tableInfo.error});
                return;
            }

            cb(null, Code.OK);
        },
        function (code, cb) {
            //注册当前玩家在玩哪个游戏 后面同步数据用
            session.set('backupGameId', "0");
            session.set('gameId', app.get('serverId'));
            session.pushAll(cb);
        },
        function (code, cb) {
            next(null, {code: Code.OK});
        }
    ], function (err) {
        if (err) {
            next(err, {code: Code.FAIL});
            return;
        }
    });
};

/**
 *
 * @param session
 * @param app
 * @param msg
 * @param next
 */
var joinGoldTable = function (session, app, msg, next) {
    var uid = msg.uid, self = this;
    logger.debug('joinGoldTable: %j', msg);
    async.waterfall([
        function(cb)
        {
            // 向大厅请求用户信息
            app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
        }, function(code, user, cb)
        {
            //user["player"]["serverId"] = session.get("serverId");
            if(code !== Code.OK){
                next(null, {code: code, err:Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            if(!user){
                next(null, {code: code, err:Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            if (user["player"].locked == 1) {
                next(null, {code: 500, error: Code.REGLOGIN.FA_ACCOUNTD_LOCKED});
                return;
            }
            if (serverStateFilter(app, user["player"].vipLevel, uid)) {
                next(null,{code:500, error:'服务器正在维护'});
                return;
            }
            if (user["player"].goldNum < 1) {
                next(null, {code: 500, error: '金币不足'});
                return;
            }
            var tableInfo = null;
            logger.debug('hasFreeGoldTable================', app.get("roomMgr").goldRoom.hasFreeGoldTable());
            if (app.get("roomMgr").goldRoom.hasFreeGoldTable()) {
                logger.debug('hasFreeGoldTable================');
                tableInfo = app.get("roomMgr").goldRoom.enterGoldTable(user["player"], msg);
                if (tableInfo == null || !!tableInfo.error){
                    logger.error("加入私人房间失败");
                    next(null, {code: Code.FAIL, error:tableInfo == null ? "加入失败" : tableInfo.error});
                    return;
                }
                cb(null, Code.OK);
            } else {
                // 获得一个桌子号
                //logger.debug(session);
                var roomConfig = app.get(app.getServerType())['goldTableConfig'];
                roomConfig.uid = msg.uid;
                roomConfig.isGold = 1;
                logger.debug('joinGoldTable-create', roomConfig);
                app.rpc.hall.msgRemote.getRandTableNum(null, roomConfig, function (err, code, result) {
                    logger.debug('getRandTableNum', err, code, result);
                    if (err == null && code == Code.OK) {
                        roomConfig.tableId = result.tableNum;
                        roomConfig.huiFangNums = result.huiFangNums;
                        app.get("roomMgr").goldRoom.createGoldTable(roomConfig);
                        tableInfo = app.get("roomMgr").goldRoom.enterGoldTable(user["player"], msg);
                        if (tableInfo == null || !!tableInfo.error){
                            logger.error("加入私人房间失败");
                            next(null, {code: Code.FAIL, error:tableInfo == null ? "加入失败" : tableInfo.error});
                            return;
                        }
                        cb(null, Code.OK);
                    } else {
                        next(null, {code: 500, error: '没找到桌子'});
                        return;
                    }
                });
            }
        },
        function (code, cb) {
            //注册当前玩家在玩哪个游戏 后面同步数据用
            session.set('backupGameId', "0");
            session.set('gameId', app.get('serverId'));
            session.pushAll(cb);
        },
        function (code, cb) {
            next(null, {code: Code.OK});
        }
    ], function(err){
        if(err) {
            next(err, {code: Code.FAIL});
            return;
        }
    });
}
exports.getPlayerPackIds = getPlayerPackIds;
exports.checkCanJoinTable = checkCanJoinTable;
exports.createPrivateTable = createPrivateTable;
exports.reCreatePrivateTable = reCreatePrivateTable;
/**
 * 加入房间
 * @type {joinPrivateTable}
 */
exports.joinPrivateTable = joinPrivateTable;
exports.joinGoldTable = joinGoldTable;