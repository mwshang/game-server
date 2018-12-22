
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var AttriChangeType = require('../../consts/consts').AttriChangeType;
var playerDao = require('../../dao/playerDao');
var chargeOrderDao = require('../../dao/chargeOrderDao');
var activeDao = require('../../dao/activeDao');
var Code = require('../../consts/code');
var bagItem = require('./bagItem');
var shop = module.exports;

/*获取商店信息
* */
shop.getShopInfo = function()
{
    var data = dataApi.shop.all();
    var dataArr = [];
    for (var key in data){
        var dataSig = {};
        dataSig["id"] = key;
        dataSig["info"] = data[key];
        dataArr.push(dataSig);
    }
    logger.debug("当前商店信息:%j", dataArr);
    return dataArr;
};

/*ping 回调
* */
shop.buyShopItem = function(msg, next)
{
    if (!msg["id"] || !msg["uid"]){
        logger.error("缺少uid或者id");
        next(null, {code: Code.FAIL});
        return false;
    }
    var item = dataApi.shop.findById(msg.id);
    logger.debug("购买商品信息:%j", item);
    var rmb = item.rmb;
    var score = item.score;
    var coin = item.coin;
    var vip = item.vipCount;
    var gem = item.gem;
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    var result = false;
    //消耗金币或者钻石的商品
    if (rmb == 0){
        result = this.getItemByCoin(msg , player, item);
        if (result == false){
            next(null, {code: Code.FAIL});
            return false;
        }
    }else{
        if (coin > 0){
            this.addCoin(msg , player, coin);
        }
        if (vip > 0){
            this.addVip(msg , player, vip);
        }
        if (gem > 0){
            this.addgem(msg , player, gem);
        }
    }
    //sync db
    if (player != null){
        //提交数据库
        player.save();
        player.updateActive();
    }
    //sync order 充值相关
    if (msg["order_no"] != null){
        var chargeInfo = {};
        chargeInfo["order_no"] = msg["order_no"];
        chargeInfo["order_status"] = 2;
        chargeOrderDao.updatechargeOrder(chargeInfo, null);
    }

    next(null, {code: Code.OK});
}

/*
 * */
shop.addCoin = function(msg, player, coin)
{
    if (player != null && !!player["coinNum"])
    {
        logger.debug("添加金币");

        //更新玩家属性变化
        player["firstPaid"] = 1;
        player["coinNum"] += coin;

        //通知客户端属性变化 [{uid: record.uid, sid: record.sid}]
        messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],"type":AttriChangeType.attrShop});

        return true;
    }
    //玩家不在线
    else
    {
        logger.error("离线购买金币 添加金币");
        //player sync write
        playerDao.getPlayerByUid(msg["uid"], function(err, res)
        {
            if (!!err){
                logger.error("buyShopCoin查询玩家信息失败");
                return false;
            }
            else{
             var player = res[0];
             player["firstPaid"] = 1;
             player["coinNum"] += coin;
             playerDao.updatePlayer(player, null);
            }
        });
    }

    return false;
}
/*
 * */
shop.addVip = function(msg, player, vip)
{
    logger.debug("addVip");
    if (player != null && player["vipLevel"] != null && player["active"] != null)
    {
        logger.debug("购买vip成功");
        //更新玩家属性变化
        player["vipLevel"] = 1;
        player["active"].vipCount += vip;

        //通知客户端属性变化 [{uid: record.uid, sid: record.sid}]
        messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"vipLevel":player["vipLevel"],"type":AttriChangeType.attrShop});

        return true;
    }
    //玩家不在线
    else
    {
        logger.error("离线购买vip成功");
        //player sync write
        playerDao.getPlayerByUid(msg["uid"], function(err, res)
        {
            if (!!err){
                logger.error("addVip查询玩家信息失败");
                return false;
            }
            else{
                var player = res[0];
                player["vipLevel"] = 1;
                playerDao.updatePlayer(player, null);
                //sync active
                activeDao.getActiveByUid(msg["uid"], function(err, res){
                    if (!!res){
                        res.vipCount += vip;
                        activeDao.update(res, null);
                    }
                });
            }
        });
    }
    return false;
}
/*
 * */
shop.addgem = function(msg, player, gem)
{
    if (player != null && !!player["gemNum"])
    {
        logger.debug("添加钻石");

        //更新玩家属性变化
        player["firstPaid"] = 1;
        player["gemNum"] += gem;

        //通知客户端属性变化 [{uid: record.uid, sid: record.sid}]
        messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":player["gemNum"],"type":AttriChangeType.attrShop});

        return true;
    }
    //玩家不在线
    else
    {
        logger.error("离线购买钻石 添加钻石");
        //player sync write
        playerDao.getPlayerByUid(msg["uid"], function(err, res)
        {
            if (!!err){
                logger.error("addgem查询玩家信息失败");
                return false;
            }
            else{
                var player = res[0];
                player["firstPaid"] = 1;
                player["gemNum"] += gem;
                playerDao.updatePlayer(player, null);
            }
        });
    }

    return false;
}

/*
赠送道具
* */
shop.addItem = function(msg, player, item)
{
    if (player != null)
    {
        logger.debug("添加道具");
        var type = item.type;
        if (type == consts.SHOP_TYPE.SHOP_VIP){
            this.addVip(msg, player, item.vipCount);
        }
        //大喇叭
        else if (type == consts.SHOP_TYPE.SHOP_LABA){
            var temp = {};
            //应该取ITEM表格的id和type后面再改吧
            temp["type"] = "itemChat";
            temp["id"] = 1;
            temp["count"] = 1;
            player.bag.addItem(temp);
            bagItem.sendBagMsg(player);
        }
        //实物记录到数据库中购买的话
//        else if (type == consts.SHOP_TYPE.SJOP_SHIWU){
//            this.addVip(msg, player, item.vipCount);
//        }

        return true;
    }

    return false;
}
/*
金币积分兑换
* */
shop.getItemByCoin = function(msg, player, item){
    if (player != null){
        var score = item.score;
        var coin = item.coin;

        //金币兑换即可
        if (coin > 0 && player["coinNum"] >= coin && score == 0){
            this.addItem(msg, player, item);
            player["coinNum"] -= coin;
            messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],
                "type":AttriChangeType.attrShop});
            return true;
        }
        //积分即可
        if (score > 0 && player["scoreNum"] >= score && coin == 0){
            this.addItem(msg, player, item);
            player["scoreNum"] -= score;
            messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"scoreNum":player["scoreNum"],
                "type":AttriChangeType.attrShop});
            return true;
        }
        //金币加积分
        if (score > 0 && player["scoreNum"] >= score && coin > 0 && player["coinNum"] >= coin){
            this.addItem(msg, player, item);
            player["coinNum"] -= coin;
            player["scoreNum"] -= score;
            messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"coinNum":player["coinNum"],
                "type":AttriChangeType.attrShop});
            messageService.pushMessageToPlayer({uid:msg.uid, sid : msg.serverId}, Event.hallUpdatePlayerAttr, {"scoreNum":player["scoreNum"],
                "type":AttriChangeType.attrShop});
            return true;
        }

        return false;
    }

    return false;
}