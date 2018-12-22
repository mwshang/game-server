
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(pomelo.app.getServerType()+'-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');

var sync2HallType = require('../../consts/consts').Sync2HallType;
var timerGame =  require('../../util/timerGame');
var ai = require('../ai/ai');
var _ = require('lodash');

var Instance = function(app){
    this.initRoomCls();
    //当前APP
    this.app = app;
    this.serverType=this.app.getServerType();
    logger.error("Room Init:"+this.serverType);
    //当前房间玩家
    this.players = {};
    //当前房间桌子
    this.tables = [];
    //当前玩家数量
    this.playerNum = 0;
    //私有房间桌子
    this.privateTables = [];
    //系统消息
    this.playersMsg = []
    //房间号随机数组
    this.randTableNum = [];

    //计时器
    this.timer = new timerGame(
        {
            delegate : this,
            interval : 60000
        });

    //AI
    this.aiManager = ai.createManager({aiType: this.AiType});

    //读取配置文件、加载桌子数量 房间金钱赌注相关信息
    this.start();
};

module.exports = Instance;

Instance.prototype.__defineGetter__("Players", function() { return this.players; });
Instance.prototype.__defineGetter__("PlayerNum", function() { return this.playerNum; });
Instance.prototype.__defineGetter__("PrivateTables", function() { return this.privateTables; });
Instance.prototype.__defineGetter__("Tables", function() { return this.tables; });
Instance.prototype.__defineGetter__("AiManager", function() { return this.aiManager; });

//是否需要房卡 默认需要 活动期间可能不需要 打完第一把扣除
//是否需要房卡 默认需要 活动期间可能不需要 打完第一把扣除
Instance.prototype.__defineGetter__("isNeedGem", function() { return this.app.get(this.serverType)["isNeedGem"]; });
//65535以上的桌子ID是私人房间 以下是普通房间
Instance.prototype.__defineGetter__("PRI_TABLE_INDEX", function() { return this.app.get(this.serverType)["privateTableNumber"][this.app.getServerId()]; });
Instance.prototype.__defineGetter__("gameType", function() { return this.app.get(this.serverType)["gameType"]; });

//ai 配置
Instance.prototype.__defineGetter__("AiType", function () { return this.app.get(this.serverType)["AiType"];});

//初始化子类中的 桌子
Instance.prototype.initRoomCls = function()
{
    this.TablesCls=null;  //桌子类
    throw new Error('function must override ! to sub table Class');
}
Instance.prototype.start = function () {
    this.initTables();
    //this.timer.run();
    this.aiManager.start();
};

Instance.prototype.initTables = function () {
    var serverId = this.app.getServerId();
    logger.debug('serverId:', serverId);

    //this.updateRandTableNum();
};

/**
 * 更新游戏次数
 * @param table
 * @param time
 */
Instance.prototype.updatePlayedTime = function (table, time) {
    for (var playerUid in table.playerUids) {
        if (!!this.players[playerUid]) {
            this.players[playerUid]["times"] = time;
            this.players[playerUid]["playedTime"] += time;
            this.updateUser2Hall(playerUid, sync2HallType.playedTime);
        }
    }
};

/**
 * 更新金币数量
 * @param playerUid
 * @param addVal
 */
Instance.prototype.updateGoldNum = function (playerUid, addVal) {
    if (!!this.players[playerUid]) {
        this.players[playerUid]["addGold"] = addVal;
        this.players[playerUid]["goldNum"] += addVal;
        this.updateUser2Hall(playerUid, sync2HallType.goldNum);
    }
};

/**
 玩家离开房间
 */
Instance.prototype.removePlayer = function (uid, type) {
    var players = this.players;
    var e = players[uid];
    if (!e) {
        logger.error('玩家不在%s房间', this.serverType, uid);
        return false;
    }
    var thisTable = this.getTableByUid(uid);
    if (thisTable == null) {
        logger.error('没有找到桌子');
        return false;
    }
    if (thisTable.removePlayer(uid, type) == false) {
        logger.error("移除玩家失败~~");
        return false;
    }
    delete players[uid];
    this.playerNum--;
    return true;
};

Instance.prototype.getPlayer = function (uid) {
    var entityId = this.players[uid];
    if (!!entityId) {
        return entityId;
    }
    return null;
};

/*更新玩家信息 table to room
 * */
Instance.prototype.updatePlayer = function (user) {
    if (!!this.players[user.uid]) {
        this.players[user.uid]["fangKa"] = user["fangKa"];
        this.players[user.uid]["gemNum"] -= user["fangKa"];
        this.updateUser2Hall(user.uid, sync2HallType.fangKa);
    }
};

