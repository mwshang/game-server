
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var Event = require('../../consts/consts').HALL;
var rankDao = require('../../dao/rankDao');

var rank = module.exports;

var RankType =
{
    coinRank:"coinNumRank",     //金币排行榜
    gemRank: "gemNumRank",      //钻石排行榜
    charmRank: "charmRank"      //魅力值排行榜
}

//金币排行榜数据
var coinRank = {};
//魅力值排行榜数据
var charmRank = {};
//钻石排行榜数据
var gemRank = {};

//重新获取排行榜信息
rank.resetRankData = function()
{
//    rankDao.getCoinRank(RankType.coinRank, function(err, data){
//        coinRank = data;
//        for(var i = 0; i < coinRank.length; i++){
//            //logger.debug("金币排行榜玩家: " + coinRank[i].userName + " 金币:" + coinRank[i].coinNum);
//        }
//    });
//
//    rankDao.getGemRank(RankType.gemRank, function(err, data){
//        gemRank = data;
//        for(var i = 0; i < gemRank.length; i++){
//            //logger.debug("金币排行榜玩家: " + gemRank[i].userName + " 钻石:" + gemRank[i].coinNum);
//        }
//    });
};

/*获取排行榜信息
* */
rank.getRankInfo = function(msg)
{
    var player = pomelo.app.get("hall").getPlayer(msg.uid);
    if (player == null){
        return null;
    }
    var rankData = {};
    rankData[RankType.coinRank] = coinRank;
    rankData[RankType.gemRank] = gemRank;
    return rankData;
}

