var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var pomelo = require('pomelo');

// var httppingxx = require('../../../domain/http/httpPingxx');

module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
    this.app = app;
};

var pro = Remote.prototype;

/*
 创建订单号pingxx
 * */
pro.createOrderPingxx = function(msg, cb)
{
    // logger.debug("createOrderPingxx  = %j" +  msg.msg);
    // httppingxx.createPingxx(msg.msg,function(charge,err)
    //     {
    //         if (charge != null) {
    //             cb(charge,null);
    //         }
    //         else{
    //             cb(null,err);
    //         }
    //     }
    // );
};
