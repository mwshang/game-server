var Code = require('../../../consts/code');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var pomelo = require('pomelo');

module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
    this.app = app;
};

var pro = Remote.prototype;

/*
离开游戏 例如断线 杀进程通知 及时通知大厅服务器玩家最新金币信息
* */
pro.killGame = function(msg, cb)
{
    logger.debug("玩家杀进程:%j" ,msg);
    //玩家发送当前玩家状态 服务器回复当前玩家状态结果
    var uid = msg.uid;
    if(!uid) {
        cb(null, {code: Code.FAIL});
        return;
    }
    if (this.app.get("roomMgr").getPlayer(uid) == null){
        cb(null, {code: Code.FAIL});
        return;
    }

    var gameing = 0;
    var ptable = this.app.get("roomMgr").getTableByUid(uid);
    if (ptable != null){
        //考虑到例如玩家加入一个房间但是没开始 那么 退出再重新进应该还是在这个房间 除非玩家主动退出请求才会真正离开房间
        ptable.updateOffLinePlayer(uid);

        gameing = 1;
    }
    cb(null, {code: Code.OK, gameing: gameing});
};

pro.checkGameing = function(msg,cb){
    logger.debug("监测玩家是否在游戏中", this.app.getServerId());
    var uid = msg.uid;
    if(!uid) {
        cb(null, Code.OK, {"gameing": 0, "serverId": this.app.getServerId()});
        return;
    }
    if (this.app.get("roomMgr").getPlayer(uid) == null){
        logger.debug("监测玩家是否在游戏中时没获取到玩家在哪个房间");
        cb(null, Code.OK, {"gameing": 0, "serverId": this.app.getServerId()});
        return;
    }
    var ptable = this.app.get("roomMgr").getTableByUid(uid);
    if (ptable != null && ptable.TableStatus != 6){
        //说明此玩家在房间中 要么创建要么加入 此处应该传当前服务器ID 后面看如何获取
        logger.debug("监测玩家在游戏中");
        cb(null, Code.OK, {"gameing": 1, "serverId": this.app.getServerId()});
    }else{
        cb(null, Code.OK, {"gameing": 0, "serverId": this.app.getServerId()});
    }

}

/*
同步定时器事件
* */
pro.updateTimeEvent = function(msg, cb){
    logger.debug("updateTimeEvent");
    this.app.get("roomMgr").updateRandTableNum();
    cb(null, Code.OK);
}

pro.updatePlayerHuifang = function(msg,cb){
    logger.debug("updatePlayerHuifang");
    this.app.get("roomMgr").updatePlayerHuifang(msg);
    cb(null, Code.OK);
}

pro.getOnLineNum = function(msg, cb){
    logger.debug("getOnLineNum changsha");
    cb(null, Code.OK,{"playerNum":this.app.get("roomMgr").PlayerNum});
}

//代开列表
pro.reTablesList = function(msg, cb){
    logger.debug("reTablesList rpc1");
    var tables = [];
    tables = this.app.get("roomMgr").reTablesList(msg.uid);
    logger.debug("reTablesList "+pomelo.app.getServerType()+":%j", tables);
    cb(null, Code.OK,{"tables":tables});
}

pro.closeTable = function(msg, cb){
    logger.debug("closeTable rpc");
    if(this.app.get("roomMgr").closeTable(msg.tableId)==1)
    {
        cb(null, Code.OK);
    }
    else
    {
        cb(null, "关闭桌子失败");
    }

}

/**
 *
 * @param msg
 * @param cb
 */
pro.getTableConfig = function (msg, cb) {
    var table = this.app.get("roomMgr").getPrivateTable(msg.tableId);
    if (!table) {
        utils.invokeCallback(cb, '房间不存在');
        return;
    }
    utils.invokeCallback(cb, null, table.config);
}

//**********************群相关*********
//创建自动房间
pro.createAutoTableRpc = function (msg, cb) {
    logger.debug("createAutoTable rpc", msg);
    if (this.app.get(pomelo.app.getServerType())["isOpenPack"] != 1) {
        utils.invokeCallback(cb, "群功能未開放", null);
        return;
    }

    // this.app.get("roomMgr").addAutoTable(msg);
    this.app.get("packMgr").createAutoTable(msg, function (err, data) {
        logger.debug("createAutoTableRpc->back", err, data);
        utils.invokeCallback(cb, err, data);
    });
}

//创建成员房间
pro.createMemberTableRpc = function (msg, cb) {
    logger.debug("createMemberTableRpc rpc");
    if (this.app.get(pomelo.app.getServerType())["isOpenPack"] != 1) {
        utils.invokeCallback(cb, "群功能未开放", null);
        return;
    }
    this.app.get("packMgr").createMemberTable(msg, function (err, data) {
        logger.debug("createMemberTableRpc", err, data);
        utils.invokeCallback(cb, err, data);
    });
}

//获取群房间
pro.getPackTablesListRpc = function (msg, cb) {
//    logger.debug("reTablesList rpc1");
    if (this.app.get(pomelo.app.getServerType())["isOpenPack"] != 1) {
        utils.invokeCallback(cb, "群功能未開放", null);
        return;
    }
    var tables = this.app.get("packMgr").getPackTables(msg.pid);
    logger.debug("getPackTablesList quanzhou:%j", tables);
    cb(null, Code.OK, {"tables": tables});
}

pro.getTableNeedFangKa = function (msg, cb) {
    if (this.app.get(pomelo.app.getServerType())["isOpenPack"] != 1) {
        utils.invokeCallback(cb, "群功能未开放", null);
        return;
    }
    var num = this.app.get("packMgr").getWillNeedGemNum(msg.pid, msg.config);
    utils.invokeCallback(cb, null, num);
}