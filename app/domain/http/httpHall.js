var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var http = require('http');
var Code = require('../../consts/code');
var huiFangInfoDao = require('../../dao/huiFangInfoDao');
var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var date = require('../../util/date');
var qpgames = require('../../../config/qpgames.json').games;
var async = require('async');
var playerDao = require('../../dao/playerDao');
var settingsDao = require('../../dao/settingsDao');

var hall = module.exports;

hall.getHuiFangInfo = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");

    //必须是正整数
    if (!msg.huiFangNum || parseInt(msg.huiFangNum) < 0 || isNaN(parseInt(msg.huiFangNum))){
        res.send({code: Code.FAIL});
        return;
    }

    huiFangInfoDao.gethuiFangInfo(msg.huiFangNum, function(err, data){
        if (!!data && data.length > 0 && !!data[data.length - 1].record){
            //logger.debug("getHuifangRecord:%j", JSON.parse(data[0]));
            try
            {
                res.send({code: Code.OK, record:  JSON.parse(data[data.length - 1].record),serverType:data[data.length - 1].serverType});
            }
            catch(e)
            {
                logger.error("getHuifangRecord:erro:"+ e);
                logger.error("getHuifangRecord:%j", JSON.parse(data[0]));
            }

        } else {
            res.send({code: Code.FAIL, err:"没有此回放号"});
        }
    });
}

