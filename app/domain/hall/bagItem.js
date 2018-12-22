var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var AttriChangeType = require('../../consts/consts').AttriChangeType;
var playerDao = require('../../dao/playerDao');
var Code = require('../../consts/code');

var bagItem = module.exports;


/*主动推送玩家背包信息
* */
bagItem.sendBagMsg = function(player)
{
    var bagData = {};
    if (player.bag != null){
        bagData = player.bag.getData();
    }
    messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallBagMsg, {"hallBagMsg": bagData});
};

/*
添加道具
* */
bagItem.addBagItem = function(msg) {
    var index = -1;
    var data = dataApi.item.findById(msg.id);
    if (!!data) {
        var player = pomelo.app.get("hall").getPlayer(msg.uid);
        if (player != null && !!player["bag"]){
            index = player.bag.addItem({id: msg.id, type: data.type, count:msg.count});
        }
    }

    return index;
};

/*
 使用道具
 * */
bagItem.useBagItem = function(msg) {
    var index = false;
    var data = dataApi.item.findById(msg.itemId);
    if (!!data) {
        var player = pomelo.app.get("hall").getPlayer(msg.uid);
        if (player != null && !!player["bag"]){
            index = player.bag.useItem(msg.itemId);
            this.sendBagMsg(player);
        }
    }

    return index;
};