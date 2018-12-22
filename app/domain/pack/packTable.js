/*** Created by fyw2515 on 2017/8/13.
 */
var pomelo = require('pomelo');
var async = require('async');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var packAutoTableDao = require('../../dao/packAutoTableDao');
var playerDao = require('../../dao/playerDao');
var packDao = require('../../dao/packDao');
var packPlayerDao = require('../../dao/packPlayerDao');
var packLossDao = require('../../dao/packLossDao');
var Code = require('../../consts/code');
var utils = require('../../util/utils');
var channelUtil = require('../../util/channelUtil');
var _ = require('lodash');
var PackEvent = require('../../consts/consts').PackEvent;
var messageService = require('../../services/messageService');
var packConfig = require('../../../config/pack.json');

var Instance = function (app) {
    logger.error("packTable Init");
    //当前APP
    this.app = app;
    this.tempTable = [];
    //自动房间
    this.autoTableCnfMap = {}; {autoId: {}}
    this.autoTableMap = {}; // {tableId: {}}
    //成员房间
    this.memberTableMap = {}; //{tableId: {}}

    this.packPlayers = {};
    this.tablePlayerUidMap = {};

    pomelo.app.set("packTableMgr", this);
    var self = this;
    pomelo.app.event.on(pomelo.events.START_ALL, function (servers) {
        //self.onServerAllStart(servers);
    });
}
module.exports = Instance;

/**
 * create pack loss items
 * @returns {}
 */
Instance.prototype.getCreateLoss = function () {
    return packConfig.createLoss || null;
}

Instance.prototype.onServerAllStart = function (servers) {
    this.loadAutoTables(servers);
}

//启动的时候 开启自动桌子
Instance.prototype.loadAutoTables = function () {
    var self = this;
    if (packConfig.loadAutoTable != true) {
        logger.error('已关闭加载自动房间配置！');
        return;
    }
    packAutoTableDao.loadAll(function (err, ret) {
        if (!ret) return;

        self.tempTable = _.cloneDeep(ret);
        self.createList();
    });
}

Instance.prototype.createFromDb = function (rowData, cb) {
    var self = this;
    if (rowData.bDisable == 1) {
        logger.debug('createFromDb1====');
        cb();
        return;
    }
    var servers = pomelo.app.getServersByType(rowData.serverType)
    if (!!servers && servers.length > 0) {
        var serverId = servers[0].id;
        var serverType = serverId.split('-')[0];
        if (serverType == rowData.serverType && rowData.bDisable == 0) {
            self.createAutoTable(rowData, function (err, res) {
                logger.debug('createFromDb: %j, err: %j, res: %j', rowData, err, res);
                cb();
            });
        } else {
            logger.debug('createFromDb3====');
            cb();
        }
    } else {
        logger.debug('createFromDb2====');
        cb();
    }
}

Instance.prototype.createList = function () {
    logger.debug('createList', this.tempTable.length);
    var self = this;
   /* async.whilst(
        function () {
            return self.tempTable && self.tempTable.length > 0;
        },
        function (next) {
            logger.debug('createFromDb->length: %d',self.tempTable.length, process.memoryUsage().rss/1000);
            var tableCnf = self.tempTable.shift();
            self.autoTableCnfMap[tableCnf.id] = tableCnf;
            self.createFromDb(tableCnf, next);
        },
        function (err) {
            if (!!err) {
                logger.debug("加载自动桌子ERROR：%j", err, _.keys(self.autoTableCnfMap).length, self.tempTable.length);
            } else {
                logger.debug("加载自动桌子完成：%j", _.keys(self.autoTableCnfMap), self.tempTable);
            }
        }
    );*/
    if (!self.tempTable ) {
        logger.error('self.tempTable is undefine');
        return;
    }
    if (self.tempTable.length < 1) {
        logger.debug("加载自动桌子完成：%j", _.keys(self.autoTableCnfMap), self.tempTable);
        return;
    }

    logger.debug('createFromDb->length: %d',self.tempTable.length, process.memoryUsage().rss/1000);
    var tableCnf = self.tempTable.shift();
    self.autoTableCnfMap[tableCnf.id] = tableCnf;
    self.createFromDb(tableCnf, function () {
        logger.debug('createFromDb one complete',self.tempTable.length, process.memoryUsage().rss/1000);
        self.createList();
    });
}

