var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(pomelo.app.getServerType() + '-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');

var consts = require('../../consts/consts');
var timerGame = require('../../util/timerGame');
var playerDao = require('../../dao/playerDao');

var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var huiFangInfoDao = require('../../dao/huiFangInfoDao');
var date = require('../../util/date');

var HUI_FANG_TYPE = require('./MjBaseConst').HUI_FANG_TYPE;

var Data = function (opts) {
    this.table = opts.table;
    this.serverType = pomelo.app.getServerType();
    this.cardResult = [];                           //每一把牌的结果详细信息 输的积分、中鸟、胡牌类型、点炮还是放炮
    this.bigWiner = [];                             //大赢家ID
    this.paoShou = [];                              //炮手
    this.roundsNum = 0;                             //当前第几圈
    this.roundsTotal = opts.config.rounds;            //一共多少圈
    this.aaGem = opts.config.aaGem!=undefined ?opts.config.aaGem:0;
    this.person = opts.config.person != undefined ? opts.config.person : 4;
    this.diScore = opts.config.diScore != undefined ? opts.config.diScore : 1;
    this.isLaiZi = opts.config.isLaiZi != undefined ? opts.config.isLaiZi : 0;                    //是否带癞子

    this.isCalGameResult = false;                       //是否已经结算了
    this.huifangRecord = {};                        //每一把回放的详细数据
    this.huifangOP = [];                            //玩家操作的备份 用于回放
    this.huifangArrDao = {};                        //总结算回放信息用于整个保存并同步到数据库
    this.keepBankerCount=1;  //连庄数
    this.HUI_FANG_TYPE=HUI_FANG_TYPE;
    this.initData();
};

var pro = Data.prototype;

pro.initData= function()
{

}
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

pro.getHuiFangSetp = function(msg){
    var cstep = {};
    //当前操作类型
    cstep["type"] = msg.type;
    //这里记录当前牌桌状态 当前操作提示 已经操作的数组 结果（摸 打 补 杠具体细节）
    if (msg.type == HUI_FANG_TYPE.HUI_INITPAI) {
        var playerPai = [];
        for (var uid in this.table.playerUids) {
            var uidPai = this.table.playerUids[uid].playerCurrentPai();
            playerPai.push(JSON.parse(JSON.stringify(uidPai)));//当前手牌等信息
        }
        this.huifangRecord["playerPai"] = playerPai;
    } else if (msg.type == HUI_FANG_TYPE.HUI_DELPAI) {
        cstep["pai"] = msg.pai;
        cstep["uid"] = msg.uid;
    } else if (msg.type == HUI_FANG_TYPE.HUI_MOPAI) {
        cstep["pai"] = msg.pai;
        cstep["uid"] = msg.uid;
    } else if (msg.type == HUI_FANG_TYPE.HUI_NOTIFY_OP) {
        var opTemp = JSON.parse(JSON.stringify(this.table.CurrentOPArr));
        cstep["notifyOP"] = opTemp;
    } else if (msg.type == HUI_FANG_TYPE.HUI_SYNC_OP) {
        var temp = JSON.parse(JSON.stringify(this.huifangOP));
        if (!!temp["__route__"] || temp["__route__"] != null) {
            temp["__route__"] = null;
        }
        cstep["syncOP"] = temp;
    } else if (msg.type == HUI_FANG_TYPE.HUI_SYNC_OP_RESULT) {
        var temp = utils.clone(msg.opResult);
        cstep["opResult"] = temp;
    }
    else if (msg.type == HUI_FANG_TYPE.HUI_HAIDI) {
        var haidi = utils.clone(msg.opResult);
        cstep["pai"] = haidi;
    } else if (msg.type == HUI_FANG_TYPE.HUI_HUA) {
        cstep["hua"] = JSON.parse(JSON.stringify(msg.hua));
        cstep["uid"] = msg.uid;
    }else if (msg.type == HUI_FANG_TYPE.HUI_JIN) {
        this.huifangRecord["jin"] = msg.pai;
        return null;
    }
    return cstep;
}

/*
 房间号
 东南西北
 庄
 进度步骤
 抓鸟个数
 每个玩家基本信息
 {"opCard":"B4", "tian":[],"chi":[],"peng":1,"gang":0,"bu":0,"hu":1,"guo":1, "level":5}
 当前每一步骤的状态  同步玩家每一步操作
 服务器记录 通知的提示和结果的形成
 * */
pro.updateHuiFang = function (msg) {
    var cstep = this.getHuiFangSetp(msg);
    if(cstep!=null)
        this.huifangRecord["step"].push(cstep);
}

pro.updatehuifangAttDao = function(){
    if (this.roundsNum > 0){
        playerHuiFangDao.createHuiFangRecord(this.huifangArrDao, function(err, res){
            logger.debug("保存回放记录成功");
        });
    }
}
//获取回放记录信息
pro.getHuiFangRecord= function(){
   var huifangRecord = {};
    huifangRecord["num"] = this.table.huiFangNums.pop();
    huifangRecord["fangZhu"] = this.table.FangZhu;
    huifangRecord["banker"] = this.table.BankerUid;
    huifangRecord["position"] = this.table.chairArrBak;
    huifangRecord["chairArr"] = this.table.ChairArr;
    huifangRecord["roundsTotal"] = this.roundsTotal;
    huifangRecord["currRounds"] = this.roundsNum;
    huifangRecord["person"] = this.person;
    huifangRecord["diScore"] = this.diScore;
    huifangRecord["isLaiZi"] = this.isLaiZi;
    huifangRecord["serverType"] = this.serverType;

    return huifangRecord;
}
/**
 * 只初始化基本信息
 */
