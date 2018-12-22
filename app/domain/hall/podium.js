var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var AttriChangeType = require('../../consts/consts').AttriChangeType;
var playerGameRecordDao = require('../../dao/playerGameRecordDao');
var podiumDao = require('../../dao/podiumDao');
var Code = require('../../consts/code');

var podium = module.exports;


/*获取领奖界面
 * */
podium.getPodium = function(msg,player,next)
{
    podiumDao.getUserPodium(msg.uid, function(err, res){
        if (!!res){
            //logger.log("res:%j",res);
            //var podiumRecord = res;
            next(null, {code: Code.OK, podium:res});
        }else{
            next(null, {code: Code.FAIL});
        }
    });
};

/*推荐金币
 podiumKey
 * */
podium.podiumInvite = function(msg,player,next)
{
    podiumDao.getUserPodium(msg.uid, function(err, res){
        if (!!res){
            logger.debug("getUserPodium:%j", res);
            var podiumRecord = res;
            //找到对应的secret
            for(var i = 0; i < podiumRecord.length; i++){
                if (podiumRecord[i].podiumKey == msg.podiumKey){
                    //玩家金币属性变化
                    player.coinNum += parseInt(podiumRecord[i].coin);
                    messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],"type":AttriChangeType.attrPodium});
                    next(null, {code: Code.OK});
                    podiumDao.updateUserPodium(msg,function(err, result){
                        next(null, {code: Code.OK});
                    });
                    player.save();

                    break;
                }
            }
        }else{
            next(null, {code: Code.FAIL});
        }
    });
};


