/**
 * Created by bruce.yang on 2017/4/2.
 */

var exp = module.exports;
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var async = require('async');
var Code = require('../../consts/code');
var routeUtil = require('../base/routeUtil');

/*
 路由策略，服务器直接交互要找到数据来源的服务器的标准
 * */
exp.route = function(session, msg, app, cb) {
  // logger.debug('msg:', msg);
  // logger.debug('session:', session);
  if(!session) {
    cb(new Error('fail to route to game server for session is empty'));
    return;
  }

  if(typeof session == "string"){
    cb(null, session);
    return;
  }

  // 没有进过游戏房间之前都没有游戏服的Id
  var gameServerId = session.get('gameId');
  // logger.debug('gameServerId:', gameServerId);
  if(gameServerId == undefined || gameServerId == 0) {
    // 创建房间的人随机给其分配游戏服Id,加入房间的人分配房间所在的游戏服Id
    var route = msg.args[0].route;
    var msg = msg.args[0].body;
    //logger.debug('route:', route, 'msg:', msg);

    var serverType=route.split(".")[0];
    var servers = app.getServersByType(serverType);
    //logger.debug('servers:', servers);
    if ( !servers ) {
      cb(new Error('can not find majhong servers.'));
      return;
    }
    if ( !!route && !!msg && (route.indexOf('.createPrivateTable')>0 || route.indexOf('.reCreatePrivateTable')>0) ) {
      routeUtil.checkGaming(session, serverType, servers, app, function (err, gamingId) {
        if ( !!gamingId ) {
          cb(null, gamingId);
          return;
        }
        if (msg.gameServerType == undefined) {
          msg.gameServerType = serverType;
        }
        routeUtil.getRandTableNum(app, msg, cb);
      });
      /*var rpcs = [];
       var j = 0;
       for (var i = 0; i < servers.length; i++) {
       rpcs.push(function (cb) {
       var serverId = servers[j++].id;
       app.rpc.shisanshui.gRemote.checkGameing(serverId, {"uid": session.get('uid')}, cb);
       });
       }
       async.parallel(rpcs, function (err, results) {
       logger.debug('gameId not in session, rpc check again:', err, results);
       var serverId = undefined;
       if ( err == null ) {
       for (var j = 0; j < results.length; j++) {
       if ( results[j][1].gameing == 1 ) {
       serverId = results[j][1].serverId;
       break;
       }
       }
       }
       if ( serverId != undefined ) {
       logger.error('create route to a majhong server error:', serverId);
       cb(null, serverId);
       }
       else {
       var id = servers[msg.uid % servers.length]['id'];
       cb(null, id);
       }
       });*/
    }
    else if ( !!route && !!msg && (route.indexOf('.joinPrivateTable')>0 || route.indexOf('.deleteRePrivateTable')>0) && parseInt(msg.tableId) > 100000 ) {
      routeUtil.checkGaming(session, serverType, servers, app, function (err, gamingId) {
        if ( !!gamingId ) {
          logger.error('route-joinPrivateTable-checkGaming', session.get('uid'), gamingId);
          cb(null, gamingId);
          return;
        }

        routeUtil.getTableServer(app, serverType, msg, cb);
      });

      /*var rpcs = [];
       var j = 0;
       for (var i = 0; i < servers.length; i++) {
       rpcs.push(function (cb) {
       var serverId = servers[j++].id;
       app.rpc.shisanshui.gRemote.checkGameing(serverId, {"uid": session.get('uid')}, cb);
       });
       }
       async.parallel(rpcs, function (err, results) {
       var serverId = undefined;
       if ( err == null ) {
       for (var j = 0; j < results.length; j++) {
       if ( results[j][1].gameing == 1 ) {
       serverId = results[j][1].serverId;
       break;
       }
       }
       }
       if ( serverId != undefined ) {
       cb(null, serverId);
       }
       else {
       var serverIndex = Math.floor(parseInt(msg.tableId) / 100000);
       var id = 'shisanshui-server-' + serverIndex;
       var found = false;
       for (var i = 0; i < servers.length; i++) {
       logger.debug("join route1:" + id);
       logger.debug("join route2:" + servers[i].id);
       if ( id == servers[i].id ) {
       found = true;
       break;
       }
       }
       if ( !found ) {
       logger.debug('join route to a default first majhong server:', servers[0].id);
       cb(null, servers[0].id);
       }
       else {
       cb(null, id);
       }
       }
       });*/
    }
    else if ( !!route && !!msg && route.indexOf('.leavePrivateTable') > 0 ) {
      gameServerId = session.get('backupGameId')  // 如果gameId已经被置0 再看看备份gameId【aaaaaaa】
      if ( gameServerId != undefined && gameServerId != 0 ) {
        logger.debug('5 route to majhong server:', gameServerId);
        cb(null, gameServerId);
      }
      else {
        routeUtil.checkGaming(session, serverType, servers, app, function (err, gamingId) {
          if (!!gamingId) {
            cb(null, gamingId);
            return;
          }
          cb(null, servers[0].id);
        });
        /*var rpcs = [];
         var j = 0;
         for (var i = 0; i < servers.length; i++) {
         rpcs.push(function (cb) {
         var serverId = servers[j++].id;
         app.rpc.shisanshui.gRemote.checkGameing(serverId, {"uid": session.get('uid')}, cb);
         });
         }
         async.parallel(rpcs, function (err, results) {
         logger.error('gameId not in session, rpc check again:', err, results);
         var serverId = undefined;
         if ( err == null ) {
         for (var j = 0; j < results.length; j++) {
         if ( results[j][1].gameing == 1 ) {
         serverId = results[j][1].serverId;
         break;
         }
         }
         }
         if ( serverId != undefined ) {
         logger.error('6 route to a majhong server:', serverId);
         cb(null, serverId);
         }
         else {
         logger.error('6 route to a default first majhong server:', servers[0].id);
         cb(null, servers[0].id);
         }
         });*/
      }
    }
    else {
      routeUtil.checkGaming(session, serverType, servers, app, function (err, gamingId) {
        if (!!gamingId) {
          cb(null, gamingId);
          return;
        }
        cb(null, servers[0].id);
      });
      /*var rpcs = [];
       var j = 0;
       for (var i = 0; i < servers.length; i++) {
       rpcs.push(function (cb) {
       var serverId = servers[j++].id;
       app.rpc.shisanshui.gRemote.checkGameing(serverId, {"uid": session.get('uid')}, cb);
       });
       }

       async.parallel(rpcs, function (err, results) {
       logger.debug('gameId not in session, rpc check again:', err, results);
       var serverId = undefined;
       if ( err == null ) {
       for (var j = 0; j < results.length; j++) {
       if ( results[j][1].gameing == 1 ) {
       serverId = results[j][1].serverId;
       break;
       }
       }
       }

       if ( serverId != undefined ) {
       logger.error('3 route to a majhong server:', serverId);
       cb(null, serverId);
       }
       else {
       logger.error('3 route to a default first majhong server:', servers[0].id);
       cb(null, servers[0].id);
       }
       });*/
    }
  }
  else {
    // logger.debug('4 route to majhong server:', gameServerId);
    cb(null, gameServerId);
  }
};
