var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('charge-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var AttriChangeType = require('../../consts/consts').AttriChangeType;
var playerDao = require('../../dao/playerDao');
var fangkaRecordDao = require('../../dao/fangkaRecordDao');
var Code = require('../../consts/code');

var fangKa = module.exports;

var FANGKA_TYPE =
{
    GIVEMONEY: 1//送钱
}

fangKa.sendFangKa = function(player)
{
//    var temp = {"fangKa": 1};
//    messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallSafeBox, {"hallSafeBox":temp});
};


fangKa.operationFangka = function(msg,player,next)
{
    var result = null;
    if (msg.type == FANGKA_TYPE.GIVEMONEY){
        result  = this.giveFangKa(msg,player,next);
    }
    return result;
};

//gemNum
//giveUid:被送方uid
fangKa.giveFangKa = function(msg,player,next)
{
    //自己减少钱 被送方加钱 检测被赠方是否存在 存在则看是否在线 是否在游戏中
    var givePlayer = pomelo.app.get("hall").getPlayer(msg.giveUid);
    var gemNumIn = parseInt(msg.gemNum);
    if (givePlayer != null){
        //玩家在线
        givePlayer.updateFangka(gemNumIn);
        messageService.pushMessageToPlayer({uid:givePlayer.uid, sid : givePlayer.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":givePlayer.gemNum});
        //扣除自己的房卡
        player.updateFangka(-gemNumIn);
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":player.gemNum});
        this.saveRecord(player,givePlayer,msg);
        next(null, {code: Code.OK});
    }else{
        //玩家不在线 也可能没有这个玩家
        playerDao.getPlayerByUid(msg.giveUid, function(err, user){
            if (err || !user) {
                next(null, {code: Code.FAIL, err:Code.ENTRY.FA_USER_NOT_EXIST});
                return;
            }
            var givePlayer = user[0];
            givePlayer["gemNum"] += gemNumIn;
            playerDao.updatePlayer(givePlayer,function(){
            });
            player.updateFangka(-gemNumIn);
            this.saveRecord(player,givePlayer,msg);
            messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":player.gemNum});
            next(null, {code: Code.OK});
        }.bind(this));
    }
};

fangKa.changeFangKa =function(uid, gemNum, isAddScore)
{
    if(gemNum==0) return;
    isAddScore = isAddScore || false;
    //自己减少钱 被送方加钱 检测被赠方是否存在 存在则看是否在线 是否在游戏中
    var givePlayer = pomelo.app.get("hall").getPlayer(uid);
    var gemNumIn = parseInt(gemNum);
    if (givePlayer != null){
        //玩家在线
        givePlayer.updateFangka(gemNumIn, isAddScore);
        messageService.pushMessageToPlayer({uid:givePlayer.uid, sid : givePlayer.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":givePlayer.gemNum});
    }else{
        //玩家不在线 也可能没有这个玩家
        playerDao.getPlayerByUid(uid, function(err, user){
            if (err || !user) {

                return;
            }
            var givePlayer = user[0];
            givePlayer["gemNum"] += gemNumIn;
            if (isAddScore) {
                givePlayer['scoreNum'] = Math.min(200, givePlayer['scoreNum'] + (-gemNumIn * 1.5));
            }
            playerDao.updatePlayer(givePlayer,function(){
            });
        }.bind(this));
    }
}
fangKa.saveRecord = function(player,givePlayer,msg){
    var record = {};
    record["uid"] = player.uid;
    record["userName"] = player.nickName;
    record["giveUid"] = givePlayer.uid;
    record["giveUserName"] = givePlayer.nickName;
    record["type"] = FANGKA_TYPE.GIVEMONEY;
    record["gemNum"] = parseInt(msg.gemNum);
    fangkaRecordDao.createFangkaRecord(record,function(err, res){
        if (err != null){
            logger.debug("更新房卡记录失败");
        }else{
            logger.debug("更新房卡记录成功");
        }

    });
}

fangKa.getRecord = function(uid,next){
    fangkaRecordDao.getFangkaRecord(uid,function(err, res){
        if (!!err){
            next(null, {code: Code.OK, "record": ""});
        }else{
            next(null, {code: Code.OK, "record": res});
        }
    }.bind(this));
}


fangKa.operationFangkaGM = function(msg,player,next)
{
    //自己减少钱 被送方加钱 检测被赠方是否存在 存在则看是否在线 是否在游戏中
    var givePlayer = pomelo.app.get("hall").getPlayer(msg.giveUid);
    var gemNumIn = parseInt(msg.gemNum);
    if (givePlayer != null){
        //玩家在线
        givePlayer.updateFangka(gemNumIn);
        messageService.pushMessageToPlayer({uid:givePlayer.uid, sid : givePlayer.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":givePlayer.gemNum});
        //扣除自己的房卡
        if (player.vipLevel < 100){
            player.gemNum -= gemNumIn;
            playerDao.updatePlayer(player,function(){
            });
        }
        this.saveRecord(player,givePlayer,msg);
        next(null, {code: Code.OK});
    }else{
        //玩家不在线 也可能没有这个玩家
        playerDao.getPlayerByUid(msg.giveUid, function(err, user){
            if (err || !user) {
                next(null, {code: Code.FAIL, err:Code.ENTRY.FA_USER_NOT_EXIST});
                return;
            }
            var givePlayer = user[0];
            givePlayer["gemNum"] += gemNumIn;
            playerDao.updatePlayer(givePlayer,function(){
            });
            if (player.vipLevel < 100){
                //扣除自己的房卡
                player.gemNum -= gemNumIn;
                playerDao.updatePlayer(player,function(){
                });
            }
            this.saveRecord(player,givePlayer,msg);
            next(null, {code: Code.OK});
        }.bind(this));
    }
};

