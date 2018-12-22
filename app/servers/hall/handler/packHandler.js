var Code = require('../../../consts/code');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');
var PackEvent = require('../../../consts/consts').PackEvent;
var packDao = require('../../../dao/packDao');
/**
 * pack handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

/**
 * quickJoinRoom
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.quickJoinRoom= function(msg, session, next) {
    var uid = msg.uid, self = this;
    if (!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }
    //首先请求Msghall大厅 获得玩家详细数据
    async.waterfall([
        function (cb) {
            if (!self.app.get("packMgr")) {
                logger.debug('joinPrivateTable==1');
                msg.pids = [];
                cb();
            } else {
                var packTableMgr = pomelo.app.get("packTableMgr");
                packTableMgr.getPlayerPackIds(uid, function (err, data) {
                    if (!!err) {
                        logger.debug('joinPrivateTable==2', err);
                        msg.pids = [];
                        cb();
                    } else {
                        logger.debug('joinPrivateTable==3', data);
                        msg.pids = data;
                        cb();
                    }
                }.bind(this));
            }
        },
        function (cb) {
            // 查找一个空闲的空间号
            var packTableMgr = pomelo.app.get("packTableMgr");
            packTableMgr.getPackFreeTable(msg.pid, function (err, data) {
                if (!!err) {
                    next(null, {code: 500, error: err});
                    return;
                }
                msg.tableId = data.state.tableId;
                cb();
            });
        },
        function (cb) {
            // 向大厅请求用户信息
            //self.app.rpc.hall.msgRemote.getPlayerFromHall(session, {uid: uid}, cb);
            var hall = pomelo.app.get('hall');
            if (!hall){
                logger.error("getPlayerFromHall error");
                next(null, Code.FAIL, 'hall server no exist');
                return;
            }
            var user = hall.getPlayer(msg.uid, "jsJson");
            if (!user){
                next(null, {code: code, err: Code.MAJHONG.FA_USER_NOT_EXIST});
                return;
            }
            var tableInfo = self.app.get("roomMgr").enterPrivateTable(user["player"], msg);
            if (tableInfo == null || !!tableInfo.error) {
                logger.error("加入私人房间失败", tableInfo);
                next(null, {code: Code.FAIL, error: tableInfo == null ? "加入失败" : tableInfo.error});
                return;
            }

            cb(null, Code.OK);
        },
        function (code, cb) {
            //注册当前玩家在玩哪个游戏 后面同步数据用
            session.set('backupGameId', "0");
            session.set('gameId', self.app.get('serverId'));
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

Handler.prototype.packApplyJoinGame = function (msg, session, next) {
    var uid = msg.uid, self = this;
    logger.debug('packApplyJoinGame', msg);
    if (!uid) {
        next(null, {code: Code.FAIL, err: Code.MAJHONG.FA_UID_INVALID});
        return;
    }

    var serverId = pomelo.app.get("hall").getTableServer(msg.tableId);
    logger.debug('packApplyJoinGame2', serverId);
    if (serverId == null || serverId == undefined){
        next(null, {code: Code.FAIL, error: '房间号不存在!'});
        return;
    }
    var serverType = serverId.split('-')[0];
    async.waterfall([
        function (cb) {
            packDao.getInfo(msg.pid, function (err, info) {
                if (!!err) {
                    next(null, {code: Code.FAIL, error: err});
                    return;
                }
                msg.packName = info.name;
                msg.packNum = info.packNum;
                cb();
            })
        },
        function (cb) {
            pomelo.app.rpc[serverType].gRemote.getTableConfig(serverId, msg, function (err, cnf) {
                //logger.debug("getTableServerType", err, cnf);
                if ( !!err ) {
                    next(null, {code: Code.FAIL, error: err});
                    return;
                }
                cb(null, cnf);
            });
        },
        function (cnf, cb) {
            var packTableMgr = pomelo.app.get("packTableMgr");
            packTableMgr.pushMsgToPackAllPlayer(msg.pid, PackEvent.packNotifyJoinGame, {
                pid: msg.pid,
                packNum: msg.packNum,
                packName: msg.packName,
                tableId: msg.tableId,
                serverType: serverType,
                config: cnf
            });
            next(null, {code: Code.OK});
        }
    ], function (err) {
        if (!!err) {
            next(null, {code: Code.FAIL, error: err});
        }
    });
}