var pomelo = require('pomelo');
var Event = require('../../consts/consts').HALL;
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var http = require('http');
var url = require('url');
var crypto = require('crypto');
var Token  = require('../../util/token');
var secret = require('../../../config/session').secret;
var playerDao = require('../../dao/playerDao');
var Code = require('../../consts/code');
var async = require('async');
var bagDao = require('../../dao/bagDao');
var playerGameRecordDao = require('../../dao/playerGameRecordDao');
var settingsDao = require('../../dao/settingsDao');
var podiumDao = require('../../dao/podiumDao');
var gameConfig  = require('../../../config/qpgames');
var activeDao = require('../../dao/activeDao');
var downloadPlayerDao = require('../../dao/downloadPlayerDao');
var FS = require('fs');
var moment = require('moment');
var regLogin = module.exports;

//注册
regLogin.register = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!msg.name || !msg.password || !msg.regType) {
        res.send({code: 500, err:Code.REGLOGIN.FA_PARAM_INVALID});
        return;
    }
    if (!msg["headUrl"]){
        msg["headUrl"] = msg.name;
    }
    if (!msg["userSex"] || msg["userSex"] == undefined){
        msg["userSex"] = "2";//1男2女0无
    }

    //重新加载配置
    reLoadConfig();

    logger.debug("register%j",msg)

    //1 代表设备号直接登陆 服务器自动生成UUID，所以注册也是直接默认快速登陆
    if (msg.regType == '1')
    {
        this._deviceReg(msg, res);
    }
    //手机登陆、用户名密码注册等验证失败通知服务器
    else
    {
        this._mobileReg(msg, res);
    }
};
//登陆
regLogin.login = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    var username = msg.name;
    var pwd = msg.password;
    logger.debug("登陆消息:%j",msg);
    if (!username || !pwd) {
        res.send({code: 500, err:Code.REGLOGIN.FA_PARAM_INVALID});
        return;
    }

    playerDao.getPlayerByName(username, function(err, user) {
        if (err || !user) {
            logger.debug('username not exist!');
            res.send({code: 500, err:Code.REGLOGIN.FA_USER_NOT_EXIST});
            return;
        }
        if (pwd !== user[0].password) {
            // password is wrong
            logger.debug('password incorrect!');
            res.send({code: 501, err:Code.REGLOGIN.FA_PASSWORD_ERROR});
            return;
        }
        res.send({code: 200, token: Token.create(user[0].uid, Date.now(), secret), uid: user[0].uid});

        //wei xin web
        if (!!msg["name"] && msg["name"] != user[0].nickName){
            //user[0].nickName = msg["name"];
            //playerDao.updatePlayer(user[0], null);
        }
    });
};

