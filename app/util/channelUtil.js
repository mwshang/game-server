var ChannelUtil = module.exports;

var GLOBAL_CHANNEL_NAME = 'pomelo';
var WUHAN_CHANNEL_NAME = 'wuhan_';


ChannelUtil.getGlobalChannelName = function() {
  return GLOBAL_CHANNEL_NAME;
};

ChannelUtil.getWuHanChannelName = function(teamId) {
    return WUHAN_CHANNEL_NAME + teamId + "_" + Date.now();
};

var PACK_CHANNEL_NAME = 'pack_';
ChannelUtil.getPackChannelName = function(teamId) {
    return PACK_CHANNEL_NAME + teamId;
};
