
var logger = require('pomelo-logger').getLogger('pack-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var consts = require('../../consts/consts');
var timerGame = require('../../util/timerGame');
var playerDao = require('../../dao/playerDao');
var packDao = require('../../dao/packDao');
var packGameRecordDao = require('../../dao/packGameRecordDao');
var packConfig  = require('../../../config/pack');
var _ = require('lodash');

var Pack = function (app) {
    //当前APP
    this.app = app;
};

var Instance = Pack.prototype;

Instance.__defineGetter__('roomMgr', function () {
    return this.app.get('roomMgr');
});

Instance.__defineGetter__('packLossMode', function () {
    return packConfig.packLossMode || 1;
});
//*****************************自动桌子**************************

Instance.getWillNeedGemNum = function (pid, msg) {
    //logger.debug('getWillNeedGemNum', msg, this.roomMgr.isNeedGem);
    if(this.roomMgr.isNeedGem == 0 ) {
        return 0;
    }
    //去掉已经代开的
    /*
    var oldNum = 0;
    for (var i = 0; i < this.roomMgr.privateTables.length; i++){
        var table = this.roomMgr.privateTables[i];
        //logger.debug('reCreatePrivateTable->gem', table["pid"], pid, table["reCreatePrivateTable"] );
        if (table["pid"] == pid && table["reCreatePrivateTable"] > 0)
        {
            oldNum += this.roomMgr.getNeedFangKa(this.roomMgr.privateTables[i]["config"]);
        }
    }
    */

    var cost = this.roomMgr.getNeedFangKa(msg);
    //logger.debug('getWillNeedGemNum', cost);
    return cost;
}


/**
 * 俱乐部开放消耗检测
 * @param tableInfo
 * @param roomCfg
 * @param packInfo
 * @param isAuto
 * @param cb
 */
Instance.reCreatePrivateTable = function(tableInfo, roomCfg, packInfo, isAuto, cb) {
    var self = this;
    var oldNum = tableInfo.oldCost;
    //logger.debug('============',tableInfo)
    // for (var i = 0; i < this.roomMgr.privateTables.length; i++){
    //     var table = this.roomMgr.privateTables[i];
    //
    //     if (table["pid"] == tableInfo.pid && table["reCreatePrivateTable"] > 0) {
    //         oldNum += this.roomMgr.getNeedFangKa(table["config"]);
    //         //logger.debug('fffff', oldNum, table.tableId, table["config"]);
    //     }
    // }

    if (this.packLossMode == 2) {
        // 俱乐部付费模式
        var imsg = _.cloneDeep(roomCfg);
        imsg.aaGem = 0;     //  俱乐部扣费都按房主付费计算
        var cost = this.roomMgr.isNeedGem == 1 ? this.roomMgr.getNeedFangKa(imsg) : 0;
        if (imsg.serverType == 'shisanshui' && imsg.wanFaType == 1) {
            cost = cost * 2;
        }
        logger.debug('reCreatePrivateTable->gem', packInfo.gemNum, oldNum, cost);
        if(this.roomMgr.isNeedGem == 1 && !!packInfo && packInfo.gemNum < cost + oldNum){
            self.app.rpc.hall.packRemote.delAutoTableRpc(null, {autoId: tableInfo.id}, function (err, data) {
                logger.error('reCreatePrivateTable->delAutoTableRpc', '钻石不足,删除配置');
            });
            utils.invokeCallback(cb, "钻石不足,请充值");
            return;
        }
        utils.invokeCallback(cb, null, cost);
    } else {
        // 正常扣费模式
        var cost = this.roomMgr.isNeedGem == 1 ? this.roomMgr.getNeedFangKa(roomCfg) : 0;
        logger.debug('正常扣费模式-reCreatePrivateTable', roomCfg.aaGem, tableInfo.pid, roomCfg, cost, oldNum);
        if (cost + oldNum == 0 ){
            utils.invokeCallback(cb, null, 0);
            return;
        }
        self.app.rpc.hall.msgRemote.checkPlayerEnoughGem(null, {uid: roomCfg.uid, needNum: cost + oldNum}, function (err, hasEnoughGem) {
            if (!!err ) {
                logger.error("创建用户不存在");
                utils.invokeCallback(cb, err);
                return;
            }
            if(!hasEnoughGem){
                logger.error("钻石不足,请充值");
                utils.invokeCallback(cb, "钻石不足,请充值");
                return;
            }
            utils.invokeCallback(cb, null, cost);
        });
    }
};

/**
 * 俱乐部房间事件处理
 * @param event
 * @param data
 */
Instance.onTableEvent = function (event, data) {
    var newTable = this.roomMgr.getPrivateTable(data.tableId);
    logger.debug('onTableEvent', event, data);
    switch (event) {
        // 房间结束通知
        case "tableClose":
        case "tableOver": {
            if (!newTable['isOver'] || newTable['isOver'] != 1) {
                //通知解散房间&&记录战绩
                var post = {
                    pid: newTable.pid,
                    tableId: data.tableId,
                    isAuto: newTable.isAuto,
                    autoId: newTable.autoId,
                    tableType: newTable.tableType,
                    data: data
                };

                if (event == "tableOver") {
                    newTable['isOver'] = 1;
                    packGameRecordDao.addRecord(post, newTable, event == "tableOver" ? 1 : 0, function (err, ret) {
                        logger.debug('notify addRecord!');
                    });
                }

                pomelo.app.rpc.hall.packRemote.closeTablePush(null, post, function (err, data) {
                    logger.debug('notify tableClose!');
                });

                newTable.table.emitter.removeAllListeners('tableClose');
                newTable.table.emitter.removeAllListeners('onTableOver');
            }
            break;
        }

        // 房间人数变化通知
        case "table_player_change": {
            //通知解散房间&&记录战绩
            pomelo.app.rpc.hall.packRemote.tablePlayerChange(
                null,
                {pid:newTable.pid, tableId:newTable.tableId, isAuto: newTable.isAuto, autoId: newTable.autoId, data: data},
                function (err, data) { logger.debug('notify table_player_change!'); }
            );
            break;
        }

        // 房间游戏开始通知
        case "table_game_started": {
            //通知解散房间&&记录战绩
            pomelo.app.rpc.hall.packRemote.tableGameStart(
                null,
                {pid:newTable.pid, tableId:newTable.tableId, isAuto: newTable.isAuto, autoId: newTable.autoId},
                function (err, data) {
                    logger.debug('notify table start!');
                }
            );
            break;
        }
    }
}

Instance.createTableImp = function(isAuto, tableInfo, packInfo, cb) {
    //logger.debug('createTableImp', tableInfo);
    var self = this;
    var roomConfig = typeof tableInfo.roomConfig === 'string' ? JSON.parse(tableInfo.roomConfig) : tableInfo.roomConfig;
    roomConfig.huiFangNums = tableInfo.huiFangNums;
    roomConfig.tableId = tableInfo.tableId;
    //roomConfig.uid = tableInfo.ownerUid;

    self.reCreatePrivateTable(tableInfo, roomConfig, packInfo, isAuto, function (err, cost) {
        logger.debug('reCreatePrivateTable', err);
        if (!!err) {
            utils.invokeCallback(cb, err);
            return;
        }

        logger.debug('reCreatePrivateTable', '创建私有桌子');
        //创建私有桌子
        roomConfig["reCreatePrivateTable"] = isAuto == 1 ? 1 : 2;
        self.roomMgr.initPrivateTable(roomConfig);

        var newTable = self.roomMgr.getPrivateTable(roomConfig.tableId);

        //newTable["tableOwner"] = tableInfo.pid;
        newTable["pid"] = tableInfo.pid;
        newTable["isAuto"] = isAuto;
        newTable["autoId"] = tableInfo.id;
        newTable['packLossMode'] = self.packLossMode;
        logger.debug("创建群房间2", newTable.tableId);

        // 房间结束通知
        newTable.table.emitter.once('tableOver', self.onTableEvent.bind(self, 'tableOver'));

        newTable.table.emitter.once('tableClose', self.onTableEvent.bind(self, 'tableClose'))

        // 房间人数变化通知
        newTable.table.emitter.on('table_player_change', self.onTableEvent.bind(self, 'table_player_change'));

        // 房间游戏开始通知
        newTable.table.emitter.on('table_game_started', self.onTableEvent.bind(self, 'table_game_started'));

        //return newTable;
        utils.invokeCallback(cb, null, {
            tableId: newTable.tableId,
            pid: tableInfo.pid,
            tableOwner: newTable.tableOwner,
            reCreatePrivateTable: newTable.reCreatePrivateTable,
            tableCost: cost,
            tableType: newTable.tableType,
            playerUids: newTable.table.tablePlayers || [],
            maxPerson: roomConfig.person || 4,
            gameState: 0,
            isAuto: isAuto
        });
    });

}
//创建自动房间
Instance.createAutoTable = function (autoTableInfo, cb) {
    var self = this;
    packDao.getInfo(autoTableInfo.pid, function (err, packInfo) {
        logger.debug("创建自动桌子1", packInfo == null);
        if (!!packInfo) {
            self.createTableImp(1, autoTableInfo, packInfo, cb);

            //logger.debug("创建自动桌子3", self.roomMgr.privateTables.length);
        } else {
            logger.error("createAutoTable", '群不存在');
            utils.invokeCallback(cb, '群不存在');
        }
    });
}

//创建成员房间
Instance.createMemberTable = function (tableInfo, cb) {
    var self = this;
    packDao.getInfo(tableInfo.pid, function (err, packInfo) {
        logger.debug("创建成员房间:%j", tableInfo);
        if (!!packInfo) {
            self.createTableImp(0, tableInfo, packInfo, cb);

            //logger.debug("创建成员房间:%j", tableInfo);
            //logger.debug("创建成员房间:%j", self.roomMgr.privateTables.length);
        } else {
            utils.invokeCallback(cb, '群不存在');
        }
    });
}

// 根据群号获取该群的房间
Instance.getPackTables = function (pid) {
    logger.debug("reTablesList 1:" + this.roomMgr.privateTables.length);
    var list = [];
    for (var i = 0; i < this.roomMgr.privateTables.length; i++) {
        var reTable = this.roomMgr.privateTables[i];
        logger.debug("reTable1:" + reTable["tableOwner"]);
        logger.debug("reTable2:" + reTable["reCreatePrivateTable"]);
        if (reTable["pid"] == pid && reTable["table"].isGameing() == false) {
            var proList = {};

            proList["tableId"] = reTable["tableId"];
            proList["playerCount"] = reTable["table"].getPlayerNumbers();
            proList["tableType"] = reTable["tableType"];
            proList["pid"] = reTable["pid"];
            proList["isAuto"] = reTable["isAuto"];
            proList["autoId"] = reTable["autoId"];
            for (var tem in reTable["config"]) {
                proList[tem] = reTable["config"][tem];
            }

            list.push(proList);
        }
    }

    return list;
}

//自动桌子开启，就再开一个房间 广播
Instance.tableStartReAuto = function (tableId) {
    var table = this.roomMgr.getPrivateTable(tableId);
    if (table.isAuto == 1) {
        var msg = {
            autoId: table.autoId,
            tableId: tableId
        }
        logger.debug("发送重新开启新桌子请求:" + table.autoId);
        pomelo.app.rpc.hall.packRemote.reCreateAutoTableRpc(null, msg, function (err, ret) {
            //this.createAutoTable(this.autoTables[table.autoId]);
            //logger.debug("重新开一个自动桌子:"+table.autoId);
        });
    }
}

module.exports = Pack;