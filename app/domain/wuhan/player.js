var room = require('./room');
var timer = require('../../util/timerGame');
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var Const = require('../../consts/consts');
var card = require('./card');
var Message = require('./message');
var messageService = require('../../services/messageService');
var util = require('util');
var WuHanHuType = require('../../consts/consts').WuHanHuType;
var playerMajhong = require('./playerMajhong');

var Player = function(opts)
{
    playerMajhong.call(this, opts);
    this.cardResult = {};               //每轮麻将自己的结果 数组结构包括输的积分、中鸟、胡牌类型、点炮还是放炮
    this.baker = 0;                     //是否是庄家默认不是
    this.isGang = 0;                    //本轮是否杠过 长沙麻将 杠过就不能动牌了。 杠就是摇塞子
    this.isCanHu = true;                //当前是否可以胡牌 俗称漏胡 玩家的对家打了一张牌你能胡但是选择了过 那么你的上家接着打胡牌你不能胡除非你手上摸过牌
    this.isHu = 0;                      //本轮是否胡了 0没有胡 1自摸
    this.isHaiDi = -1;                   //是否海底捞月 0 木有 1 有  -1：无海底捞月
    this.isZimo = 0;                    //本轮是否自摸
    this.isFangPao = 0;                 //本轮是否放炮了 0 没有放炮  1 放炮
    this.zimoBigCount = 0;              //大胡自摸次数
    this.zimoSmallCount = 0;            //小胡自摸次数
    this.dahuPao = 0;                   //大胡点炮
    this.xiaoHuPao = 0;                 //小胡点炮
    this.dahuCount = 0;                 //大胡接炮
    this.xiaoHuCount = 0;               //小胡接炮
    this.isReady = 0;                   //玩家准备好没有

    //给每个玩家通知可操作数组 用于通讯 协议消息封装类型 避免多次申请
    //{"opCard":"B4", "tian":[],"chi":[],"peng":1,"gang":0,"bu":0,"hu":1,"guo":1, "level":5}
    this.playerOP = {};

    //回放号 回放数据 详细的打牌数据 每一个都有一个编号然后根据UID保存 每一个回放号单独数据 回放号对应当前以哪个玩家视角看游戏
    //所以同一局游戏 有四个回放号 一轮下来就是4*8-32回放号 存储时候Uid作为key 对应房间号 回放号等
    this.huiFangPlayer = [];

    //简化版本回放数据 另一个数据表 房间号 对局玩家总积分 每一轮的积分 回放号数组
    this.huiFangWai = [];

    //gm 相关
    this.gmQiPai = null;
    this.qiPaiNum = 0;
    this.paiChuCount = 0;  //玩家真正的出牌数量
    this.gmQiPaiNum = 0;

    this.isBuPaiHu = false;             //是否是补牌
    this.tianTing = 0;              //是否是天听 起手第一圈内听牌
    this.noDelPai = [];             //本轮内不能打的牌
    this.huaScore = 0;              //本轮内花分数
    this.gangScore = 0;             //本轮内杠分数
    this.pengScore = 0;             //本轮内碰牌分数

    this.isYingHu = false;            //硬胡 没有赖子
    this.baoPaiUid = -1;            //包自己牌的玩家。
    this.gdGangBuPai = 1;        //固定杠是否补牌


};

util.inherits(Player, playerMajhong);
var pro = Player.prototype;

