var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);

var exp = module.exports;

exp.pushMessageByUids = function (uids, route, msg) {
	pomelo.app.get('channelService').pushMessageByUids(route, msg, uids, errHandler);
};

exp.pushMessageToPlayer = function (uid, route, msg) {
  exp.pushMessageByUids([uid], route, msg);
};


function errHandler(err, fails){
	if(!!err){
		logger.error('发送大厅消息失败! %j', err.stack);
	}
}