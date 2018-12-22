var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var active = require('../../../domain/hall/active');
/**
 * active handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;


/*请求获取每日登陆奖励 hall.activeHandlerQP.useEveryLogin
* */
pro.useEveryLogin = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    if (active.useEveryLogin(msg) == false)
    {
        logger.error("请求失败");
        next(null, {code: Code.FAIL});
    }

    next(null, {code: Code.OK});
};

/**
 * 请求领取每日金币奖励 hall.activeHandler.useDailyGoldReward
 * @param msg {uid}
 * @param session
 * @param next
 */
pro.useDailyGoldReward = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    if (active.everyDayGoldReward(msg) == false)
    {
        logger.error("请求失败");
        next(null, {code: Code.FAIL});
    }

    next(null, {code: Code.OK});
};