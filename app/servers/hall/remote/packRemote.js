/**
 * Created by Administrator on 2017/8/13 0013.
 */
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');
var Code = require('../../../consts/code');
var qpgames = require('../../../../config/qpgames.json').games;
var async = require('async');
var packAutoTableDao = require('../../../dao/packAutoTableDao');
var utils = require('../../../util/utils');

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
 * 获取当前俱乐部房间消耗
 * @param msg
 * @param cb
 */
pro.getPackTablesWillLoss = function (msg, cb) {
    var pid = msg.pid;
    if (!pid) {
        cb(Code.FAIL, '');
        return;
    }
    var packTableMgr = pomelo.app.get("packTableMgr");
    var num = packTableMgr.getPackTablesWillLoss(msg.pid);

    logger.debug("获取当前俱乐部房间消耗:%j", num);

    cb(null, num);
}

/**
 * 获取当前俱乐部房间消耗
 * @param msg
 * @param cb
 */
pro.getPackTableListLoss = function (msg, cb) {
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
                if (pomelo.app.rpc[serverType].gRemote.getTableNeedFangKa) {
                    pomelo.app.rpc[serverType].gRemote.getTableNeedFangKa(serverId, {"pid": pid, config: msg.cnf}, cb);
                } else {
                    utils.invokeCallback(cb, '没有房间', 0);
                }
            });
        }
    }

    if (rpcs.length < 1) {
        logger.debug('not found servers');
        utils.invokeCallback(cb, null, 0);
        return;
    }
    async.parallel(rpcs, function (err, results) {
        var num = 0;
        for (var j = 0; j < results.length; j++) {
            if (!results[j]) {
                logger.error("结果有空值：%j", results[j]);
                continue;
            }
            num += parseInt(results[j])
        }
        cb(null, num);
    });
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
                } else {
                    utils.invokeCallback(cb, '没有房间', []);
                }
            });
        }
    }

    async.parallel(rpcs, function (err, results) {
        //logger.debug("packRemote->getTableListRpc::async.parallel", err, JSON.stringify(results));
        var reTables = [];
        for (var j = 0; j < results.length; j++) {
            if (!results[j] || !results[j][1]) {
                logger.error("结果有空值：%j", results[j]);
                continue;
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
    var hall = pomelo.app.get("hall");
    var player = hall.getPlayer(msg.uid);

    logger.debug('notifyJoinPack', msg);
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

pro.enterPackHall = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.enterPackHall(msg.player, msg.gameing);
    cb(null);
}

pro.checkCreateCondition = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    var hall = pomelo.app.get('hall');
    if (!packTableMgr || !hall) {
        utils.invokeCallback(cb, "俱乐部未开放");
        return;
    }
    var loss = packTableMgr.getCreateLoss();
    if (!loss) {
        utils.invokeCallback(cb, null);
        return;
    }
    var user = hall.getPlayer(msg.uid);
    if (!user) {
        utils.invokeCallback(cb, "未找到创建用户");
        return;
    }
    if (user.hasOwnProperty(loss.key)) {
        if (user[loss.key] >= loss.val) {
            pomelo.app.rpc.hall.msgRemote.updatePlayerFromGame(null, {type: 'fangKa', msg: {uid: msg.uid, fangKa: -loss.val}}, function (err) {
               logger.debug('创建俱乐部消耗', msg, err)
            });
            utils.invokeCallback(cb, null);
            return;
        }
    }
    utils.invokeCallback(cb, '钻石不足,创建俱乐部需消耗'+ loss.val+'钻石');
}

pro.getCurMemoryUsage = function (msg, cb) {
    cb(null, process.memoryUsage());
}

pro.notifyPackState = function (msg, cb) {
    var packTableMgr = pomelo.app.get("packTableMgr");
    packTableMgr.notifyPackState(msg, cb);
}