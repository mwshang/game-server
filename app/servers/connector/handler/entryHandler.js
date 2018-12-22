var Code = require('../../../consts/code');
var playerDao = require('../../../dao/playerDao');
var async = require('async');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var qpgames = require('../../../../config/qpgames.json').games;

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

	if(!this.app)
		logger.error(app);
};

var pro = Handler.prototype;

/*
登陆前端服务器
* */
pro.entryConnector = function(msg, session, next) {
	var token = msg.token, self = this;
	if(!token) {
        next(null, {code: Code.FAIL, err:Code.ENTRY.FA_TOKEN_INVALID});
		return;
	}

	async.waterfall([
		function(cb) {
			// auth token
			self.app.rpc.auth.authRemote.auth(session, token, cb);
		},
		function(code, player, cb) {
			// generate session and register chat status
			self.app.get('sessionService').kick(player.uid, function () {
				cb(null, player);
			});
		},
		function(player, cb) {
			session.bind(player.uid, function(err) {
				logger.debug('session.bind', err);
				cb(err, player);
			});
		},
		function(player, cb) {
			session.set('serverId', self.app.get('serverId'));
		  if (msg.gameServerType != undefined)
				session.set('gameServerType', msg.gameServerType);
			session.set('userName', player.userName);
			session.set('uid', player.uid);
			session.set('ip', session.__session__.__socket__.remoteAddress.ip);
			session.on('closed', onPlayerLeave.bind(null, self.app));
			session.pushAll(function () {
				cb(null, player);
			});
			logger.debug("当前用户ServerId:" + self.app.get('serverId'));
		},
		function(player, cb) {
			self.app.rpc.chat.chatRemote.add(session, player.uid, player.userName,
				channelUtil.getGlobalChannelName(), function (err, code) {
					logger.debug('chatRemote.add', err, code);
					if (code != Code.OK)
						cb(code);
					else
						cb(null, player);
				});
		}],
	  function(err, player) {
			if(err) {
				next(null, {code: Code.FAIL, "err": err});
				return;
			}

			player["ip"] = session.get('ip');
			self.app.rpc.hall.msgRemote.enterMsgHall(session, {player: player,uid: session.get('uid'), serverId: session.get('serverId'),
							ip:session.get('ip'),"gameServerType": msg.gameServerType != undefined ? msg.gameServerType : ""},
				function(err, code, gameId,gameing){
					if(!!err){
						logger.error('玩家加入游戏大厅失败! %j', err);
					}
					logger.debug('gameId:'+ gameId);
					if (gameId != '')
						session.set('gameId', gameId);
					session.pushAll(function () {
						next(null, {code: Code.OK, player: player,gameing:gameing, serverId:gameId});
					});
				});
		});
};

/*
玩家离开游戏 通知对应的服务器
* */
var onPlayerLeave = function (app, session, reason) {
	if(!session || !session.uid) {
		return;
	}

  self = this;
	var uid = session.get('uid');

	logger.debug('玩家离开:' + uid);

    //chat kick
    app.rpc.chat.chatRemote.kick(session, uid, null);

	//kill games
	var _servers = [];

	if (session.get('gameServerType') != undefined) {
		var servers = app.getServersByType(session.get('gameServerType'));
		if(!servers) logger.error("有错误的gameServerType:"+session.get('gameServerType'));
		if (servers.length > 0) {
			_servers = _servers.concat(servers);
		}
	} else {
		for (var g in qpgames) {
			var serverType = qpgames[g].serverType;

			var servers = app.getServersByType(serverType);
            if(!servers)
            {
                logger.error("找不到不服务器:"+serverType);
            }
			if (!!servers && servers.length > 0) {
				_servers = _servers.concat(servers);
			}
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
				logger.debug("serverId:", serverId);
				app.rpc[serverType].gRemote.killGame(serverId, {uid: uid}, function(err, res){});
			});
		}
	}

	async.parallel(rpcs, function(err, results){
		logger.debug(err, results);
	});

	if(!!app.rpc.hall.arenaRemote)
	{
		//通知比赛场玩家下线
		app.rpc.hall.arenaRemote.playerUidOffRPC(session, {uid: uid}, function(err){
			if(!!err){
				logger.error('玩家离开比赛场失败%j', err);
			}
		});
	}

    //玩家离开hall
    app.rpc.hall.msgRemote.leaveMsgHall(session, {uid: uid,
        isSync: 1}, function(err){
        if(!!err){
            logger.error('玩家离开游戏大厅失败%j', err);
        }
    });
};

// 心跳
pro.heartBeat = function(msg, session, next) {
	if(!msg.uid)
		next(null, {code: Code.FAIL});
	else
		next(null, {code: Code.OK});
};
