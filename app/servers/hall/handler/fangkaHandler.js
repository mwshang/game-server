var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('charge-log', __filename);
var pomelo = require('pomelo');
var fangKa = require('../../../domain/hall/fangKa');
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

/*操作保险箱
 hall.fangkaHandler.operationFangka
 uid
 type 1:赠送
 gemNum:房卡
 giveUid:被送方uid
 * */
pro.operationFangka = function(msg, session, next) {
    logger.debug("operationFangka msg:%j", msg);
    var uid = msg.uid;
    if(!uid || !msg.gemNum || !msg.giveUid) {
        next(null, {code: Code.FAIL});
        return;
    }
    //必须是正整数
    if (parseInt(msg.gemNum) < 0 || isNaN(parseInt(msg.gemNum))){
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null){
        next(null, {code: Code.FAIL});
        return;
    }
    if (player.vipLevel < 10){
        next(null, {code: Code.FAIL, err:"权限不够"});
        return;
    }
    if (player.gemNum <parseInt(msg.gemNum)){
        next(null, {code: Code.FAIL, err:"钻石不足"});
        return;
    }

    fangKa.operationFangka(msg, player, next);
};

pro.getFangkaRecord = function(msg, session, next){
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null){
        next(null, {code: Code.FAIL});
    }
    if (player.vipLevel < 10){
        next(null, {code: Code.FAIL, err:"权限不够"});
    }

    fangKa.getRecord(uid,next);
}
