var pomelo = require('pomelo');
var Event = require('../../consts/consts').HALL;
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var http = require('http');
var url = require('url');
var crypto = require('crypto');
var playerDao = require('../../dao/playerDao');
var qpgames = require('../../../config/qpgames.json').games;
var async = require('async');
var noticeDao = require('../../dao/noticeDao');
var sync2HallType = require('../../consts/consts').Sync2HallType;

var gm = module.exports;

gm.gmPlayerAttr = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    playerDao.getPlayerByName(msg.userName, function(err, user) {
        if (err || !user) {
            logger.debug('username not exist!');
            res.send({code: 500});
            return;
        }
        var player = user[0];
        if (!!msg.GM){
            player.GM = msg.GM;
            logger.debug("玩家GM权限改变:" + msg.GM);
        }
        if (!!msg.coinNum){
            player.coinNum += msg.coinNum;
            logger.debug("玩家GM金币改变:" + msg.coinNum);
        }
        if (!!msg.gemNum){
            player.gemNum += msg.gemNum;
            logger.debug("玩家GM钻石改变:" + msg.gemNum);
        }

        playerDao.updatePlayer(player);
        res.send({code: 200});
    });
};

gm.updateMsgHall = function (msg, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    pomelo.app.rpc.hall.msgRemote.updateMsgHall(null, msg,function(err){
        if(!!err){
            logger.error("更新广播通知失败:%j", err);
            res.send({code: 500});
            return;
        }
        res.send({code: 200});
    });
}

gm.getHallPlayerNum = function (msg, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

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
        for (var i=0; i<_servers.length; i++) {
            rpcs.push(function (cb) {
                var serverId = _servers[j++].id;
                var serverType = serverId.split('-')[0];
                logger.debug("servcerId:", serverId, serverType);
                pomelo.app.rpc[serverType].gRemote.getOnLineNum(serverId, {"uid": msg.uid}, cb);
            });
        }

    }
    var num = 0;
    async.parallel(rpcs, function(err, results){
        logger.debug(err, results);
        for (var j=0; j<results.length; j++) {
            if(!results[j]){
                logger.error("结果有空值：%j",results[j]);
            }
            num += results[j][1].playerNum;
        }
        logger.debug("同时在线人数:%j", num);
        res.send({code: 200,onlineNum:num});
    });

}
gm.updatePlayerHuifang = function(msg, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    pomelo.app.rpc.hall.msgRemote.updatePlayerHuifang(null, msg,function(err){
        if(!!err){
            logger.error("更新临时保存玩家信息通知失败2:%j", err);
            res.send({code: 500});
            return;
        }
        res.send({code: 200});
    });
}

/**
 * 获取公告消息
 * @param msg
 * @param res
 */
gm.getNoticeList = function(msg, res) {
    if (!msg.uid || !msg.type) {
        res.send({errno: 500, errmsg: '参数错误'});
        return;
    }

    noticeDao.getNoticeList(msg.type, function (err, data) {
        if (!!err) {
            res.send({errno: 500, errmsg: err});
        } else {
            var list = [];
            data.map(function (d) {
                list.push({ctype: d.type, notice: d.contents});
            }.bind(this));
            res.send({errno: 0, errmsg: '', data: list});
        }
    });
}

gm.addNotice = function (msg, res) {
    if (!msg.ctype || !msg.contents || !msg.sign) {
        res.send({errno: 500, errmsg: '参数错误'});
        return;
    }

    msg.type = msg.ctype;
    // default
    if (!msg.uid) {
        msg.uid = 0;
    }
    if (!msg.startTime || msg.startTime == '') {
        msg.startTime = '2017-1-1: 00:00:00';
    }
    if (!msg.endTime || msg.endTime == '') {
        msg.endTime = '2027-1-1: 00:00:00';
    }
    if (!msg.intervalTime || msg.intervalTime == '') {
        msg.intervalTime = 100;
    }
    noticeDao.addNotice(msg, function (err, data) {
        if (!!err) {
            res.send({errno: 500, errmsg: err});
        } else {
            pomelo.app.rpc.hall.msgRemote.updateMsgHall(null, msg,function(err){
                if(!!err){
                    res.send({errno: 500, errmsg: "更新广播通知失败"});
                    return;
                }
                res.send({errno: 200, errmsg: ""});
            });
        }
    });
}

gm.lockPlayer = function (msg, res) {
    if (!msg.uid || !msg.optUid) {
        res.send({errno: 500, errmsg: '参数错误'});
        return;
    }
    pomelo.app.rpc.hall.msgRemote.updatePlayerFromGame(null, {"msg": {locked: 1, uid: msg.optUid}, "type": sync2HallType.playerInfoMsg},  function (err, data) {
        if (!!err) {
            res.send({errno: 500, errmsg: err});
            return;
        }
        res.send({errno: 200});
    });
}