Instance.prototype.getAutoInfo = function (id) {
    //logger.debug("getAutoInfo", this.autoTableCnfMap, id);
    return this.autoTableCnfMap[id];
}

/**
 * 游戏服务通知房间解散
 * @param data {pid, tableId, isAuto, autoId?}
 */
Instance.prototype.closeTable = function (data) {
    logger.debug("on_closeTable", data);
    var self = this;
    this.notifyPlayerState(data.isAuto, data.tableId, 1);

    delete this.tablePlayerUidMap[data.tableId];

    setTimeout(function () {
        self.pushMsgToPackAllPlayer(data.pid, PackEvent.packNotifyTableClose, {pid: data.pid, tableId: data.tableId});
    }, 100);

    if (data.isAuto == 1) {
        // autoTable
        this.delAutoTable(data.tableId);
    } else {
        this.delMemberTable(data.tableId);
    }
}

/**
 * 删除自动房间配置时 关闭对应的房间
 * @param autoId
 */
Instance.prototype.closeAutoTableRpc = function(autoId) {
    var self = this;
    _.forOwn(this.autoTableMap, function (table) {
        if (table.conf.id == autoId && table.state.gameState == 0) {
            var tableId = table.state.tableId;

            var hall = pomelo.app.get('hall');
            if (!hall) {
                logger.error('hall non found');
                return;
            }
            var serverId = hall.getTableServer(tableId);
            if (serverId) {
                pomelo.app.rpc[table.conf.serverType].gRemote.closeTable(serverId, {tableId:tableId}, function (err, data) {
                    //cb(err, data);
                    if (!!err) {
                        logger.error("closeAutoTableRpc", err);
                    }
                });
            } else {
                //cb(Code.FAIL, '服务器类型不存在');
                logger.error('createAutoTable', '服务器类型不存在');
            }
            delete self.autoTableMap[tableId];
        }
    }.bind(this));
}

/**
 * 游戏服务通知房间状态改变
 * @param data
 */
Instance.prototype.setTableGameState = function (data) {
    logger.debug("setTableGameState", data);
    var self = this;
    this.changeMapPrototype(data.isAuto, data.tableId, 'gameState', 1);
    setTimeout(function () {
        self.notifyPlayerState(data.isAuto, data.tableId, 2);
    }, 100);

    setTimeout(function () {
        self.pushMsgToPackAllPlayer(data.pid, PackEvent.packNotifyTableState, {pid: data.pid, tableId: data.tableId, gameState: 1});
    }, 300);

}

/**
 * 游戏服务通知房间人数改变
 * @param data
 */
Instance.prototype.setTablePlayerState = function (data) {
    logger.debug("setTablePlayerState1", data);
    this.changeMapPrototype(data.isAuto, data.tableId, 'playerUids', data.data.playerUids || []);
    this.changeMapPrototype(data.isAuto, data.tableId, 'isFull', data.data.isFull || false);
    this.pushMsgToPackAllPlayer(data.pid, PackEvent.packNotifyTableState, {pid: data.pid, tableId: data.tableId, playerUids: data.data.playerUids || []});
}

Instance.prototype.changeMapPrototype = function (isAuto, tableId, keys, val) {
    logger.debug("changeMapPrototype", isAuto, tableId, keys, val);
    var thatMap = null;
    if (isAuto == 1) {
        thatMap = this.autoTableMap;
    } else {
        thatMap = this.memberTableMap;
    }
    if (thatMap) {
        if (!thatMap[tableId]) {
            logger.error("setTablePlayerState table不存在", tableId);
            return;
        }

        thatMap[tableId]['state'][keys] = val;
    } else {
        logger.error("setTablePlayerState map not exist");
    }
}

/**
 *
 * @param pid
 * @param tableId
 * @param state
 */
