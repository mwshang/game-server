/**
 * Created by Administrator on 2017/8/13 0013.
 */
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');
var Code = require('../../../consts/code');
var qpgames = require('../../../../config/qpgames.json').games;
var async = require('async');
var packAutoTableDao = require('../../../dao/packAutoTableDao');

module.exports = function (app) {
    return new Remote(app);
};

var Remote = function (app) {
    this.app = app;
};

var pro = Remote.prototype;

pro.__defineGetter__('packTableMgr', function () {
    return pomelo.app.get("packTableMgr");
})

/**
 * 创建一个成员房间
 * @param msg
 * @param cb
 */
pro.addPackMemberTableRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    logger.debug('addPackMemberTableRpc');
    packTableMgr.addMemberTable(msg, function (err, data) {
        logger.debug("添加成员房间成功", err, data);
        cb(err, data);
    });
}

/**
 * 添加一个自动房间
 * @param msg
 * @param cb
 */
pro.addPackAutoTableRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.addAutoTable(msg);

    logger.debug("添加自动房间成功");
    cb(Code.OK);
}

/**
 * 重新开启一个自动房间
 * @param msg
 * @param cb
 */
pro.reCreateAutoTableRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    var info = packTableMgr.getAutoInfo(msg.autoId);
    if (!!info) {
        info.ownerUid = info.createUid;
        packTableMgr.createAutoTable(info, function (err, data) {
            logger.debug("开启自动桌子:%j", err, data);
            cb(Code.OK);
        });
    }
    else {
        logger.error("找不到配置，或者已经关闭");
        cb("找不到配置，或者已经关闭");
    }
}

/**
 * 删除自动房间配置
 * @param msg
 * @param cb
 */
pro.delAutoTableCnfRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.delAutoTableCnf(msg.autoId);

    cb(Code.OK);
}

pro.delAutoTableRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packAutoTableDao.delTable(msg.autoId, function (err, ret) {
        if (!!err) {
            cb(Code.FAIL, err);
            return;
        }

        // 删除 大厅里的房间
        packTableMgr.delAutoTableCnf(msg.autoId);
        cb(Code.OK);
    }.bind(this));
}

/**
 * 删除该群下的所有桌子
 * @param msg
 * @param cb
 */
pro.delAutoTableCnfByPidRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.delAutoTableCnfByPid(msg.pid);

    cb(Code.OK);
}


/**
 *
 * @param msg
 * @param cb
 */
pro.closeTablePush = function(msg, cb) {
    this.packTableMgr.closeTable(msg);
    cb && cb();
}

/**
 *
 * @param msg
 * @param cb
 */
pro.tableGameStart = function (msg, cb) {
    logger.debug("on_tableGameStart", msg);
    this.packTableMgr.setTableGameState(msg);
    cb && cb();
}

/**
 *
 * @param msg
 * @param cb
 */
pro.tablePlayerChange = function (msg, cb) {
    logger.debug("on_tablePlayerChange", msg)
    this.packTableMgr.setTablePlayerState(msg);
    cb && cb();
}

/**
 *
 * @param msg
 * @param cb
 */
pro.getTableListLocal = function (msg, cb) {
    var pid = msg.pid;
    if (!pid) {
        cb(Code.FAIL, '');
        return;
    }
    var packTableMgr = pomelo.app.get("packTableMgr");
    var list = packTableMgr.getPackTableList(msg.pid, msg.all);

    logger.debug("获取群房间结果:%j", list);

    cb(null, list);
}

/**
 *
 * @param msg
 * @param cb
 */
pro.getTableListRpc = function(msg, cb) {
    var pid = msg.pid;
    if (!pid) {
        cb(Code.FAIL, '');
        return;
    }

    var _servers = [];
    for (var g in qpgames) {
        var serverType = qpgames[g].serverType;
        var servers = pomelo.app.getServersByType(serverType);
        if (servers.length > 0) {
            _servers = _servers.concat(servers);
        }
    }
    var rpcs = [];
    if (_servers.length > 0) {
        var j = 0;
        logger.debug("serversLength:" + _servers.length);
        //logger.debug("servers1:%j",_servers[j]);
        for (var i = 0; i < _servers.length; i++) {
            rpcs.push(function (cb) {
                //logger.debug("servers2:%j",_servers[j]);
                var serverId = _servers[j++].id;
                var serverType = serverId.split('-')[0];
                logger.debug("servcerId:", serverId, serverType);
                if (pomelo.app.rpc[serverType].gRemote.getPackTablesListRpc) {
                    pomelo.app.rpc[serverType].gRemote.getPackTablesListRpc(serverId, {"pid": pid}, cb);
                }
            });
        }
    }

    async.parallel(rpcs, function (err, results) {
        //logger.debug("packRemote->getTableListRpc::async.parallel", err, JSON.stringify(results));
        var reTables = [];
        for (var j = 0; j < results.length; j++) {
            if (!results[j]) {
                logger.error("结果有空值：%j", results[j]);
            }
            if (results[j][1].tables.length > 0) {
                reTables = reTables.concat(results[j][1].tables);
            }
        }
        reTables = pomelo.app.get("packTableMgr").filterTable(reTables);
        logger.debug("获取群房间结果:%j", reTables);

        cb(null, reTables);
    });
}

pro.setDisableAutoTableRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.setDisableAutoTable(msg.autoId, msg.bDisable);

    cb(Code.OK);
}

//隐藏大厅房间
pro.setHideAutoTableByPidRpc = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.setHideByPid(msg.pid, msg.bHideRoom);

    cb(Code.OK);
}

pro.getPlayerPackIds = function(uid, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.getPlayerPackIds(uid, cb);
}

pro.updatePackFangKa = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.updatePackFangKa(msg, cb);
}

/**
 * 获取一个空闲的房间
 * @param msg
 * @param cb
 */
pro.getFreeTable = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.getPackFreeTable(msg.pid, msg.uid, cb);
}

/**
 * 通知玩家通过审核
 * @param msg
 * @param cb
 */
pro.notifyAuthJoinPack = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    pomelo.app.rpc.hall.msgRemote.getPlayerFromHall(null, {uid: msg.uid}, function (err, code, user) {
        logger.debug('notifyJoinPack', msg, code, user);
        if (code !== Code.OK) {
            cb('找不到玩家');
            return;
        }
        var player = user["player"];
        logger.debug('notifyAuthJoinPack', user, player);
        if (!!player) {
            if (msg.audit == 1) {
                packTableMgr.enterPackHall(player, 0);
                setTimeout(function () {
                    packTableMgr.notifyJoinPack(msg.pid, msg.uid,msg.packName);
                }.bind(this), 200);
            } else {
                packTableMgr.notifyRejectJoin(player, msg.packName);
            }
        }
        cb(null);
    });

    //packTableMgr.notifyJoinPack(msg.pid, msg.uid, cb);
}

/**
 * 通知玩家退出群
 * @param msg
 * @param cb
 */
pro.notifyQuitPack = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.notifyQuitPack(msg, cb);
}

/*
pro.enterPackHall = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.enterPackHall(msg.player, msg.gameing);
    cb(null);
}*/
