var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var rank = require('../../../domain/hall/rank');
/**
 * rank handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;


/*请求排行信息 给前20名以及自己排行 昵称 金币 头像
rankHandlerQP.getRankInfo
uid
type
* */
pro.getRankInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var rankData = rank.getRankInfo(msg);
    if (rankData == null)
    {
        logger.error("请求失败");
        next(null, {code: Code.FAIL});
    }

    next(null, {code: Code.OK, "rank":rankData});
};