Instance.prototype.notifyPlayerState = function (isAuto, tableId, state) {
    var thatMap = null;
    if (isAuto == 1) {
        thatMap = this.autoTableMap;
    } else {
        thatMap = this.memberTableMap;
    }
    if (thatMap) {
        if (!thatMap[tableId]) {
            logger.error("setTablePlayerState table不存在", tableId);
            return;
        }
        var tableState = thatMap[tableId]['state'];
        var conf = thatMap[tableId]['conf'];

        var uids = [];
        if (state == 2) {
            this.tablePlayerUidMap[tableId] = tableState.playerUids;
            uids = tableState.playerUids;
            packPlayerDao.updateMemberLastJoin(tableState.pid, uids, tableState.tableType);
        } else {
            uids = this.tablePlayerUidMap[tableId] || [];
        }
        logger.debug('notifyPlayerState', isAuto, tableId, state, tableState);
        uids.map(function(uid) {
            if (this.packPlayers[tableState.pid][uid]) {
                this.packPlayers[tableState.pid][uid].online = state;
            }
            this.notifyPlayerStateImp(uid, state);
        }.bind(this));
        //this.pushMsgToPackAllPlayer(conf.pid, PackEvent.packNotifyPlayerState, {pid: conf.pid, uids: uids, online: state });

    } else {
        logger.error("setTablePlayerState map not exist");
    }
}

Instance.prototype.notifyPlayerStateImp = function (uid, state) {
    packPlayerDao.getPlayerPackIds(uid, function (err, pids) {
        if (!err) {
            pids.map(function (a) {
                this.pushMsgToPackAllPlayer(a.pid, PackEvent.packNotifyPlayerState, {pid: a.pid, uids: [uid], online: state });
            }.bind(this));
        }
    }.bind(this));
}
/**
 * 新建房间
 * @param isAuto
 * @param tableConf
 * @param state
 */
Instance.prototype.setTableChange = function (isAuto, tableConf, state) {
    var table = {conf: tableConf, state: state};
    if (isAuto == 1) {
        if (this.autoTableMap[state.tableId]) {
            logger.error('为啥发现重复的1 tableId', this.autoTableMap[state.tableId]);
            this.autoTableMap[state.tableId] = null;
        }
        this.autoTableMap[state.tableId] = table;
    } else {
        if (this.memberTableMap[state.tableId]) {
            logger.error('为啥发现重复的2 tableId', this.memberTableMap[state.tableId]);
            this.autoTableMap[state.tableId] = null;
        }
        this.memberTableMap[state.tableId] = table;
    }
    this.pushMsgToPackAllPlayer(tableConf.pid, PackEvent.packNotifyTableAdd, {pid: tableConf.pid,  table: _.cloneDeep(table)});
}

/**
 * 俱乐部房间需要消耗
 * @param pid
 * @returns {number}
 */
Instance.prototype.getPackTablesWillLoss = function (pid) {
    var num = 0;
    _.forOwn(this.autoTableMap, function (table) {
        //logger.debug('getPackTablesWillLoss', table);
        if (table.conf.pid == pid) {
            num += (table.state.tableCost || 0);
        }
    });

    _.forOwn(this.memberTableMap, function (table) {
        if (table.conf.pid == pid) {
            num += (table.state.tableCost || 0);
        }
    });
    return num;
}
//================================== 成员房间 ==================================

Instance.prototype.addMemberTable = function (tableInfo, cb) {
    var self = this;
    packDao.getInfo(tableInfo.pid, function (err, pack) {
        if (!!pack) {
            tableInfo.ownerUid = pack.ownerUid;
            tableInfo.memberUid = tableInfo.uid;          // 创建的成员UID
            logger.debug('addMemberTable', tableInfo);
            self.createMemberTable(tableInfo, cb);
        } else {
            cb(200, '群不存在');
        }
    });
}

/**
 *
 * @param tableInfo {uid,pid,roomName,roomConfig,bDisable,serverType,ownerUid,memberUid}
 * @param cb
 */
Instance.prototype.createMemberTable = function (tableInfo, cb) {
    var self = this;
    tableInfo.roomConfig.uid = tableInfo.uid;
    async.waterfall([
        function (next) {
            self.genTableNum(tableInfo, function (err, data) {
                if (!!err) {
                    utils.invokeCallback(cb, err);
                    return;
                }
                next(null, data);
            });
        },
        function (serverInfo, next) {
            tableInfo.oldCost = self.getPackTablesWillLoss(tableInfo.pid);
            pomelo.app.rpc[tableInfo.serverType].gRemote.createMemberTableRpc(serverInfo.serverId, tableInfo, function (err, data) {
                // 拿到新建的桌子id
                logger.debug("gRemote->createMemberTable", err, data);
                if (!err) {
                    //self.memberTableMap[data.tableId] = {conf: tableInfo, state: data};
                    self.setTableChange(0, tableInfo, data);
                } else {
                    // 释放房间号
                    pomelo.app.rpc.hall.msgRemote.recycleTableNum(null, {tableId: tableInfo.tableId}, function (err, res) {
                       logger.debug('创建失败，回收房间号', tableInfo.tableId);
                    });
                }
                utils.invokeCallback(cb, err, data);
            });
        }
    ], function (err, data) {
        if (!!err) {
            utils.invokeCallback(cb, err);
        }
    });
}

