var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');
var Const = require('../../../consts/consts');
var podium = require('../../../domain/hall/podium');

/**
 * podium handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;

/*打开领奖界面
hall.podiumHandler.getPodiumInfo
* */
pro.getPodiumInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null)
    {
        podium.getPodium(msg, player, next);
    }else
    {
        next(null, {code: Code.FAIL});
    }
};

/*领取推荐奖励
 hall.podiumHandler.pickPodiumInvite
 podiumKey
 uid
 * */
pro.pickPodiumInvite = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null)
    {
        podium.podiumInvite(msg, player, next);
    }else
    {
        next(null, {code: Code.FAIL});
    }
};