pro.__defineGetter__("IsReady", function() { return this.isReady; });
pro.__defineSetter__("IsReady",function(value){this.isReady=value;});
pro.__defineGetter__("Baker", function() { return this.baker; });
pro.__defineSetter__("Baker",function(value){this.baker=value;});
pro.__defineGetter__("IsGang", function() { return this.isGang; });
pro.__defineSetter__("IsGang",function(value){this.isGang=value;});
pro.__defineGetter__("PlayerOP", function() { return this.playerOP; });
pro.__defineGetter__("IsCanHu", function() { return this.isCanHu; });
pro.__defineSetter__("IsCanHu",function(value){this.isCanHu=value;});
pro.__defineGetter__("IsHaiDi", function() { return this.isHaiDi; });
pro.__defineSetter__("IsHaiDi",function(value){this.isHaiDi=value;});
/*
每轮结束刷新
* */
pro.reset = function(){
    logger.debug("清理玩家数据");
    this.isHu = 0;
    this.isReady = 0;
    this.isGang = 0;
    this.isZimo = 0;
    this.isFangPao = 0;
    this.isHaiDi = -1;
    this.isCanHu = true;
    this.qiPaiNum = 0;
    this.isKaiBao = 0;
    this.resultScore = 0;
    this.paiChuCount = 0;
    this.isBuPaiHu = false;
    this.daHuType = [];
    this.tianTing = 0;
    this.gang1 = 0;
    this.gang2 = 0;
    this.gang3 = 0;
    this.noDelPai = [];
    this.huaScore = 0;
    this.gangScore = 0;
    this.pengScore = 0;
    this.isYingHu = false;
    this.baoPaiUid = -1;
    this.gdGangBuPai = 1;

    this.clearPai();
}
/*
初始化玩家手里牌 闲13  庄14  从card获取牌 并发送给对应的客户端
* */
pro.initHandCards = function(cards){
    //logger.debug("发牌%j", cards);
    this.faPai(cards);
    this.table.Message.mjSendHandCards(cards, this.uid);

    this.daHuType = WuHanHuType.PuTong;  //默认当前玩家最多就是普通胡
    this.delJinNum = 0;
    //检测天胡
    this.playerTianPai();
}
/*
从牌库发给玩家一张牌
* */
pro.playerQiPai = function(){
    logger.debug("玩家起牌：" + this.uid);
    this.isCanHu = true;

    this.qiPaiNum += 1;
    this.isBuPaiHu = false;

    var pai = {};
    logger.debug("玩家起牌 gmqipai %j",this.gmQiPai);
    if (!!this.gmQiPai && this.gmQiPai != null){
        pai = this.table.Card.qiPai_debug(this.gmQiPai);
        if (pai == null)
            pai = this.table.Card.qiPai();
        this.gmQiPai = null;
        this.gmQiPaiNum += 1;
    }else {
        pai = this.table.Card.qiPai();
    }
    //记录下来每一摸牌步骤
    this.table.Data.updateHuiFang({"type": 2, pai:pai,uid:this.uid});
    this.addPai(pai);
    this.table.Message.mjSendQiPai(pai,this.uid);

    //刷新金牌
    this.updateJinNumber();
    //刷新固定杠牌
    this.updateGdGangNumber();


    return pai;
}

/*
玩家打了一张牌
* */
pro.playerDelPai = function(pai){

    logger.debug("玩家打牌:" + this.uid);
    logger.debug("玩家打牌:%j", pai);
    //记录下来每一摸牌步骤
    this.table.Data.updateHuiFang({"type": 1, pai:pai,uid:this.uid});
    this.delPai(pai);
    this.isCanHu = true;
    this.isBuPaiHu = false;

    if(this.isLaiZi(pai) || this.isGdGangPai(pai)){

    }else{
        this.paiChuPush(pai);
        this.paiLeiBaoPush(pai);
    }

    this.table.Message.mjSyncDelCards(pai,this.uid);

    this.qiPaiNum += 1;
    this.paiChuCount += 1;
    this.noDelPai = [];

}
//cxp
//pro.playerGdGangPai = function(isOverHua){
//    //默认一次性补完最多一个人补了12次花 极限
//
//    if (isOverHua == undefined || isOverHua == null || !isOverHua){
//        for (var i = 0; i < 12; i++){
//            if (this.isHaveGdGangPai() == true){
//                logger.debug("固定杠第几次:" + i + 1);
//                var overMsg = this.replaceGdGangPai();
//                overMsg["mo"] = 1;
//                if (this.isHaveGdGangPai() == false){
//                    //记录下来补花
//                    this.table.Data.updateHuiFang({"type":8, hua:overMsg,uid:this.uid});
//                    this.table.Message.mjSendHuaPai(overMsg,this.uid);
//                    break;
//                }
//            }else{
//                break;
//            }
//        }
//
//    }else{
//        //不管摸到的牌如何只补花一次
//        //补花  发送给客户端显示新的牌
//        var msg = this.replaceGdGangPai();
//        msg["mo"] = 0;
//        //记录下来补花
//        this.table.Data.updateHuiFang({"type":8, hua:msg,uid:this.uid});
//        this.table.Message.mjSendHuaPai(msg,this.uid);
//    }
//}