Instance.prototype.updatePlayerServerInfo = function (uid, serverId, ip) {
    if (!!this.players[uid]) {
        this.players[uid]["serverId"] = serverId;
        this.players[uid]["ip"] = ip;
    }
};

/*
 * 推送消息大厅更新玩家数据
 */
Instance.prototype.updateUser2Hall = function (uid, type) {
    var entityId = this.players[uid];
    if (entityId == null || !entityId) {
        logger.error("未知的玩家");
        return;
    }
    var session = null;

    if (type == sync2HallType.playerInfoMsg) {
        this.app.rpc.hall.msgRemote.updatePlayerFromGame(session, {"msg": entityId, "type": type}, function (err) {
            if (!!err) {
                logger.error('1发送给大厅服务器更新玩家信息失败 %j', err);
            }
        });
    }
    if (type == sync2HallType.fangKa) {
        this.app.rpc.hall.msgRemote.updatePlayerFromGame(session, {"msg": entityId, "type": type}, function (err) {
            if (!!err) {
                logger.error('2发送给大厅服务器更新玩家信息失败 %j', err);
            }
        });
    }
    if (type == sync2HallType.playedTime) {
        this.app.rpc.hall.msgRemote.updatePlayerFromGame(session, {"msg": entityId, "type": type}, function (err) {
            if (!!err) {
                logger.error('3发送给大厅服务器更新玩家信息失败 %j', err);
            }
        });
    }
    if (type == sync2HallType.goldNum) {
        this.app.rpc.hall.msgRemote.updatePlayerFromGame(session, {"msg": entityId, "type": type}, function (err) {
            if (!!err) {
                logger.error('3发送给大厅服务器更新玩家信息失败 %j', err);
            }
        });
    }
};

Instance.prototype.updateFangka2Hall = function (tableId, fangka) {
    logger.debug("代开扣费1");
    var priTable = this.getPrivateTable(tableId);
    if (!priTable || !priTable["tableOwner"]) {
        return;
    }
    logger.debug("代开扣费2");
    var session = null;
    if (!!priTable.pid) {
        // 群相关扣费
        this.app.rpc.hall.packRemote.updatePackFangKa(session,
            { pid: priTable.pid, tableId: tableId, changeNum: fangka },
            function (err) {
                if (!!err) {
                    logger.error('2发送给大厅服务器更新玩家信息失败 %j', err);
                }
            });
    } else {
        this.app.rpc.hall.msgRemote.updatePlayerFromGame(session,
            {"uid": priTable["tableOwner"], "type":sync2HallType.fangKaOffline,"fangKa":fangka},
            function(err){
                if(!!err){
                    logger.error('2发送给大厅服务器更新玩家信息失败 %j', err);
                }
            });
    }
};

/*
 返回当前UID的桌子
 * */
Instance.prototype.getTableByUid = function (uid) {
    if (!this.players[uid]) {
        logger.error("没有找到当前玩家:" + uid);
        return null;
    }
    var index = this.players[uid]["tableId"];
//    logger.debug("当前玩家在第几个桌子：" + index);
    var priTable = this.getPrivateTable(index);
    if (priTable != null) {
        return priTable["table"];
    } else {
        logger.error("没有找到私人房间！");
        return null;
    }
};

Instance.prototype.isEmpty = function () {
    return this.playerNum === 0;
};



/**
 * 创建金币场房间
 * @param msg
 * @param player
 * @returns {*}
 */
Instance.prototype.createGoldTable = function () {
    var msg = {
        isGold: 1,
        rounds: 4,
        isLaiZi: 1,
        isPingHuNoPao: 0,
        isBuBuGao: 0,
        isJinTongYuNv: 0,
        isYiZhiHua: 0,
        isSanTong: 0
    };

    this.initPrivateTable(msg);
    logger.error("创建桌子成功。");
    return this.getPrivateTable(msg["tableId"]);
}

/**
 * 创建房间小号房卡数量
 * @param msg
 */
Instance.prototype.getNeedFangKa = function (msg) {
    throw new Error('function getNeedFangKa must override !!');
}

Instance.prototype.isNeedFangKa = function (msg, player, isCreate) {
    if (!msg || !player) return false;
    var fangNum = this.getNeedFangKa(msg);

    if (msg.aaGem == 0 && isCreate == false) {
        fangNum = 0;
    }
    if (this.isNeedGem == 1 && !!player && player.gemNum < fangNum) {

        return true;
    }
    return false;
}
/**
 创建一个私有房间 记录此房间ID 房主UID 房间名字 密码
 */
