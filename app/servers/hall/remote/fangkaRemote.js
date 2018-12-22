var playerDao = require('../../../dao/playerDao');
var Code = require('../../../consts/code');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('charge-log', __filename);
var pomelo = require('pomelo');
var async = require('async');
var sync2HallType = require('../../../consts/consts').Sync2HallType;
var messageService = require('../../../services/messageService');
var Event = require('../../../consts/consts').HALL;
var playerGameRecord = require('../../../domain/hall/playerGameRecord');
var QPPlayer = require('../../../domain/entity/player');
var fangKa = require('../../../domain/hall/fangKa');
var active = require('../../../domain/hall/active');

module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
    this.app = app;
};

var pro = Remote.prototype;

/*
 进入消息大厅服务器
 * */
pro.operationFangkaRPC = function(msg, cb)
{
    logger.debug("operationFangkaRPC:%j", msg);
    //必须是正整数
    if (parseInt(msg.gemNum) < 0 || isNaN(parseInt(msg.gemNum))){
        cb(null, {code: Code.FAIL});
        return;
    }
    //自己不赠送自己
    if (!!msg.uid && !!msg.giveUid && msg.giveUid == msg.uid){
        cb(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null){ //通过GM赠送
        playerDao.getPlayerByUid(msg.uid, function(err, user) {
            if(err) {
                logger.debug("operationFangkaRPC auth error");
                cb(null, {code: Code.FAIL});
                return;
            }
            player = user[0];
            if (player.vipLevel < 10){
                cb(null, {code: Code.FAIL});
                return;
            }
            if (player.gemNum < parseInt(msg.gemNum) && player.vipLevel < 100){
                cb(null, {code: Code.FAIL});
                return;
            }
            fangKa.operationFangkaGM(msg,player,cb);
        });
    }else{
        if (player.vipLevel < 10){
            cb(null, {code: Code.FAIL});
            return;
        }
        if (player.gemNum < msg.gemNum && player.vipLevel < 100){
            cb(null, {code: Code.FAIL});
            return;
        }
        fangKa.operationFangka(msg, player, cb);
    }
};

/*
 type:1 2 3...
 每日分享:1
 邀请新好友进游戏输入邀请人的UID:2
 大转盘:3
 * */
pro.activeFangkaRPC = function(msg, cb)
{
    logger.debug("activeFangkaRPC:%j", msg);
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null) {
        cb(null, {code: Code.FAIL});
    }else{
        var isRet = active.activeFangka(player,msg,cb);
        if (isRet == true){
            cb(null, {code: Code.OK});
        }else{
            cb(null, {code: Code.FAIL});
        }
    }
};


/*给某一个玩家充值房卡*/
pro.changeFangKa = function(msg, cb){
    logger.debug("changeFangKa:%j", msg);
    fangKa.changeFangKa(msg.uid,msg.gemNum);
    cb(null, {code: Code.OK});
}
