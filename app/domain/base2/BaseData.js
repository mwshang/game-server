
var logger = require('pomelo-logger').getLogger('data-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var consts = require('../../consts/consts');
var timerGame = require('../../util/timerGame');
var playerDao = require('../../dao/playerDao');
var packDao = require('../../dao/packDao');
var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var huiFangInfoDao = require('../../dao/huiFangInfoDao');
var date = require('../../util/date');

var Data = function (opts) {
    this.table = opts.table;
    this.serverType = pomelo.app.getServerType();
    this.cardResult = [];                           //每一把牌的结果详细信息 输的积分、中鸟、胡牌类型、点炮还是放炮
    this.bigWiner = [];                             //大赢家ID
    this.paoShou = [];
    this.roundsNum = 0;                             //当前第几圈
    this.roundsTotal = opts.config.rounds;            //一共多少圈
    this.aaGem = opts.config.aaGem!=undefined ?opts.config.aaGem:0;
    this.person = opts.config.person != undefined ? opts.config.person : 4;

    this.isCalGameResult = false;                       //是否已经结算了
    this.huifangRecord = {};                        //每一把回放的详细数据
    this.huifangOP = [];                            //玩家操作的备份 用于回放
    this.huifangArrDao = {};                        //总结算回放信息用于整个保存并同步到数据库
};

var pro = Data.prototype;

pro.resetData = function() {
    this.huifangRecord = {};
    this.huifangOP = [];
    this.isCalGameResult = false;
}

//curStatus 0 1   0代表第一把 1代表中间
//uid1-4 type fangHao recordTime record
//用来记录每个玩家的uid 名字 总积分 每局的回放号 输赢积分 时间等
//用来记录每个玩家的uid 名字 总积分 每局的回放号 输赢积分 时间等
pro.updatehuifangArrDao = function(curStatus){
    if (curStatus == 0){
        this.huifangArrDao["uid1"] = this.table.chairArrBak[0];
        this.huifangArrDao["uid2"] = this.table.chairArrBak[1];
        this.huifangArrDao["uid3"] = this.table.chairArrBak.length > 2 ? this.table.chairArrBak[2] : 0;
        this.huifangArrDao["uid4"] = this.table.chairArrBak.length > 3 ? this.table.chairArrBak[3] : 0;
        this.huifangArrDao["uid5"] = this.table.chairArrBak.length > 4 ? this.table.chairArrBak[4] : 0;
        this.huifangArrDao["uid6"] = this.table.chairArrBak.length > 5 ? this.table.chairArrBak[5] : 0;
        this.huifangArrDao["uid7"] = this.table.chairArrBak.length > 6 ? this.table.chairArrBak[6] : 0;
        this.huifangArrDao["uid8"] = this.table.chairArrBak.length > 7 ? this.table.chairArrBak[7] : 0;
        this.huifangArrDao["type"] = this.getGemCount();
        this.huifangArrDao["fangHao"] = this.table.Index;
        this.huifangArrDao["person"] = this.person;
        this.huifangArrDao["roundsTotal"] = this.roundsTotal;
        this.huifangArrDao["record"] = [];
        this.huifangArrDao["serverType"] = this.serverType;

        this.extHuiFangArr();

        //代开检测
        this.huifangArrDao["daiKai"] = 0;
        this.huifangArrDao["fangZhu"] = this.table.chairArrBak[0];
        if (this.table.app.get("roomMgr").isRePrivateTable(this.table.Index) == true){
            var daiKai =  this.table.app.get("roomMgr").getRePrivateTableID(this.table.Index);
            this.huifangArrDao["fangZhu"] = daiKai;
            this.huifangArrDao["daiKai"] = 1;
        }

    }else if (curStatus == 1){
        var huiNum = this.huifangRecord["num"];
        var lastRecord = {};
        var currRounds = [];
        var cardDetail = this.cardResult[this.cardResult.length - 1];
        for (var i = 0; i < cardDetail.players.length; i++){
            var player = cardDetail.players[i];
            var tempPlayer = {};
            tempPlayer["uid"] = player.uid;
            tempPlayer["userName"] = player.nickName;
            tempPlayer["winScore"] = player.winScore;
            tempPlayer["coinNum"] = player.coinNum;
            currRounds.push(tempPlayer);
        }
        lastRecord["result"] = currRounds;
        lastRecord["num"] = huiNum;
        lastRecord["time"] = date.timeLocalFormat(new Date());
        this.huifangArrDao["record"].push(lastRecord);
        logger.error("存储一把回放房间号:" + huiNum);
    }
}

pro.extHuiFangArr = function () {

}

pro.updatehuifangAttDao = function(){
    if (this.roundsNum > 0){
        playerHuiFangDao.createHuiFangRecord(this.huifangArrDao, function(err, res){
            logger.debug("保存回放记录成功");
        });
    }
}

/**
 * 只初始化基本信息
 */
pro.initHuiFang = function(){
    this.huifangRecord = {};
    this.huifangRecord["num"] = this.table.huiFangNums.pop();
    this.huifangRecord["fangZhu"] = this.table.FangZhu;
    this.huifangRecord["banker"] = this.table.BankerUid;
    this.huifangRecord["position"] = this.table.chairArrBak;
    this.huifangRecord["chairArr"] = this.table.ChairArr;
    this.huifangRecord["roundsTotal"] = this.roundsTotal;
    this.huifangRecord["currRounds"] = this.roundsNum;
    this.huifangRecord["person"] = this.person;
    this.huifangRecord["serverType"] = this.serverType;

    this.extInitHuiFang();

    var players = [];
    for (var uid in this.table.playerUids){
        var playerInfo = {};
        playerInfo["uid"] = parseInt(uid);//基本信息
        playerInfo["userName"] = this.table.playerUids[uid].userName;//基本信息
        playerInfo["nickName"] = this.table.playerUids[uid].player.nickName;//基本信息
        playerInfo["coinNum"] = this.table.playerUids[uid].coinNum;//基本信息
        playerInfo["headUrl"] = this.table.playerUids[uid].player.headUrl;//头像
        players.push(playerInfo);
    }
    this.huifangRecord["players"] = players;
    //每一步的细节 后面叠加
    this.huifangRecord["step"] = [];

    //第一把
    if (this.roundsNum < 1){
        this.updatehuifangArrDao(0);
    }

    logger.error("新一把回放号码:" + this.huifangRecord["num"] );
}

pro.extInitHuiFang = function () {

}

//更新单把回放数据信息
pro.updateHuiFangDao = function(cb){
    var huiFangMsg = {};
    var huiFangnum = this.huifangRecord["num"];
    huiFangMsg["huiFangNum"] = huiFangnum;
    huiFangMsg["uid1"] = this.huifangRecord["chairArr"][0];
    huiFangMsg["uid2"] = this.huifangRecord["chairArr"][1];
    huiFangMsg["uid3"] = this.huifangRecord["chairArr"].length > 2 ? this.huifangRecord["chairArr"][2] : 0;
    huiFangMsg["uid4"] = this.huifangRecord["chairArr"].length > 3 ? this.huifangRecord["chairArr"][3] : 0;
    huiFangMsg["uid5"] = this.huifangRecord["chairArr"].length > 4 ? this.huifangRecord["chairArr"][4] : 0;
    huiFangMsg["uid6"] = this.huifangRecord["chairArr"].length > 5 ? this.huifangRecord["chairArr"][5] : 0;
    huiFangMsg["uid7"] = this.huifangRecord["chairArr"].length > 6 ? this.huifangRecord["chairArr"][6] : 0;
    huiFangMsg["uid8"] = this.huifangRecord["chairArr"].length > 7 ? this.huifangRecord["chairArr"][7] : 0;
    huiFangMsg["serverType"] = this.serverType;
    huiFangMsg["record"] = utils.clone(this.huifangRecord);

    //暂时屏蔽 服务器空间不够大
    huiFangInfoDao.createhuiFangInfo(huiFangMsg, function(err, res){
        logger.debug("保存单场回放记录成功");
    });
    cb();
}

/**
* 计算本局结果 积分 输赢等等
**/
pro.calGameResult = function(){
    if (this.isCalGameResult == true){
        logger.error("结算出问题了,多次结算呢");
        return;
    }
    //摸鸟 + 算分
    this.isCalGameResult = true;
    this.roundsNum += 1;//当前第几圈
    this.calScore();
    this.delGem();//消耗房卡
    this.updatehuifangArrDao(1);//记录回放数据
    this.table.Message.mjGameResult(this.cardResult[this.cardResult.length - 1]);
    this.updateHuiFangDao(function(){
        this.table.resetTable();
        if (this.roundsNum == this.roundsTotal){
            logger.debug("游戏解散已经打完了统计总成绩");
            this.gameOver();
        }else{
            logger.debug("游戏继续下一把");
            this.table.resetPlayer();
        }
    }.bind(this));//保存单场回放数据
}

/**
 * 房卡消耗
 */
pro.delGem = function(){
    //统计玩家房间数
    if(this.roundsNum==1)
    {
        this.table.app.get("roomMgr").updatePlayedTime(this.table,1);
    }
    if (this.roundsNum == 1 && this.table.app.get("roomMgr").isNeedGem == 1){
        logger.debug("房卡消耗:");
        var fangNum = this.getGemCount();
        if (this.aaGem == 1){
            fangNum  = fangNum / 4;
            for (var uid in this.table.playerUids){
                this.table.playerUids[uid].player["fangKa"] = -fangNum;
                this.table.playerUids[uid].player.gemNum -= fangNum;
                this.table.playerUids[uid].gemNum = this.table.playerUids[uid].player.gemNum;
                this.table.app.get("roomMgr").updatePlayer(this.table.playerUids[uid].player);
            }
        }else{
            //是否是代开
            if (this.table.app.get("roomMgr").isRePrivateTable(this.table.Index) == true){
                this.table.app.get("roomMgr").updateFangka2Hall(this.table.Index,-fangNum);
            }else{
                this.table.playerUids[this.table.FangZhu].player["fangKa"] = -fangNum;
                this.table.playerUids[this.table.FangZhu].player.gemNum -= fangNum;
                this.table.playerUids[this.table.FangZhu].gemNum = this.table.playerUids[this.table.FangZhu].player.gemNum;
                this.table.app.get("roomMgr").updatePlayer(this.table.playerUids[this.table.FangZhu].player);
            }
        }
    }
}

/**
 * override 计算房间消耗房卡数量
 * @returns {number}
 */
pro.getGemCount = function () {
    return 0;
}

//游戏总结算
pro.gameOver = function(){
    var gameResult = {};
    var playerResult = [];
    var maxCoin = 0;
    var paoShou = 0
    for (var uid in this.table.playerUids){
        var resultPlayer = this.table.playerUids[uid].getPlayerResult();
        playerResult.push(resultPlayer);
        if (this.table.playerUids[uid].coinNum > maxCoin){
            maxCoin = this.table.playerUids[uid].coinNum;
            this.bigWiner.push(parseInt(uid));//最后一个push进来的肯定最多 暂时不算俩个大赢家情况~
        }

        if (resultPlayer.dahuPao + resultPlayer.xiaoHuPao > paoShou){
            paoShou = resultPlayer.dahuPao + resultPlayer.xiaoHuPao;
            this.paoShou.push(parseInt(uid));
        }
    }

    this.extGameOver();

    // notice
    this.table.emitter.emit('tableOver', {tableId: this.table.Index, bigWinner: this.bigWiner, result: this.huifangArrDao.record});
    gameResult["players"] = playerResult;
    gameResult["bigWiner"] = this.bigWiner[this.bigWiner.length - 1];
    gameResult["fangZhu"] = this.table.FangZhu;
    gameResult["paoShou"] = this.paoShou[this.paoShou.length - 1];

    // 加入游戏相关数据
    this.extGameResult(gameResult);

    //回放记录保存
    this.updatehuifangAttDao();

    this.table.Message.mjGameOver(gameResult);
    this.table.clearTablePlayers();

    //桌子解散啦
    setTimeout(function(){
        this.table.gameOver();
    }.bind(this), 2000);
}

/**
 * must override 游戏相关的结果数据
 * @param gameResult
 */
pro.extGameResult = function (gameResult) {
}

/**
 * must override
 */
pro.extGameOver = function () {
}

//更新最终的分数
pro.updateLastScore = function(players){

    for (var p = 0; p < players.length; p++){
        players[p]["coinNum"] += players[p]["winScore"];
        this.table.PlayerUids[players[p]["uid"]].coinNum = players[p]["coinNum"];
        this.table.PlayerUids[players[p]["uid"]].player.coinNum = players[p]["coinNum"];
    }
}

module.exports = Data;