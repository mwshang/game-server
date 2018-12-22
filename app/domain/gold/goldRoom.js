
var logger = require('pomelo-logger').getLogger('gold-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var pomelo = require('pomelo');
var consts = require('../../consts/consts');
var sync2HallType = require('../../consts/consts').Sync2HallType;

var GoldRoom = function (app, room) {
    //当前APP
    this.app = app;
    this.room = room;
};

var Instance = GoldRoom.prototype;
module.exports = GoldRoom;

Instance.__defineGetter__('players', function () {
    return this.room.players;
})
/**
 * 进入金币场
 * @param e
 * @param msg
 * @returns {*}
 */
Instance.enterGoldTable = function (e, msg) {
    var players = this.room.players;
    var priTable = {};
    if(!!players[e.uid]){
        logger.error("玩家已经在游戏中了");
        priTable = {};
        priTable["error"] = "玩家已经在游戏中了";
        return priTable;
    }
    //查看桌子ID是否存在
    priTable = this.getGoldTable();
    //logger.debug('enterGoldTable', priTable);
    if (priTable == null){
        priTable = {};
        priTable["error"] = "没有此房间号";
        logger.error("没有此房间号");
        return priTable;
    }

    if (priTable["table"].addPlayer(e) == false){
        logger.error("进入房间失败");
        priTable["error"] = "进入房间失败";
        return null;
    }
    players[e.uid] = e;
    players[e.uid]["tableId"] = priTable["tableId"];
    this.room.playerNum++;
    logger.debug('玩家进入私人房间 = %j', e);

    return priTable;
}

/**
 * 获取一个空闲的金币场桌子
 * @returns {*}
 */
Instance.getGoldTable = function() {
    for (var i = 0; i < this.room.privateTables.length; i++) {
        var priTable = this.room.privateTables[i];
        if (priTable.isGold && priTable.isGold == 1 && priTable.table.isFull() != 1) {
            return priTable;
        }
    }
    // 没有找到空闲桌子就创建
    return null;
};

/**
 *
 * @returns {boolean}
 */
Instance.hasFreeGoldTable = function () {
    for (var i = 0; i < this.room.privateTables.length; i++) {
        var priTable = this.room.privateTables[i];
        if (priTable.isGold && priTable.isGold == 1 && priTable.table.isFull() != 1) {
            return true;
        }
    }
    return false;
}

/**
 * 创建金币场房间
 * @param roomConfig
 * @returns {*}
 */
Instance.createGoldTable = function (roomConfig) {

    this.room.initPrivateTable(roomConfig);
    logger.error("创建桌子成功。");
    var newTable = this.room.getPrivateTable(roomConfig["tableId"]);
    newTable.isGold = roomConfig.isGold;
    return newTable;
}

/**
 * 更新金币数量
 * @param playerUid
 * @param addVal
 */
Instance.updateGoldNum = function(playerUid, addVal) {
    if(!!this.players[playerUid]){
        this.players[playerUid]["addGold"] = addVal;
        this.players[playerUid]["goldNum"] += addVal;

        this.room.updateUser2Hall(playerUid, sync2HallType.goldNum);
    }
};