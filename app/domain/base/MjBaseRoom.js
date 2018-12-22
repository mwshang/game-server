
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(pomelo.app.getServerType()+'-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');

var sync2HallType = require('../../consts/consts').Sync2HallType;
var timerGame =  require('../../util/timerGame');
var ai = require('../ai/ai');
var _ = require('lodash');
var util= require('util');
var BaseRoom=require('../base/BaseRoom');

var Instance = function(app){
    BaseRoom.call(this,app);
};
util.inherits(Instance, BaseRoom);
module.exports = Instance;