pro.initHuiFang = function(){
    this.huifangRecord = this.getHuiFangRecord();

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
/*
 获取最新一局庄家UID
 * */
pro.updateBaker = function () {
    if (this.roundsNum == 0) {
        return this.table.FangZhu;
    }

    //取出最后一局数据
    var cardDetail = this.cardResult[this.cardResult.length - 1];

    return cardDetail.banker;
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
//计算分数
pro.calScore = function () {
    var thisResult = {};//总结算数据 给客户端和保存用
    var players = [];//玩家积分数组
    var huPlayerUids = [];//胡牌玩家 {uid:100001,isZimo:0}
    var fangPaoUid = -1; //uid放炮的人记录

    this.initPlayerScore(players);

    //流局
    if (this.table.liuJu == false) {
        //只判断胡牌方 基本分数计算
        fangPaoUid = this.capHuScore(players, huPlayerUids);
        logger.debug("放炮者UID：" + fangPaoUid);
    }
    //计算 其他额外的分
    this.capOtherScore(players,huPlayerUids,fangPaoUid);

    //庄家更新
    var oldBanker = this.table.bankerUid;
    var newBanker = this.checkBanker(huPlayerUids, fangPaoUid);
    thisResult["banker"] = oldBanker;
    thisResult["bankerCount"] = this.keepBankerCount;
    if(oldBanker == newBanker)
    {
        this.keepBankerCount += 1;
    }else
    {
        this.keepBankerCount = 1;
    }
    this.table.BankerUid = newBanker;
    this.table.updateChair();
    //牌局结果 1代表有结果
    thisResult["roundResult"] = 0;

    if (this.table.liuJu == false) {
        thisResult["roundResult"] = 1;
    }


    //更新分数
    this.updateLastScore(players);

    thisResult["players"] = players;

    if (this.roundsNum == this.roundsTotal) {
        thisResult["isOver"] = 1;
    } else {
        thisResult["isOver"] = 0;
    }

    this.cardResult.push(thisResult);
}
//计算胡的分数
//players 结算玩家信息
//huPlayerUids 胡牌玩家uid 数组
//return  fangPaoUid 返回放炮uid
pro.capHuScore = function(players,huPlayerUids)
{
    throw new Error('function must override !');
}
//计算 其他额外的分
//players 结算玩家信息
//huPlayerUids 胡牌玩家uid 数组
//fangpaoUid 放炮uid
pro.capOtherScore = function(players,huPlayerUids,fangpaoUid){
    //throw new Error('function must override !');
}
//获取 初始用户信息
pro.getInitPlayer = function(player){
    var paiResult = {};
    paiResult["uid"] = parseInt(player.uid);
    paiResult["userName"] = player.userName;
    paiResult["nickName"] = player.player.nickName;
    paiResult["paiDest"] = JSON.parse(JSON.stringify(player.paiDest));
    paiResult["qiPai"] = JSON.parse(JSON.stringify(player.paiQiLai()));
    paiResult["winScore"] = 0;
    paiResult["diScore"] = this.diScore;
    paiResult["position"] = player.position;//位置
    paiResult["huType"] = JSON.parse(JSON.stringify(player.huChoice));
    paiResult["isHu"] = player.isHu;
    paiResult["isZimo"] = player.isZimo;
    paiResult["isFangPao"] = player.isFangPao;
    paiResult["coinNum"] = player.coinNum;

    return paiResult;
}

pro.initPlayerScore = function (players) {
    for (var uid in this.table.PlayerUids) {

        var player = this.table.PlayerUids[uid];
        var paiResult = this.getInitPlayer(player);
        players.push(paiResult);
    }
}

pro.scoreDebug = function (players) {
    for (var i = 0; i < players.length; i++) {
        logger.debug("当前玩家uid:" + players[i]["uid"]);
        logger.debug("当前玩家积分:" + players[i]["winScore"]);
    }
}

//检测庄家 下一轮的庄家
pro.checkBanker = function (huPlayerUids, fangPaoUid) {
    logger.debug("huPlayerUids:%j", huPlayerUids);
    //流局庄家 抢海底的为庄 都不抢则最后轮到谁谁是庄

    if (this.table.liuJu == true) {
        var xiaJiaUid = this.table.getNextUid(this.table.bankerUid);
        return xiaJiaUid;
    }

    logger.debug("胡牌的人为庄家:" + huPlayerUids[0].uid);
    return huPlayerUids[0].uid;
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
            fangNum = Math.ceil(fangNum / 4);
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

    // notice
    this.table.emitter.emit('tableOver', {tableId: this.table.Index, bigWinner: this.bigWiner, result: this.huifangArrDao.record});
    var gameResult = {};
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



//更新最终的分数
pro.updateLastScore = function(players){

    for (var p = 0; p < players.length; p++){
        players[p]["coinNum"] += players[p]["winScore"];
        this.table.PlayerUids[players[p]["uid"]].coinNum = players[p]["coinNum"];
        this.table.PlayerUids[players[p]["uid"]].player.coinNum = players[p]["coinNum"];
    }
}

module.exports = Data;