//自己做了什么操作
/*
 opCard":{"type":"B","value":2},"level":2,"chi":[],"peng":0,"bu":[{"pai":{"type":"B","value":9},"origin":3}],
 "gang":[{"pai":{"type":"B","value":9},"origin":3}],"hu":0,"guo":1}
* */
pro.notifyOPCard = function(){
    if (!!this.playerOP["level"] && this.playerOP["level"] > -1){
        if (this.playerOP["opCard"] == null || this.playerOP["opCard"] == ""){
            if (!!this.playerOP["bu"] && this.playerOP["bu"].length > 0){
                this.playerOP["opCard"] = this.playerOP["bu"][0]["pai"];
            }
            else{
                this.playerOP["opCard"] = this.paiLast;
            }
            //如果是自摸并且自摸胡的牌和补不一样那么用自摸的牌显示自摸 暂时屏蔽因为客户端会报错等待客户端处理了之后再打开
            if (this.playerOP["level"] >= 3 && this.table.LastOP["lastUid"] == this.uid){
                this.playerOP["opCard"] = this.paiLast;
            }
        }
        logger.debug("==发给玩家=%j",JSON.parse(JSON.stringify(this.playerOP)));
        this.table.Message.mjNotifyPlayerOP(this.playerOP, this.uid);
    }
}

pro.clearOPcard = function(){
    this.playerOP = {};
}

pro.setOPcardHu = function(pai){
    this.playerOP = {};
    this.playerOP["uid"] = this.uid;
    this.playerOP["opCard"] = pai != null ? pai : this.paiLast;
    this.playerOP["level"] = 3;
    this.playerOP["chi"] = [];
    this.playerOP["peng"] = 0;
    this.playerOP["gang"] = [];
    this.playerOP["bu"] = [];
    this.playerOP["hu"] = 1;
    this.playerOP["guo"] = 1;
    this.playerOP["buType"] = 1;
}
/*
判断当前玩家可以哪些操作并通知给对应玩家
{"opCard":{"opCard":{"type":"B", "value": 1}, "tian":[],"chi":[],"peng":1,"gang":0,"bu":0,"hu":1,"guo":1, "level":5}
* */
pro.checkOPCard = function(pai, isGang,isCanChi){
    logger.debug("监测我的操作我的UID：" + this.uid);
    this.clearOPcard();
    this.playerOP["uid"] = this.uid;
    this.playerOP["opCard"] = pai !== null ? pai : "";
    this.playerOP["level"] = -1;      //默认没有优先级
    if (pai == undefined){
        pai = null;
    }
    //吃牌判断 只有上家打的牌才能吃
    if (pai == null || isCanChi == false || isGang == true || this.isGang >= 1){
        this.chiChoice = [];
        this.playerOP["chi"] = [];
    }else{
        var chipai = this.checkChi(pai);
        if (chipai == true){
            this.playerOP["chi"] = this.chiChoice;
            this.playerOP["level"] = 1;
        }else{
            this.playerOP["chi"] = [];
        }
    }
    //碰判断 其他玩家打的牌可以碰
    if (pai == undefined || pai == null || isGang == true || this.isGang == 1){
        this.playerOP["peng"] = 0;
    }else{
        var pengpai = this.checkPeng(pai);
        if (pengpai == true){
            this.playerOP["peng"] = 1;
            this.playerOP["level"] = 2;
        }else{
            this.playerOP["peng"] = 0;
        }
    }
    //杠判断 如果别人打的牌只能判断自己手里是否有三张一样的才能杠 如果没有牌则判断自己手里有三张一样的则是暗杠
    //如果有桌面碰的有三张则是明杠  如果是天胡阶段则第不检测杠 等天胡过了再重新检测玩家杠的状态
    if (isGang == true || this.table.card.leftPaiCount() <= 13){
        this.playerOP["gang"] = [];
        this.playerOP["bu"] = [];
    }else{
        var gangpai = this.checkGang(pai,this.isGang);//1表示自己摸牌 2表示别人打的牌
        //var gangpai = false;
        if (gangpai == true){

            this.playerOP["bu"] = this.gangChoice;
            this.playerOP["level"] = 2;
            this.playerOP["buType"] = 1;
            //if (this.checkTing1(pai,this.isGang) == true){
            //    this.playerOP["gang"] = this.gangChoice;//听牌才能杠
            //}
            //else{
            //    this.playerOP["gang"] = [];
            //}
        }
        else{
            this.playerOP["gang"] = [];
            this.playerOP["bu"] = [];
            this.playerOP["buType"] = 0;
        }
    }
    //胡判断
    if (this.isCanHu == false){
        this.huChoice = [];
        this.playerOP["hu"] = 0;
    }else{

        var hupai = this.checkHu(pai,isGang);
        if (hupai == true){
            this.playerOP["hu"] = 1;
            this.playerOP["level"] = 3;
        }else{
            this.playerOP["hu"] = 0;
        }
    }
    //有操作则过为1
    if (this.playerOP["level"] > -1){
        this.playerOP["guo"] = 1;
    }
    logger.debug("当前操作%j",this.playerOP);
    return this.playerOP;
}

