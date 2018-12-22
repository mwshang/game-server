var pomelo = require('pomelo');
var Event = require('../../consts/consts').HALL;
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var http = require('http');
var url = require('url');
var crypto = require('crypto');
var playerDao = require('../../dao/playerDao');

var gm = module.exports;

gm.gmFangKa = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!msg.uid || !msg.gemNum || !msg.giveUid) {
        logger.debug('GM参数错误');
        res.send({code: 500});
        return;
    }
    pomelo.app.rpc.hall.fangkaRemote.operationFangkaRPC(null, msg,function(err){
        if(!!err){
            logger.error("操作房卡失败:%j", err);
            res.send({code: 500});
            return;
        }
        res.send({code: 200});
    });
};

/*
type:1 2 3...
每日分享:1
邀请新好友进游戏输入邀请人的UID:2
大转盘:3
* */
gm.gmFangKaActive = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!msg.type || !msg.uid) {
        logger.debug('GM参数错误');
        res.send({code: 500});
        return;
    }

    pomelo.app.rpc.hall.fangkaRemote.activeFangkaRPC(null, msg,function(err,msg){
        logger.debug("err:%j" , msg);
        res.send({code: msg.code});
    });
};