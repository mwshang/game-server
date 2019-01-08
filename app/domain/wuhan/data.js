var room = require('./room');
var timer = require('../../util/timerGame');
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var Const = require('../../consts/consts');
var card = require('./card');
var Table = require('./table');
var Message = require('./message');
var messageService = require('../../services/messageService');
var Player = require('./player');
var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var huiFangInfoDao = require('../../dao/huiFangInfoDao');
var date = require('../../util/date');

var HU_SCORE =
{
    SMALL_HU_ZIMO:4,
    SMALL_HU_JIEPAO: 4,
    DA_HU_ZIMO:8,
    DA_HU_JIEPAO:8
}

//平胡番数对应的番数分
// var PINGHU_SCORE={
//     6:100,
//     7:200,
//     8:300,
//     9:500,
//     10:1000
// }
var PINGHU_SCORE={
    6:64,
    7:128,
    8:256,
    9:512,
    10:1024
}
//大胡番数对应的番数分
// var DAHU_SCORE={
//     3:100,
//     4:200,
//     5:400,
//     6:800,
//     7:1000
// }
var DAHU_SCORE={
    3:80,
    4:160,
    5:320,
    6:640,
    7:1280
}
//金顶底分
var JINDING_SCORE = 0;
var JINDING_PINGHU = 1024;//平胡金顶
var JINDING_DAHU = 1280;//大胡金顶


var HUI_FANG_TYPE = {
    HUI_INITPAI:0,          //第一步四个玩家的信息牌 座位 房主 庄闲等信息
    HUI_DELPAI:1,           //玩家打牌
    HUI_MOPAI:2,            //玩家摸牌
    HUI_NOTIFY_OP:3,        //通知可以操作的玩家操作
    HUI_SYNC_OP:4,          //同步所有人的操作
    HUI_SYNC_OP_RESULT:5,   //同步最终操作结果
    HUI_NIAO:6,             //同步鸟牌
    HUI_HAIDI:7,             //同步海底捞月操作 特殊处理 因为要询问
    HUI_HUA:8,               //补花
    HUI_JIN:9,                //开金
    HUI_PIZI:10             //皮子
}

/*
整个长沙麻将的配置以及结算数据玩家每步操作的记录存储类、积分计算
* */
var Data = function(opts)
{
    this.table = opts.table;
    this.isHaveBaker = opts.isHaveBaker;            //是否有庄闲
    this.isLaiZi = opts.isLaiZi!=undefined ?opts.isLaiZi:1;                    //是否带癞子
    //this.isLaiZi = 0;                    //是否带癞子
 //isLaiZi = true;                    //是否带癞子
    this.niaoNum = opts.niaoNum;                    //翻鸟个数

    this.niaoArr = [];                              //翻的鸟保存
    this.cardResult = [];                           //每一把牌的结果详细信息 输的积分、中鸟、胡牌类型、点炮还是放炮
    this.bigWiner = [];                             //大赢家ID
    this.paoShou = [];                              //炮手放炮最多
    this.roundsNum = 0;                             //当前第几圈
    this.roundsTotal = opts.roundsTotal;            //一共多少圈
    this.menQing = opts.menQing;                    //是否带门清
    this.isPingHuNoPao = opts.isPingHuNoPao!=undefined ?opts.isPingHuNoPao:0; //是否平胡不点炮
    this.isBuBuGao = opts.isBuBuGao!=undefined ?opts.isBuBuGao:0;
    this.isJinTongYuNv = opts.isJinTongYuNv!=undefined ?opts.isJinTongYuNv:0;
    this.isYiZhiHua = opts.isYiZhiHua!=undefined ?opts.isYiZhiHua:0;
    this.isSanTong = opts.isSanTong!=undefined ?opts.isSanTong:0;


    this.isCalGameResult = false;                       //是否已经结算了
    this.huifangRecord = {};                        //每一把回放的详细数据
    this.huifangOP = [];                            //玩家操作的备份 用于回放
    this.huifangArrDao = {};                        //总结算回放信息用于整个保存并同步到数据库

    this.jinDingNum = 0;                               //金顶次数
    this.yuanLaiFan = opts.yuanLaiFan != undefined ? opts.yuanLaiFan : 0;
    this.fengLaiFan = opts.fengLaiFan != undefined ? opts.fengLaiFan : 0;
    this.yiJiuLaiFan = opts.yiJiuLaiFan != undefined ? opts.yiJiuLaiFan : 0;
    this.lianJinFan = opts.lianJinFan != undefined ? opts.lianJinFan : 0;
    this.aaGem = opts.aaGem != undefined ? opts.aaGem : 0;

    // 2018.12.20 mwshang 增加底分结算规则
    this.baseScore = opts.baseScore != undefined ? opts.baseScore : 0;

    this.beforeLaiZi = undefined;    //上一局的赖子

    this.serverType="wuhan";

    //this.roundsTotal = 2;
};

var pro = Data.prototype;

pro.resetData = function() {
    this.huifangRecord = {};
    this.huifangOP = [];
    this.niaoArr = [];
    this.isCalGameResult = false;
}