//海底捞月
pro.playerHaiDiPai = function(){
    logger.debug("玩家海底捞月啦当前牌数目:" + this.table.Card.leftPaiCount());
    var pai = this.table.Card.qiPai();
    // mwshang
    pai["from"] = {"uid":this.uid};
    // end
    this.paiLast = pai;
    var hupai = this.CheckHu_HDLY(pai,true);
    var isPlayerHu = false;
    this.table.Message.mjHaiDiPai(this.uid, pai);

    this.table.Data.updateHuiFang({type:7,opResult:{pai:pai,uid:this.uid}});

    if (hupai == true){
        //海底捞月 玩家胡牌结算
        this.playerHuPai(pai);
        isPlayerHu = true;
    }else{
        //判断其他玩家是否可胡如果胡则走放炮流程 并标记是海底胡枚举 结算
        for (var otherUid in this.table.playerUids){
            if (otherUid == this.uid)
                continue;
            //海底捞月 玩家胡牌结算
            if (this.table.playerUids[otherUid].CheckHu_HDP(pai,true) == true){
                this.table.playerUids[otherUid].playerHuPai(pai);
                isPlayerHu = true;
            }
        }
    }
    return isPlayerHu;
}

/*
* */
pro.playerChiPai = function(index,pai){
    var isOK = this.chiPai(index,pai);
    if (isOK == -1){
        logger.error("吃牌为啥出错");
        return;
    }
    var msg = {"opType":"chi", opCard:pai,
        "cards": this.chiChoice[index],"sourceUid":this.table.LastOP["lastUid"]};

    //记录回放
    msg["uid"] = this.uid;
    this.table.Data.updateHuiFang({type:5,opResult:msg});

    //把上家打出去的牌删除掉 因为已经被其他人吃掉了
    this.table.playerUids[this.table.LastOP["lastUid"]].paiChuPop();

    this.table.Message.mjSyncPlayerOP(msg,this.uid);
    this.isCanHu = true;

    if(this.qiPaiNum == 0){
        this.qiPaiNum += 1;
    }

    //检查包牌
    this.addBaoPaiUid();

}
pro.playerPengPai = function(pai){
    this.pengPai(pai);

    this.table.playerUids[this.table.LastOP["lastUid"]].paiChuPop();

    //记录谁打给玩家碰的
    var sourceChair = this.getUidChair(this.table.LastOP["lastUid"]);
    var msg = {"opType":"peng", opCard:pai,"sourceUid":this.table.LastOP["lastUid"],
        "sourceChair":sourceChair};
    this.paiDest[this.paiDest.length - 1]["sourceChair"] = sourceChair;

    //记录回放
    msg["uid"] = this.uid;
    this.table.Data.updateHuiFang({type:5,opResult:msg});
    this.table.Message.mjSyncPlayerOP(msg,this.uid);
    this.isCanHu = true;

    if(this.qiPaiNum == 0){
        this.qiPaiNum += 1;
    }
    //检查包牌
    this.addBaoPaiUid();
}
pro.playerGangPai = function(pai,gangPai){
    logger.debug("玩家杠牌");
    var gangType = this.gangPai(pai);
    this.isCanHu = true;
    if (!!this.table.LastOP["lastUid"] && this.table.LastOP["lastUid"] !== this.uid){
        this.table.playerUids[this.table.LastOP["lastUid"]].paiChuPop();
    }
    //从牌中摸出两张牌 判断是否可胡 如果可胡那么通知操作如果没胡那么首先判断别人是否有胡没有则继续判断 碰 吃 操作
    var card1 = this.table.Card.qiPai("end");
    var card2 = this.table.Card.qiPai("end");


    gangPai.push(card1);
    gangPai.push(card2);
    // 标记下玩家杠牌了 以后再也不能换牌摸啥打啥
    this.isGang = 1;
    var msg = {"opType":"gang", opCard:pai,"sourceUid":this.table.LastOP["lastUid"],"cards":[card1,card2],"origin":gangType};
    //记录打出去的牌 杠算打出去的
    this.paiChuPush(card1);
    this.paiChuPush(card2);
    //记录回放
    msg["uid"] = this.uid;
    this.table.Data.updateHuiFang({type:5,opResult:msg});
    this.table.Message.mjSyncPlayerOP(msg,this.uid);
    //检查包牌
    this.addBaoPaiUid();
}
pro.playerBuPai = function(pai){
    logger.debug("玩家补牌1");
    this.isCanHu = true;
    //杠牌 删除掉杠牌 并通知客户端 如果是别人打的牌那么要删除对应打的人的桌面牌
    var gangType = this.gangPai(pai);
    logger.debug("补最后操作的UID：%j", this.table.LastOP);
    if (!!this.table.LastOP["lastUid"] && this.table.LastOP["lastUid"] !== this.uid){
        this.table.playerUids[this.table.LastOP["lastUid"]].paiChuPop();
    }
    var msg = {"opType":"bu", opCard:pai,"sourceUid":this.table.LastOP["lastUid"],"cards":this.gangChoice,"origin":gangType,"buType":1};
    //记录回放
    msg["uid"] = this.uid;
    this.table.Data.updateHuiFang({type:5,opResult:msg});
    this.table.Message.mjSyncPlayerOP(msg,this.uid);

    var paiMsg;
    logger.debug("玩家补牌 gmqipai %j",this.gmQiPai);
    if (!!this.gmQiPai && this.gmQiPai != null){
        paiMsg = this.table.Card.qiPai_debug(this.gmQiPai);
        if (paiMsg == null)
            paiMsg = this.table.Card.qiPai("end");;
        this.gmQiPai = null;
        this.gmQiPaiNum += 1;
    }else {
        //从屁股摸一张牌 走摸牌流程
        paiMsg = this.table.Card.qiPai("end");
    }

    this.addPai(paiMsg);
    logger.debug("玩家补牌2:%j", paiMsg);
    this.debugPai();
    this.table.Message.mjSendQiPai(paiMsg,this.uid);
    this.isBuPaiHu = true;
    //记录回放
    this.table.Data.updateHuiFang({type:2,pai:paiMsg,uid:this.uid});
    this.qiPaiNum += 1;

    //刷新金牌
    this.updateJinNumber();
    //刷新固定杠牌
    this.updateGdGangNumber();

    //检查包牌
    this.addBaoPaiUid();
}

