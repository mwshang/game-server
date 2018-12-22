var Code = require('../consts/code');
var utils = require('../util/utils');
var dispatcher = require('../util/dispatcher');
var Event = require('../consts/consts').Event;
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);

var gameService = function(app)
{

  this.app = app;
  this.uidMap = {};
  this.nameMap = {};
  this.channelMap = {};
};

module.exports = gameService;

gameService.prototype.createChannel = function(channelName)
{
    var channel = this.app.get('channelService').getChannel(channelName, true);
    if(!channel) {
        logger.error("创建channel失败");
        return null;
    }

    return channel;
};



/**
 * Add player into the channel
 *
 * @param {String} uid         user id
 * @param {String} playerName  player's role name
 * @param {String} channelName channel name
 * @return {Number} see code.js
 */
gameService.prototype.add = function(uid, playerName, channelName, sid)
{
  if(checkDuplicate(this, uid, channelName)) {
    return Code.OK;
    // this.leave(uid, channelName);
  }

 //如果找不到sid的情况
  if (!sid)
  {
     logger.error("玩家的SID为空");
     return Code.FAIL;
  }

  var channel = this.app.get('channelService').getChannel(channelName, true);
  if(!channel) {
    return Code.FAIL;
  }

  channel.add(uid, sid);
  addRecord(this, uid, playerName, sid, channelName);

  return Code.OK;
};

/**
 * User leaves the channel
 *
 * @param  {String} uid         user id
 * @param  {String} channelName channel name
 */
gameService.prototype.leave = function(uid, channelName) {
  var record = this.uidMap[uid];
  var channel = this.app.get('channelService').getChannel(channelName, true);

  if(channel && record) {
    channel.leave(uid, record.sid);
  }else{
      logger.error("移除玩家channel失败1:" + uid + "   name:" + channelName);
  }

  removeRecord(this, uid, channelName);
};

/**
 *
 * @param  {String} uid user id
 */
gameService.prototype.kick = function(uid) {
  var channelNames = this.channelMap[uid];
  var record = this.uidMap[uid];

  if(channelNames && record) {
    // remove user from channels
    var channel;
    for(var name in channelNames) {
      channel = this.app.get('channelService').getChannel(name);
      if(channel) {
        channel.leave(uid, record.sid);
      }
    }
  }

  clearRecords(this, uid);
};

/*
删除channelName
* */
gameService.prototype.removeChannelByName = function(channelName){
    this.app.get('channelService').destroyChannel(channelName);
}

/**
 * Push message by the specified channel
 *
 * @param  {String}   channelName channel name
 * @param  {Object}   msg         message json object
 * @param  {Function} cb          callback function
 */
gameService.prototype.pushByChannel = function(eventName,channelName, msg, cb) {
  var channel = this.app.get('channelService').getChannel(channelName,true);
  if(!channel) {
    cb(new Error('channel ' + channelName + ' dose not exist'));
    return;
  }

  //主动推送客户端消息 Event 事件列表
  channel.pushMessage(eventName, msg, cb);
};

/**
 * Push message to the specified player
 *
 * @param  {String}   playerName player's role name
 * @param  {Object}   msg        message json object
 * @param  {Function} cb         callback
 */
gameService.prototype.pushByPlayerName = function(eventName,playerName, msg, cb) {
  var record = this.nameMap[playerName];
  if(!record) {
    cb(null, Code.CHAT.FA_USER_NOT_ONLINE);
    return;
  }

  this.app.get('channelService').pushMessageByUids(eventName, msg, [{uid: record.uid, sid: record.sid}], cb);
};
gameService.prototype.pushByPlayerUid = function(eventName,uid, msg, cb) {
    var record = this.uidMap[uid];
    if(!record) {
        //logger.debug(this.uidMap);
        cb(null, Code.CHAT.FA_USER_NOT_ONLINE);
        return;
    }
    //主动推送客户端消息 Event 事件列表
    this.app.get('channelService').pushMessageByUids(eventName, msg, [{uid: record.uid, sid: record.sid}], cb);
};
gameService.prototype.pushByPlayerUids = function (eventName, uids, msg, cb) {
    var targets = [];
    uids.map(function (uid) {
      var record = this.uidMap[uid];
      if(!record) {
        logger.debug('no found record', uid);
        return;
      }
      targets.push({uid: record.uid, sid: record.sid});
    }.bind(this));
    //主动推送客户端消息 Event 事件列表
    this.app.get('channelService').pushMessageByUids(eventName, msg, targets, cb);
}
/**
 * Check whether the user has already in the channel
 */
var checkDuplicate = function(service, uid, channelName) {
  return !!service.channelMap[uid] && !!service.channelMap[uid][channelName];
};

/**
 * Add records for the specified user
 */
var addRecord = function(service, uid, name, sid, channelName) {
  var record = {uid: uid, name: name, sid: sid};
  service.uidMap[uid] = record;
  service.nameMap[name] = record;
  var item = service.channelMap[uid];
  if(!item) {
    item = service.channelMap[uid] = {};
  }
  item[channelName] = 1;
};

/**
 * Remove records for the specified user and channel pair
 */
var removeRecord = function(service, uid, channelName) {
  var item = service.channelMap[uid];
  if(item)
    delete service.channelMap[uid][channelName];

  // if user not in any channel then clear his records
  clearRecords(service, uid);
};

/**
 * Clear all records of the user
 */
var clearRecords = function(service, uid) {
  delete service.channelMap[uid];

  var record = service.uidMap[uid];
  if(!record) {
    logger.error("清理玩家channel失败:%j" , record);
    return;
  }

  delete service.uidMap[uid];
  delete service.nameMap[record.name];
};

/**
 * Get the connector server id assosiated with the uid
 */
var getSidByUid = function(uid, app) {
  var connector = dispatcher.dispatch(uid, app.getServersByType('connector'));
  if(connector) {
    return connector.id;
  }
  return null;
};
