var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var playerRecordDao = require('../../../dao/playerRecordDao');
var mailType = require('../../../consts/consts').MailType;
/**
 * mail handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;


/*获取邮件系统信息
hall.mailHandlerQP.getMailInfo
uid
type
* */
pro.getMailInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }

    //游戏内部消息
    if (msg.type == mailType.mailGame){
        playerRecordDao.getUserGameRecord(msg, function(err, data)
        {
            logger.debug("getUserRecord:%j", data);
            if(err)
            {
                logger.debug("getUserRecord error");
                next(null, {code: Code.FAIL});
                return;
            }
            next(null, {code: Code.OK,mailInfo:data});
        });
    }


};