Instance.prototype.delMemberTable = function (tableId) {

    if (this.memberTableMap[tableId]) {
        delete this.memberTableMap[tableId];
    }
    return false;
}

//================================== 自动房间 ==================================
//创建自动房间
Instance.prototype.createAutoTable = function (autoTableInfo, cb) {
    logger.debug("创建桌子: %j" ,autoTableInfo);
    if (autoTableInfo.bDisable != 0) {
        utils.invokeCallback(cb, null);
        return;
    }
    if (typeof autoTableInfo.roomConfig === 'string'){
        autoTableInfo.roomConfig = JSON.parse(autoTableInfo.roomConfig);
    }
    var self = this;
    async.waterfall([
        function (next) {
            self.genTableNum(autoTableInfo, function (err, data) {
                if (!!err) {
                    utils.invokeCallback(cb, err);
                    return;
                }
                next(null, data);
            });
        },
        function (serverInfo, next) {
            if (!pomelo.app.rpc[autoTableInfo.serverType]) {
                utils.invokeCallback(cb, '相应的游戏服务未启动: %s', autoTableInfo.serverType);
                return;
            }
            autoTableInfo.oldCost = self.getPackTablesWillLoss(autoTableInfo.pid);
            pomelo.app.rpc[autoTableInfo.serverType].gRemote.createAutoTableRpc(serverInfo.serverId, autoTableInfo, function (err, data) {
                // 拿到新建的桌子id
                logger.debug("createAutoTable-拿到新建的桌子id: err: %j, data: %j", err, data);
                if (!err && data) {
                    self.setTableChange(1, autoTableInfo, data);
                } else {
                    // 释放房间号autoTableInfo
                    delete self.autoTableCnfMap[autoTableInfo.id];
                    pomelo.app.rpc.hall.msgRemote.recycleTableNum(null, {tableId: autoTableInfo.tableId}, function (err, res) {
                        logger.debug('创建失败，回收房间号', autoTableInfo.tableId);
                    });
                }
                utils.invokeCallback(cb, err, data);
            });
        }
    ], function (err, rs) {
        if (!!err) {
            utils.invokeCallback(cb, err);
        }
    });
}

Instance.prototype.genTableNum = function (tableInfo, next) {
    logger.debug('genTableNum: %j', tableInfo);
    var servers = pomelo.app.getServersByType(tableInfo.serverType);
    if (!servers || servers.length < 1) {
        next(new Error('can not find servers.'));
        return;
    }

    pomelo.app.rpc.hall.msgRemote.getRandTableNum(null, {gameServerType: tableInfo.serverType, rounds: tableInfo.roomConfig.rounds, uid: tableInfo.ownerUid || 0}, function (err, code, result) {
        logger.debug("获取一个房间号并关联到服务器:", err, code, result);
        if (err == null && code == Code.OK) {
            tableInfo.tableId = result.tableNum;
            tableInfo.huiFangNums = result.huiFangNums;
            next(null, result);
        } else {
            next(new Error('can not getRandTableNum'));
        }
    });
}

Instance.prototype.addAutoTable = function (autoTableInfo, cb) {
    this.autoTableCnfMap[autoTableInfo.id] = autoTableInfo;
    var self = this;
    packDao.getInfo(autoTableInfo.pid, function (err, pack) {
        if (!!err) {
            utils.invokeCallback(cb, err);
            return;
        }
        if (!!pack) {
            autoTableInfo.ownerUid = pack.ownerUid;
            self.createAutoTable(autoTableInfo, cb);
        } else {
            utils.invokeCallback(cb, '群不存在');
        }
    });
}

