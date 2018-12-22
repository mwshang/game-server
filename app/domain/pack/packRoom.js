
var pomelo = require('pomelo');
var async = require('async');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var utils = require('../../util/utils');
var channelUtil = require('../../util/channelUtil');
var messageService = require('../../services/messageService');


var Instance = function (opts) {
    this.app = opts.app;
}


module.exports = Instance;

/**
 *
 * @param tableId
 * @returns {boolean}
 */
Instance.prototype.isRealRePrivateTable = function (tableId) {
    var priTable = this.app.get('roomMgr').getPrivateTable(tableId);
    if (priTable == null){
        logger.error("没有找到私人房间！");
        return false;
    }
    return priTable["reCreatePrivateTable"] == 1;
}

/**
 * 是否俱乐部付费模式
 * @returns {*}
 */
Instance.prototype.isPackLossMode = function (tableId) {
    var priTable = this.app.get('roomMgr').getPrivateTable(tableId);
    if (priTable == null){
        logger.error("没有找到私人房间！");
        return false;
    }
    //logger.debug('isPackLossMode', priTable["packLossMode"]);
    return priTable["packLossMode"] && priTable["packLossMode"] == 2;
}

/**
 * table 所属俱乐部
 * @param tableId
 * @returns {*}
 */
Instance.prototype.getTableOwnPackId = function (tableId) {
    var priTable = this.app.get('roomMgr').getPrivateTable(tableId);
    if (priTable == null) {
        logger.error("没有找到私人房间！");
        return 0;
    }

    return priTable["pid"] || 0;
}

/**
 * 俱乐部房间消耗
 * @param tableId
 * @param aaGem
 * @param roundsNum
 * @param fangNum
 * @param isOver
 */
Instance.prototype.packTableLoss = function (tableId, aaGem, roundsNum, fangNum, isOver) {
    logger.debug("俱乐部房卡消耗0:", aaGem, isOver, roundsNum);
    if (roundsNum == 1 && aaGem < 2 && !isOver) {
        logger.debug("俱乐部房卡消耗1:" + fangNum);
        this.updateFangnka2Pack(tableId,-fangNum);
        return;
    }
    //大赢家付费、结算的时候
    if (aaGem == 2 && roundsNum > 1 && isOver > 0) {
        logger.debug("俱乐部房卡消耗2:" + fangNum);
        this.updateFangnka2Pack(tableId,-fangNum);
        return;
    }
}

/**
 * 俱乐部扣费
 * @param tableId
 * @param fangka
 */
Instance.prototype.updateFangnka2Pack = function (tableId, fangka) {
    logger.debug("代开扣费1");
    var priTable = this.app.get('roomMgr').getPrivateTable(tableId);
    if (!priTable || !priTable["tableOwner"]){
        return;
    }
    logger.debug("代开扣费2");
    var session = null;
    if (this.isPackLossMode(priTable.tableId) == true && !!priTable.pid) {
        logger.debug("代开扣费3");
        // 群相关扣费
        this.app.rpc.hall.packRemote.updatePackFangKa(session,
            { pid: priTable.pid, tableId: tableId, changeNum: fangka },
            function (err) {
                if (!!err) {
                    logger.error('2发送给大厅服务器更新玩家信息失败 %j', err);
                }
            });
    }
}