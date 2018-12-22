
var async = require('async');
var Code = require('../../consts/code');
var logger = require('pomelo-logger').getLogger('routeUtil-log', __filename);

/**
 * 检查玩家是否在游戏中
 * @param session
 * @param serverType
 * @param servers
 * @param app
 * @param next
 */
var checkGaming = function (session, serverType, servers, app, next) {
    var rpcs = [];
    var j = 0;
    for (var i = 0; i < servers.length; i++) {
        rpcs.push(function (cb) {
            var serverId = servers[j++].id;
            app.rpc[serverType].gRemote.checkGameing(serverId, {"uid": session.get('uid')}, cb);
        });
    }

    async.parallel(rpcs, function (err, results) {
        logger.debug('checkGaming', err, results);
        var serverId = undefined;
        if (err == null) {
            for (var j = 0; j < results.length; j++) {
                if (results[j][1].gameing == 1) {
                    serverId = results[j][1].serverId;
                    break;
                }
            }
        }

        if (serverId != undefined) {
            logger.debug('6 route to a majhong server:', serverId);
            next(null, serverId);
        } else {
            logger.debug('6 route to a default first majhong server:', servers[0].id);
            next(null, null);
        }
    });
};

/**
 * 获得一个房间号
 * @param app
 * @param msg
 * @param next
 */
var getRandTableNum = function (app, msg, next) {
    app.rpc.hall.msgRemote.getRandTableNum(null, msg, function (err, code, result) {
        logger.debug(err, code, result);
        if (err == null && code == Code.OK) {
            msg.tableId = result.tableNum;
            msg.huiFangNums = result.huiFangNums;

            //logger.debug(msg.huiFangNums[0]);

            var gameServerId = result.serverId;
            logger.debug('1 route to game server:', gameServerId);
            next(null, gameServerId);
        } else {
            next(new Error('can not getRandTableNum'));
        }
    });
};

/**
 *
 * @param app
 * @param serverType
 * @param msg
 * @param next
 */
var getTableServer = function (app, serverType, msg, next) {
    logger.debug('getTableServer', msg.tableId);
    app.rpc.hall.msgRemote.getTableServer(null, {tableId: msg.tableId}, function (err, code, serverId) {
        logger.debug(err, code, serverId);
        if (err == null && code == Code.OK && serverId != undefined && serverId != null) {
            var gameServerId = serverId;
            logger.debug('2 route to game server:', gameServerId);
            next(null, gameServerId);
        } else {
            //cb(new Error('can not getTableServer'));
            var gameServerId = serverType + "-server-1";
            logger.debug('3 route to game server:', gameServerId);
            next(null, gameServerId);
        }
    });
}

exports.checkGaming = checkGaming;
exports.getRandTableNum = getRandTableNum;
exports.getTableServer = getTableServer;