//设备号注册、登陆
regLogin._deviceReg = function (msg, res){
    playerDao.getPlayerByName(msg.name, function (err, user)
    {
        if (err || !user)
        {
            playerDao.createUser(msg.name, msg.password, msg.regType, msg.deviceID, msg.nickName,msg.headUrl,msg.passwordRecord,msg.userSex,msg.osPlatform,msg.province,msg.city,msg.curVersion,function(err, user)
            {
                if (err || !user)
                {
                    logger.error(err);
                    if (err && err.code === 1062)
                    {
                        res.send({code: 501, err:Code.REGLOGIN.FA_CREATE_ERROR});
                    } else
                    {
                        res.send({code: 500, err:Code.REGLOGIN.FA_CREATE_ERROR});
                    }
                } else
                {
                    async.parallel([
                        function(callback){ // 查询是否通过邀请码下载游戏 若是则绑定邀请码并赠送钻石
                          downloadPlayerDao.getAgentCode(msg.deviceID, function (err, agentCode) {
                            if (err == null && agentCode != null && agentCode.length == 6) {
                              playerDao.bingAgentCode(msg.deviceID, agentCode, function (err, result) {
                                if (err == null && result) {
                                  settingsDao.getSettings('bindAgentReward', function (err, reward) {
                                    if (err == null && reward!=null && reward.length > 0) {
                                      var values = reward.split('|');
                                      if (values.length > 0) {
                                        playerDao.rewardGem(user.uid, values[0], function (err, result) {
                                          callback(null);
                                        });
                                      } else
                                        callback(null);
                                    } else
                                      callback(null);
                                  });
                                } else
                                  callback(null);
                              });
                            } else {
                              callback(null);
                            }
                          });
                        },
                        function(callback){
//                            bagDao.createBag(user.uid, callback);
                            activeDao.createActive(user.uid,callback);
                        },
                        function(callback){
                            playerGameRecordDao.createGameRecord(user.uid, callback);
                        },
                        function(callback){
                          settingsDao.getSettings('forbiddenLogin', callback);
                        }],
                        function(err, value) {
                          var code = 200;

                            if (err) {
                                logger.error('create bag error with player stack:' + err.stack);
                            } else {
                              if (value != undefined && value == 1) {
                                code = 1001; // 服务器维护中
                              }
                            }

                            logger.debug('新用户设备号创建:' + JSON.stringify(user));
                            var isShen = isTiShen(msg);
                            var isGame = isDownGame(msg.curVersion);
                            var resMsg ={code: code, token: Token.create(user.uid, Date.now(), secret), uid: user.uid,
                                isDownGame:isGame,newVersion:gameConfig["newVersion"],downloadUrlAndroid:gameConfig["downloadUrlAndroid"],
                                downloadUrlIOS:gameConfig["downloadUrlIOS"],isShen:isShen};
                            res.send(resMsg);

                        });
                }
            });
        }else
        {
          if (user[0].agentCode == undefined || user[0].agentCode == null || user[0].agentCode.length == 0) {
            downloadPlayerDao.getAgentCode(msg.deviceID, function (err, agentCode) {
              if (err == null && agentCode != null && agentCode.length == 6) {
                playerDao.bingAgentCode(msg.deviceID, agentCode, function (err, result) {
                  if (err == null && result) {
                    settingsDao.getSettings('bindAgentReward', function (err, reward) {
                      if (err == null && reward!=null && reward.length > 0) {
                        var values = reward.split('|');
                        if (values.length > 0) {
                          playerDao.rewardGem(user[0].uid, values[0], function (err, result) {});
                        }
                      }
                    });
                  }
                });
              }
            });
          }

            logger.debug("msg:%j", msg);
            logger.debug('玩家登陆:' + JSON.stringify(user[0]));
            var isShen = isTiShen(msg);
            var isGame = isDownGame(msg.curVersion);

          settingsDao.getSettings('forbiddenLogin', function (err, value) {
            var code = 200;
            if (err == null && value == 1) {
              code = 1001; // 服务器维护中
            }

            if (user[0].locked == 1)
              code = 1000; // 已封号

            var resMsg = {code: code, token: Token.create(user[0].uid, Date.now(), secret), uid: user[0].uid,
              isDownGame:isGame,newVersion:gameConfig["newVersion"],downloadUrlAndroid:gameConfig["downloadUrlAndroid"],
              downloadUrlIOS:gameConfig["downloadUrlIOS"],isShen:isShen};
            logger.debug("deveceId1:" + msg["deviceID"]);
            logger.debug("deveceId2:" + user[0].deviceID);
            if ((!!msg["headUrl"] && msg["headUrl"] != user[0].headUrl) || (!!msg["nickName"] && msg["nickName"] != user[0].nickName ||
              (!!msg["deviceID"] && msg["deviceID"] != user[0].deviceID))){
              if (!!msg["headUrl"]){
                user[0].headUrl = msg["headUrl"];
              }
              if (!!msg["userSex"]){
                user[0].userSex = msg["userSex"];
              }
              if (!!msg["nickName"]){
                user[0].nickName = msg["nickName"];
              }
              if (!!msg["deviceID"]){
                user[0].deviceID = msg["deviceID"];
              }
              playerDao.updatePlayer(user[0], null);

            }
            res.send(resMsg);
            logger.debug("用户登录成功HTTP：%j",resMsg);
          });
        }
    });
}
//手机注册
regLogin._mobileReg = function (msg, res){
    playerDao.createUser(msg.name, msg.password, msg.regType, msg.deviceID, msg.nickName,msg.headUrl,msg.passwordRecord,msg.userSex,msg.osPlatform,msg.province,msg.city,msg.curVersion,function(err, user)
    {
        if (err || !user)
        {
            logger.error(err);
            if (err && err.code === 1062)
            {
                res.send({code: 501, err:Code.REGLOGIN.FA_CREATE_ERROR});
            } else
            {
                res.send({code: 500, err:Code.REGLOGIN.FA_CREATE_ERROR});
            }
        } else
        {
            async.parallel([
                    function(callback){
                        activeDao.createActive(user.uid,callback);
                    },
                    function(callback){
                        playerGameRecordDao.createGameRecord(user.uid, callback);
                    }],
                function(err, results) {
                    if (err) {
                        logger.error('create bag error with player stack:' + err.stack);
                    }
                    logger.debug('新用户移动端创建： ' + JSON.stringify(user));
                    res.send({code: 200, token: Token.create(user.uid, Date.now(), secret), uid: user.uid});
                    //是否有邀请人ID有则给予奖励
                    msg["uid"] = user.uid;
                    regLogin.invitedReg(msg);
                });
        }
    });
}
/*
邀请注册 填写邀请人名字
inviteUserName
inviteRecord
regType 2
* */
regLogin.invitedReg = function (msg){
    if (!!msg.inviteUserName){
        playerDao.getPlayerByName(msg.inviteUserName, function(err, user) {
            if (err || !user) {
                logger.debug('username not exist!:' + inviteUserName);
                res.send({code: 500, err:Code.REGLOGIN.FA_USER_NOT_EXIST});
                return;
            }
            playerGameRecordDao.getGameRecordByUid(user[0].uid,function(err, res){
                if (!!res){
                    var podiumRecord = {};
                    var gameRecord = res[0];
                    var podium = 100;
                    var mu = 1;
                    var totalChipIn = gameRecord["totalChipIn"];
                    var timestamp = new Date().getTime();
                    logger.debug("totalChipIn:" + totalChipIn);
                    if (totalChipIn > 10000){
                        mu = Math.ceil(totalChipIn * 0.0001);
                        podium = podium * mu;
                    }
                    //[msg.uid, msg.userName,msg.record,msg.type,msg.giveUid, msg.giveUserName, msg.coin, msg.gem, msg.podiumKey];
                    if (!msg.inviteRecord){
                        msg["inviteRecord"] = "";
                    }
                    podiumRecord["uid"] = user[0].uid;
                    podiumRecord["userName"] = user[0].userName;
                    podiumRecord["record"] = msg.inviteRecord;
                    podiumRecord["type"] = 2;
                    podiumRecord["giveUid"] = msg.uid;
                    podiumRecord["giveUserName"] = msg.name;
                    podiumRecord["coin"] = podium;
                    podiumRecord["gem"] = 0;
                    podiumRecord["podiumKey"] = msg.uid.toString() + "_" + timestamp.toString();
                    logger.debug("createPodium:%j",podiumRecord );
                    podiumDao.createPodium(podiumRecord, function(err, podiumResult){

                    });
                }
            });
        });
    }
}