Instance.prototype.createPrivateTable = function (msg, player) {
    //房间名字是否重复
    var priTable = {};

    if (this.isNeedFangKa(msg, player, true)) {
        logger.error("房卡不足,请找代理充值");
        priTable["error"] = "房卡不足,请找代理充值";
        return priTable;
    }

    //当前玩家是否已经在游戏中了
    if (this.getTableByUid(msg.uid) != null) {
        logger.error("数据异常,请重新登录");
        priTable["error"] = "数据异常,请重新登录";
        return priTable;
    }

    //创建私有桌子
    this.initPrivateTable(msg);
    //房主进入房间
    var priTab = this.enterPrivateTable(player, msg);
    if (priTab == null || !!priTab.error) {
        logger.error("进入私人房间失败???");
        this.leavePrivateRoom(msg.uid, 1);
        return priTab;
    }
    priTable = this.getPrivateTable(msg["tableId"]);
    if (priTable != null) {
        return priTable;
    } else {
        logger.error("没有找到私人桌子？");
        priTable["error"] = "服务器异常,请重启稍后再试";
        return priTable;
    }
};

//代开
Instance.prototype.reCreatePrivateTable = function (msg, player) {
    //房间名字是否重复
    var priTable = {};

    //去掉已经代开的
    var oldNum = 0;
    for (var i = 0; i < this.privateTables.length; i++) {
        if (this.privateTables[i]["tableOwner"] == msg.uid && this.privateTables[i]["reCreatePrivateTable"] > 0) {
            oldNum += this.getNeedFangKa(this.privateTables[i]["config"]);
        }
    }
    msg.aaGem = 0;
    var fangNum = this.getNeedFangKa(msg);
    if (this.isNeedGem == 1 && !!player && player.gemNum < fangNum + oldNum) {
        logger.error("房卡不足,请找代理充值");
        priTable["error"] = "房卡不足,请找代理充值";
        return priTable;
    }
    //创建私有桌子
    msg["reCreatePrivateTable"] = 1;
    this.initPrivateTable(msg);

    return priTable;
};

Instance.prototype.initConfig = function(msg)
{
    var tableConfig = {};
    //房间配置
    tableConfig["banker"] = msg.banker;
    tableConfig["rounds"] = msg.rounds;
    tableConfig["diScore"] = msg.diScore;
    tableConfig["aaGem"] = msg.aaGem;
    tableConfig["person"] = msg.person;
    tableConfig["isGold"] = msg.isGold;
    tableConfig["laZi"] = msg.laZi;
    tableConfig["huiFangNums"] = msg.huiFangNums;

    return tableConfig;
}
/**
 初始化私有房间信息
 */
Instance.prototype.initPrivateTable = function (msg) {
   // throw new Error('function initPrivateTable must override !!');
    var tableConfig = this.initConfig(msg);

    var priTable = {};
    priTable["reCreatePrivateTable"] = msg.reCreatePrivateTable != null ? msg.reCreatePrivateTable : 0;
    priTable["tableType"] = this.gameType;

    priTable["tableId"] = msg.tableId;//this.popTableNum();
    priTable["table"] =new this.TablesCls({index: priTable["tableId"], app: this.app, config: tableConfig});
    priTable["tableName"] = msg.tableName;
    priTable["tableOwner"] = msg.uid;
    priTable["config"] = tableConfig;
    priTable["isGold"] = msg.isGold;
    this.privateTables.push(priTable);

    //返回给客户端用
    msg["tableId"] = priTable["tableId"];
};


/**
 进入私有房间
 */
