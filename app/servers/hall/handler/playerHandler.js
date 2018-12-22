var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('con-log', __filename);
var pomelo = require('pomelo');
var Const = require('../../../consts/consts');
var date = require('../../../util/date');
var playerRecordDao = require('../../../dao/playerRecordDao');
var playerDao = require('../../../dao/playerDao');
var messageService = require('../../../services/messageService');
var playerHuiFangDao = require('../../../dao/playerHuiFangDao');
var huiFangInfoDao = require('../../../dao/huiFangInfoDao');

/**
 * player handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;

/*更新玩家昵称 头像 性别
hall.playerHandler.updatePlayerInfo
uid 必选
headUrl 可选
nickName 可选
userSex 可选
passwordRecord 可选
oldPassword newPassword 可选
* */
pro.updatePlayerInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var serverId = session.get('serverId');
    logger.debug("当前玩家serverId:" + serverId);
    if ((!!msg.oldPassword && typeof msg.oldPassword != 'string') ||
        (!!msg.newPassword && typeof msg.newPassword != 'string')){
        logger.error("修改密码参数错误");
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (!!msg.oldPassword && !!msg.newPassword && player != null){
        logger.debug("修改密码：" + player.password + "  param1:" + msg.oldPassword + "   param2:" + msg.newPassword);
        if (player.password === msg.oldPassword){
            msg.password = msg.newPassword;
        }else{
            next(null, {code: Code.FAIL});
            return;
        }
    }
    if (player != null)
    {
        player.updatePlayerInfo(msg);
        player.updateBaseInfo();

        //notice
        if (!!msg.newPassword){
            messageService.pushMessageToPlayer({uid:msg.uid, sid : serverId}, Const.HALL.hallUpdatePlayerAttr, {"password":player["password"],
                "type":0});
        }
        if (!!msg.userSex){
            messageService.pushMessageToPlayer({uid:msg.uid, sid : serverId}, Const.HALL.hallUpdatePlayerAttr, {"userSex":player["userSex"],
                "type":0});
        }
        if (!!msg.nickName){
            messageService.pushMessageToPlayer({uid:msg.uid, sid : serverId}, Const.HALL.hallUpdatePlayerAttr, {"nickName":player["nickName"],
                "type":0});
        }

        next(null, {code: Code.OK});
    }else
    {
        next(null, {code: Code.FAIL});
    }

};

/*玩家信息反馈
hall.playerHandler.feedbackInfo
uid
feedback
 * */
pro.feedbackInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid || !msg.feedback) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null)
    {
        var broMsg ={};
        broMsg["uid"] = uid;
        broMsg["userName"] = player.userName;
        broMsg["serverId"] = pomelo.app.get('serverId');
        broMsg["type"] = Const.MailType.mailFeedback;
        broMsg["record"] = msg.feedback;
        playerRecordDao.createUserRecord(broMsg, function(err, res){
                next(null, {code: Code.OK});
            }
        );
    }else
    {
        next(null, {code: Code.FAIL});
    }

};

/*获取玩家信息反馈
 uid
 hall.playerHandler.getFeedbackInfo
 * */
pro.getFeedbackInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null)
    {
        playerRecordDao.getUserGameRecord({"type": Const.MailType.mailFeedback}, function(err, res){
            if (!!res){
                logger.debug("getFeedbackInfo:%j", res );
                next(null, {code: Code.OK, feedback:res});
            }
            next(null, {code: Code.OK, feedback:""});
        })

    }else
    {
        logger.error("没有此人？");
        next(null, {code: Code.FAIL});
    }

};

/*获取密码
 hall.playerHandler.getPassword
 userName
 passwordRecord
 玩家此时只连接了网关
 * */
pro.getPassword = function(msg, session, next) {
    var userName = msg.userName;
    if(!userName || !msg.passwordRecord) {
        next(null, {code: Code.FAIL});
        return;
    }
    playerDao.getPlayerByName(msg.userName, function(err, user) {
        if (err || !user) {
            logger.debug('username not exist!1:');
            next(null, {code: Code.FAIL});
        }
        var player = user[0];
        if (player != null){
            logger.debug("player[passwordRecord]" + player["passwordRecord"]);
            if (msg.passwordRecord == player["passwordRecord"]){
                next(null, {code: Code.OK, "password": player["password"]});
            }
        }else{
            logger.debug('username not exist!2:');
            next(null, {code: Code.FAIL});
        }
    })
};

/*获取玩家回放信息
 uid
 hall.playerHandler.getHuifangRecord
 * */
pro.getHuifangRecord = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null){
        playerHuiFangDao.getHuiFangRecord({"uid": uid}, function(err, res){
            if (!!res){
                for (var i = 0; i < res.length; i++){
                    var jsonObj = JSON.parse(res[i].record);
                    if(jsonObj == undefined || jsonObj == null || jsonObj.length <= 0){
                        continue;
                    }
                    if (jsonObj[jsonObj.length - 1]["result"] == undefined || jsonObj[jsonObj.length - 1]["result"] == null){
                        continue;
                    }
                    var onePai = jsonObj[jsonObj.length - 1]["result"];
                    logger.debug("one:" + typeof(onePai) + "  length:" + onePai.length);
                    var lastMsg = [];
                    for (var p = 0; p < onePai.length; p++){
                        var totalScore = {};
                        totalScore["uid"] = onePai[p].uid;
                        totalScore["nickName"] = onePai[p].userName;
                        totalScore["coinNum"] = onePai[p].coinNum;
                        lastMsg.push(totalScore);
                    }

                    res[i]["lastResult"] = lastMsg;
                    res[i]["record"] = [];
                    res[i]["record"] = jsonObj;
                    res[i]["recordTime"] = date.timeFormat(res[i]["recordTime"]);
                    //logger.debug("getHuiFangRecord0:%j", typeof(res[i]["record"]));
                }

                //logger.debug("getHuiFangRecord2:%j", res );
                next(null, {code: Code.OK, record:res});
            }

            next(null, {code: Code.OK, record:""});

        })
    }
    else
    {
        logger.error("没有此人？");
        next(null, {code: Code.FAIL});
    }

};

/*获取玩家回放信息
 uid
 hall.playerHandler.getHuifangInfo
 huiFangNum
 * */
pro.getHuifangInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid || !msg.huiFangNum) {
        next(null, {code: Code.FAIL});
        return;
    }

    //必须是正整数
    if (parseInt(msg.huiFangNum) < 0 || isNaN(parseInt(msg.huiFangNum))){
        next(null, {code: Code.FAIL});
        return;
    }

    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player != null){
        huiFangInfoDao.gethuiFangInfo(msg.huiFangNum, function(err, res){

//            logger.debug("res2:%j", res[0]);
            if (!!res && res.length > 0 && !!res[res.length - 1].record){
//                logger.debug("单场回放详细信息:", typeof(res[res.length - 1].record));
                //logger.debug("getHuifangRecord:%j", JSON.parse(res[0]));
                next(null, {code: Code.OK, record:  JSON.parse(res[res.length - 1].record),serverType:res[res.length - 1].serverType });
            }

            next(null, {code: Code.FAIL, err:"没有此回放号"});

        })
    }
    else
    {
        logger.error("没有此人？");
        next(null, {code: Code.FAIL});
    }

};
