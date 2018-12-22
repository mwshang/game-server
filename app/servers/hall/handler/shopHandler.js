var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var shop = require('../../../domain/hall/shop');
/**
 * shop handler.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;


/*获取商店信息
 hall.shopHandler.getShopInfo
* */
pro.getShopInfo = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }

    var msg = shop.getShopInfo();

    next(null, {code: Code.OK,shopInfo:msg});
};

/*购买商品
id
uid
hall.shopHandler.buyShopItem
* */
pro.buyShopItem = function(msg, session, next) {
    var uid = msg.uid,self = this;
    if(!uid || !msg.id /* || !msg.channel*/) {
        next(null, {code: Code.FAIL});
        return;
    }

    var serverId = session.get('serverId');
    logger.debug("当前玩家serverId:" + serverId);
    msg["serverId"] = serverId;

    //发送httpgame 创建订单号并请求ping++第三方获取订单详细信息 然后返回给client
//    self.app.rpc.http.httpRemote.createOrderPingxx(session, {msg: msg}, function(charge,err)
//    {
//        if(!!err)
//        {
//            logger.error('创建订单失败! %j', err);
//            next(null, {code: Code.FAIL, "err": err});
//        }else{
//            logger.debug("charge：%j", charge);
//            next(null, {code: Code.OK, "charge":charge});
//        }
//    });

    shop.buyShopItem(msg,next);
//    if (shop.buyShopItem(msg,next) == false)
//    {
//        logger.error("购买失败");
//        next(null, {code: Code.FAIL});
//    }


};