//删除房间
Instance.prototype.delAutoTable = function (tableId) {
    if (this.autoTableMap[tableId]) {
        this.autoTableMap[tableId] = null;
        delete this.autoTableMap[tableId];
        return true;
    }
    return false;
}

//删除房间
Instance.prototype.delAutoTableByPid = function (pid) {
    _.forOwn(this.autoTableMap, function (table) {
        if (table.stat.pid == pid) {
            this.autoTableMap[table.state.tableId] = null;
            delete this.autoTableMap[table.state.tableId];
        }
    });
}

/**
 * 删除自动房间配置
 * @param autoId
 * @returns {boolean}
 */
Instance.prototype.delAutoTableCnf = function(autoId) {
    if (this.autoTableCnfMap[autoId]) {
        this.closeAutoTableRpc(autoId);
        delete this.autoTableCnfMap[autoId];
        return true;
    }
    return false;
}

/**
 * 删除群所有自动房间配置
 * @param pid
 */
Instance.prototype.delAutoTableCnfByPid = function (pid) {
    _.forOwn(this.autoTableCnfMap, function (tableCnf) {
        if (tableCnf.pid == pid) {
            delete this.autoTableCnfMap[tableCnf.id];
            this.closeAutoTableRpc(tableCnf.id);
        }
    });
}

//过滤可访问的 桌子
Instance.prototype.filterTable = function (tables) {
    var rets = [];
    for (var idx = 0; idx < tables.length; idx++) {
        //var info = this.getAutoInfo(tables[idx].autoId);
        //if (info.bDisable == 0)
            rets.push(tables[idx]);
    }
    return rets;
}

//设置是否隐藏
Instance.prototype.setDisableAutoTable = function (autoid, bDisable) {
    var info = this.getAutoInfo(autoid);
    info.bDisable = bDisable;
}

//隐藏群房间
Instance.prototype.setHideByPid = function (pid, bHide) {
    _.forOwn(this.autoTableCnfMap, function (cnf) {
        if (cnf.pid == pid) {
            this.autoTableCnfMap[cnf.id].bHideRoom = bHide;
        }
    });
}

/**
 * 获得群房间列表
 * @param pid
 * @param isAll
 * @returns {Array}
 */
Instance.prototype.getPackTableList = function (pid, isAll) {
    logger.debug('getPackTableList1', pid, isAll)
    isAll = isAll || 0;
    var list = [];
    var self = this;
    var filterFn = function (table, extCnd) {
        extCnd = extCnd || true;
        logger.debug('getPackTableList2: %j', table.conf, pid, isAll, extCnd)
        if (table.conf.pid == pid) {
            if (isAll == 1 || (table.conf.bDisable == 0 && table.state.gameState != 1 && extCnd && table.state.isFull != 1)) {
                list.push(_.cloneDeep(table));
            }
        }
    };

    _.forOwn(self.autoTableMap, function (table) {
        //logger.debug('getPackTableList'/*, self.autoTableCnfMap*/);
        if (self.autoTableCnfMap[table.conf.id]) {
            filterFn(table, self.autoTableCnfMap[table.conf.id].bDisable == 0);
        } else if (isAll == 1) {
            list.push(table);
        }
    });

    _.forOwn(self.memberTableMap, function (table) {
        filterFn(_.cloneDeep(table));
    });

    return list;
}

/**
 *  获得一个空闲的房间
 * @param pid
 * @param uid
 * @param cb
 */