//curStatus 0 1   0代表第一把 1代表中间
//uid1-4 type fangHao recordTime record
//用来记录每个玩家的uid 名字 总积分 每局的回放号 输赢积分 时间等
//用来记录每个玩家的uid 名字 总积分 每局的回放号 输赢积分 时间等
pro.updatehuifangArrDao = function(curStatus){
    //
    if (curStatus == 0){
        this.huifangArrDao["uid1"] = this.table.chairArrBak[0];
        this.huifangArrDao["uid2"] = this.table.chairArrBak[1];
        this.huifangArrDao["uid3"] = this.table.chairArrBak[2];
        this.huifangArrDao["uid4"] = this.table.chairArrBak[3];
        this.huifangArrDao["type"] = this.getGemCount();
        this.huifangArrDao["fangHao"] = this.table.Index;
        this.huifangArrDao["record"] = [];

        this.huifangArrDao["aaGem"] = this.aaGem;
        this.huifangArrDao["serverType"] = this.serverType;
        // 2018.12.20 mwshang 增加底分结算规则
        this.huifangArrDao["baseScore"] = this.baseScore;

        //代开检测
        this.huifangArrDao["daiKai"] = 0;
        this.huifangArrDao["fangZhu"] = this.table.chairArrBak[0];
        if (this.table.app.get("roomMgr").isRePrivateTable(this.table.Index) == true){
            var daiKai =  this.table.app.get("roomMgr").getRePrivateTableID(this.table.Index);
            this.huifangArrDao["fangZhu"] = daiKai;
            this.huifangArrDao["daiKai"] = 1;
        }
        
        this.huifangArrDao['pid'] = this.table.app.get("roomMgr").getTableOwnPackId(this.table.Index);
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
//结算数据,更新到DB中
pro.updatehuifangAttDao = function(){
    if (this.roundsNum > 0){
        // 2018.12.20 mwshang 增加底分结算规则
        if (!this.huifangArrDao["baseScore"] || this.huifangArrDao["baseScore"] == 0) {
            this.huifangArrDao["baseScore"] = this.baseScore;    
        }        

        playerHuiFangDao.createHuiFangRecord(this.huifangArrDao, function(err, res){
            logger.debug("保存回放记录成功");
        });
    }
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
pro.updateHuiFang = function(msg){
    var cstep = {};
    //当前操作类型
    cstep["type"] = msg.type;
    //这里记录当前牌桌状态 当前操作提示 已经操作的数组 结果（摸 打 补 杠具体细节）
    if (msg.type == HUI_FANG_TYPE.HUI_INITPAI){
        var playerPai = [];
        for (var uid in this.table.playerUids){
            var uidPai = this.table.playerUids[uid].playerCurrentPai();
            playerPai.push(JSON.parse(JSON.stringify(uidPai)));//当前手牌等信息
        }
        this.huifangRecord["playerPai"] = playerPai;
    }else if (msg.type == HUI_FANG_TYPE.HUI_DELPAI){
        cstep["pai"] = msg.pai;
        cstep["uid"] = msg.uid;
    }else if (msg.type == HUI_FANG_TYPE.HUI_MOPAI){
        cstep["pai"] = msg.pai;
        cstep["uid"] = msg.uid;
    }else if (msg.type == HUI_FANG_TYPE.HUI_NOTIFY_OP){
        var opTemp = JSON.parse(JSON.stringify(this.table.CurrentOPArr));
        cstep["notifyOP"] = opTemp;
    }else if (msg.type == HUI_FANG_TYPE.HUI_SYNC_OP){
        var temp = JSON.parse(JSON.stringify(this.huifangOP));
        if (!!temp["__route__"] || temp["__route__"] != null){
            temp["__route__"] = null;
        }
        cstep["syncOP"] = temp;
    }else if (msg.type == HUI_FANG_TYPE.HUI_SYNC_OP_RESULT){
        var temp = utils.clone(msg.opResult);
        cstep["opResult"] = temp;
    }else if (msg.type == HUI_FANG_TYPE.HUI_NIAO){
        var niao = utils.clone(msg.opResult);
        cstep["niao"] = niao;
    }
    else if (msg.type == HUI_FANG_TYPE.HUI_HAIDI){
        var haidi = utils.clone(msg.opResult);
        cstep["pai"] = haidi;
    }else if (msg.type == HUI_FANG_TYPE.HUI_JIN){
        this.huifangRecord["jin"] = msg.pai;
        return;
    }else if (msg.type == HUI_FANG_TYPE.HUI_PIZI){
        this.huifangRecord["pizi"] = msg.pai;
        return;
    }
    this.huifangRecord["step"].push(cstep);
}

pro.initHuiFang = function(){
    this.huifangRecord = {};
    this.huifangRecord["num"] = this.table.huiFangNums.pop();
    this.huifangRecord["fangZhu"] = this.table.FangZhu;
    this.huifangRecord["banker"] = this.table.BankerUid;
    this.huifangRecord["position"] = this.table.chairArrBak;
    this.huifangRecord["chairArr"] = this.table.ChairArr;
    this.huifangRecord["mjNumber"] = 14;
    this.huifangRecord["roundsTotal"] = this.roundsTotal;
    this.huifangRecord["currRounds"] = this.roundsNum;
    this.huifangRecord["niao"] = this.niao;
    this.huifangRecord["isLaiZi"] = this.isLaiZi;
    this.huifangRecord["isPingHuNoPao"] = this.isPingHuNoPao;
    this.huifangRecord["isBuBuGao"] = this.isBuBuGao;
    this.huifangRecord["isJinTongYuNv"] = this.isJinTongYuNv;
    this.huifangRecord["isYiZhiHua"] = this.isYiZhiHua;
    this.huifangRecord["isSanTong"] = this.isSanTong;

    this.huifangRecord["serverType"] = this.serverType;

    this.huifangRecord["yuanLaiFan"] = this.yuanLaiFan;
    this.huifangRecord["fengLaiFan"] = this.fengLaiFan;
    this.huifangRecord["yiJiuLaiFan"] = this.yiJiuLaiFan;
    this.huifangRecord["lianJinFan"] = this.lianJinFan;



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
    this.updateHuiFang({type:0});

    //第一把
    if (this.roundsNum < 1){
        this.updatehuifangArrDao(0);
    }

    logger.error("新一把回放号码:" + this.huifangRecord["num"] );

}

//更新单把回放数据信息 一次性写入如此多内容会不会影响性能
pro.updateHuiFangDao = function(cb){
    var huiFangMsg = {};
    var huiFangnum = this.huifangRecord["num"];
    huiFangMsg["huiFangNum"] = huiFangnum;
    huiFangMsg["uid1"] = this.huifangRecord["chairArr"][0];
    huiFangMsg["uid2"] = this.huifangRecord["chairArr"][1];
    huiFangMsg["uid3"] = this.huifangRecord["chairArr"][2];
    huiFangMsg["uid4"] = this.huifangRecord["chairArr"][3];
    huiFangMsg["serverType"] = this.serverType;
    huiFangMsg["record"] = utils.clone(this.huifangRecord);
    // 2018.12.20 mwshang 增加底分结算规则
    huiFangMsg["baseScore"] = this.baseScore;
    //暂时屏蔽 服务器空间不够大
    huiFangInfoDao.createhuiFangInfo(huiFangMsg, function(err, res){
        logger.debug("保存单场回放记录成功");
    });
    cb();
}

/*
获取最新一局庄家UID
* */
pro.updateBaker = function(){
    if (this.roundsNum == 0){
        return this.table.FangZhu;
    }

    //取出最后一局数据
    var cardDetail = this.cardResult[this.cardResult.length - 1];

    return  cardDetail.newBanker;
}

/*计算本局结果 积分 输赢等等
//摸鸟
//计算结算分数并推送给客户端 展示所有人的牌给客户端显示 点炮者 放炮者 自摸 中鸟 胡的牌是哪个 积分 等
* */
pro.calGameResult = function(){
    //日志结算走这里 mwshang
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
//获取当前需要扣的钻石 flag:mwshang
pro.getGemCount = function(){
    if(this.table.app.get("roomMgr").isNeedGem==0) return 0;
    var fangNum = 6;
    if (this.roundsTotal <= 8){
        fangNum = 6;
    }else if (this.roundsTotal > 8 && this.roundsTotal <= 16){
        fangNum = 12;
    }else {
        fangNum = 12 + Math.ceil((this.roundsTotal - 16)/4) * 4;
    }
    return fangNum;
}
//房卡消耗
pro.delGem = function(){
    //统计玩家房间数
    if(this.roundsNum==1)
    {
        this.table.app.get("roomMgr").updatePlayedTime(this.table,1);
    }
    if (this.roundsNum == 1 && this.table.app.get("roomMgr").isNeedGem == 1){
        logger.debug("房卡消耗:");
        var fangNum = this.getGemCount();

        if (this.table.app.get("roomMgr").isPackLossMode(this.table.index) == true) {
            logger.debug("俱乐部房卡消耗1:" + fangNum);
            this.table.app.get("roomMgr").updateFangka2Hall(this.table.Index,-fangNum);
            return;
        }

        //代开
        if (this.table.app.get("roomMgr").isRePrivateTable(this.table.Index) == true && this.aaGem == 0){
            this.table.app.get("roomMgr").updateFangka2Hall(this.table.Index,-fangNum);
            return;
        }
        if (this.aaGem == 1){

            fangNum = Math.ceil(fangNum / this.person);
            for (var uid in this.table.playerUids){
                this.table.playerUids[uid].player["fangKa"] = -fangNum;
                this.table.playerUids[uid].player.gemNum -= fangNum;
                this.table.playerUids[uid].gemNum = this.table.playerUids[uid].player.gemNum;
                this.table.app.get("roomMgr").updatePlayer(this.table.playerUids[uid].player);
            }
        }else{
            this.table.playerUids[this.table.FangZhu].player["fangKa"] = -fangNum;
            this.table.playerUids[this.table.FangZhu].player.gemNum -= fangNum;
            this.table.playerUids[this.table.FangZhu].gemNum = this.table.playerUids[this.table.FangZhu].player.gemNum;
            this.table.app.get("roomMgr").updatePlayer(this.table.playerUids[this.table.FangZhu].player);
        }
    }
}
//游戏总结算
pro.gameOver = function(){
    var gameResult = {};
    var playerResult = [];
    var maxCoin = 1000;
    var paoShou = 0;
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

    gameResult["players"] = playerResult;
    gameResult["bigWiner"] = this.bigWiner[this.bigWiner.length - 1];
    gameResult["paoShou"] = this.paoShou[this.paoShou.length - 1];
    gameResult["fangZhu"] = this.table.FangZhu;
    gameResult["baseScore"] = this.baseScore;

    //回放记录保存
    this.updatehuifangAttDao();

    this.table.Message.mjGameOver(gameResult);
    this.table.clearTablePlayers();

    //桌子解散啦
    setTimeout(function(){
        this.table.gameOver();
    }.bind(this), 2000);
}

pro.calScore = function(){//计算积分 flag:mwshang
    var thisResult = {};//总结算数据 给客户端和保存用
    var players = [];//玩家积分数组
    var huPlayerUids = [];//胡牌玩家 {uid:100001,isZimo:0}
    var fangPaoUid = -1; //uid放炮的人记录

    this.initPlayerScore(players);

    //流局
    if (this.table.liuJu == false){
        //只判断胡牌方 基本分数计算
        fangPaoUid = this.capHuScore(players,huPlayerUids);
        logger.debug("放炮者UID：" + fangPaoUid);
        logger.debug("胡牌UID：%j", huPlayerUids);

        if(huPlayerUids.length > 0){
            //计算不开口罚分
            this.buKaiKouScore(players,huPlayerUids);

            if(!(this.table.playerUids[huPlayerUids[0]["uid"]].isHuExist(Const.WuHanHuType.QiangGangHu))){
                //计算包牌
                this.capBaoPaiScore(players,huPlayerUids);
            }

            //玩家设置翻倍算分
            this.capSetScore(players,huPlayerUids);
        }else{
            logger.error("为什么没有人胡牌");
        }

        this.beforeLaiZi = this.table.jinPai;
        logger.debug("beforeLaiZi %j",this.beforeLaiZi);
    }
    //庄家更新
    var oldBanker = this.table.bankerUid;
    var newBanker = this.checkBanker(huPlayerUids,fangPaoUid);
    thisResult["banker"] = oldBanker;
    thisResult["oldBanker"] = oldBanker;
    thisResult["newBanker"] = newBanker;
    // 2018.12.20 增加底分结算规则
    thisResult["baseScore"] = this.baseScore;

    this.table.BankerUid = newBanker;
    this.table.updateChair();
    //牌局结果 1代表有结果
    thisResult["roundResult"] = 0;
    if (this.table.liuJu == false){
        thisResult["roundResult"] = 1;
    }

    //更新分数
    this.updateLastScore(players);

    thisResult["players"] = players;
    thisResult["niao"] = this.niaoArr;
    if (this.roundsNum == this.roundsTotal){
        thisResult["isOver"] = 1;
    }else{
        thisResult["isOver"] = 0;
    }

    this.cardResult.push(thisResult);
    //logger.debug("本局结果%j",thisResult);
}

//
pro.initPlayerScore = function(players){
    for (var uid in this.table.PlayerUids){
        var paiResult = {};
        var player = this.table.PlayerUids[uid];
        paiResult["uid"] = parseInt(uid);
        paiResult["userName"] = player.userName;
        paiResult["nickName"] = player.player.nickName;
        paiResult["paiDest"] = JSON.parse(JSON.stringify(player.paiDest));
        paiResult["qiPai"] = JSON.parse(JSON.stringify(player.paiQiLai()));
        paiResult["winScore"] = 0;
        paiResult["diScore"] = 0;
        paiResult["tianhu"] = JSON.parse(JSON.stringify(player.tianhuChoice));
        paiResult["coinNum"] = player.coinNum;
        paiResult["niao"] = 0;
        paiResult["niaoPai"] = [];
        paiResult["huType"] = JSON.parse(JSON.stringify(player.huChoice));
        paiResult["isHu"] = player.isHu;
        paiResult["isZimo"] = player.isZimo;
        paiResult["isFangPao"] = player.isFangPao;

        paiResult["isDaHu"] = 0;
        paiResult["huDiSocre"] = 1;
        paiResult["isYingHu"] = 0;
        paiResult["fanShu"] = 0;
        paiResult["isKaiKou"] = 1;
        paiResult["isBaoPai"] = 0;
        paiResult["isJinDing"] = 0;
        paiResult["isYuanLai"] = 0;
        paiResult["isFengLai"] = 0;
        paiResult["isYiJiuLai"] = 0;
        paiResult["isLianJin"] = 0;

        players.push(paiResult);
    }
}

//更新最终的分数
pro.updateLastScore = function(players){

    for (var p = 0; p < players.length; p++){
        players[p]["coinNum"] += players[p]["winScore"];
        this.table.PlayerUids[players[p]["uid"]].coinNum = players[p]["coinNum"];
        this.table.PlayerUids[players[p]["uid"]].player.coinNum = players[p]["coinNum"];
    }
}

// 检测是否金顶
pro.checkJinDing = function(players) {
    var totalFanShu = 0;

    for (var uid in players)
    {
        var player = players[uid];
        if (player.isFangPao == 1){
            continue;
        }
        if(player.isHu == 1) {
            if (player.huChoice[0].type == Const.WuHanHuType.PingHu)
            {
                var kaiKouNum = player.kaiKouScore();
                //庄加一番
                if(uid == this.table.bankerUid){
                    kaiKouNum += 1;
                }
                //自摸加一番
                if(player.isZimo == 1){
                    kaiKouNum += 1;
                }
                //硬胡
                if(player.isYingHu){
                    kaiKouNum += 1;
                }
                for (var loseUid in players)
                {
                    if(loseUid != uid )
                    {

                        var loseKaiKuNum = players[loseUid].kaiKouScore();
                        //庄加一番
                        if(loseUid == this.table.bankerUid){
                            loseKaiKuNum += 1;
                        }
                        //放炮加一番
                        if(players[loseUid].isFangPao == 1){
                            loseKaiKuNum += 1;
                        }

                        var totalKaiKou = kaiKouNum + loseKaiKuNum;                       
                        if(totalKaiKou > 10){
                            totalKaiKou = 10;
                        }
                        totalFanShu += totalKaiKou;

                    }

                }
            } else {//大胡
                if(player.isHuExist(Const.WuHanHuType.FengYiSe)) {//风一色
                    totalFanShu = 30;
                } else {
                    var kaiKouNum = player.kaiKouScore();

                    //自摸加一番 //杠开 不算自摸
                    if(player.isZimo == 1 && !player.isHuExist(Const.WuHanHuType.GangKaiHua) && !player.isHuExist(Const.WuHanHuType.HaiDiLaoYue)){
                        kaiKouNum += 1;
                    }
                    //硬胡
                    if(player.isYingHu){
                        kaiKouNum += 1;
                    }
                    //累计大胡
                    kaiKouNum += player.huChoice.length - 1;
                    for (var loseUid in players)
                    {
                        if(loseUid != uid )
                        {
                            var loseKaiKuNum = players[loseUid].kaiKouScore();
                            //放炮加一番
                            if(players[loseUid].isFangPao == 1){
                                loseKaiKuNum += 1;
                            }

                            var totalKaiKou = kaiKouNum + loseKaiKuNum;
                            if(totalKaiKou >= 7){
                                totalKaiKou = 10;
                            }
                            totalFanShu += totalKaiKou;
                        }

                    }

                }
            }
        }
    }
    return {isJinDing:totalFanShu>=30};
}

//玩有胡牌分数
//一家放炮，三家输。庄家与另外三家番数，分别计算。
pro.capHuScore = function(players, huPlayerUids){
    logger.debug("开始算分====");
    logger.debug("beforeLaiZi: %j",this.beforeLaiZi);
    logger.debug("curLaiZi: %j",this.table.jinPai);

    var dinDingInfo = this.checkJinDing(this.table.PlayerUids);
    var isJinDing = dinDingInfo["isJinDing"];

    var fangPaoUid = -1;
    for (var uid in this.table.PlayerUids)
    {
        var player = this.table.PlayerUids[uid];
        if (player.isFangPao == 1){
            continue;
        }
        var playerIndex = -1;
        for (var i = 0; i < players.length; i++){
            if (players[i]["uid"] == uid){
                playerIndex = i;
            }
        }

        if(player.isHu == 1)
        {

            huPlayerUids.push({uid:parseInt(uid), isZimo:player.isZimo});
            logger.debug("胡牌类型有%j:%j",player.uid,player.huChoice);

            var diScore = 0;

            if (player.huChoice[0].type == Const.WuHanHuType.PingHu)
            {
                JINDING_SCORE = JINDING_PINGHU;

                var kaiKouNum = player.kaiKouScore();
                logger.debug("uid:%j gdGang:%j",player.uid,player.paiGdGang);
                logger.debug("chi:%j, peng:%j, ming:%j, an:%j",player.chiHandScore(),player.pengHandScore(),player.mingGangScore(),player.anGangScore());
                logger.debug('胡牌的人算分：win = %j:%j',uid,kaiKouNum);
                //庄加一番
                if(uid == this.table.bankerUid){
                    kaiKouNum += 1;
                    logger.error('庄加一番');
                }
                //自摸加一番
                if(player.isZimo == 1){
                    kaiKouNum += 1;
                    logger.error('自摸加一番');
                }
                //硬胡
                if(player.isYingHu){
                    kaiKouNum += 1;
                    players[playerIndex]["isYingHu"] = 1;
                    logger.error('硬胡一番');
                }

                players[playerIndex]["fanShu"] = kaiKouNum;

                for (var loseUid in this.table.PlayerUids)
                {
                    if(loseUid != uid )
                    {

                        var loseKaiKuNum = this.table.PlayerUids[loseUid].kaiKouScore();
                        logger.debug("%j 的开口分 %j",loseUid,loseKaiKuNum);
                        //庄加一番
                        if(loseUid == this.table.bankerUid){
                            loseKaiKuNum += 1;
                            logger.error('庄加一番');
                        }
                        //放炮加一番
                        if(this.table.PlayerUids[loseUid].isFangPao == 1){
                            loseKaiKuNum += 1;
                            fangPaoUid = loseUid;
                            logger.error('放炮加一番');
                        }

                        var totalKaiKou = kaiKouNum + loseKaiKuNum;
                        var losePlay2 = this.table.PlayerUids[loseUid];
                        logger.debug("uid:%j gdGang:%j",losePlay2.uid,losePlay2.paiGdGang);
                        logger.debug("chi:%j, peng:%j, ming:%j, an:%j",losePlay2.chiHandScore(),losePlay2.pengHandScore(),losePlay2.mingGangScore(),losePlay2.anGangScore());
                        logger.debug('平胡算分：win = %j:%j  loser = %j:%j 总番数：%j',uid,kaiKouNum,loseUid,loseKaiKuNum,totalKaiKou);

                        if(totalKaiKou < 6){
                            logger.error('%j 跟 %j 番数小于6',uid,loseUid);
                        }else if(totalKaiKou > 10){
                            totalKaiKou = 10;
                        }
                        //-------------
                        // mwshang 金顶规则 
                        if (isJinDing == false && totalKaiKou >= 10) {//如果不是金顶,按9番计算
                            totalKaiKou = 9;
                        }
                        ////====

                        diScore = PINGHU_SCORE[totalKaiKou];

                        for (var p = 0; p < players.length; p++){
                            if (players[p]["uid"] == loseUid){

                                players[p]["winScore"] -= diScore;
                                players[p]["diScore"] = diScore;
                                players[p]["fanShu"] = loseKaiKuNum;
                                break;
                            }
                        }

                        players[playerIndex]["winScore"] += diScore;
                        players[playerIndex]["diScore"] = diScore;

                    }

                }

            }else{
                players[playerIndex]["isDaHu"] = 1;
                players[playerIndex]["huDiSocre"] = 10;

                JINDING_SCORE = JINDING_DAHU;

                //风一色，直接三家金顶
                if(player.isHuExist(Const.WuHanHuType.FengYiSe))
                {
                    players[playerIndex]["winScore"] += JINDING_SCORE * 3;
                    players[playerIndex]["diScore"] = JINDING_SCORE;

                    for (var p = 0; p < players.length; p++){
                        if (players[p]["uid"] != uid){
                            players[p]["winScore"] -= JINDING_SCORE;
                            players[p]["diScore"] = JINDING_SCORE;
                        }
                    }

                }else if(player.isHuExist(Const.WuHanHuType.QiangGangHu)){
                    var fangPaoUid = null;
                    for(var fangUid in this.table.PlayerUids){
                        if(this.table.PlayerUids[fangUid].isFangPao == 1){
                            fangPaoUid = fangUid;
                            break;
                        }
                    }

                    if(!!fangPaoUid){
                        players[playerIndex]["winScore"] += JINDING_SCORE * 3;
                        players[playerIndex]["diScore"] = JINDING_SCORE;

                        for (var p = 0; p < players.length; p++){
                            if (players[p]["uid"] == fangPaoUid){
                                players[p]["winScore"] -= JINDING_SCORE * 3;
                                players[p]["diScore"] = JINDING_SCORE;
                            }
                        }

                    }else{
                        logger.error("抢杠胡，没有放炮的人");
                    }


                }else{
                    var kaiKouNum = player.kaiKouScore();
                    logger.debug("uid:%j gdGang:%j",player.uid,player.paiGdGang);
                    logger.debug("chi:%j, peng:%j, ming:%j, an:%j",player.chiHandScore(),player.pengHandScore(),player.mingGangScore(),player.anGangScore());
                    logger.debug('胡牌的人算分：win = %j:%j',uid,kaiKouNum);

                    //自摸加一番 //杠开 不算自摸
                    if(player.isZimo == 1 && !player.isHuExist(Const.WuHanHuType.GangKaiHua) && !player.isHuExist(Const.WuHanHuType.HaiDiLaoYue)){
                        kaiKouNum += 1;
                        logger.error('自摸加一番');
                    }
                    //硬胡
                    if(player.isYingHu){
                        kaiKouNum += 1;
                        logger.error('硬胡加一番');
                        players[playerIndex]["isYingHu"] = 1;
                    }
                    //累计大胡
                    logger.error('累计大胡加%j',player.huChoice.length - 1);

                    kaiKouNum += player.huChoice.length - 1;

                    players[playerIndex]["fanShu"] = kaiKouNum;

                    for (var loseUid in this.table.PlayerUids)
                    {
                        if(loseUid != uid )
                        {
                            var loseKaiKuNum = this.table.PlayerUids[loseUid].kaiKouScore();
                            logger.debug("%j 的开口分 %j",loseUid,loseKaiKuNum);
                            //放炮加一番
                            if(this.table.PlayerUids[loseUid].isFangPao == 1){
                                loseKaiKuNum += 1;
                                fangPaoUid = loseUid;
                            }

                            var totalKaiKou = kaiKouNum + loseKaiKuNum;

                            var losePlay2 = this.table.PlayerUids[loseUid];
                            logger.debug("uid:%j gdGang:%j",losePlay2.uid,losePlay2.paiGdGang);
                            logger.debug("chi:%j, peng:%j, ming:%j, an:%j",losePlay2.chiHandScore(),losePlay2.pengHandScore(),losePlay2.mingGangScore(),losePlay2.anGangScore());
                            logger.debug('大胡算分：win = %j:%j  loser = %j:%j 总番数：',uid,kaiKouNum,loseUid,loseKaiKuNum,totalKaiKou);

                            if(totalKaiKou < 3){
                                logger.error('%j 跟 %j 番数小于3',uid,loseUid);
                            }else if(totalKaiKou > 7){
                                totalKaiKou = 7;
                            }

                            diScore = DAHU_SCORE[totalKaiKou]; // 番数分

                            for (var p = 0; p < players.length; p++){
                                if (players[p]["uid"] == loseUid){
                                    players[p]["winScore"] -= diScore;
                                    players[p]["diScore"] = diScore;
                                    players[p]["fanShu"] = loseKaiKuNum;
                                    // logger.debug("capHuScore---uid:%j----loseUid:%j----diScore:%j---%j",uid,loseUid,diScore,this.table.PlayerUids[loseUid]);
                                    break
                                }
                            }

                            players[playerIndex]["winScore"] += diScore;
                            players[playerIndex]["diScore"] = diScore;

                        }

                    }

                }

            }


            logger.debug("胡牌计算分数");
            this.scoreDebug(players);

            if(!player.isHuExist(Const.WuHanHuType.QiangGangHu)){
                if (isJinDing) {
                    this.jinDingScore(players,playerIndex,uid);
                    logger.debug("金顶胡牌计算分数");
                    this.scoreDebug(players);
                }
            }

            //只有一个玩家可以胡
            break;
        }

    }

    return fangPaoUid;
}

//三家同时封顶，则直接金顶
pro.jinDingScore = function(players,playerIndex,uid){
    var baseJinDing = JINDING_SCORE * 3;
    if(players[playerIndex]["winScore"] >= baseJinDing)
    {
        for (var p = 0; p < players.length; p++)
        {
            if (players[p]["uid"] != uid){
                players[p]["winScore"] = -JINDING_SCORE;
                players[p]["diScore"] = JINDING_SCORE;
            }
        }

        players[playerIndex]["winScore"] = JINDING_SCORE * 3;
        players[playerIndex]["diScore"] = JINDING_SCORE;

        players[playerIndex]["isJinDing"] = 1;

        this.jinDingNum += 1
        logger.debug("金顶次数：%j",this.jinDingNum);
    }else{
        this.jinDingNum = 0;
        logger.debug("金顶次数归0：%j",this.jinDingNum);
    }

}


pro.buKaiKouScore = function(players,huPlayerUids){
    logger.debug("开始计算不开口罚分");

    var buKaiKouScore = 0;

    for(var uid in this.table.PlayerUids){
        if(this.table.PlayerUids[uid].kaiKouScore() <= 0){

            for (var p = 0; p < players.length; p++)
            {
                if (players[p]["uid"] == uid){
                    players[p]["winScore"] -= players[p]["diScore"];
                    buKaiKouScore += players[p]["diScore"];
                    players[p]["diScore"] *= 2;

                    players[p]["isKaiKou"] = 0;

                    logger.debug("%j 没有开口，现在输 %j",uid,players[p]["winScore"]);

                }
            }
        }
    }

    for (var p = 0; p < players.length; p++)
    {
        if (players[p]["uid"] == huPlayerUids[0]["uid"]){
            players[p]["winScore"] += buKaiKouScore;
            players[p]["diScore"] += buKaiKouScore;
            logger.debug("别人没有开口:玩家 %j 加不开口罚分： %j  总分： %j",uid,buKaiKouScore,players[p]["winScore"]);

        }
    }

    logger.debug("不开口计算分数");
    this.scoreDebug(players);


}


//包牌者，包所有输家的的分数
pro.capBaoPaiScore = function(players,huPlayerUids){
    logger.debug("开始计算包牌");
    var isBaoPai = false;

    var huPlayer = this.table.PlayerUids[huPlayerUids[0]["uid"]];

    //if(huPlayer.isHuExist(Const.WuHanHuType.QingYiSe) || huPlayer.isHuExist(Const.WuHanHuType.JiangJiangHu))
    if(huPlayer.isHuExist(Const.WuHanHuType.JiangJiangHu))
    {
        //if(huPlayer.baoPaiUid != -1 && huPlayer.baoPaiUid != this.table.LastOP["lastUid"])
        if(huPlayer.baoPaiUid != -1)
        {
            isBaoPai = true;
            this.baoPaiAddScore(huPlayer.uid,huPlayer.baoPaiUid,players);
            logger.debug("清一色或者将将胡包牌%j  包牌 id %j ",huPlayer.uid,huPlayer.baoPaiUid);

            var leiBaoType = 0;//清一色累包
            if(huPlayer.isHuExist(Const.WuHanHuType.JiangJiangHu)){
                leiBaoType = 1;//将一色累包
            }

            for(var leiBaoUid in this.table.playerUids)
            {
                if(leiBaoUid != huPlayer.uid && leiBaoUid != huPlayer.baoPaiUid)
                {
                    logger.debug("可能累包的人 %j",leiBaoUid);
                    var leiBaoPlay = this.table.playerUids[leiBaoUid];

                    if(leiBaoType == 0)
                    {
                        var type = ['W','T','B'];
                        for(var i in type)
                        {
                            if(huPlayer.paiQi[type[i]].length > 0)
                            {
                                var isLeiBao = leiBaoPlay.isLeiBao(huPlayer.uid,leiBaoType,huPlayer.paiQi[type[i]][0]);
                                if(isLeiBao)
                                {
                                    this.leiBaoScore(huPlayer,leiBaoPlay,players);
                                }
                                break;
                            }
                        }
                    }else{

                        var isLeiBao = leiBaoPlay.isLeiBao(huPlayer.uid,leiBaoType);
                        if(isLeiBao)
                        {
                            this.leiBaoScore(huPlayer,leiBaoPlay,players);
                        }
                    }

                }
            }

        }
    }else if(huPlayer.isHuExist(Const.WuHanHuType.QuanQiuRen) && huPlayer.isZimo != 1 ) // 全求人
    {
        var lastOpPlayer = this.table.playerUids[this.table.LastOP["lastUid"]];
        var lastPai = lastOpPlayer.paiChu.slice(-1);

        if(lastOpPlayer.allJiangPai() != true && lastOpPlayer.checkJiang(lastPai[0]))
        {

            if (lastOpPlayer.checkTing()) {//放炮者报听了,3家承包
                this.baoPaiAddScore(huPlayer.uid,lastOpPlayer.uid,players);
            } else {//放炮者承包
                isBaoPai = true;
                var baoPaiUid = lastOpPlayer.uid;
                var huUid = huPlayer.uid;
                var lastOpPlayerInfo = null;
                var huPlayerInfo = null;


                for (var p = 0; p < players.length; p++)
                {
                    var uid = players[p]["uid"];

                    if (uid == baoPaiUid) {
                        lastOpPlayerInfo = players[p];
                    }else if (uid == huUid) {
                        huPlayerInfo = players[p];
                    }else {
                        players[p]["winScore"] = 0;
                        players[p]["diScore"] = 0;
                    }       
                }
                lastOpPlayerInfo["winScore"] = -lastOpPlayerInfo["diScore"] * 3;
                lastOpPlayer["winScore"] = lastOpPlayerInfo["winScore"];
                huPlayer["winScore"] = -lastOpPlayer["winScore"];
                huPlayerInfo["winScore"] = huPlayer["winScore"];
            }           
            
        }
    }

    if(isBaoPai)
    {
        logger.debug("包牌胡牌计算分数");
        this.scoreDebug(players);
    }else{
        logger.debug("没有包牌");
    }

}


pro.baoPaiAddScore = function(huUid,baoPaiUid,players){
    var otherScore = 0;

    for (var p = 0; p < players.length; p++)
    {
        if (players[p]["uid"] != baoPaiUid && players[p]["uid"] != huUid)
        {
            otherScore += players[p]["diScore"];
            players[p]["winScore"] += players[p]["diScore"];
            players[p]["diScore"] = 0;
        }
    }

    for (var i = 0; i < players.length; i++)
    {
        if (players[i]["uid"] == baoPaiUid)
        {
            players[i]["diScore"] += otherScore;
            players[i]["winScore"] -= otherScore;
            players[i]["isBaoPai"] = 1;
            break;
        }
    }
}

pro.leiBaoScore = function(huPlayer,leiBaoPlayer,players){
    if(huPlayer == undefined || huPlayer == null || leiBaoPlayer == undefined || leiBaoPlayer == null){
        logger.debug("huPlayer = %j , leiBaoPlayer = %j");
        return ;
    }

    //包牌人输的分数
    var leiBaoScore = 0;
    for (var i = 0; i < players.length; i++)
    {
        if (players[i]["uid"] == huPlayer.baoPaiUid)
        {
            leiBaoScore = players[i]["diScore"];
            logger.debug("包牌人输的分数:uid = %j  score = %j",huPlayer.baoPaiUid,leiBaoScore);
            break;
        }
    }

    //累包的人减去包牌的分数
    for (var i = 0; i < players.length; i++)
    {
        if (players[i]["uid"] == leiBaoPlayer.uid)
        {
            players[i]["diScore"] = leiBaoScore;
            players[i]["winScore"] -= leiBaoScore;
            logger.debug("累包人输的分数:%j",leiBaoScore);
            break;
        }
    }
    //胡家 加上累包的分数
    for (var i = 0; i < players.length; i++)
    {
        if (players[i]["uid"] == huPlayer.uid)
        {
            players[i]["diScore"] += leiBaoScore;
            players[i]["winScore"] += leiBaoScore;
            break;
        }
    }

}


//玩家配置加分 原敕跟一九赖只算一次
pro.capSetScore = function(players,huPlayerUids){
    logger.debug("玩家设置原赖 %j,一九赖 %j,连金 %j",this.yuanLaiFan,this.yiJiuLaiFan,this.lianJinFan);

    var yuanLaiFan = false;
    var player = this.table.PlayerUids[huPlayerUids[0]["uid"]];


    if(this.yuanLaiFan > 0 && this.beforeLaiZi != undefined && player.isJinPai(this.beforeLaiZi) == true){

        logger.debug("原赖翻倍");
        this.scoreFanBei(players,'yuanLai');
        yuanLaiFan = true;
    }

    if(!yuanLaiFan && this.yiJiuLaiFan > 0 && player.isYiJiuLai()){
        logger.debug("一九赖翻倍");
        this.scoreFanBei(players,'yiJiuLai');
    }

    if(this.lianJinFan > 0 && this.jinDingNum >= 2){
        logger.debug("连金翻倍");
        this.scoreFanBei(players,'lianJin');
    }

    logger.debug("玩家设置属性，胡牌计算分数");
    this.scoreDebug(players);

}

pro.scoreFanBei = function(players,type){

    for (var p = 0; p < players.length; p++)
    {
        players[p]["winScore"] *= 2;

        if(type == 'yuanLai'){
            players[p]["isYuanLai"] = 1;
        }else if(type == 'yiJiuLai'){
            players[p]["isYiJiuLai"] = 1;
        }else{
            players[p]["isLianJin"] = 1;
        }
    }

}

//检测庄家 下一轮的庄家
pro.checkBanker = function(huPlayerUids, fangPaoUid){
    logger.debug("huPlayerUids:%j",huPlayerUids);
    //流局庄家 抢海底的为庄 都不抢则最后轮到谁谁是庄
    //流局，庄家继续做庄
    if (this.table.liuJu == true){

        logger.debug("流局，庄家继续做庄");
        return this.table.bankerUid;
    }

    if(huPlayerUids[0].uid == this.table.bankerUid)
    {
        return this.table.bankerUid;
        logger.debug("庄胡，庄家继续做庄");
    }else{
        logger.debug("别人胡，庄家下家做庄");

        var newBanker = this.table.getNextUid(this.table.bankerUid);
        return newBanker;
    }


}

/*翻鸟 一个鸟的数组
 * */
pro.updateNiao = function(){
    this.niaoArr = []; //清空上一轮鸟牌
    for (var i = 0; i < this.niaoNum; i++){
        var niaoPai = this.table.Card.qiPai();
        if (niaoPai !== null){
            this.niaoArr.push(niaoPai);
        }
    }
    var msg = {};
    msg["niao"] = this.niaoArr;
    msg["lastUid"] = this.table.BankerUid;
    this.table.Message.mjNiaoPai(msg);

    this.updateHuiFang({type:6,opResult:msg});
}

pro.scoreDebug = function(players){
    for (var i = 0; i < players.length; i++){
        logger.debug("算分debug:玩家uid = %j : %j",players[i]["uid"],players[i]["winScore"]);
    }
}

module.exports = Data;
