var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var AttriChangeType = require('../../consts/consts').AttriChangeType;
var safeBoxDao = require('../../dao/safeBoxDao');
var playerDao = require('../../dao/playerDao');
var podiumDao = require('../../dao/podiumDao');
var Code = require('../../consts/code');

var safeBox = module.exports;

var SAFEBOX_TYPE =
{
    SAVEMONEY: 1,//存钱
    TAKEMONEY: 2,//取钱
    GIVEMONEY: 3//送钱
}

/*创建保险箱
 * */
safeBox.createSafeBox = function(msg, player,next)
{
    //logger.debug("createSafeBox:%j", player);
    if (msg.uid == null || msg.password == null){
        logger.error("保险箱密码或者UID为空");
        next(null, {code: Code.FAIL});
        return null;
    }

    safeBoxDao.getSafeBox(msg.uid, function(err, safeBox){
        if(!!err || !safeBox){
            safeBoxDao.createSafeBox(msg, function(err, safeBox){
                if (!!err || !safeBox){
                    logger.error("createSafeBox failed!");
                    next(null, {code: Code.FAIL});
                    return null;
                }
                else{
                    logger.debug("创建保险箱成功uid:" + msg.uid);
                    safeBoxDao.getSafeBox(msg.uid, function(err, safeBox){
                        if(!!err || !safeBox){
                            next(null, {code: Code.FAIL});
                            return null;
                        }
                        else{
                            next(null, {code: Code.OK, "hallSafeBox": safeBox});
                            return 'ok';
                        }
                    });
                }
            });
        }
        else{
            logger.debug("已经有保险箱了不需要再创建");
            next(null, {code: Code.FAIL});
            return null;
        }
    });
};

/*主动推送保险箱信息
* */
safeBox.sendSafeBox = function(msg,box)
{
    if (box == null){
        safeBoxDao.getSafeBox(msg.uid, function(err, safeBox){
            if(!!err || !safeBox){
                logger.debug("当前玩家木有保修箱");
                var temp = {"noSafebox": 1};
                messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallSafeBox, {"hallSafeBox":temp});
            }
            else{
                logger.debug("sendSafeBox : %j",safeBox);
                messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallSafeBox, {"hallSafeBox":safeBox});
            }
        });
    }
    else
    {
        messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallSafeBox, {"hallSafeBox":box});
    }

};

/*打开保险箱信息、客户端主动请求保险箱
 * */
safeBox.openSafeBox = function(msg,player,next)
{
    //vip or gm
    if (msg.uid == null || msg.password == null){
        logger.error("保险箱密码或者UID为空");
        next(null, {code: Code.FAIL});
        return null;
    }
    safeBoxDao.getSafeBox(msg.uid, function(err, safeBox){
        if(!!err || !safeBox){
           logger.error("玩家木有保险箱");
           next(null, {code: Code.FAIL});
           return null;
        }
        else{
            if (msg.password !== safeBox.password){
                logger.error("保修箱密码不对");
                next(null, {code: Code.FAIL});
                return null;
            }
            logger.debug("safeBox2: %j",safeBox);
            messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallSafeBox, {"hallSafeBox":safeBox});
            next(null, {code: Code.OK});
        }
    });
};

/*获取保险箱内容
 * */
safeBox.getSafeBox = function(msg,cb)
{
    safeBoxDao.getSafeBox(msg.uid, function(err, safeBox){
        if(!!err || !safeBox){
            logger.error("玩家木有保险箱");
            cb("err",null);
        }
        else{
            cb(null,safeBox);
        }
    });
};

/*保险箱操作 1:加钱 2：减少钱  3：送钱
 * */
safeBox.operationSafeBox = function(msg,player,next)
{
    var result = null;
    if (msg.type == SAFEBOX_TYPE.SAVEMONEY){
        result  = this.saveSafeBox(msg,player,next);
    }
    else if (msg.type == SAFEBOX_TYPE.TAKEMONEY){
        result = this.takeSafeBox(msg,player,next);
    }
    else if (msg.type == SAFEBOX_TYPE.GIVEMONEY){
        result = this.giveSafeBox(msg,player,next);
    }

    return result;
};

