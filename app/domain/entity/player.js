/**
 * Module dependencies
 */
var util = require('util');
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var logger = require('pomelo-logger').getLogger('charge-log', __filename);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var underscore = require('underscore');
var EventEmitter = require('events').EventEmitter;
var moment = require('moment');
//玩家类基本属性信息
var QPPlayer = function(opts) {
    //基本信息
    EventEmitter.call(this, opts);
    this.uid = opts.uid;
    this.deviceID = opts.deviceID;
    this.regType = opts.regType;
    this.userName = opts.userName;
    this.headUrl = opts.headUrl;
    this.password = opts.password;
    this.nickName = opts.nickName;
    this.userSex = opts.userSex;
    this.vipLevel = opts.vipLevel;
    this.coinNum = opts.coinNum;
    this.gemNum = opts.gemNum;
    this.charm = opts.charm;
    this.firstPaid = opts.firstPaid;
    this.phoneNumber = opts.phoneNumber;
    this.playedTime = opts.playedTime;
    this.clientType = opts.clientType;
    this.GM = opts.GM;
    this.scoreNum = opts.scoreNum;
    this.passwordRecord = "t";
    this.rewardGemNum = opts.rewardGemNum;
    this.goldNum = opts.goldNum;
    this.locked = opts.locked;
    this.lastLoginTime = opts.lastLoginTime;
    //前端服务器ID
    this.serverId = "";
    //对应active数据库信息活动产生的奖励等例如vip次数  每日登陆信息
    this.active = {};
    //背包
    this.bag = opts.bag || null;
};

util.inherits(QPPlayer, EventEmitter);

module.exports = QPPlayer;

// 保存玩家数据
QPPlayer.prototype.save = function() {
  this.emit('save');
};
//更新玩家基本信息  昵称 头像 性别 三个
QPPlayer.prototype.updateBaseInfo = function() {
    this.emit('updateBaseInfo');
};
//更新玩家活动信息
QPPlayer.prototype.updateActive = function() {
    this.emit('updateActive');
};

QPPlayer.prototype.offLineSave = function () {
    this.emit('offLine');
}

QPPlayer.prototype.updateLogin = function () {
    this.emit('updateLogin');
}
//JSON格式的玩家数据
QPPlayer.prototype.toJSON = function() {
  return {
      uid: this.uid,
      deviceID: this.deviceID,
      regType: this.regType,
      userName: this.userName,
      headUrl: this.headUrl,
      password: this.password,
      nickName: this.nickName,
      userSex: this.userSex,
      vipLevel: this.vipLevel,
      coinNum: this.coinNum,
      gemNum: this.gemNum,
      charm: this.charm,
      firstPaid: this.firstPaid,
      phoneNumber: this.phoneNumber,
      playedTime: this.playedTime,
      clientType: this.clientType,
      scoreNum: this.scoreNum,
      rewardGemNum : this.rewardGemNum,
      goldNum: this.goldNum,
      locked: this.locked,
      lastLoginTime: this.lastLoginTime
  };
};
//内存更新玩家属性
QPPlayer.prototype.updatePlayerInfo = function(player) {
    //logger.debug('updatePlayerInfo', player);
    if(!!player["userName"])
        this.userName =  player.userName;
    if(!!player["regType"])
        this.regType =   player.regType;
    if(!!player["headUrl"])
        this.headUrl =   player.headUrl;
    if(!!player["password"])
        this.password =  player.password;
    if(!!player["nickName"])
        this.nickName =  player.nickName;
    if(!!player["userSex"])
        this.userSex =   player.userSex;
    if(!!player["vipLevel"])
        this.vipLevel =  player.vipLevel;
    if(!!player["coinNum"])
        this.coinNum =   player.coinNum;
    if(!!player["gemNum"])
        this.gemNum =    player.gemNum;
    if(!!player["charm"])
        this.charm =     player.charm;
    if(!!player["firstPaid"])
        this.firstPaid = player.firstPaid;
    if(!!player["phoneNumber"])
        this.phoneNumber = player.phoneNumber;
    if(!!player["scoreNum"])
        this.scoreNum = player.scoreNum;
    if(!!player["passwordRecord"])
        this.passwordRecord = player.passwordRecord;
    if(!!player["rewardGemNum"])
        this.rewardGemNum = player.rewardGemNum;
    if(!!player["goldNum"])
        this.goldNum = player.goldNum;
    if(!!player["locked"])
        this.locked = player.locked;
    this.save();
};

//房卡单独刷新跟之前机制不一样
QPPlayer.prototype.updateFangka = function(fangKa, isAddScore){
    isAddScore = isAddScore || false;
    if (isAddScore) {
        // 每消耗一张房卡加1.5积分
        this.updateScoreNum(-fangKa * 1.5);
    }
    this.gemNum += Math.ceil(fangKa);
    if (this.gemNum < 0){
        this.gemNum = 0;
    }
    logger.debug("玩家更新房卡:" + this.gemNum + "    uid:" + this.uid + "    房卡变化:" + fangKa);
    this.save();
};
//更新局数
QPPlayer.prototype.updatePlayedTime = function(time){
    // 每玩一局游戏加1积分
    this.updateScoreNum(time);
    this.playedTime += time;
    logger.debug("玩家更新次数:" + this.playedTime + "    uid:" + this.uid + "    次数变化:" + time);
    this.emit('updatePlayedTime');
};

QPPlayer.prototype.updateScoreNum = function (addVal) {
    this.scoreNum = Math.min(200, this.scoreNum + addVal);
    logger.debug("玩家更新积分:" + this.scoreNum + "    uid:" + this.uid + "    次数变化:" + addVal);
    this.emit('updateScoreNum');
}

QPPlayer.prototype.updateGoldNum = function (addVal) {
    this.goldNum = Math.max(0, this.goldNum + addVal);
    logger.debug("玩家更新金币:" + this.goldNum + "    uid:" + this.uid + "    次数变化:" + addVal);
    this.emit('updateGoldNum');
}

// 奖励赠送的房卡走该接口 额外保存赠送的部分
QPPlayer.prototype.updateRewardFangka = function(fangKa){

    this.gemNum += Math.ceil(fangKa);
    this.rewardGemNum += Math.ceil(fangKa);
    logger.debug("更新房卡:" + this.gemNum + "赠送的房卡:" + this.rewardGemNum + "    uid:" + this.uid + "    房卡变化:" + fangKa);

    var rewardGemInfo = {"uid":this.uid,"rewardGem":fangKa,"beforeGem":(this.gemNum - Math.ceil(fangKa)),"type":1};
    logger.debug("QPPlayer_rewardGemInfo %j",rewardGemInfo);
    this.emit("addRewardGemInfo",rewardGemInfo);

    this.save();
}
