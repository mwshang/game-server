
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var Event = require('../../consts/consts').HALL;
var playerGameRecordDao = require('../../dao/playerGameRecordDao');

var playerGameRecord = module.exports;


//更新玩家行为数据
playerGameRecord.updateGameRecord = function(msg)
{
    logger.debug("updateGameRecord1:%j", msg);
    if (!msg.uid){
        logger.error("updateGameRecord param error 1");
        return false;
    }
    //[msg.dayCoin,msg.weekCoin, msg.dayChipIn, msg.totalChipIn, msg.uid];
//    msg["uid"] = info.uid;
//    msg["result"] = info.result;
//    msg["chipIn"] = this.playerUids[info.uid]["chipIn"];
//    msg["coin"] = info.coinNum;
    //获取之前记录信息
    playerGameRecordDao.getGameRecordByUid(msg.uid, function(err, res){
        if (!!res){
            var newRecord = {};
            var oldRecord = res[0];
            //logger.debug("玩家旧记录:");
            //logger.debug(oldRecord);
            newRecord["uid"] = msg.uid;
            newRecord["dayChipIn"] = oldRecord["dayChipIn"] + msg["chipIn"];
            newRecord["totalChipIn"] = oldRecord["totalChipIn"] + msg["chipIn"];
            if (msg["result"] == 1){
                newRecord["dayCoin"] = oldRecord["dayCoin"] + msg["coin"];
                newRecord["weekCoin"] = oldRecord["weekCoin"] + msg["coin"];
            }else{
                newRecord["dayCoin"] = oldRecord["dayCoin"] - msg["coin"];
                newRecord["weekCoin"] = oldRecord["weekCoin"] - msg["coin"];
            }
            //logger.error("updateGameRecord  1.1");
            playerGameRecordDao.updateGameRecord(newRecord, function(err, res){
            });
        }else{
            logger.error("updateGameRecord param error 2");
            return false;
        }

    });
};