Instance.prototype.getPackFreeTable = function (pid, uid, cb) {
    var self = this;
    async.waterfall([
        function (next) {
            packPlayerDao.getPackPlayer(pid, uid, function (err, playerInfo) {
               if (!!err || !playerInfo) {
                   utils.invokeCallback(cb, '玩家不在群中');
                   return;
               }
               next(null, playerInfo);
            });
        },
        function (playerInfo, next) {
            var list = self.getPackTableList(pid, 0);
            if (!list || list.length < 1) {
                // 没有房间 新建
                next(null, playerInfo);
                return;
            }

            //logger.debug('quickJoin find ', pid, playerInfo, list);
            list = list.sort(function (a, b) {
                if (playerInfo.lastJoin == "" || a.state.tableType == b.state.tableType) {
                    return a.state.playerUids.length < b.state.playerUids.length ? 1 : -1;
                } else if (a.state.tableType == playerInfo.lastJoin ) {
                    return -1;
                } else if (b.state.tableType == playerInfo.lastJoin) {
                    return 1;
                } else {
                    return a.state.playerUids.length < b.state.playerUids.length ? 1 : -1;
                }
            }.bind(this));
            //logger.debug('quickJoin find2 ', list);
            cb(null, list[0]);
        },
        function (playerInfo, next) {
            // 新建一个
            var cnfs = self.getOneAutoCnf(pid, playerInfo.lastJoin);
            if (!cnfs || cnfs.length < 1) {
                cb('没有自动房间配置');
                return;
            }
            self.addAutoTable({pid: pid}, function (err, data) {
                if (!!err) {
                    cb(err);
                    return;
                }
                cb(null, data);
            });
        }
    ], function (err) {
        if (!!err) {
            utils.invokeCallback(cb, err, null);
            return;
        }
    });
}

Instance.prototype.getOneAutoCnf = function (pid, type) {
    var cnfs = [];
    _.forOwn(this.autoTableCnfMap, function (cnf) {
        if (cnf.pid == pid && (type == "" || cnf.serverType == type)) {
            cnfs.push(cnf);
        }
    });
    return cnfs;
}
/**
 * 玩家所在群
 * @param msg
 * @param cb
 */
Instance.prototype.getPlayerPackIds = function(msg, cb) {
    packPlayerDao.getPlayerPackIds(msg.uid, cb);
}

/**
 * 更新群房卡数据
 * @param msg
 * @param cb
 */
Instance.prototype.updatePackFangKa = function(msg, cb) {
    packDao.updatePackGemNum(msg.pid, msg.changeNum, function (err, resp) {
        if (!!err) {
            utils.invokeCallback(cb, err);
            return;
        }
        packLossDao.lossPackGemNum(msg.pid, msg.tableId, msg.changeNum, cb)
    });

}

//========================群消息相关========================================

Instance.prototype.notifyQuitPack = function (msg, cb) {
    var pid = msg.pid;
    var uid = msg.uid;
    if (this.packPlayers[pid] && this.packPlayers[pid][uid]){
        this.leavePackHallImp(pid, this.packPlayers[pid][uid]);
        delete this.packPlayers[pid][uid];
    }
    utils.invokeCallback(cb, null, null);
}

Instance.prototype.notifyPackState = function (msg, cb) {
    if (!msg.pid) {
        cb('俱乐部id不存在');
        return;
    }
    var self = this;
    packDao.getInfo(msg.pid, function (err, packInfo) {
       if (!!err || !packInfo) {
           cb('俱乐部不存在');
           return;
       }
        self.pushMsgToPackByUid(msg.pid, packInfo.ownerUid, PackEvent.packNotifyState, {pid: msg.pid});
    });
}
/**
 * 审核通过 通知玩家在线列表
 * @param pid
 * @param uid
 * @param packName
 */
Instance.prototype.notifyJoinPack = function (pid, uid, packName) {
    this.pushMsgToPackByUid(pid, uid, PackEvent.packNotifyJoin, {name: packName});
}

/**
 * 通知玩家 申请被拒绝
 * @param player
 * @param packName
 */
Instance.prototype.notifyRejectJoin = function (player, packName) {
    messageService.pushMessageToPlayer({
        uid: player.uid,
        sid: player.serverId
    }, PackEvent.packNotifyRejectJoin, {name: packName});
}
/**
 * 玩家登录
 * @param player
 * @param gaming
 */
Instance.prototype.enterPackHall = function (player, gaming) {
    var self = this;
    packPlayerDao.getPlayerPackMemberInfo(player.uid, function (err, data) {
        if (!!err || data.length < 1) {
            logger.debug('没有加入群');
            return;
        }

        var playerInfo = {
            uid:        player.uid,
            nickName:   player.nickName,
            headUrl:    player.headUrl,
            vipLevel:   player.vipLevel,
            serverId:   player.serverId,
            online:     gaming == 1 ? 2 : 1
        }

        var pList = {};
        data.map(function (d) {
            var pid = d.pid;
            if (!self.packPlayers[pid]) {
                self.packPlayers[pid] = {};
            }

            if (!self.packPlayers[pid][player.uid]){
                //logger.debug('enterPackHall', pid, player.uid, player.nickName);
                playerInfo.notice = data.notice;
                self.packPlayers[pid][player.uid] = playerInfo;

                pList[pid] = _.values(self.packPlayers[pid]);
                self.enterPackHallImp(pid, playerInfo)
            } else {
                logger.error('玩家为什么会加入两次群频道？', pid, player.uid, player.nickName)
            }
        }.bind(this));
        setTimeout(function () {
            self.pushMsgToPackByUid(data[0].pid, player.uid, PackEvent.packNotifyOnlineList, pList);
        }, 200);

    });
}