hall.getHuiFangList = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;

    if (!uid){
        res.send({code: Code.FAIL});
        return;
    }

    playerHuiFangDao.getHuiFangRecord({"uid": uid}, function(err, data){
        if (!!data){
            for (var i = 0; i < data.length; i++){
                var jsonObj = JSON.parse(data[i].record);
                if(jsonObj == undefined || jsonObj == null || jsonObj.length <= 0){
                    continue;
                }
                if (jsonObj[jsonObj.length - 1]["result"] == undefined || jsonObj[jsonObj.length - 1]["result"] == null){
                    continue;
                }
                var onePai = jsonObj[jsonObj.length - 1]["result"];
                //logger.debug("one:" + typeof(onePai) + "  length:" + onePai.length);
                var lastMsg = [];
                for (var p = 0; p < onePai.length; p++){
                    var totalScore = {};
                    totalScore["uid"] = onePai[p].uid;
                    totalScore["nickName"] = onePai[p].userName;
                    totalScore["coinNum"] = onePai[p].coinNum;
                    lastMsg.push(totalScore);
                }

                data[i]["lastResult"] = lastMsg;
                data[i]["record"] = [];
                data[i]["record"] = jsonObj;
                data[i]["recordTime"] = date.timeFormat(data[i]["recordTime"]);
                //logger.debug("getHuiFangRecord0:%j", typeof(res[i]["record"]));
            }

            //logger.debug("getHuiFangRecord2:%j", res );
            res.send({code: Code.OK, record:data});
        }

        res.send({code: Code.OK, record:""});
    });
}
//参数 uid  serverType  name    opts     opts包括比赛场的选项配置
//isArena=1固定, tableNum 桌子数, gemNeed 房卡数, startTime, endTime, ...
hall.createArena = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;

    if (!uid){
        res.send({code: Code.FAIL, error:''});
        return;
    }
    //客户端传过来是字符串需要转换下
    msg.opts=JSON.parse(msg.opts);
    msg.cfgs=JSON.parse(msg.cfgs);
    logger.debug("createArena:%j" ,msg);

    pomelo.app.rpc.hall.arenaRemote.createArenaRPC(null, msg, function(tem,err, arenaId){
        if(err!=Code.OK){
            logger.error("createArenaRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("比赛场号："+arenaId);
        res.send({code: 200, arenaId: arenaId});
    });
}

hall.removeArena = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;

    if (!uid){
        res.send({code: Code.FAIL, error:''});
        return;
    }


    pomelo.app.rpc.hall.arenaRemote.removeArenaRPC(null, msg, function(tem,err){
        if(err!=Code.OK){
            logger.error("createArenaRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("删除比赛场成功");
        res.send({code: 200});
    });
}
hall.getCanJoinArenaList = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    pomelo.app.rpc.hall.arenaRemote.getCanJoinArenaListRPC(null, msg, function(tem,err,ret){
        if(err!=Code.OK){
            logger.error("getArenaListRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }

        res.send({code: 200,data:ret});
    });
}

hall.enterArena = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.enterArenaRPC(null, msg, function(tem,err, ret){
        if(err!=Code.OK){
            logger.error("getArenaEnrolledListRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("玩家进入比赛场获取当前信息：ret: %j",ret);
        res.send({code: 200,data: ret});
    });
}

hall.checkArenaPwd = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.checkArenaPwdRPC(null, msg, function(tem,err, ret){
        if(err!=Code.OK){
            logger.error("getArenaEnrolledListRPC failed:%j", err);
            res.send({code: Code.FAIL, error:err});
            return;
        }
        logger.debug("玩家进入比赛场获取当前信息：ret: %j",ret);
        res.send({code: 200,arena: ret});
    });
}
//获取报名用户  参数uid  areaId
hall.getArenaEnrolledList = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.getArenaEnrolledListRPC(null, msg, function(tem,err, arena){
        if(err!=Code.OK){
            logger.error("getArenaEnrolledListRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("获得报名用户：arena: %j",arena);
        res.send({code: 200, arena: arena});
    });
}

// 报名  uid  arenaId
hall.enrollArena = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:'比赛场号不能为空'});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.enrollArenaRPC(null, msg, function(tem,err){
        if(err!=Code.OK){
            logger.error("enrollArenaRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("报名成功：%j",msg);
        res.send({code: 200});
    });
}
// 取消报名  uid  arenaId
hall.cancelEnrollArena = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:'比赛场号不能为空'});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.cancelEnrollArenaRPC(null, msg, function(tem,err,ret){
        if(err!=Code.OK){
            logger.error("enrollArenaRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("取消报名成功：%j",ret);
        res.send({code: 200,state:ret.state});
    });
}
// 检查是否在比赛场中  uid  arenaId
hall.checkPlayerInArena = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;

    if (!uid ){
        res.send({code: Code.FAIL, error:'账号不能为空'});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.checkPlayerInArenaRPC(null, msg, function(tem,err,ret){
        if(err!=Code.OK){
            logger.error("checkPlayerInArenaRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("检查是否在比赛场：%j",ret);
        res.send({code: 200,data:ret});
    });
}
//审核报名  uid arenaId
//审核报名  uid arenaId  audit 0/1表示审核结果
hall.auditArenaEnrollment = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;
    logger.debug("请求信息：%j",msg);
    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.auditArenaEnrollmentRPC(null, msg, function(tem,err,ret){
        if(err!=Code.OK){
            logger.error("auditArenaEnrollmentRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("审核成功：%j",msg);
        res.send({code: 200,state:ret});
    });
}
// 获取比赛场结果列表  uid
hall.getArenaList = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;

    if (!uid ){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.getArenaListRPC(null, msg, function(tem,err, ret){
        if(err!=Code.OK){
            logger.error("getArenaRankListRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("获取比赛场排行：%j",ret.arenas);
        res.send({code: 200, arenas:ret.arenas});
    });
}
// 获取比赛场排行  uid  arenaId
hall.getArenaRankList = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    pomelo.app.rpc.hall.arenaRemote.getArenaRankListRPC(null, msg, function(tem,err, rankList){
        if(err!=Code.OK){
            logger.error("getArenaRankListRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("获取比赛场排行：%j",rankList);
        res.send({code: 200, rankPlayers:rankList});
    });
}

hall.arenaStart = function(msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    var arenaId = msg.arenaId;
    if (!uid || !arenaId){
        res.send({code: Code.FAIL, error:''});
        return;
    }
//开始比赛
    pomelo.app.rpc.hall.arenaRemote.arenaStartRPC(null, msg, function(tem,err, ret){
        if(err!=Code.OK){
            logger.error("arenaStartRPC failed:%j", err);
            res.send({code: 500, error:err});
            return;
        }
        logger.debug("启动比赛");
        res.send({code: 200,ret: ret});
    });
}

//强制关闭比赛场
hall.arenaClose = function(msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");

    var arenaId = msg.arenaId;
    var uid = msg.uid;
    if (!arenaId || !uid){
        res.send({code: Code.FAIL, error:''});
        return;
    }
    playerDao.getPlayerObjByUid(uid,function(err,player) {

        if (player.vipLevel < 20) {
            res.send({code: 500, error: "权限不够"});
            return;
        }

        pomelo.app.rpc.hall.arenaRemote.arenaCloseRPC(null, msg, function(tem,err, ret){
            if(err!=Code.OK){
                logger.error("arenaCloseRPC failed:%j", err);
                res.send({code: 500, error:err});
                return;
            }
            logger.debug("关闭比赛场");
            res.send({code: 200});
        });
    });
}


//代开s type:1代表当前代开列表  2：代表已经开过的代开信息
hall.reCreateTables = function(msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    var uid = msg.uid;
    if (!uid){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    if (!!msg.type && msg.type == 2){
        playerHuiFangDao.getHuiFangRecordByDaiKai({"uid": uid}, function(err, data){
            if (!!data){
                for (var i = 0; i < data.length; i++){
                    var jsonObj = JSON.parse(data[i].record);
                    if(jsonObj == undefined || jsonObj == null || jsonObj.length <= 0){
                        continue;
                    }
                    if (jsonObj[jsonObj.length - 1]["result"] == undefined || jsonObj[jsonObj.length - 1]["result"] == null){
                        continue;
                    }
                    var onePai = jsonObj[jsonObj.length - 1]["result"];
                    logger.debug("one:" + typeof(onePai) + "  length:" + onePai.length);
                    var lastMsg = [];
                    for (var p = 0; p < onePai.length; p++){
                        var totalScore = {};
                        totalScore["uid"] = onePai[p].uid;
                        totalScore["nickName"] = onePai[p].userName;
                        totalScore["coinNum"] = onePai[p].coinNum;
                        lastMsg.push(totalScore);
                    }

                    data[i]["lastResult"] = lastMsg;
                    data[i]["record"] = [];
                    data[i]["record"] = jsonObj;
                    data[i]["recordTime"] = date.timeFormat(data[i]["recordTime"]);

                    //logger.debug("getHuiFangRecord0:%j", typeof(res[i]["record"]));
                }
                //logger.debug("getHuiFangRecord2:%j", res );
                res.send({code: Code.OK, record:data});
            }

            res.send({code: Code.OK, record:""});
        });
    }else{
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
//        logger.debug("servers1:%j",_servers[j]);
            for (var i=0; i<_servers.length; i++) {
                rpcs.push(function (cb) {
//                logger.debug("servers2:%j",_servers[j]);
                    var serverId = _servers[j++].id;
                    var serverType = serverId.split('-')[0];
                    logger.debug("servcerId:", serverId, serverType);
                    if(!!pomelo.app.rpc[serverType].gRemote.reTablesList)
                        pomelo.app.rpc[serverType].gRemote.reTablesList(serverId, {"uid": msg.uid}, cb);
                    else
                    {
                        cb(null,Code.OK,{"tables":[]});
                    }
                });
            }

        }
        var reTables = [];
        async.parallel(rpcs, function(err, results){
            logger.debug(err, results);
            for (var j=0; j<results.length; j++) {
                if(!results[j]){
                    logger.error("结果有空值：%j",results[j]);
                }
                if (results[j][1].tables.length > 0) {
                    reTables = reTables.concat(results[j][1].tables);
                }
            }

            logger.debug("开放列表结果:%j", reTables);
            res.send({code: 200,reTables: reTables});
        });
    }

}

//关闭桌子
hall.closeTable = function(msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");

    var tableId = msg.tableId;
    var uid=msg.uid;
    var serverType=msg.serverType;
    if (!tableId || !serverType || !uid){
        res.send({code: Code.FAIL, error:''});
        return;
    }

    playerDao.getPlayerObjByUid(uid,function(err,player){

        if(player.vipLevel<20)
        {
            res.send({code: 500, error:"权限不够"});
            return;
        }
        var servers = pomelo.app.getServersByType(serverType);
        var self=pomelo;
        var rpcs = [];
        if (servers.length > 0) {
            var j = 0;
            for (var i=0; i<servers.length; i++) {
                rpcs.push(function (cb) {
                    var serverId = servers[j++].id;
                    var serverType = serverId.split('-')[0];
                    logger.debug("serverId:", serverId, serverType);
                    self.app.rpc[serverType].gRemote.closeTable(serverId,{"tableId": tableId}, cb);
                });
            }
        }

        async.parallel(rpcs, function(err, results){
            logger.debug(err, results);

            for(var tem in results)
            {
                if(results[tem]==Code.OK)
                {
                    logger.debug("关闭桌子成功");
                    res.send({code: 200});
                    return;
                }

            }
            res.send({code: Code.FAIL,error:"没有该桌子号"});
        });

    });


}

/**
 * 获取大厅设置
 * @param msg {uid}
 * @param res
 */
hall.getHallSettings = function (msg, res) {
    if (!msg.uid || !msg.keys) {
        res.send({code: Code.FAIL, error:'参数错误'});
        return;
    }

    settingsDao.getSettingList(msg.keys, function (err, data) {
        if (!!err) {
            res.send({code: Code.FAIL, error: err.message});
            return;
        }
        res.send({code: Code.OK, data: data});
    })
}

/**
 * 设置大厅设置
 * @param msg
 * @param res
 */
hall.setHallSettings = function (msg, res) {
    if (!msg.uid || !msg.vkey || !msg.val) {
        res.send({code: Code.FAIL, error:'参数错误'});
        return;
    }
    settingsDao.setSettings(msg.vkey, msg.val, function (err, data) {
        if (!!err) {
            res.send({code: Code.FAIL, error: err.message});
            return;
        }
        res.send({code: Code.OK, data: data});
    })
}
