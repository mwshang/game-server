var pomelo = require('pomelo');
var Event = require('../../consts/consts').HALL;
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var http = require('http');
var url = require('url');
var crypto = require('crypto');
var playerDao = require('../../dao/playerDao');
var date = require('../../util/date');

var order = module.exports;

var orderLists = [];
var checkUrl   = "https://sandbox.itunes.apple.com/verifyReceipt";
var vertifyUrl = "https://buy.itunes.apple.com/verifyReceipt";


//订单号
//uid  prodId  prodNum 客户端发过来
//uid  traceNo  orderNo  orderAmount  orderTime payChannel status productNum
order.getOrder = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!msg.uid) {
        logger.debug('GM参数错误');
        res.send({code: 500});
        return;
    }
    var orderId = order.addOrder(msg);
    orderLists.push(orderId);
    logger.debug("新的订单ID：%j", orderId);
    res.send({code:200, orderInfo:orderId});
};
//订单状态 uid info
order.qp_orderStatus = function (msg,res)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!msg.uid) {
        logger.error('GM参数错误');
        res.send({code: 500});
        return;
    }
    logger.debug("qp_orderStatus1：%j", msg);
    var data = msg;
//    var url = checkUrl;

//    Http.HttpPostWithJson(url, {"receipt-data" : data}, function(err, iosInfo) {
//        if (err) {
//            logger.error('错误1:' + err);
//            res.send({code: 500});
//            return;
//        }
//        var retInfo = null;
//        try {
//            retInfo = JSON.parse(iosInfo);
//        } catch(e) {
//            logger.error('错误2:' + e);
//            res.send({code: 500});
//            return;
//        }
//        logger.debug("IOS验证返回 ret:%j", retInfo);
//    });

    //根据订单ID判断哪个产品对应充值
    var index = order.getOrderByList(data);
    if (index >= 0){
        var msgRpc = {};
        msgRpc["uid"] = msg.uid;
        msgRpc["gemNum"] = orderLists[index].prodNum;
        pomelo.app.rpc.hall.fangkaRemote.changeFangKa(null, msgRpc,function(err){
            if(!!err){
                logger.error("操作房卡失败:%j", err);
                orderLists[index]["status"]=1;
                res.send({code: 500});
                return;
            }
            logger.error("充值成功:%j",msg);
            logger.error("充值成功111:%j",orderLists[index]);
            orderLists[index]["status"]=2;
            res.send({code: 200});
        });
    }else{
        logger.error("错误3:" + index);
        res.send({code: 500});
        return;
    }
};

//添加一个订单号
order.addOrder = function (msg)
{
    var orderInfo = {};
    orderInfo["uid"] = msg.uid;
    orderInfo["payChannel"] = "ios";
    orderInfo["status"] = 0; //0 代表请求订单 1代表支付成功但是没发货  2代表发货
    orderInfo["prodId"] = msg.prodId;
    //orderInfo["prodNum"] = msg.prodNum;
    var gem=0;
    if(msg.prodId.indexOf("01")>0)
    {
        gem=6;
    }
    else if(msg.prodId.indexOf("02")>0)
    {
        gem=12;
    }
    else if(msg.prodId.indexOf("03")>0)
    {
        gem=18;
    }
    else{
        gem = 6;
    }
    orderInfo["prodNum"] = gem;
    var currTime = Date.now();
    var currOrederId =  msg.uid + "_" +msg.prodId + "_" + currTime;
    orderInfo["orderId"] = currOrederId;

    return orderInfo;
};

//删除一个订单号
order.deleteOrder = function (msg)
{


};

//获取一个订单号
order.getOrderByList = function(msg){
    logger.debug("getOrderByList1:%j",msg);
    logger.debug("getOrderByList2:%j",orderLists);
    for (var i = 0; i < orderLists.length; i++){
        if (msg.prodId == orderLists[i].prodId && orderLists[i].status == 0){
            return i;
        }
    }
    return -1;
}