/*存钱
* */
safeBox.saveSafeBox = function(msg,player,next)
{
    if (player.coinNum < parseInt(msg.coinNum)){
        logger.debug("货币不够存储啊亲");
        next(null, {code: Code.FAIL});
        return null;
    }

    //保险箱加钱,玩家减钱
    this.getSafeBox(msg,function(err,box){
        if (!!err || box == null){
            next(null, {code: Code.FAIL});
            return null;
        }

        box.coinNum += parseInt(msg.coinNum);
        player.coinNum -= parseInt(msg.coinNum);
        //logger.debug("存钱改变后的金币:" + box.coinNum);
        //sync
        player.save();
        safeBoxDao.updateCoin(box, null);

        //notice client
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],"type":AttriChangeType.attrSafeBox});
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallSafeBox, {"hallSafeBox":box});

        next(null, {code: Code.OK});
        return 'OK';
    });
};

/*取钱
 * */
safeBox.takeSafeBox = function(msg,player,next)
{
    //保险箱加钱,玩家减钱
    this.getSafeBox(msg,function(err,box){
        if (!!err || box == null){
            next(null, {code: Code.FAIL});
            return null;
        }
        if (box.coinNum < parseInt(msg.coinNum)){
            logger.debug("取钱取不出来啊取那么多");
            next(null, {code: Code.FAIL});
            return null;
        }

        box.coinNum -= parseInt(msg.coinNum);
        player.coinNum += parseInt(msg.coinNum);
        //logger.debug("取钱改变后的金币:" + box.coinNum);
        //sync
        player.save();
        safeBoxDao.updateCoin(box, null);

        //notice client
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],"type":AttriChangeType.attrSafeBox});
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallSafeBox, {"hallSafeBox":box});

        next(null, {code: Code.OK});
        return 'OK';
    });

};

/*送钱
 * */
safeBox.giveSafeBox = function(msg,player,next)
{
    if (!msg.userName){
        logger.debug("权限不够或者用户名为空无法赠送钱啊");
        next(null, {code: Code.FAIL});
        return null;
    }
    //自己减少钱 被送方加钱
    this.getSafeBox(msg,function(err,box){
        if (!!err || box == null){
            next(null, {code: Code.FAIL});
            return null;
        }
        if (box.coinNum < parseInt(msg.coinNum)) {
            logger.debug("货币不够送啊亲");
            next(null, {code: Code.FAIL});
            return null;
        }
        playerDao.getPlayerByName(msg.userName, function(err, user) {
            if (err || !user) {
                res.send({code: 500, err:Code.REGLOGIN.FA_USER_NOT_EXIST});
                return;
            }
            var podiumRecord = {};
            var podium = msg.coinNum;
            var timestamp = new Date().getTime();
            //[msg.uid, msg.userName,msg.record,msg.type,msg.giveUid, msg.giveUserName, msg.coin, msg.gem, msg.podiumKey];
            if (!msg.inviteRecord){
                msg["inviteRecord"] = "";
            }
            podiumRecord["uid"] = user[0].uid;
            podiumRecord["userName"] = user[0].userName;
            podiumRecord["record"] = msg.inviteRecord;
            podiumRecord["type"] = consts.PODIUM_TYPE.PODIUM_GIVE;
            podiumRecord["giveUid"] = msg.uid;
            podiumRecord["giveUserName"] = player.userName;
            podiumRecord["coin"] = podium;
            podiumRecord["gem"] = 0;
            podiumRecord["podiumKey"] = msg.uid.toString() + "_" + timestamp.toString();
            logger.debug("createPodium:%j",podiumRecord );
            podiumDao.createPodium(podiumRecord, function(err, podiumResult){

            //保险箱金币减少
            box.coinNum -= parseInt(msg.coinNum);
            safeBoxDao.updateCoin(box, null);

            //notice client
            messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallSafeBox, {"hallSafeBox":box});
            next(null, {code: Code.OK});
            });
        });


        return "OK";
    });
};



/*修改保险箱密码
 * */
safeBox.UpdateSafeBox = function(msg,player,next)
{
    safeBoxDao.getSafeBox(msg.uid, function(err, safeBox){
        if(!!err || !safeBox){
            logger.error("玩家木有保险箱");
            next(null, {code: Code.FAIL});
            return null;
        }
        else{
            if (msg.oldPassword !== safeBox.password){
                logger.error("保修箱密码不对");
                next(null, {code: Code.FAIL});
                return null;
            }
            //新密码修改
            safeBox.password = msg.newPassword;
            safeBoxDao.updatePassword(safeBox, null);

            logger.debug("修改保险箱密码: %j",safeBox);
            //messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallSafeBox, {"hallSafeBox":safeBox});
            next(null, {code: Code.OK});
        }
    });
};