//玩家选择不胡清理数据
pro.playerCancelHu = function(){
    //this.isCanHu = false;
    this.huChoice = [];
}

pro.playerHuPai = function(pai){
    logger.debug("玩家发送胡牌请求啦");
    //判断玩家是否可以胡牌 检测胡牌列表是否有值
    var huNun = this.huChoice.length;
    if (huNun <= 0){
        logger.error("玩家没有胡牌丫有问题" );
        this.debugPai();
        return false;
    }
    var isZimo = 1; //默认自摸
    var isDaHu = 0; //默认不是大胡
    if (this.huChoice.length > 1 || this.huChoice[0].type > 0){
        isDaHu = 1;
    }
    //如果最后操作的人不是自己那么是接炮 只统计放炮者信息
    if (this.table.LastOP["lastUid"] != this.uid){
        logger.debug("不是自摸:" + this.table.LastOP["lastUid"] + "     myUid:" + this.uid);
        isZimo = 0;
        this.table.playerUids[this.table.LastOP["lastUid"]].loseCountTotal(isDaHu, 1);
    }
    //自摸 三家统计
    else{
        for (var uid in this.table.playerUids){
            if (uid == this.uid){
                continue;
            }
            this.table.playerUids[uid].loseCountTotal(isDaHu,0);
        }
        //除了杠和海底捞的情况 把自摸的牌再减掉
        var isDelLastPai = true;
        //for (var p = 0; p < this.huChoice.length; p++){
        //    if (this.huChoice[p].type == WuHanHuType.HaiDiLaoYue || this.huChoice[p].type == WuHanHuType.GangKaiHua){
        //        isDelLastPai = false;
        //        break;
        //    }
        //}
        if (isDelLastPai == true){
            this.delPai(this.paiLast);
        }

        if (this.isJinPai(this.paiLast)){
            this.delJinPai();
        }
        //武汉单张自摸不算全求人
        if(this.isHuExist(WuHanHuType.QuanQiuRen))
        {
            logger.debug("自摸不算全求人！");
            this.delHuType(WuHanHuType.QuanQiuRen);
        }
    }
    //统计自己的次数
    this.winCountTotal(isDaHu, isZimo);

    //判断是否是门清
    //if (isZimo == 1 && this.table.Data.menQing == 1){
    //    this.CheckMenQing(pai);
    //}
    this.HaveDaHuNoPingHu();
    //胡牌的人直接亮牌告诉别人胡牌了 杠的时候是胡两个有可能所以来个备份牌
    var msg = {"opType":"hu", opCard:pai,"sourceUid":this.table.LastOP["lastUid"],"cards":this.huChoice,"selfPaiQi":
        JSON.parse(JSON.stringify(this.paiQiLai()))};

    if((this.laiZiNum <= 0 && !!pai && this.isJinPai(pai) != true) ){
        this.isYingHu = true;
    }else if((isZimo == 0 && !!pai && this.checkYuanLaiHu(pai)) || this.checkYuanLaiHu()){
        this.isYingHu = true;
    }

    this.table.Message.mjSyncPlayerOP(msg,this.uid);
    logger.debug("胡牌类型显示:%j",this.huChoice);
    //记录回放
    var huiMsg = JSON.parse(JSON.stringify(msg));
    huiMsg["selfPaiQi"] = [];
    huiMsg["uid"] = this.uid;
    this.table.Data.updateHuiFang({type:5,opResult:huiMsg});

    return true;
}