Instance.prototype.leavePackHall = function (uid) {
    var self = this;
    packPlayerDao.getPlayerPackIds(uid, function (err, data) {
        if (!!err || data.length < 1) {
            logger.debug('没有加入群');
            return;
        }

        data.map(function (d) {
            var pid = d.pid;
            if (self.packPlayers[pid] && self.packPlayers[pid][uid]){
                self.leavePackHallImp(pid, self.packPlayers[pid][uid]);
                delete self.packPlayers[pid][uid];
            }
        }.bind(this));
    });
}

// 进入群大厅为了通知数据
Instance.prototype.enterPackHallImp = function (pid, user, cb) {
    logger.debug('enterPackHall1',pid, /*msg,*/ user.uid, user.serverId);

    if(!!user) {
        var channelName = channelUtil.getPackChannelName(pid);
        var channel = this.app.get('channelService').getChannel(channelName,true);
        logger.debug('enterPackHallImp', /*channel,*/ channelName);
        if (!!channel) {
            channel.pushMessage(PackEvent.packNotifyPlayerEnter, {pid: pid, user: user}, function (err, data) {
                if (!!err) {
                    logger.error('push player enter pack error!!', pid, user);
                }
                channel.add(user.uid, user.serverId);
                utils.invokeCallback(cb, null, null);
            } );

            //this.pushMsgToPackByUid(pid, msg.uid, 'onlineList', this.packPlayers[pid]);
        } else {
            utils.invokeCallback(cb, null, null);
        }
    } else {
        utils.invokeCallback(cb, null, null);
    }
}


Instance.prototype.leavePackHallImp = function (pid, user, cb) {
    logger.debug('leavePackHall',pid/*, msg*/);
    var channelName = channelUtil.getPackChannelName(pid);
    var channel = this.app.get('channelService').getChannel(channelName, false);
    if (!!channel) {
        channel.leave(user.uid, user.serverId);
        user.online = 0;
        channel.pushMessage(PackEvent.packNotifyPlayerLeave, {pid: pid, user: user}, function() {
            utils.invokeCallback(cb, null, null);
        });
    }
}

// 推送消息
Instance.prototype.pushMsgToPackAllPlayer = function (pid, eventType,  msg) {
    logger.debug('pushMsgToPackPlayers', pid, eventType/*,  msg*/);
    var channelName = channelUtil.getPackChannelName(pid);
    var channel = this.app.get('channelService').getChannel(channelName, false);
    if (!!channel) {
        channel.pushMessage(eventType,  msg, function (err) {

        });
        return true;
    }
    return false;
}

Instance.prototype.pushMsgToPackByUid= function (pid, uid, eventType, msg) {
    logger.debug('pushMsgToPackPlayer', pid, uid, eventType/*,  msg*/);
    var channelName = channelUtil.getPackChannelName(pid);
    var channel = this.app.get('channelService').getChannel(channelName, false);
    var tuid = uid;
    if (!channel)
        return;
    var member = channel.getMember(tuid);
    logger.debug('pushMsgToPackByUid2', /*channel,*/ member);
    if (!!channel && !!member) {
        var tsid = member['sid'];
        //this.app.get('channelService').pushMessageByUids(eventName, msg, [{uid: record.uid, sid: record.sid}], cb);
        this.app.get('channelService').pushMessageByUids(eventType, msg, [{uid: uid, sid: tsid}], function(err, res){
            if(err){
                logger.error("广播玩家信息失败1,ID: %j", eventType);
                logger.error(err.stack);
                return false;
            }else{
                //logger.debug("广播玩家信息成功,ID: %j", eventType);
                return true;
            }
        });
    }
    return false;
}