Instance.prototype.enterPrivateTable = function (e, msg) {
    var players = this.players;
    var priTable = {};
    if (!!players[e.uid]) {
        logger.error("玩家已经在游戏中了");
        priTable = {};
        priTable["error"] = "玩家已经在游戏中了";
        return priTable;
    }
    //查看桌子ID是否存在
    priTable = this.getPrivateTable(msg["tableId"]);
    if (priTable == null) {
        priTable = {};
        priTable["error"] = "没有此房间号";
        logger.error("没有此房间号");
        return priTable;
    }
    var config = priTable["config"];

    if (this.isNeedFangKa(config, e, false)) {
        priTable = {};
        logger.error("房卡不足,请找代理充值");
        priTable["error"] = "房卡不足,请找代理充值";
        return priTable;
    }
    if (priTable["table"].isFull() == 1) {
        priTable["error"] = "房间人数已满";
        logger.error("房间人数已满");
        return priTable;
    }

    // 如果是群房间 判断用户是否在群中
    logger.debug('enterPrivateTable', priTable.pid, msg.pids, e.uid);
    if (priTable.pid && _.findIndex(msg.pids, ['pid', priTable.pid - 0]) == -1) {
        // @todo 验证pid
        priTable = {};
        priTable["error"] = "不在群中，无法加入群房间";
        logger.error("不在群中，无法加入群房间");
        return priTable;
    }

    if (priTable["table"].addPlayer(e) == false) {
        logger.error("进入房间失败");
        priTable["error"] = "进入房间失败";
        return null;
    }
    players[e.uid] = e;
    players[e.uid]["tableId"] = msg["tableId"];
    this.playerNum++;
    logger.debug('玩家进入私人房间 = %j', e);

    return priTable;
};

/**
 * 进入金币场
 * @param e
 * @param msg
 * @returns {*}
 */
Instance.prototype.enterGoldTable = function (e, msg) {
    var players = this.players;
    var priTable = {};
    if (!!players[e.uid]) {
        logger.error("玩家已经在游戏中了");
        priTable = {};
        priTable["error"] = "玩家已经在游戏中了";
        return priTable;
    }
    //查看桌子ID是否存在
    priTable = this.getGoldTable();
    if (priTable == null) {
        priTable = {};
        priTable["error"] = "没有此房间号";
        logger.error("没有此房间号");
        return priTable;
    }

    if (priTable["table"].addPlayer(e) == false) {
        logger.error("进入房间失败");
        priTable["error"] = "进入房间失败";
        return null;
    }
    players[e.uid] = e;
    players[e.uid]["tableId"] = priTable["tableId"];
    this.playerNum++;
    logger.debug('玩家进入私人房间 = %j', e);

    return priTable;
}

Instance.prototype.deletePriTable = function (index) {
    logger.debug("删除私人房间:" + this.privateTables.length);
    for (var i = 0; i < this.privateTables.length; i++) {
        var priTable = this.privateTables[i];
        if (priTable["tableId"] == index) {
            logger.debug("私人桌没有人了 解散");
            priTable['table'].emitter.emit('tableClose', {tableId: priTable["tableId"], bigWinner: [], result: []});
            priTable["table"].close();
            priTable["table"] = null;
            this.privateTables.splice(i, 1);
            return true;
        }
    }
}

/*玩家离开私人房间 非房主离开直接调用正常离开 房主离开则房间摧毁
 * */
Instance.prototype.leavePrivateRoom = function (uid, type) {
    var priTable = this.getTableByUid(uid);
    if (priTable != null) {
//        logger.debug("leavePrivateRoom 2");
        if (this.removePlayer(uid, type) == false) {
            logger.error("离开私有房间失败");
            return false;
        }
//        logger.debug("leavePrivateRoom 3");

        if (priTable.isGameover() == false && this.isRealRePrivateTable(priTable.Index) == true) {
            logger.debug("代开的房间玩家都空了也不解散");
            return true;
        }
        //如果桌子没人了则直接解散销毁或者是房主离开这直接解散
        if (priTable.getPlayerNumbers() <= 0 || priTable.FangZhu == uid) {
            setTimeout(function () {
                this.deletePriTable(priTable.Index);
            }.bind(this), 100);
        }
        return true;
    }
    return false;
};

//解散代开桌子
Instance.prototype.deleteRePrivateTable = function (msg, type) {
    var priTable = this.getPrivateTable(msg.tableId);
    if (priTable == null) {
        logger.error("没有找到私人房间！");
        return false;
    }
    if (priTable["tableOwner"] != msg.uid) {
        logger.debug("解散代开的房间必须是创建者自己1");
        return false;
    }
    if (priTable["reCreatePrivateTable"] <= 0) {
        logger.debug("解散代开的房间必须是创建者自己2");
        return false;
    }
    logger.debug("解散代开桌子1");
    if (priTable["table"].isGameing() == true) {
        logger.debug("解散代开的房间已经开始状态了不能解散");
        return false;
    }
    //如果桌子没人了则直接解散销毁或者是房主离开这直接解散
    logger.debug("需要解散的代开桌子:" + priTable.table.Index);
    this.deletePriTable(priTable.table.Index);

    return true;
};