/*
是否是送审版本
* */
var isTiShen = function(msg) {

    var version = msg.curVersion; //osPlatform != "android"
    var osPlatform = msg.osPlatform;
    if (!version || version == undefined || osPlatform == undefined || osPlatform == "android"){
        return 0;
    }
    logger.debug("isTiShen1:%j", msg);
    if (!gameConfig["isTiShen"]){
        gameConfig["isTiShen"] = 0;
    }
    logger.debug("isTiShen2:%j", gameConfig["isTiShen"]);
    if (version == gameConfig["newVersion"] && gameConfig["isTiShen"] == 1){
        return 1;
    }else{
        logger.debug("tiShen 0");
        return 0;
    }
};

var isDownGame = function(version) {
    logger.debug("isDownGame ver:" + version);
    if (!version || version == undefined){
        return 0;
    }
    if (version != gameConfig["newVersion"] && gameConfig["isDownGame"] == 1){
        return 1;
    }else{
        return 0;
    }
};

var reLoadConfig = function(){
    gameConfig  = FS.readFileSync(pomelo.app.getBase() + '/config/qpgames.json', 'utf8');
    gameConfig = JSON.parse(gameConfig);
    logger.debug("http reLoad 2:%j", gameConfig["isTiShen"]);
//    logger.debug(gameConfig);
}