pro.playerTianPai = function(){
    this.checkTianHu();
    if (this.tianhuChoice.length > 0){
        var msg = {"uid":this.uid,"cards":this.tianhuChoice};
        this.table.Message.mjSyncPlayerTianHu(msg,this.uid);
        logger.debug("玩家天胡:%j", msg);
    }
}

pro.winCountTotal = function(isDaHu,isZimo){
    this.isHu = 1;
    this.isZimo = isZimo;
    this.isFangPao = 0;

    if (isZimo == 1){
        if (isDaHu == 1){
            this.zimoBigCount += 1;              //大胡自摸次数
        }else{
            this.zimoSmallCount += 1;            //小胡自摸次数
        }
    }else{
        if (isDaHu == 1){
            this.dahuCount += 1;              //大胡接炮
        }else{
            this.xiaoHuCount += 1;            //小胡接炮
        }
    }
}
pro.loseCountTotal = function(isDaHu, isFangPao){

    this.isHu = 0;
    this.isFangPao = isFangPao;
    //放炮
    if (isFangPao == 1){
        if (isDaHu == 1){
            this.dahuPao += 1;                   //大胡点炮
        }else{
            this.xiaoHuPao += 1;                 //小胡点炮
        }
    }
}
/*
用于断线重练等 获取当前每个玩家的详细信息 牌桌状态
* */
pro.playerStatus = function(myUid){
    //logger.debug("断线重练打出的牌的长度:" + this.paiChu.length + " UID:" + this.uid);
    var msg = {};
    msg["uid"] = this.uid;
    msg["paiQi"] = this.uid == myUid ? this.paiQiLai() : {num:this.paiNumber()};
    msg["paiChu"] = this.paiChu;
    msg["paiDest"] = this.paiDest;
    msg["position"] = this.position;
    msg["chair"] = this.chair;
    msg["player"] = this.player;
    msg["coinNum"] = this.coinNum;
    msg["isReady"] = this.isReady;
    msg["isGang"] = this.isGang;
    msg["isOffLine"] = this.uid == myUid ? 0 : this.isOffLine;
    if (this.table.nextChuPai == myUid && myUid == this.uid){
        msg["paiLast"] = this.paiLast;
    }
    msg["gdGangBuPai"] = this.gdGangBuPai;
    msg["gdGang"] = this.paiGdGang;
    msg["laiZiGang"] = this.paiLaiZiGang;


    return msg;
}

pro.playerCurrentPai = function(){
    return{
        uid:this.uid,
        paiQi: this.paiQiLai(),
        paiChu: this.paiChu,
        paiDest:this.paiDest
    };
}


//JSON格式的玩家数据用于结算
pro.getPlayerResult = function() {
    return {
        uid:this.uid,
    
        nickName:this.player.nickName,
        headUrl:this.player.headUrl,
        coinNum:this.coinNum,//默认帮客户端算好 只是显示输赢多少分即可
        zimoBigCount: this.zimoBigCount,
        zimoSmallCount: this.zimoSmallCount,
        dahuPao: this.dahuPao,
        xiaoHuPao: this.xiaoHuPao,
        dahuCount: this.dahuCount,
        xiaoHuCount: this.xiaoHuCount
    };
};

//当前玩家是否可以胡  游金是不能街跑的 只能自摸
pro.isCanHuJin = function(){
    //弃胡过本轮不能胡
    if (this.isCanHu == false){
        return false;
    }
    return true;
}

