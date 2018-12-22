var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var pomelo = require('pomelo');

module.exports = function(app) {
  return new ChannelHandler(app, app.get('chatService'));
};

var ChannelHandler = function(app, chatService) {
  this.app = app;
  this.chatService = chatService;
};

function setContent(str) {
  str = str.replace(/<\/?[^>]*>/g,'');
  str = str.replace(/[ | ]*\n/g,'\n');
  return str.replace(/\n[\s| | ]*\r/g,'\n');
}

ChannelHandler.prototype.send = function(msg, session, next)
{

};

var getChannelName = function(msg){

  return channelUtil.getGlobalChannelName();
};
