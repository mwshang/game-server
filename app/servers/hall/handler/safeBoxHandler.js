var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var safeBox = require('../../../domain/hall/safeBox');
var pomelo = require('pomelo');
/**
 * safeBox handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;


/*创建保险箱
uid
password
* */
pro.createSafeBox = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }

    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null)
    {
        next(null, {code: Code.FAIL});
    }

    safeBox.createSafeBox(msg, player,next);
};

/*打开保险箱
uid
password
* */
pro.openSafeBox = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }

    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null)
    {
        next(null, {code: Code.FAIL});
    }

    safeBox.openSafeBox(msg, player,next);

};

/*操作保险箱
 uid
 type 1:加钱 2：减少钱  3：送钱
 coinNum
 userName:被送方名字
 * */
pro.operationSafeBox = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid || !msg.coinNum) {
        next(null, {code: Code.FAIL});
        return;
    }
    //必须是正整数
    if (parseInt(msg.coinNum) < 0 || isNaN(parseInt(msg.coinNum))){
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null)
    {
        next(null, {code: Code.FAIL});
    }

    safeBox.operationSafeBox(msg, player,next);
};


/*修改保险箱密码
 uid
 oldPassword
 newPassword
 * */
pro.UpdateSafeBox = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid || !msg.oldPassword || !msg.newPassword) {
        next(null, {code: Code.FAIL});
        return;
    }
    //密码必须是字符串
    if (typeof msg.newPassword != 'string'){
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null)
    {
        next(null, {code: Code.FAIL});
    }

    safeBox.UpdateSafeBox(msg, player,next);
};