//玩家打了金牌
pro.delJinPai = function(){
    this.delJinNum += 1;
    logger.debug("玩家打了几张金牌:" + this.delJinNum);
    this.laiZiNum -= 1;
}
pro.getUidChair = function(sourceUid) {
    var sourceUidPos =  this.table.PlayerUids[sourceUid].Chair;
    if (Math.abs(this.chair - sourceUidPos) == 2){
        return 1;
    }
    var nextUid = this.table.getNextUid(this.uid);
    if (nextUid == sourceUid){
        return 2;
    }else{
        return 0;
    }
}
//cxp
//pro.delGdGangPai = function(pai){
//    logger.debug("玩家打了固定杠牌:%j" + pai);
//
//    if (this.isHaveGdGangPai() == true){
//        logger.debug("固定杠第几次:" + i + 1);
//        var overMsg = this.replaceGdGangPai();
//        overMsg["mo"] = 1;
//        return;
//    }
//    logger.error('玩家没有这张固定杠牌%j',pai);
//}
//==================武汉=========================

//杠分
pro.gangHandScore = function()
{
    var pan = this.mingGangScore() + this.anGangScore();
    //logger.debug("gangHandScore = %j",pan);
    return pan;
}

//cxp 获取明杠番数
pro.mingGangScore = function(){
    var pan = 0;
    for(var i = 0;i<this.paiDest.length;i++)
    {
        if(this.paiDest[i]["type"] == "gang")
        {
            if(this.paiDest[i]["origin"] == 2 || this.paiDest[i]["origin"] == 3)
            {
                pan += 2;
            } else if(this.paiDest[i]["origin"] == 4){
                pan += 1;
            }


        }
    }
    //logger.debug("mingGangScore = %j",pan);
    return pan;
}

//获取暗杠分数，包含赖子杠
pro.anGangScore = function(noLaizi){
    var pan = 0;

    if(noLaizi == true){

        for (var i = 0; i < this.paiDest.length; i++) {
            if (this.paiDest[i]["type"] == "gang" && this.paiDest[i]["origin"] == 1) {
                pan += 2;
            }
        }

    }else{
        for (var i = 0; i < this.paiDest.length; i++) {
            if (this.paiDest[i]["type"] == "gang" && (this.paiDest[i]["origin"] == 1 || this.paiDest[i]["origin"] == 5)) {
                pan += 2;
            }
        }
    }


    //logger.debug("anGangScore = %j",pan);
    return pan;
}
//硬杠（明杠）
pro.yingGangScore = function(){
    var pan = 0;
    for (var i = 0; i < this.paiDest.length; i++) {
            if (this.paiDest[i]["type"] == "gang" && (this.paiDest[i]["origin"] == 2 || this.paiDest[i]["origin"] == 3)) {
                pan += 2;
            }
    }
    //logger.debug("yingGangScore = %j",pan);
    return pan;
}

pro.yingGangNum = function(){
    var pan = 0;
    for (var i = 0; i < this.paiDest.length; i++) {
        if (this.paiDest[i]["type"] == "gang" && (this.paiDest[i]["origin"] == 2 || this.paiDest[i]["origin"] == 3)) {
            pan += 1;
        }
    }
    //logger.debug("yingGangScore = %j",pan);
    return pan;
}

pro.pengHandScore = function(){
    var pan = 0;
    for(var i = 0;i<this.paiDest.length;i++)
    {
        if(this.paiDest[i]["type"] == "peng")
        {
            pan +=1;
        }
    }
    //logger.debug("pengHandScore = %j",pan);
    return pan;
}

pro.chiHandScore = function(){
    var pan = 0;
    for(var i = 0;i<this.paiDest.length;i++)
    {
        if(this.paiDest[i]["type"] == "chi")
        {
            pan +=1;
        }
    }
    //logger.debug("chiHandScore = %j",pan);
    return pan;
}
//开口番数：吃，碰，杠，固定杠，赖子杠
pro.kaiKouScore = function(){
    var score = this.chiHandScore() + this.pengHandScore() + this.gangHandScore();
    //score = 10;
    return score;
}

pro.isLaiZi = function(pai){
    if(pai.type == this.laiZiPai.type && pai.value == this.laiZiPai.value){
        return true;
    }
    return false;
}

//硬开口分数
pro.yingKaiKouScore = function(){
    var num = this.chiHandScore() + this.pengHandScore() + this.yingGangScore();
    //num = 10;
    return num;
}

