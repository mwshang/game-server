
var playerDao = require('../../../dao/playerDao');
var Code = require('../../../consts/code');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');
var async = require('async');
var sync2HallType = require('../../../consts/consts').Sync2HallType;
var messageService = require('../../../services/messageService');
var Event = require('../../../consts/consts').HALL;
var arena = require('../../../domain/hall/arena');

module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
    this.app = app;
};

var pro = Remote.prototype;



pro.updatePlayerHuifang = function(msg, cb){
    var timeValue = msg.time == undefined ? 180 : msg.time;
    var hall = pomelo.app.get('hall');

    var _servers = [];
    for (var g in qpgames) {
        var serverType = qpgames[g].serverType;
        var servers = self.app.getServersByType(serverType);
        if (servers.length > 0) {
            _servers = _servers.concat(servers);
        }
    }

    var rpcs = [];
    if (_servers.length > 0) {
        var j = 0;
        for (var i=0; i<_servers.length; i++) {
            rpcs.push(function (cb) {
                // logger.debug("serverI:", _servers, serverType, j);
                var serverId = _servers[j++].id;
                var serverType = serverId.split('-')[0];
                // logger.debug("serverId:", serverId);
                self.app.rpc[serverType].gRemote.updatePlayerHuifang(servers[j++].id,{time:timeValue * 1000}, cb);
            });
        }
    }

    async.parallel(rpcs, function(err, results){
        logger.debug(err, results);
    });
    cb(null, Code.OK,"");
}

pro.createArenaRPC = function(msg, cb){
    var uid = msg.uid;
    if (!uid){
        cb(null, "非法登陆，请检查参数");
        return;
    }
    arena.createArena(uid,msg.name,msg.serverType, msg.opts,msg.cfgs, cb);
}

pro.removeArenaRPC = function(msg, cb){
    var uid = msg.uid;
    if (!uid){
        cb(null, "非法登陆，请检查参数");
        return;
    }
    arena.removeArena(uid, cb);
}
pro.getCanJoinArenaListRPC = function(msg, cb){
    arena.getCanJoinArenaList(cb);
}
pro.cancelEnrollArenaRPC = function(msg,cb)
{
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        cb(null, "非法登陆，请检查参数");
        return;
    }

    arena.cancelEnrollArena(msg.uid,msg.arenaId, cb);
}
pro.enterArenaRPC = function(msg, cb){
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        cb(null, "非法登陆，请检查参数");
        return;
    }
    arena.enterArena(uid,arenaId, cb);
}
pro.checkArenaPwdRPC = function(msg, cb){
    var uid = msg.uid;
    var arenaId = msg.arenaId;
    var pwd = msg.pwd;
    if (!uid || !arenaId ||!pwd){
        cb(null,"密码不能为空");
        return;
    }
    arena.checkArenaPwd(uid,arenaId,pwd, cb);
}
pro.getArenaEnrolledListRPC = function(msg, cb){
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        cb(null, Code.FAIL, "");
        return;
    }

    arena.getArenaEnrolledList(uid, arenaId, cb);
}

pro.enrollArenaRPC = function(msg, cb){
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        cb(null, Code.FAIL);
        return;
    }

    arena.enrollArena(uid, arenaId,msg.pwd, cb);
}

pro.auditArenaEnrollmentRPC = function(msg, cb){
    var uid = msg.uid;
    var arenaId = msg.arenaId;
    var playerUid = msg.playerUid;

    if (!uid || !arenaId || !playerUid){
        cb(null, Code.FAIL);
        return;
    }

    arena.auditArenaEnrollment(uid, arenaId, playerUid, msg.audit, cb);
}

pro.getArenaRankListRPC = function(msg, cb){

    var arenaId = msg.arenaId;

    if ( !arenaId){
        cb(null, Code.FAIL);
        return;
    }

    arena.getArenaRankList( arenaId, cb);
}

pro.getArenaListRPC = function(msg, cb){
    var uid = msg.uid;

    if (!uid ){
        cb(null, Code.FAIL);
        return;
    }

    arena.getArenaList(uid, cb);
}

pro.arenaStartRPC = function(msg, cb){
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        cb(null, Code.FAIL);
        return;
    }

    arena.arenaStart(uid, arenaId, cb);
}
pro.arenaCloseRPC = function(msg, cb){
   // var uid = msg.uid;
    var arenaId = msg.arenaId;

    if ( !arenaId){
        cb(null, "比赛场号不能为空");
        return;
    }

    arena.arenaClose(msg.arenaId, cb);
}
//保存比赛场结果
pro.saveArenaTableRPC = function(msg,cb){


   logger.debug("saveArenaTableRPC:%j",msg);
   arena.saveTableScore(msg.aid, msg.tableId,msg.players);
   cb();
}

//检查是否在比赛场中
pro.checkPlayerInArenaRPC = function(msg,cb)
{
    if ( !msg.uid){
        cb(null, Code.FAIL,"");
        return;
    }
    arena.checkPlayerInArena(msg.uid, cb);
}

//取消报名
pro.cancelEnrollArenaRPC = function(msg,cb)
{
    var uid = msg.uid;
    var arenaId = msg.arenaId;

    if (!uid || !arenaId){
        cb(null, Code.FAIL);
        return;
    }

    arena.cancelEnrollArena(msg.uid,msg.arenaId, cb);
}

pro.playerUidOffRPC = function(msg,cb)
{
    var uid = msg.uid;

    if (!uid){
        logger.error("uid错误");
        utils.invokeCallback(cb);
        return;
    }

    arena.playerUidOff(msg.uid);
    utils.invokeCallback(cb);
}