Instance.prototype.isRePrivateTable = function (tableId) {
    var priTable = this.getPrivateTable(tableId);
    if (priTable == null) {
        logger.error("没有找到私人房间！");
        return false;
    }
    if (priTable["reCreatePrivateTable"] <= 0) {
        logger.debug("解散代开的房间必须是创建者自己2");
        return false;
    }

    return true;
}

Instance.prototype.isRealRePrivateTable = function (tableId) {
    var priTable = this.getPrivateTable(tableId);
    if (priTable == null){
        logger.error("没有找到私人房间！");
        return false;
    }
    return priTable["reCreatePrivateTable"] == 1;
}

Instance.prototype.getRePrivateTableID = function (tableId) {
    var priTable = this.getPrivateTable(tableId);
    if (priTable == null) {
        logger.error("没有找到私人房间！");
        return -1;
    }
    if (priTable["reCreatePrivateTable"] <= 0) {
        logger.debug("解散代开的房间必须是创建者自己2");
        return -1;
    }

    return priTable["tableOwner"];
}
//获取俱乐部 id
Instance.prototype.getTableOwnPackId = function (tableId) {
    var priTable = this.getPrivateTable(tableId);
    if (priTable == null) {
        logger.error("没有找到私人房间！");
        return 0;
    }

    return priTable["pid"] || 0;
}
/*
 获取私人桌子
 * */
Instance.prototype.getPrivateTable = function (tableId) {
    for (var i = 0; i < this.privateTables.length; i++) {
        if (typeof tableId == "string") {
            tableId = parseInt(tableId);
        }
        //logger.debug("私人房间号1:" + this.privateTables[i]["tableId"] + typeof this.privateTables[i]["tableId"] );
        //logger.debug("私人房间号2:" + tableId+" type:"+typeof tableId);
        if (this.privateTables[i]["tableId"] == tableId) {
            //logger.debug("获得私人桌子");
            return this.privateTables[i];
        }
    }
    logger.debug("没有找到私有桌子");
    return null;
};

/**
 * 获取一个空闲的金币场桌子
 * @returns {*}
 */
Instance.prototype.getGoldTable = function () {
    for (var i = 0; i < this.privateTables.length; i++) {
        var priTable = this.privateTables[i];
        if (priTable.isGold && priTable.isGold == 1 && priTable.table.isFull() != 1) {
            return priTable;
        }
    }
    // 没有找到空闲桌子就创建
    return this.createGoldTable();
};

/*
 是否是房主
 * */
Instance.prototype.isPriTableOwner = function (uid) {
    for (var i = 0; i < this.privateTables.length; i++) {
        if (this.privateTables[i]["tableOwner"] == uid) {
            logger.debug("是房主" + uid);
            return i;
        }
    }
    return -1;
};

/*
 每个10分钟刷新一次"
 * */
Instance.prototype.update = function () {
    //logger.debug("当前三公房间刷新数据啦");
};

//临时保存正在进行游戏的玩家数据
Instance.prototype.updatePlayerHuifang = function (msg) {
    var xtime = msg.time;
    setTimeout(function () {
        for (var i = 0; i < this.privateTables.length; i++) {
            this.privateTables[i]["table"].Data.updatehuifangAttDao();
        }
    }.bind(this), xtime);
}


//某一个人的代开列表
Instance.prototype.reTablesList = function (uid) {
    logger.debug("reTablesList 1:" + this.privateTables.length);
    var list = [];
    for (var i = 0; i < this.privateTables.length; i++) {
        var reTable = this.privateTables[i];
        logger.debug("reTable1:" + reTable["tableOwner"]);
        logger.debug("reTable2:" + reTable["reCreatePrivateTable"]);
        if (reTable["tableOwner"] == uid && reTable["reCreatePrivateTable"] == 1 && reTable["table"].isGameing() == false) {
            var proList = {};

            proList["tableId"] = reTable["tableId"];
            proList["playerCount"] = reTable["table"].getPlayerNumbers();
            proList["tableType"] = reTable["tableType"];

            for (var tem in reTable["config"]) {
                proList[tem] = reTable["config"][tem];
            }

            list.push(proList);
        }
    }

    return list;
}

//关闭桌子
Instance.prototype.closeTable = function (tableId)
{
    var priTable = this.getPrivateTable(tableId);
    if (!!priTable) {
        logger.debug("关闭桌子：%d", tableId);
        priTable["table"].closeTable();
        setTimeout(function () {
            logger.debug("关闭桌子111：%d", tableId);
            this.deletePriTable(tableId);
        }.bind(this), 100);
        return 1;
    }
    return 0;
}