//硬开口次数
pro.yingKaiKouNum = function(){
    var num = this.chiHandScore() + this.pengHandScore() + this.yingGangNum();
    //num = 10;
    return num;
}
//可能包牌
pro.addBaoPaiUid = function(){
    logger.debug("yingKaiKouNum = %j",this.yingKaiKouNum());
    if(this.yingKaiKouNum() == 3 && this.table.LastOP["lastUid"] != this.uid){
        this.baoPaiUid = this.table.LastOP["lastUid"];
        this.table.recordLeiBao[this.uid] = true;
        logger.debug("beiBaoPaiUid=%j",this.uid);
        logger.debug("baoPaiUid=%j",this.baoPaiUid);
        logger.debug("recordLeiBao=%j",this.table.recordLeiBao);
    }

}

pro.allJiangPai = function(){

    if(this.paiQi['J'].length > 0 || this.paiQi['F'].length > 0){
        return false;
    }

    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++)
    {
        var pais = this.paiQi[types[i]];
        for (var j=0; j<pais.length; j++) {
            if (pais[j].value != 2 && pais[j].value != 5 && pais[j].value != 8){
                //logger.debug("CheckJJ_HU4:%j", pais[j]);
                return false;
            }
        }
    }

    return true;
}

pro.updateGdGangNoBuPai = function(pai){
    logger.debug("玩家打了一张固定杠牌%j",pai);
    var gangType = this.isGdGangPai(pai)==true ? 4 : 5;

    this.gangChoice = [];

    this.gangChoice.push({"pai": pai, "origin": gangType});

    this.gangPai(pai);

    var msg = {"opType":"bu", opCard:pai,"sourceUid":this.uid,"cards":this.gangChoice,"origin":gangType,"buType":0};
    logger.debug("向客户端发补牌协议%j",msg);
    //记录回放
    msg["uid"] = this.uid;
    this.table.Data.updateHuiFang({type:5,opResult:msg});
    this.table.Message.mjSyncPlayerOP(msg,this.uid);
}

 pro.isLeiBao  = function(huUid,leiBaoType,pai){

    if(leiBaoType == 0)
    {
        logger.debug("要判断累包的牌 %j",pai);

        if(pai == undefined || pai == null){
            logger.error("清一色累包判断,胡家的牌为空");
            return false;
        }

        var haveLeiBaoPai = false;

        if(this.paiQi[pai.type].length > 0){
            haveLeiBaoPai = true;
            logger.debug("手里有累包牌的牌型");
        }

        if(haveLeiBaoPai)
        {
            for(var i in this.paiLeiBao[huUid]){
                logger.debug("qys leibao  uid %j   chupai %j",huUid,this.paiLeiBao[huUid]);


                if(this.paiLeiBao[huUid][i].type != pai.type){
                    logger.debug("this.paiLeiBao %j",this.paiLeiBao[huUid]);
                    logger.debug("没有一直打累包的牌，玩家累包了");
                    return true;
                }
            }
        }

    }else{

        var haveJiang = false;
        var types = ['W','T','B'];
        for (var i = 0; i < types.length; i++)
        {
            var pais = this.paiQi[types[i]];
            for (var j=0; j<pais.length; j++) {


                if (pais[j].value == 2 || pais[j].value == 5 || pais[j].value == 8)
                {
                    haveJiang = true;
                    logger.debug("将一色累包，玩家手里有将牌%j  %j ",this.uid,pais[j]);

                    break;
                }
            }
        }

        if(haveJiang == true){
            for(var i in this.paiLeiBao[huUid])
            {
                logger.debug("jiayisheleibao  uid %j  chupai %j",huUid,this.paiLeiBao[huUid]);

                if(this.paiLeiBao[huUid][i].value != 2 && this.paiLeiBao[huUid][i].value != 5 && this.paiLeiBao[huUid][i].value != 8){
                    logger.debug("不是全手将，又没有一直打将牌，将一色累包了%j",this.uid);

                    logger.debug("this.paiLeiBao %j",this.paiLeiBao[huUid]);
                    logger.debug("没有一直打累包的牌，玩家累包了");
                    return true;
                }
            }
        }
    }

    logger.debug("玩家没有累包");
    return false;
 }

// 获取听牌建议
pro.getTingChoice = function () {
    //听牌判断
    // if (this.playerOP["level"] < 3){
    if (this.checkTing()){
        logger.debug('检测到玩家可以听牌:%j', this.tingChoice);
        return this.tingChoice;
    }
    // }

    return [];
}


module.exports = Player;