var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var pomelo = require('pomelo');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
//var WuHanHuType = require('../../consts/consts').WuHanHuType;
var WuHanHuType = require('../../consts/consts').WuHanHuType;
var ChangShaTianHuType = require('../../consts/consts').ChangShaTianHuType;
var Card = require('./card');
var Majhong = require('../../algorithm/majhongLaiZi');
var PaiPool = require('../../algorithm/majhongPool');

var CHAIR_POSITION =
{
    DONG:0, //东
    NAN: 1, //南
    XI:2,   //西
    BEI:3   //北
}

var playerMajhong = function(opts)
{
    EventEmitter.call(this, opts);
    this.table = opts.table;
    this.player = opts.player;                  //名字
    this.uid = opts.player.uid;                 //UID
    this.userName = opts.player.userName;       //名字
    this.coinNum = 0;                        //金币
    this.player.coinNum = 0;
    this.gemNum = opts.player.gemNum;           //房卡
    this.chair = opts.chair;                    //座位号
    this.isOffLine = 0;                         //是否离线
    this.paiQi = {
        'J': [],
        'F': [],
        'W': [],
        'B': [],
        'T': []};                          //手牌
    this.paiChi = {
        'J': [],
        'F': [],
        'W': [],
        'B': [],
        'T': []};                          //自己吃的牌
    this.paiPeng = {
        'J': [],
        'F': [],
        'W': [],
        'B': [],
        'T': []};                         //自己碰的牌
    this.paiGang = {
        'J': [],
        'F': [],
        'W': [],
        'B': [],
        'T': [] };                         //自己杠的牌

    this.chiChoice= []; // 吃牌可选组合
    this.pengChoice= []; // 碰牌可选组合
    this.gangChoice= []; // 杠牌可选组合
    this.tianhuChoice = []; //天胡
    this.huChoice = [];  //胡
    this.tingChoice = [];
    this.paiChu = [];                      //自己打出的牌 按順序擺放必須是數組
    this.paiDest = [];                      //自己桌面吃碰杠的牌 必须按顺序为了客户端断线重练

    this.jiangValue = 0; // 将牌面值
    this.paiLast = 0;                           //最后起的牌
    this.position = opts.chair;                 //东南西北 默认房主是东 第一次位置就是椅子的位置0
    this.isRobot = false;                       //是否是机器人

    this.isTingPai = false;                     // 是否听牌
    this.isKaiGang = false;                     // 是否开杠 需补张
    this.laiZi = true; // 是否癞子
    this.laiZiPai ={};
    this.laiZiNum = 0;

    this.paiLaiZiGang = [];

    this.piZi = {};                             //皮子
    this.paiGdGang=[];                          //固定杠，已经杠过的牌。
    this.paiHaveGdGang=[];                      //固定杠，还在手里的牌
    this.gdGangPai = [];                        //本轮确定的固定杠：皮子，红中
    this.gdGuangNum = 0;                       //
    this.daHuCanHuScore = 3;                    //大胡的最低番数
    this.piHuCanHuScore = 6;                    //屁胡的最低番数

    this.paiLeiBao = {};                        //累包


    this.majhong = new Majhong();
    this.majhong.area = 'wuhan';


    this.clearPai();
};

util.inherits(playerMajhong, EventEmitter);
var pro = playerMajhong.prototype;

pro.__defineGetter__("Chair", function() { return this.chair; });
pro.__defineSetter__("Chair",function(value){this.chair=value;});
pro.__defineGetter__("Position", function() { return this.position; });
/*
清理牌
* */
pro.clearPai = function(){
    this.paiQi['J']= [];
    this.paiQi['F']= [];
    this.paiQi['W']= [];
    this.paiQi['B']= [];
    this.paiQi['T']= [];

    this.paiChi['J']= [];
    this.paiChi['F']= [];
    this.paiChi['W']= [];
    this.paiChi['B']= [];
    this.paiChi['T']= [];

    this.paiPeng['J']= [];
    this.paiPeng['F']= [];
    this.paiPeng['W']= [];
    this.paiPeng['B']= [];
    this.paiPeng['T']= [];

    this.paiGang['J']= [];
    this.paiGang['F']= [];
    this.paiGang['W']= [];
    this.paiGang['B']= [];
    this.paiGang['T']= [];


    this.chiChoice= []; // 吃牌可选组合
    this.pengChoice= []; // 碰牌可选组合
    this.gangChoice= []; // 杠牌可选组合
    this.tianhuChoice = [];//天胡数组
    this.huChoice = []; //胡牌数组 可叠加
    this.tingChoice = [];
    this.paiChu = [];
    this.paiDest = [];
    this.paiLast = 0;
    this.chair = 0;
    this.laiZiPai ={};
    this.laiZiNum = 0;

    this.piZi = {};                             //皮子
    this.gdGangPai = [];                          //固定杠：皮子，红中
    this.gdGuangNum = 0;                       //
    this.paiGdGang = [];
    this.paiHaveGdGang = [];
    this.paiLeiBao = {};


    this.majhong.clear();
}

/*
加入新派并排序
* */
pro.addPai = function(pai, isSyncLast){
    //logger.debug("玩家摸到一张牌:%j", pai);
    if (pai == undefined || !pai){
        logger.error("添加进来一个错的牌:%j", pai);
        return;
    }
    var found = false;
    var pais = this.paiQi[pai.type];

    for (var i=pais.length-1; i>=0; i--) {
        if (pai.value > pais[i].value) {
            pais.splice(i+1, 0, pai);
            found = true;
            break;
        }
    }
    if (!found){
        pais.unshift(pai);
    }


    if (isSyncLast == undefined || isSyncLast == null || !isSyncLast){
        this.paiLast = pai;
    }

    this.majhong.addPai(pai);

    this.debugPai();
}

pro.faPai = function(pais){
    logger.debug("发牌给玩家:%j", pais);
    for (var i=0; i<pais.length; i++) {
        this.addPai(pais[i]);
    }
    this.debugPai();
}
pro.delPai = function(pai){
    for (var i=0; i<this.paiQi[pai.type].length; i++) {
        if (this.paiQi[pai.type][i].value == pai.value) {
            this.paiQi[pai.type].splice(i, 1);

            this.majhong.delPai(pai);

            //this.debugPai();
            return true;
        }
    }
    return false;
}

pro.paiChuPush = function(pai){
    if (pai == null || pai == undefined)
    {
      return;
    }
    this.paiChu.push(pai);
   // logger.debug("我打出去的牌数目0:" + this.paiChu.length + "  UID:" + this.uid);
}
pro.paiChuPop = function(){
    this.paiChu.pop();
  //  logger.debug("我打的牌被别人吃碰杠了所以弹出去我UID：" + this.uid);
  //  logger.debug("我打出去的牌数目1:" + this.paiChu.length);
}

pro.checkChiChoice = function(pai1, pai2, pai3) {
    for (var i=0; i<this.chiChoice.length; i++)
        if (this.chiChoice[i][0].type == pai1.type && this.chiChoice[i][0].value == pai1.value
            && this.chiChoice[i][1].type == pai2.type && this.chiChoice[i][1].value == pai2.value
            && this.chiChoice[i][2].type == pai3.type && this.chiChoice[i][2].value == pai3.value)
            return true;

    return false;
}

pro.checkChi = function(pai) { // 检查吃牌
    this.chiChoice = [];
  //  logger.debug("检测吃牌：别人打的牌：%j", pai); //{"type":"B","value":1}
    this.debugPai();
    if (pai.type == 'H' || pai.type == 'J' || pai.type == 'F' ){
        return false;
    }

    if (this.paiQi[pai.type].length > 0) {
   //     logger.debug("我自己这种类型的牌：%j", this.paiQi[pai.type]);
        var len = this.paiQi[pai.type].length;
        if (len >= 2) {
            for (var i=0; i<len-1; i++) {
                if (this.paiQi[pai.type][i].value == pai.value+1 && this.paiQi[pai.type][i+1].value == pai.value+2) {
                    if (!this.checkChiChoice(pai, this.paiQi[pai.type][i], this.paiQi[pai.type][i+1]))
                        this.chiChoice.push([pai, this.paiQi[pai.type][i], this.paiQi[pai.type][i+1]]);
                }
                if (this.paiQi[pai.type][i].value == pai.value-1 && this.paiQi[pai.type][i+1].value == pai.value+1) {
                    if (!this.checkChiChoice(this.paiQi[pai.type][i], pai, this.paiQi[pai.type][i+1]))
                        this.chiChoice.push([this.paiQi[pai.type][i], pai, this.paiQi[pai.type][i+1]]);
                }
                if (this.paiQi[pai.type][i].value == pai.value-2 && this.paiQi[pai.type][i+1].value == pai.value-1) {
                    if (!this.checkChiChoice(this.paiQi[pai.type][i], this.paiQi[pai.type][i+1], pai))
                        this.chiChoice.push([this.paiQi[pai.type][i], this.paiQi[pai.type][i+1], pai]);
                }
            }
        }
        if (len >= 3) { // 假设吃B 已有ABC
            for (var i=1; i<len-1; i++) {
                if (this.paiQi[pai.type][i-1].value == pai.value-1 && this.paiQi[pai.type][i].value == pai.value && this.paiQi[pai.type][i+1].value == pai.value+1) {
                    if (!this.checkChiChoice(this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+1]))
                        this.chiChoice.push([this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+1]]);
                }
            }
        }

        if (len >= 4) { // 假设吃B 已有ABBC
            for (var i=1; i<len-2; i++) {
                if (this.paiQi[pai.type][i-1].value == pai.value-1 && this.paiQi[pai.type][i].value == pai.value && this.paiQi[pai.type][i+2].value == pai.value+1) {
                    if (!this.checkChiChoice(this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+2]))
                        this.chiChoice.push([this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+2]]);
                }
            }
        }

        if (len >= 5) { // 假设吃B 已有ABBBC
            for (var i=1; i<len-3; i++) {
                if (this.paiQi[pai.type][i-1].value == pai.value-1 && this.paiQi[pai.type][i].value == pai.value && this.paiQi[pai.type][i+3].value == pai.value+1) {
                    if (!this.checkChiChoice(this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+3]))
                        this.chiChoice.push([this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+3]]);
                }
            }
        }

        if (len >= 6) { // 假设吃B 已有ABBBBC
            for (var i=1; i<len-4; i++) {
                if (this.paiQi[pai.type][i-1].value == pai.value-1 && this.paiQi[pai.type][i].value == pai.value && this.paiQi[pai.type][i+4].value == pai.value+1) {
                    if (!this.checkChiChoice(this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+4]))
                        this.chiChoice.push([this.paiQi[pai.type][i-1], pai, this.paiQi[pai.type][i+4]]);
                }
            }
        }

        if (this.chiChoice.length > 0){
          //  logger.debug("排序前检测吃牌结果：%j", this.chiChoice);
            this.chiChoice.sort(function(a,b){
                return a[0].value < b[0].value ? 1 : -1;
            });
          //  logger.debug("排序后检测吃牌结果：%j", this.chiChoice);
            return true;
        }

    }

    return false;
}

pro.chiPai = function(index,pai) { // 吃牌
    this.addPai(pai,"noSync");
    var chiPos = -1;
    if (index >= this.chiChoice.length)
        return chiPos;
    else {
        var chiPais = this.chiChoice[index];
        this.delPai(chiPais[0]);
        this.delPai(chiPais[1]);
        this.delPai(chiPais[2]);
        this.paiChi[chiPais[0].type].push(chiPais[0]);
        this.paiChi[chiPais[0].type].push(chiPais[1]);
        this.paiChi[chiPais[0].type].push(chiPais[2]);
      //  logger.debug("玩家吃牌后的牌:%j");
        var chiDest = [];
        if (pai.value == chiPais[1].value){
            chiDest = chiPais;
            chiPos = 1;
        }else if (pai.value == chiPais[0].value){
            chiDest.push(chiPais[1]);
            chiDest.push(chiPais[0]);
            chiDest.push(chiPais[2]);
            chiPos = 0;
        }else{
            chiDest.push(chiPais[0]);
            chiDest.push(chiPais[2]);
            chiDest.push(chiPais[1]);
            chiPos = 2;
        }
        this.paiDest.push({"type":"chi","pai":chiDest}); //按顺序记录吃碰杠的牌
        this.debugPai();

        return chiPos;
    }
}

pro.checkPeng = function(pai) { // 检查碰牌
    this.pengChoice = [];
  //  logger.debug("检测碰牌：别人打的牌：%j", pai); //{"type":"B","value":1}
    if (this.paiQi[pai.type].length > 0) {
   //     logger.debug("我这种类型的牌%j", this.paiQi[pai.type]);
        var len = this.paiQi[pai.type].length;
        if (len >= 2) {
            for (var i=0; i<len-1; i++) {
                if (this.paiQi[pai.type][i].value == pai.value && this.paiQi[pai.type][i+1].value == pai.value) {
                    this.pengChoice.push(pai);
                    break;
                }
            }
        }
        if (this.pengChoice.length > 0){
       //     logger.debug("检测碰牌结果：%j", this.pengChoice);
            this.debugPai();
            return true;
        }

    }

    return false;
}

pro.pengPai = function(pai) { // 碰牌
   // logger.debug("玩家碰牌前的牌:");
    this.debugPai();
    var pengPais = this.pengChoice;
    this.delPai(pengPais[0]);
    this.delPai(pengPais[0]);
    this.paiPeng[pengPais[0].type].push(pengPais[0]);
    this.paiPeng[pengPais[0].type].push(pengPais[0]);
    this.paiPeng[pengPais[0].type].push(pengPais[0]);
   // logger.debug("玩家碰牌后的牌:");
    this.paiDest.push({"type":"peng","pai":pengPais[0]}); //按顺序记录吃碰杠的牌
   // this.debugPai();
}

pro.checkGang = function(pai, isTing) {  // 检查杠牌  origin: 1表示自己摸牌 2表示别人打的牌  pai为null表示自己摸牌
    this.gangChoice = [];
    logger.debug("监测杠牌别人打牌：%j", pai);
    //origin  1暗杠  2 别人打的杠 3明杠
    if (pai == null) { // pai为null表示自己摸牌
        var types = ['J','F','W','T','B'];
        for (var i=0; i<5; i++) {
            var pais = this.paiQi[types[i]];
            logger.debug("监测杠:%j", pais);
            var len = pais.length;
            if (len >= 4) {
                for (var j=0; j<len-3; j++) {
                    if (this.CheckAAAAPai(pais[j].value, pais[j+1].value, pais[j+2].value, pais[j+3].value))
                        this.gangChoice.push({pai: pais[j], origin: 1});
                }
            }
        }

        for (var i=0; i<5; i++) { //从碰牌里面也判断
            var pais = this.paiPeng[types[i]];
            var len = pais.length;
            if (len >= 3) {
                for (var j=0; j<len; j+=3) {
                    for (var k=0; k<this.paiQi[types[i]].length; k++) {
                        if (this.paiQi[types[i]][k].value == pais[j].value) {
                            this.gangChoice.push({pai: pais[j], origin: 3});
                            break;
                        }
                    }
                }
            }
        }

        //cxp 固定杠
        if(this.paiHaveGdGang.length > 0){
            this.gangChoice.push({pai: this.paiHaveGdGang[0], origin: 4});
            logger.debug("监测到固定杠牌%j",this.gangChoice);
        }

        //logger.debug("现在的赖子数量:",this.laiZiNum);
        if(this.laiZiNum > 0){
            this.gangChoice.push({pai: this.laiZiPai, origin: 5});
            logger.debug("监测到赖子杠%j",this.gangChoice);
        }

//        this.checkGangTing(isTing,null);
        if (this.gangChoice.length > 0){
            logger.debug("监测到杠牌%j",this.gangChoice );
            return true;
        }

    } else if (this.paiQi[pai.type].length > 0) {
        var len = this.paiQi[pai.type].length;
        if (len >= 3) {
            for (var i=0; i<len-2; i++) {
                if (this.paiQi[pai.type][i].value == pai.value && this.paiQi[pai.type][i+1].value == pai.value &&  this.paiQi[pai.type][i+2].value == pai.value) {
                    this.gangChoice.push({pai: pai, origin: 2});
                    break;
                }
            }
        }
//        this.checkGangTing(isTing,null);
        if (this.gangChoice.length > 0){
            logger.debug("监测到杠牌%j",this.gangChoice);
            return true;
        }

    }


    return false;
}
pro.gangPai = function(pai) { // 杠牌
    //logger.debug("玩家杠之前的牌");
    logger.debug("玩家要杠的牌%j",pai);
    this.debugPai();
    var gangPais = this.gangChoice;
    var i = 0;
    var gangType = 0;
    for (i=0; i<gangPais.length; i++) {
        if (gangPais[i].pai.type == pai.type && gangPais[i].pai.value == pai.value) {
            break;
        }
    }
    //origin  1暗杠  2 别人打的杠 3明杠
    if (gangPais[i].origin == 1) {
        gangType = 1;
        this.delPai(gangPais[i].pai);
        this.delPai(gangPais[i].pai);
        this.delPai(gangPais[i].pai);
        this.delPai(gangPais[i].pai);
        this.paiDest.push({"type":"gang","pai":gangPais[i].pai, "origin":1}); //按顺序记录吃碰杠的牌

    } else if (gangPais[i].origin == 2) {
        gangType = 2;
        this.delPai(gangPais[i].pai);
        this.delPai(gangPais[i].pai);
        this.delPai(gangPais[i].pai);
        this.paiDest.push({"type":"gang","pai":gangPais[i].pai, "origin":2}); //按顺序记录吃碰杠的牌

    } else if (gangPais[i].origin == 3) {
        gangType = 3;
        for (var j=0; j<this.paiPeng[gangPais[i].pai.type].length; j++) {
            if (this.paiPeng[gangPais[i].pai.type][j].value == pai.value) {
                this.delPai(gangPais[i].pai);
                this.paiPeng[gangPais[i].pai.type].splice(j, 3);

                //按顺序记录吃碰杠的牌 这里要删除掉之前碰的牌
                this.paiDest.push({"type":"gang","pai":gangPais[i].pai, "origin":3});
                for(var p = 0; p < this.paiDest.length; p++){
                    if (this.paiDest[p].type == "peng" && this.paiDest[p].pai.type == gangPais[i].pai.type
                        && this.paiDest[p].pai.value == gangPais[i].pai.value){
                        this.paiDest.splice(p,1);
                        break;
                    }
                }
                break;
            }
        }
    }else if(gangPais[i].origin == 4){//cxp
        gangType = 4;

        for(var haveGd = 0;haveGd < this.paiHaveGdGang.length;haveGd++) {
            if(gangPais[i].pai.type == this.paiHaveGdGang[haveGd].type && gangPais[i].pai.value == this.paiHaveGdGang[haveGd].value){
                this.paiHaveGdGang.splice(haveGd,1);
                break;
            }
        }

        this.paiGdGang.push(gangPais[i].pai);
        this.paiDest.push({"type":"gang","pai":gangPais[i].pai, "origin":4}); //按顺序记录吃碰杠的牌
        logger.debug("杠牌后，的固定杠牌%j",this.paiHaveGdGang);
    }else if(gangPais[i].origin == 5){
        gangType = 5;
        this.paiLaiZiGang.push(this.laiZiPai);
        this.laiZiNum -= 1;
        this.paiDest.push({"type":"gang","pai":gangPais[i].pai, "origin":5}); //按顺序记录吃碰杠的牌
    }

    if (this.paiGang[gangPais[i].pai.type].length == 0)
    {
        if(gangPais[i].origin <=3 ){
            this.paiGang[gangPais[i].pai.type].push(gangPais[i]);
            this.paiGang[gangPais[i].pai.type].push(gangPais[i]);
            this.paiGang[gangPais[i].pai.type].push(gangPais[i]);
            this.paiGang[gangPais[i].pai.type].push(gangPais[i]);
        }

    } else {
        if(gangPais[i].origin <=3 ){
            var paiType = gangPais[i].pai.type;
            var isAdd = false;

            for (var j = 0; j<this.paiGang[paiType].length; j++)
            {
                if (pai.value < this.paiGang[paiType][j].pai.value) {
                    this.paiGang[paiType].splice(j, 0, gangPais[i],gangPais[i],gangPais[i],gangPais[i]);
                    isAdd = true;
                    break;
                }
            }

            if(isAdd != true){
                this.paiGang[paiType].push(gangPais[i],gangPais[i],gangPais[i],gangPais[i]);
            }
        }

    }

    logger.debug("现在手里的杠牌%j",this.paiGang);
    this.debugPai();
    return gangType;
}

//获取杠牌类型 用于判断是否抢杠
// origin  1暗杠  2 别人打的杠 3明杠
pro.getGangType = function(pai){
    for (var i = 0; i < this.gangChoice.length; i++){
        //{pai: pai, origin: 2}
        logger.debug("查询杠牌:%j", this.gangChoice[i]);
        if (this.gangChoice[i].pai.type == pai.type && this.gangChoice[i].pai.value == pai.value){
            return this.gangChoice[i].origin;
        }
    }
    logger.error("咋木有找到杠牌呢: %j ", pai);
    return -1;
}

pro.checkTianHu = function() { //检测是否天胡
    //this.CheckD4X_HU();
    //this.CheckBB_HU();
    //this.CheckQue1S_HU();
    //this.Check66S_HU();
    //if(this.table.Data.isBuBuGao>0)
    //    this.CheckBuBuGao_HU();
    //if(this.table.Data.isJinTongYuNv>0)
    //    this.CheckJinTongYuNv_HU();
    //if(this.table.Data.isYiZhiHua>0)
    //    this.CheckYiZhiHua_HU();
    //if(this.table.Data.isSanTong>0)
    //    this.CheckSanTong_HU();
}

pro.checkDaHu = function(pai) { //检测是否大胡
    //自摸的话是木有pai的
    if (pai == null || pai == undefined){
        pai = this.paiLast;
    }
    //logger.debug("检测大胡我的手牌信息");
    this.debugPai();

    if(!this.check_hu_before()){
        return false;
    }

    var ret = false;
    var hu = this.CheckPP_HU(pai);
    if (hu) {
        logger.debug("检测玩家可以碰碰胡");
        ret = hu;
    }

    var hu = this.CheckJJ_HU(pai);
    if (hu) {
        logger.debug("检测玩家可以将一色");
        ret = hu;
    }

    var hu = this.CheckQing1S_HU(pai);
    if (hu) {
        logger.debug("检测玩家可以清一色");
        ret = hu;
    }
//cxp 武汉没有七对
    //var hu = this.Check7D_HU(pai);
    //if (hu) {
    //    logger.debug("检测玩家可以7对");
    //    ret = hu;
    //}

    var hu = this.CheckQQR_HU(pai);
    if (hu) {
        logger.debug("检测玩家可以全求人");
        logger.debug("jiangValue %j",this.jiangValue);

        //if(this.jiangValue != 2 && this.jiangValue != 5 && this.jiangValue != 8){
        //    if(this.isHuExist(WuHanHuType.QingYiSe) || this.isHuExist(WuHanHuType.PengPengHu)){
        //        this.delHuType(WuHanHuType.QuanQiuRen);
        //    }
        //}
        ret = hu;
    }

    //cxp 放最后，会删除清一色牌型
    var hu = this.CheckFengYiSe_HU(pai);
    if (hu) {
        logger.debug("检测玩家可以风一色");
        ret = hu;
    }

    return ret;
}

/**
 *
 * @param pai == null表示摸牌后检测胡牌 否则表示别人打牌后检测胡牌
 */
pro.checkHu = function(pai,isGang) {
 //   logger.debug("胡牌之前判断:");

    var isRet = false;

    //胡牌可选数组 多种胡是叠加关系
    this.huChoice = [];
    if (pai != null) {
        this.addPai(pai,"noSync");
    }
    logger.debug("准备判断胡牌");
    this.debugPai();
    var reaPai = pai;
    //如果没有牌或者检测听牌则都拿最后一个自己摸到的牌判断
    if (reaPai == null || reaPai == undefined){
        reaPai = this.paiLast;
    }

    var qiangGangCanHu = false;

    if (this.checkDaHu(reaPai)) { //检测是否大胡

        if (this.isBuPaiHu == true && this.kaiKouScoreCanHu(true,true,true)){
            //杠开时没有平胡
            this.delPingHu();
            this.huChoice.push({type:WuHanHuType.GangKaiHua, pais:[reaPai]});
            logger.debug("玩家大胡,并且补牌胡！");
            isRet = true;

        }else if (this.IsHaiDi == 1 && this.kaiKouScoreCanHu(true,true,true)){
            //杠开时没有平胡
            this.delPingHu();
            this.huChoice.push({type:WuHanHuType.HaiDiLaoYue, pais:[reaPai]});
            logger.debug("玩家大胡,并且海底捞月！");
            isRet = true;

        }else if(this.kaiKouScoreCanHu(true,false)){
            logger.debug("玩家有大胡牌型,并且能胡");
            isRet = true;
        }else{
            logger.debug("玩家有大胡牌型,但番娄不够");
            this.huChoice = [];
        }

        qiangGangCanHu = true;
    }
    else if(this.isBuPaiHu == true && this.CheckPING_HU(true))//补牌胡是大胡,也要2，5，8做将
    {
        if(this.kaiKouScoreCanHu(true,false,true))
        {
            this.delPingHu();
            this.huChoice.push({type:WuHanHuType.GangKaiHua, pais:[reaPai]});
            logger.debug("玩家可以补牌胡:%j", this.paiLast);
            isRet = true;

        }else{
            logger.debug("补牌胡，但番数不够");
        }

    }else if(this.IsHaiDi == 1 && this.CheckPING_HU(true))//补牌胡是大胡,也要2，5，8做将
    {
        if(this.kaiKouScoreCanHu(true,false,true))
        {
            this.delPingHu();
            this.huChoice.push({type:WuHanHuType.HaiDiLaoYue, pais:[reaPai]});
            logger.debug("玩家可以海底捞胡:%j", this.paiLast);
            isRet = true;

        }else{
            logger.debug("海底捞，但番数不够");
        }

    }
    else if (this.CheckPING_HU(true)) { //检测是否平胡
        if(this.laiZiNum > 1)
        {
            logger.debug("屁胡赖子不能大于1个");
        }else if(this.kaiKouScoreCanHu(false,false))
        {
            this.huChoice.push({type:WuHanHuType.PingHu, pais:[reaPai]});
            logger.debug("玩家可以平胡，最后手牌  :%j", this.paiLast);
            isRet = true;

        }else{
            logger.debug("屁胡不够6番，不能胡牌");
        }

        qiangGangCanHu = true;
    }

    if(qiangGangCanHu && isGang)
    {
        logger.debug("玩家可以抢杠胡 %j pai %j ",this.uid,reaPai);
        this.huChoice.push({type:WuHanHuType.QiangGangHu, pais:[reaPai]});
        isRet = true;
    }

    logger.debug("胡牌类型显示111:%j",this.huChoice);
    // 删除别人的牌
    if (pai != null) {
        this.delPai(pai);
    }

    return isRet;
}

pro.checkHu_GSH = function(pai1, pai2) {  // 检查杠上花  参数是补张的两张牌

    logger.debug("玩家開缸檢測UID：" + this.uid);
    logger.debug("玩家开杠监测杠上花1:%j", pai1);
    logger.debug("玩家开杠监测杠上花2:%j", pai2);

    var isRet1 = false, isRet2  = false;
    //胡牌可选数组 多种胡是叠加关系
    this.huChoice = [];

    // 判断补张的第一张牌是否胡牌
    this.addPai(pai1);
    if (this.checkDaHu(pai1)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡checkHu_GSH");
        isRet1 = true;
    } else if (this.CheckPING_HU(true)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡checkHu_GSH");
        isRet1 = true;
    }
    if (pai1 != null) {
        this.delPai(pai1);
    }
    if (isRet1) {
        this.huChoice.push({type: WuHanHuType.GangKaiHua, pais: [pai1]});
    }

    return isRet1;
    //可能牌桌只有一个牌了 那么杠开也只能一个牌了
    if (pai2 == null || pai2 == undefined){
        logger.debug("杠牌 pai2没有了");
        return isRet1;
    }
    // 判断补张的第二张牌是否胡牌
    this.addPai(pai2);
    if (this.checkDaHu(pai2)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡checkHu_GSH 2");
        isRet2 = true;
    } else if (this.CheckPING_HU(true)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡checkHu_GSH 2");
        isRet2 = true;
    }
    if (pai2 != null) {
        this.delPai(pai2);
    }
    if (isRet2) {
        this.huChoice.push({type: WuHanHuType.GangKaiHua, pais: [pai2]});
    }
    if (isRet1 == true || isRet2 == true){
        return true;
    }
    return false;
}

pro.checkHu_GSP = function(pai1, pai2) {  // 检查杠上炮  参数是别人补张的两张牌
    var isRet1 = false, isRet2  = false;
    //胡牌可选数组 多种胡是叠加关系
    this.huChoice = [];
    logger.debug("玩家杠上炮檢測UID：" + this.uid);
    logger.debug("玩家开杠监测杠上泡1:%j", pai1);
    logger.debug("玩家开杠监测杠上泡2:%j", pai2);
    // 判断补张的第一张牌是否胡牌
    this.addPai(pai1);
    if (this.checkDaHu(pai1)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡checkHu_GSP");
        isRet1 = true;
    } else if (this.CheckPING_HU(true)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡checkHu_GSP");
        isRet1 = true;
    }
    if (pai1 != null) {
        this.delPai(pai1);
    }
    if (isRet1) {
        this.huChoice.push({type: WuHanHuType.GangShangPao, pais:[pai1]});
    }

    if (pai2 == null || pai2 == undefined){
        logger.debug("杠牌2 pai2没有了");
        return isRet1;
    }
    //判断补张的第二张牌是否胡牌
    this.addPai(pai2);
    if (this.checkDaHu(pai2)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡checkHu_GSP 2");
        isRet2 = true;
    } else if (this.CheckPING_HU(true)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡checkHu_GSP 2");
        isRet2 = true;
    }
    if (pai2 != null) {
        this.delPai(pai2);
    }

    if (isRet2) {
        this.huChoice.push({type: WuHanHuType.GangShangPao, pais:[pai2]});
    }

    if (isRet1 == true || isRet2 == true){
        return true;
    }

    return false;
}

//抢杠胡 只有自己碰的牌 再开杠才可以抢
pro.checkHu_QGH = function(pai, isGang){
    if (!isGang)
        return false;

    if(!this.kaiKouScoreCanHu(true,true,true)){
        logger.debug('当前玩家番数不够！');
        return false;
    }

    logger.debug("检测玩家抢杠胡");
    this.huChoice = [];
    var isRet = false;
    this.addPai(pai);

    if (this.checkDaHu(pai)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡");
        isRet = true;
    } else if (this.CheckPING_HU(false)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡2");
        isRet = true;
    }
    if (pai != null) {
        this.delPai(pai);
    }

    if (isRet == true) {
        this.huChoice.push({type: WuHanHuType.QiangGangHu, pais:[pai]});
        return true;
    }

    return false;
}

pro.CheckHu_HDLY = function(pai, isLast) { // 海底捞月
    if (!isLast)
        return false;

    if(!this.kaiKouScoreCanHu(true,true,true)){
        logger.debug('当前玩家番数不够！');
        return false;
    }

    this.huChoice = [];
    if (pai != null) {
        this.addPai(pai);
    }
    var isRet = false;
    this.debugPai();
    if (this.checkDaHu(pai)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡");
        isRet = true;
    } else if (this.CheckPING_HU(true)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡3");
        isRet = true;
    }
    if (isRet == true) { //检测是否平胡
        this.huChoice.push({type:WuHanHuType.HaiDiLaoYue, pais:[pai]});
    }
    // 删除别人的牌
    if (pai != null) {
        this.delPai(pai);
    }
    return isRet;
}

pro.CheckHu_HDP = function(pai, isLast) { // 海底炮
    if (!isLast)
        return false;
    this.huChoice = [];
    if (pai != null) {
        this.addPai(pai);
    }
    var isRet = false;
    this.debugPai();
    if (this.checkDaHu(pai)) { //检测是否大胡
        logger.debug("检测到玩家可以大胡");
        isRet = true;
    } else if (this.CheckPING_HU(true)) { //检测是否平胡
        logger.debug("检测到玩家可以小胡4");
        isRet = true;
    }
    if (isRet == true) {
        this.huChoice.push({type:WuHanHuType.HaiDiPao, pais:[pai]});
    }
    // 删除别人的牌
    if (pai != null) {
        this.delPai(pai);
    }
    return isRet;
}

pro.CheckD4X_HU = function() { //检测是否大四喜
    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {
        var pais = this.paiQi[types[i]];
        var len = pais.length;
        if (len >= 4) {
            for (var j=0; j<len-3; j++) {
                if (this.CheckAAAAPai(pais[j].value, pais[j+1].value, pais[j+2].value, pais[j+3].value)) {
                    this.tianhuChoice.push({type:ChangShaTianHuType.DaSiXi, pais:[pais[j], pais[j], pais[j], pais[j]]});
                    return true;
                }
            }
        }
    }

    return false;
}

pro.CheckBB_HU = function() { //检测是否板板胡
    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {
        var pais = this.paiQi[types[i]];
        for (var j=0; j<pais.length; j++) {
            if (pais[j].value == 2 || pais[j].value == 5 || pais[j].value == 8)
                return false;
        }
    }

    var pais = [];
    for (var i=0; i<types.length; i++) {
        for (var j=0; j<this.paiQi[types[i]].length; j++) {
            pais.push(this.paiQi[types[i]][j]);
        }
    }

    this.tianhuChoice.push({type:ChangShaTianHuType.BanBanHu, pais:pais});
    return true;
}

pro.CheckQue1S_HU = function() { //检测是否缺一色
    var count = 0;
    if (this.paiQi['W'].length == 0)
        count++;
    if (this.paiQi['T'].length == 0)
        count++;
    if (this.paiQi['B'].length == 0)
        count++;

    if (count > 0) {
        var types = ['W','T','B'];
        var pais = [];
        for (var i=0; i<types.length; i++) {
            for (var j=0; j<this.paiQi[types[i]].length; j++) {
                pais.push(this.paiQi[types[i]][j]);
            }
        }

        this.tianhuChoice.push({type:ChangShaTianHuType.QueYiSe, pais:pais});
        return true;
    }

    return false;
}

pro.Check66S_HU = function() { //检测是否六六顺
    var count = 0;
    var types = ['W','T','B'];
    var pais = [];
    for (var i=0; i<types.length; i++) {
        var len = this.paiQi[types[i]].length;
        if (len >= 3) {
            for (var j=0; j<len-2; j++) {
                if (this.paiQi[types[i]][j].value == this.paiQi[types[i]][j+1].value
                    && this.paiQi[types[i]][j].value == this.paiQi[types[i]][j+2].value) {
                    pais.push(this.paiQi[types[i]][j]);
                    pais.push(this.paiQi[types[i]][j]);
                    pais.push(this.paiQi[types[i]][j]);
                    count++;
                    j+=2;
                }
            }
        }
    }

    if (count >= 2) {
        this.tianhuChoice.push({type:ChangShaTianHuType.LiuLiuShun, pais:pais});
        return true;
    }

    return false;
}

pro.CheckPP_HU = function(pai) { //检测是否碰碰胡
    //var types = ['W', 'B', 'T'];
    //// var jiangNum = 0;
    //var result = false;
    //
    //// 手中每个牌对应的张数
    //var paiData = [[0,0,0,0,0,0,0,0,0], //W
    //                [0,0,0,0,0,0,0,0,0], // B
    //                [0,0,0,0,0,0,0,0,0]]; // T
    //
    //for (var i=0; i<types.length; i++) {
    //    if (this.paiChi[types[i]].length > 0) // 有吃牌 不满足鹏鹏胡
    //        return false;
    //
    //    for (var j=0; j<this.paiQi[types[i]].length;j++) {
    //        var pai1 = this.paiQi[types[i]][j];
    //        paiData[i][pai1.value-1]++;
    //    }
    //}
    //
    //var count1 = 0, count2 = 0;
    //for (var i=0; i<types.length; i++) {
    //    for (var j=0; j<9; j++) {
    //        if (paiData[i][j] == 2)
    //            count2++;
    //        else if (paiData[i][j] == 1)
    //            count1++;
    //    }
    //}
    //
    //if (this.laiZiNum == 0 && count1 == 0 && count2 == 1) { // 没癞子 必须只有一个对子
    //    result = true;
    //} else if (this.laiZiNum == 1) {
    //    if (count1 == 1 && count2 == 0) // 单牌只有1张并且没有对子
    //        result = true;
    //    else if (count1 == 0 && count2 == 2) // 没有单牌 但有两个对子
    //        result = true;
    //} else if (this.laiZiNum == 2) {
    //    if (count1 == 0 && count2 == 0) // 没有单牌也没有对子 癞子做对子
    //        result = true;
    //    else if (count1 == 1 && count2 == 1) // 1个单牌并且1个对子
    //        result = true;
    //    else if (count1 == 0 && count2 == 3) // 没有单牌并且3个对子
    //        result = true;
    //} else if (this.laiZiNum == 3) {
    //    if (count1 == 0 && count2 == 1) // 没有单牌并且只有1个对子 癞子做碰
    //        result = true;
    //    else if (count1 == 1 && count2 == 2) // 1个单牌并且2个对子
    //        result = true;
    //    else if (count1 == 2 && count2 == 0) // 2个单牌并且1个对子
    //        result = true;
    //    else if (count1 == 0 && count2 == 4) // 没有单牌并且4个对子
    //        result = true;
    //} else if (this.laiZiNum == 4) {
    //    if (count1 == 0 && count2 == 2) // 没有单牌并且有2个对子 2个癞子分别做碰 一对癞子做将
    //        result = true;
    //    else if (count1 == 0 && count2 == 5) // 没有单牌并且5个对子
    //        result = true;
    //    else if (count1 == 1 && count2 == 0) // 1个单牌 没有个对子 3个癞子做碰 1个做将
    //        result = true;
    //    else if (count1 == 1 && count2 == 3) // 1个单牌并且3个对子
    //        result = true;
    //    else if (count1 == 2 && count2 == 1) // 2个单牌并且1个对子
    //        result = true;
    //}

    var types = ['W', 'B', 'T', 'F', 'J'];
    // var jiangNum = 0;
    var result = false;

    // 手中每个牌对应的张数
    var paiData = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0], //W
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // B
        [0, 0, 0, 0, 0, 0, 0, 0, 0],// T
        [0, 0, 0, 0, 0, 0, 0, 0, 0], //F
        [0, 0, 0, 0, 0, 0, 0, 0, 0] //J
    ];

    for (var i=0; i<types.length; i++) {
        if (this.paiChi[types[i]].length > 0) // 有吃牌 不满足鹏鹏胡
            return false;


        for (var j = 0; j < this.paiQi[types[i]].length; j++) {
            var pai1 = this.paiQi[types[i]][j];

            paiData[i][pai1.value - 1]++;
        }
    }

    var count1 = 0, count2 = 0;
    for (var i=0; i<types.length; i++) {
        for (var j=0; j<9; j++) {
            if (paiData[i][j] == 2)
                count2++;
            else if (paiData[i][j] == 1)
                count1++;
        }
    }

    if (this.laiZiNum == 0 && count1 == 0 && count2 == 1) { // 没癞子 必须只有一个对子
        result = true;
    } else if (this.laiZiNum == 1) {
        if (count1 == 1 && count2 == 0) // 单牌只有1张并且没有对子
            result = true;
        else if (count1 == 0 && count2 == 2) // 没有单牌 但有两个对子
            result = true;
    } else if (this.laiZiNum == 2) {
        if (count1 == 0 && count2 == 0) // 没有单牌也没有对子 癞子做对子
            result = true;
        else if (count1 == 1 && count2 == 1) // 1个单牌并且1个对子
            result = true;
        else if (count1 == 0 && count2 == 3) // 没有单牌并且3个对子
            result = true;
    } else if (this.laiZiNum == 3) {
        if (count1 == 0 && count2 == 1) // 没有单牌并且只有1个对子 癞子做碰
            result = true;
        else if (count1 == 1 && count2 == 2) // 1个单牌并且2个对子
            result = true;
        else if (count1 == 2 && count2 == 0) // 2个单牌并且1个对子
            result = true;
        else if (count1 == 0 && count2 == 4) // 没有单牌并且4个对子
            result = true;
    } else if (this.laiZiNum == 4) {
        if (count1 == 0 && count2 == 2) // 没有单牌并且有2个对子 2个癞子分别做碰 一对癞子做将
            result = true;
        else if (count1 == 0 && count2 == 5) // 没有单牌并且5个对子
            result = true;
        else if (count1 == 1 && count2 == 0) // 1个单牌 没有个对子 3个癞子做碰 1个做将
            result = true;
        else if (count1 == 1 && count2 == 3) // 1个单牌并且3个对子
            result = true;
        else if (count1 == 2 && count2 == 1) // 2个单牌并且1个对子
            result = true;
    }

    if (result){
        if(!this.isHuExist(WuHanHuType.PengPengHu))
            this.huChoice.push({type:WuHanHuType.PengPengHu, pais:[pai]});
    }
    return result;
}

pro.CheckJJ_HU = function(pai) { //检测是否将将胡

    var types = ['F','J'];

    for(var i = 0;i < types.length; i++)
    {
        var pais = this.paiChi[types[i]];
        if(pais.length > 0){
            return false;
        }

        pais = this.paiPeng[types[i]];
        if(pais.length > 0){
            return false;
        }

        pais = this.paiGang[types[i]];
        if(pais.length > 0){
            return false;
        }

        pais = this.paiQi[types[i]];
        if(pais.length > 0){
            return false;
        }
    }





    types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {
        var pais = this.paiChi[types[i]];
        for (var j=0; j<pais.length; j++) {
            if (pais[j].value != 2 && pais[j].value != 5 && pais[j].value != 8){
                //logger.debug("CheckJJ_HU1:%j", pais[j]);
                return false;
            }

        }

        pais = this.paiPeng[types[i]];
        for (var j=0; j<pais.length; j++) {
            if (pais[j].value != 2 && pais[j].value != 5 && pais[j].value != 8){
                //logger.debug("CheckJJ_HU2:%j", pais[j]);
                return false;
            }
        }

        pais = this.paiGang[types[i]];
        for (var j=0; j<pais.length; j++) {
            if (pais[j].pai.value != 2 && pais[j].pai.value != 5 && pais[j].pai.value != 8){
                //logger.debug("CheckJJ_HU3:%j", pais[j]);
                return false;
            }
        }

        pais = this.paiQi[types[i]];
        for (var j=0; j<pais.length; j++) {
            if (pais[j].value != 2 && pais[j].value != 5 && pais[j].value != 8){
                //logger.debug("CheckJJ_HU4:%j", pais[j]);
                return false;
            }
        }
    }
    if(!this.isHuExist(WuHanHuType.JiangJiangHu))
        this.huChoice.push({type:WuHanHuType.JiangJiangHu, pais:[pai]});

    return true;
}

pro.CheckQing1S_HU = function(pai) { //检测是否清一色
    var count = 0;
    var types = ['W','T','B','F','J'];
    for (var i=0; i<types.length; i++) {
        if (this.paiQi[types[i]].length == 0 && this.paiChi[types[i]].length == 0 && this.paiPeng[types[i]].length == 0 && this.paiGang[types[i]].length == 0)
            count++;
    }

    var count2 = 0
    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {
        if (this.paiQi[types[i]].length == 0 && this.paiChi[types[i]].length == 0 && this.paiPeng[types[i]].length == 0 && this.paiGang[types[i]].length == 0)
            count2++;
    }

    //风一色，也算是清一色
    if ((count == 4 || count2 == 3) && this.CheckPING_HU(false)) { // 只有一种花色有牌
        this.huChoice.push({type:WuHanHuType.QingYiSe, pais:[pai]});
        return true;
    }

    return false;
}

pro.Check7D_HU = function(pai) { // 检测是七对
    var singleNum = 0;
    var doubleNum = 0;
    var threeNum = 0;
    var quadNum = 0;

    // 手中每个牌对应的张数
    var paiData = [[0,0,0,0,0,0,0,0,0], //W
        [0,0,0,0,0,0,0,0,0], // B
        [0,0,0,0,0,0,0,0,0]]; // T

    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {
        var pais = this.paiQi[types[i]];
        var len = pais.length;

        for (var j=0; j<this.paiQi[types[i]].length;j++) {
            var _pai = this.paiQi[types[i]][j];
            paiData[i][_pai.value-1]++;
        }

        for (var j=0; j<9;j++) {
            if (paiData[i][j] == 1)
                singleNum++;
            else if (paiData[i][j] == 2)
                doubleNum++;
            else if (paiData[i][j] == 3)
                threeNum++;
            else if (paiData[i][j] == 4) {
                quadNum++;
                doubleNum+=2;
            }
        }
    }

    if (this.laiZiNum == 1) {
        if (singleNum == 1) {
            singleNum--;
            doubleNum++;
        } else if (threeNum == 1) {
            threeNum--;
            doubleNum+=2;
            quadNum++;
        }
    } else if (this.laiZiNum == 2) {
        if (singleNum == 2) {
            singleNum-=2;
            doubleNum+=2;
        } else if (threeNum == 2) {
            threeNum-=2;
            doubleNum+=4;
            quadNum+=2;
        } else if (singleNum == 1 && threeNum == 1) {
            singleNum--;
            doubleNum+=3;
            threeNum--;
            quadNum++;
        } else {
            doubleNum++;
            quadNum++;
        }
    } else if (this.laiZiNum == 3) {
        if (singleNum == 1 && threeNum == 0) {
            singleNum--;
            doubleNum+=2;
            quadNum++;
        } else if (singleNum == 2 && threeNum == 1) {
            singleNum-=2;
            threeNum--;
            doubleNum+=3;
            quadNum++;
        } else if (singleNum == 3) {
            singleNum-=3;
            doubleNum+=3;
        } else if (threeNum == 3) {
            threeNum-=3;
            doubleNum+=6;
            quadNum+=3;
        } else if (threeNum == 2 && singleNum == 1) {
            threeNum-=2;
            singleNum--;
            doubleNum+=5;
            quadNum+=2;
        } else if (threeNum == 1 && singleNum == 0) {
            threeNum--;
            doubleNum+=2;
            quadNum++;
        }
    } else if (this.laiZiNum == 4) {
        if (singleNum == 0 && threeNum == 4) {
            threeNum-=4;
            doubleNum+=8;
            quadNum+=4;
        } else if (singleNum == 1 && threeNum == 1) {
            singleNum--;
            threeNum--;
            doubleNum+=3;
            quadNum++;
        } else if (singleNum == 1 && threeNum == 3) {
            singleNum--;
            threeNum-=3;
            doubleNum+=7;
            quadNum+=3;
        } else if (singleNum == 2 && threeNum == 0) {
            singleNum-=2;
            doubleNum+=3;
            quadNum++;
        } else if (singleNum == 2 && threeNum == 2) {
            singleNum-=2;
            threeNum-=2;
            doubleNum+=6;
            quadNum+=2;
        } else if (singleNum == 3 && threeNum == 1) {
            singleNum-=3;
            threeNum--;
            doubleNum+=5;
            quadNum++;
        } else  if (singleNum == 4 && threeNum == 0) {
            singleNum-=4;
            doubleNum+=4;
        } else if (threeNum == 2 && singleNum == 0) {
            threeNum-=2;
            doubleNum+=4;
            quadNum+=2;
        } else if (threeNum == 3 && singleNum == 1) {
            threeNum-=3;
            singleNum--;
            doubleNum+=7;
            quadNum+=3;
        } else if (threeNum == 4 && singleNum == 0) {
            threeNum-=4;
            doubleNum+=4;
            quadNum+=8;
        } else {
            doubleNum+=2;
            quadNum+=2;
        }
    }

    if (singleNum == 0 && threeNum == 0 && doubleNum == 7) {
        if (quadNum == 3)
        {
            if (!this.isHuExist(WuHanHuType.QiXiaoDui3)){
                this.huChoice.push({type:WuHanHuType.QiXiaoDui3, pais:[pai]});
            }
        }
        else if (quadNum == 2)
        {
            if (!this.isHuExist(WuHanHuType.QiXiaoDui2)){
                this.huChoice.push({type:WuHanHuType.QiXiaoDui2, pais:[pai]});
            }
        }
        else if (quadNum == 1)
        {
            if (!this.isHuExist(WuHanHuType.QiXiaoDui1)){
                this.huChoice.push({type:WuHanHuType.QiXiaoDui1, pais:[pai]});
            }
        }
        else
        {
            if (!this.isHuExist(WuHanHuType.QiXiaoDui)){
                this.huChoice.push({type:WuHanHuType.QiXiaoDui, pais:[pai]});
            }

        }

        return true;
    }

    return false;
}

pro.CheckQQR_HU = function(pai) {

    if(this.table.LastOP["lastUid"] == this.uid){
        logger.debug("全求人不能是自摸");
        return false;
    }

    if(this.anGangScore(true) > 0 ){
        logger.debug("全求人不能有暗杠");
        return false;
    }

    var count = 0;
    var total = 0;
    var types = ['W','T','B','J','F'];
    for (var i=0; i<types.length; i++) {
        var pais = this.paiQi[types[i]];
        total += pais.length;
        if (total > 2) return false; // 如果多于两张牌肯定不是全求人

        if (pais.length == 2 && pais[0].value == pais[1].value) {
            count++;

            if(!this.checkJiang(pais[0])){
                logger.debug("全求人必须258做将! %j",pais[0]);
                return false;
            }
        }
    }

    if (total == 2 && count == 1 && this.laiZiNum == 0) {
        if(!this.isHuExist(WuHanHuType.QuanQiuRen))
            this.huChoice.push({type:WuHanHuType.QuanQiuRen, pais:[pai]});
        return true;
    } else if (total == 1 && this.laiZiNum == 1)
    {
        for (var i=0; i<types.length; i++) {
            var pais = this.paiQi[types[i]];
            if(pais.length == 1 && this.checkJiang(pais[0])){
                if(!this.isHuExist(WuHanHuType.QuanQiuRen)){
                    this.huChoice.push({type:WuHanHuType.QuanQiuRen, pais:[pai]});
                }

                return true;
            }
        }

    }

    return false;
}
//cxp 风一色
pro.CheckFengYiSe_HU = function(pai) {

    //检测是否清一色
    // logger.debug("检查清一色:%d",count);
    var count = 0;
    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {
        if (this.paiQi[types[i]].length == 0 && this.paiChi[types[i]].length == 0 && this.paiPeng[types[i]].length == 0 && this.paiGang[types[i]].length == 0)
            count++;
    }

    if (count == 3) // 只有 F J
    {
        if(this.isHuExist(WuHanHuType.QingYiSe))
        {
            this.delHuType(WuHanHuType.QingYiSe);
        }
        this.huChoice.push({type:WuHanHuType.FengYiSe, pais:[pai]});
        return true;
    }

    return false;
}

//门清 全靠自己 并且是自摸
pro.CheckMenQing = function(pai){
    var isMenQing = false;
    var delNum = 0;
    var paiCount = this.paiNumber();
    if (paiCount >= 13){
        isMenQing = true;
    }
    if(isMenQing == false){
        for (var i = 0; i < this.paiDest.length; i++){
            var paiDest = this.paiDest[i];
            if (paiDest.type == "gang" && paiDest.origin == 1){
                delNum += 3;
            }
        }
        if (paiCount + delNum >= 13){
            isMenQing = true;
        }
    }
    if (isMenQing){
        //删除掉小胡自摸
        var temPai = pai;
        for(var i = 0; i < this.huChoice.length; i++){
            if (this.huChoice[i].type == WuHanHuType.PingHu){
                temPai = this.huChoice[i].pais[0];
                this.huChoice.splice(i,1);
                break;
            }
            if (this.huChoice[i].pais[0].type != temPai.type || this.huChoice[i].pais[0].value != temPai.value){
                temPai = this.huChoice[i].pais[0];
            }
        }
        this.huChoice.push({type:WuHanHuType.MenQing, pais:[temPai]});
    }
}

//检测是否胡牌（张）
pro.CheckAAPai= function(val1, val2)
{
    if (val1 == val2) return true;
    return false;
}

//检测是否三连张
pro.CheckABCPai= function(val1, val2, val3)
{
    if ((val1 == (val2 - 1)) && (val2 == (val3 - 1))) return true;
    return false;
}

//检测是否三重张
pro.CheckAAAPai= function(val1, val2, val3)
{
    if (val1 == val2 && val2 == val3) return true;
    return false;
}

//检测是否四重张
pro.CheckAAAAPai= function(val1, val2, val3, val4)
{
    if (val1 == val2 && val2 == val3 && val3 == val4) return true;
    return false;
}

//检测是否三连对 11 22 33
pro.CheckAABBCCPai= function(val1, val2, val3, val4, val5, val6)
{
    if (val1 == val2 && val3 == val4 && val5 == val6){
        if ((val1 == val3-1) && (val3 == val5-1)){
            return true;
        }
    }
    return false;
}

//检测是否两连顺 1 22 33 4
pro.CheckABBCCDPai = function(val1, val2, val3, val4, val5, val6)
{
    if (val1 == val2-1 && val2 == val3 && val4 == val3+1 && val4 == val5 && val6 == val5+1)
    {
        return true;
    }
    return false;
}

//检测是否三连高压 111 222 333
pro.CheckAAABBBCCCPai= function(val1, val2, val3, val4, val5, val6, val7, val8, val9)
{
    if ((val1 == val2 && val2 == val3) && (val4 == val5 && val5 == val6) && (val7 == val8 && val8 == val9))
    {
        if ((val1 == val4-1) && (val4 == val7-1))
        {
            return true;
        }
    }
    return false;
}

//检测是否三连刻 1111 2222 3333
pro.CheckAAAABBBBCCCCPai= function(val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11, val12)
{
    if ((val1 == val2 && val2 == val3 && val3 == val4)
        && (val5 == val6 && val6 == val7 && val7 == val8)
        && (val9 == val10 && val10 == val11 && val11 == val12))
    {
        if ((val1 == val5-1) && (val5 == val9-1))
        {
            return true;
        }
    }
    return false;
}

//检测是否六连对 11 22 33 44 55 66
pro.CheckAABBCCDDEEFFPai= function(val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11, val12)
{
    if (val1 == val2 && val3 == val4 && val5 == val6 && val7 == val8 && val9 == val10 && val11 == val12)
    {
        if ((val1 == val3-1) && (val3 == val5-1) && (val5 == val7-1) && (val7 == val9-1) && (val9 == val11-1))
        {
            return true;
        }
    }
    return false;
}

//检测是否胡牌（张）
pro.Check3Pai= function(val1, val2, val3) {
    if (this.CheckABCPai(val1,val2,val3)) return true;
    if (this.CheckAAAPai(val1, val2, val3)) return true;
    return false;
}

//检测是否胡牌（张）
pro.Check6Pai= function(val1, val2, val3, val4, val5, val6) {
    if (this.Check3Pai(val1, val2, val3) && this.Check3Pai(val4, val5, val6)) return true;
    //三连对
    if (this.CheckAABBCCPai(val1, val2, val3, val4, val5, val6)) return true;
    //两连顺
    if (this.CheckABBCCDPai(val1, val2, val3, val4, val5, val6)) return true;
    //第一张牌四连张
    if (this.CheckAAAAPai(val2, val3, val4, val5))
    {
        if (this.CheckABCPai(val1, val2, val6)) return true;
    }
    return false;
}

//检测是否胡牌（张）
pro.Check9Pai= function(val1, val2, val3, val4, val5, val6, val7, val8, val9) {
    if (this.CheckABCPai(val1, val2, val3) && this.Check6Pai(val4, val5, val6, val7, val8, val9)) return true;
    if (this.CheckAAAPai(val1, val2, val3) && this.Check6Pai(val4, val5, val6, val7, val8, val9)) return true;
    if (this.CheckABCPai(val7, val8, val9) && this.Check6Pai(val1, val2, val3, val4, val5, val6)) return true;
    if (this.CheckAAAPai(val7, val8, val9) && this.Check6Pai(val1, val2, val3, val4, val5, val6)) return true;
    /* 344555667*/
    if (val1 + 1 == val2 && val2 == val3 && val3 + 1 == val4 && val4 == val5 && val5 == val6 && val6 + 1 == val7 && val7 == val8 && val8 + 1 == val9) return true;
    /* 122233344*/
    if (this.CheckABCPai(val1, val2, val5) && this.Check6Pai(val3, val4, val6, val7, val8, val9)) return true;
    /* 112223334*/
    if (this.CheckABCPai(val1, val3, val6) && this.Check6Pai(val2, val4, val5, val7, val8, val9)) return true;

    return false;
}

//检测是否胡牌（张）
pro.Check12Pai= function(val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11, val12) {
    if(this.CheckABCPai(val1, val2, val3) && this.Check9Pai(val4, val5, val6, val7, val8, val9, val10, val11, val12)) return true;
    if(this.CheckAAAPai(val1, val2, val3) && this.Check9Pai(val4, val5, val6, val7, val8, val9, val10, val11, val12)) return true;
    if(this.CheckABCPai(val10, val11, val12) && this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val8, val9)) return true;
    if(this.CheckAAAPai(val10, val11, val12) && this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val8, val9)) return true;
    if(this.Check6Pai(val1, val2, val3, val4, val5, val6) && this.Check6Pai(val7, val8, val9, val10, val11, val12)) return true;

    return false;
}

//检测是否胡牌（张）
pro.Check5Pai = function(val1, val2, val3, val4, val5)
{
    //如果是左边两个为将，右边为三重张或三连张
    if (this.CheckAAPai(val1, val2))
    {
        this.jiangValue = val1;
        if (this.Check3Pai(val3, val4, val5))
            return true;
    }
    //如果中间两个为将 12223
    if (this.CheckAAAPai(val2, val3, val4))
    {
        if (this.CheckABCPai(val1, val4, val5)) {
            this.jiangValue = val2;
            return true;
        }
    }
    //如果是左边两个为将，右边为三重张或三连张
    if (this.CheckAAPai(val4, val5))
    {
        this.jiangValue = val4;
        if(this.Check3Pai(val1, val2, val3))
            return true;
    }

    this.jiangValue = 0;
    return false;
}

//检测是否胡牌（张）
pro.Check8Pai = function(val1, val2, val3, val4, val5, val6, val7, val8)
{
    //如果是左边两个为将，右边为三重张或三连张
    if (this.CheckAAPai(val1, val2))
    {
        this.jiangValue = val1;
        if (this.Check6Pai(val3, val4, val5, val6, val7, val8))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val2, val3, val4))
    {
        this.jiangValue = val2;
        if (this.CheckABCPai(val1, val4, val5) && this.Check3Pai(val6, val7, val8))
            return true;
    }

    //如果是中间两个为将，左右边为三重张或三连张
    if (this.CheckAAPai(val4, val5))
    {
        this.jiangValue = val4;
        if(this.Check3Pai(val1, val2, val3) && this.Check3Pai(val6, val7, val8))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val5, val6, val7))
    {
        this.jiangValue = val5;
        if (this.CheckABCPai(val4, val5, val8) && this.Check3Pai(val1, val2, val3))
            return true;
    }

    //如果是右边两个为将，左边为三重张或三连张
    if (this.CheckAAPai(val7, val8))
    {
        this.jiangValue = val7;
        if (this.Check6Pai(val1, val2, val3, val4, val5, val6))
            return true;
    }

    //12222334     45566667 两种类型处理
    if (this.CheckAAPai(val2, val3))
    {
        this.jiangValue = val2;
        if (this.Check6Pai(val1, val4, val5, val6, val7, val8))
            return true;
    }
    if (this.CheckAAPai(val6, val7))
    {
        this.jiangValue = val6;
        if (this.Check6Pai(val1, val2, val3, val4, val5, val8))
            return true;
    }
    //44555566
    if (this.CheckAAPai(val4, val5))
    {
        this.jiangValue = val4;
        if (this.Check6Pai(val1, val2, val3, val6, val7, val8))
            return true;
    }
    if (this.CheckAAPai(val3, val4))
    {
        this.jiangValue = val3;
        if (this.Check6Pai(val1, val2, val5, val6, val7, val8))
            return true;
    }
    if (this.CheckAAPai(val5, val6))
    {
        this.jiangValue = val5;
        if (this.Check6Pai(val1, val2, val3, val4, val7, val8))
            return true;
    }

    this.jiangValue = 0;
    return false;
}

//检测是否胡牌（张）
pro.Check11Pai = function(val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11)
{
    //如果是左边两个为将
    if (this.CheckAAPai(val1, val2))
    {
        this.jiangValue = val1;
        if (this.Check9Pai(val3, val4, val5, val6, val7, val8, val9, val10, val11))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val2, val3, val4))
    {
        this.jiangValue = val2;
        if (this.CheckABCPai(val1, val4, val5) && this.Check6Pai(val6, val7, val8, val9, val10, val11))
            return true;
    }

    //如果是中间两个为将
    if (this.CheckAAPai(val4, val5))
    {
        this.jiangValue = val4;
        if (this.Check3Pai(val1, val2, val3) && this.Check6Pai(val6, val7, val8, val9, val10, val11))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val5, val6, val7))
    {
        this.jiangValue = val5;
        if (this.CheckABCPai(val4, val5, val8) && this.Check3Pai(val1, val2, val3) && this.Check3Pai(val9, val10, val11))
            return true;
    }

    //如果是右边两个为将
    if (this.CheckAAPai(val7, val8))
    {
        this.jiangValue = val7;
        if (this.Check3Pai(val9, val10, val11) && this.Check6Pai(val1, val2, val3, val4, val5, val6))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val8, val9, val10))
    {
        this.jiangValue = val8;
        if (this.CheckABCPai(val7, val8, val11) && this.Check6Pai(val1, val2, val3, val4, val5, val6))
            return true;
    }

    //如果是右边两个为将
    if (this.CheckAAPai(val10, val11))
    {
        this.jiangValue = val10;
        if (this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val8, val9))
            return true;
    }

    //优化
    if (this.CheckAAPai(val2, val3))
    {
        this.jiangValue = val2;
        if (this.Check9Pai(val1, val4, val5, val6, val7, val8, val9, val10, val11))
            return true;
    }
    if (this.CheckAAPai(val3, val4))
    {
        this.jiangValue = val3;
        if (this.Check9Pai(val1, val2, val5, val6, val7, val8, val9, val10, val11))
            return true;
    }
    if (this.CheckAAPai(val5, val6))
    {
        this.jiangValue = val5;
        if (this.Check9Pai(val1, val2, val3, val4, val7, val8, val9, val10, val11))
            return true;
    }
    if (this.CheckAAPai(val6, val7))
    {
        this.jiangValue = val6;
        if (this.Check9Pai(val1, val2, val3, val4, val5, val8, val9, val10, val11))
            return true;
    }
    if (this.CheckAAPai(val8, val9))
    {
        this.jiangValue = val8;
        if (this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val10, val11))
            return true;
    }
    if (this.CheckAAPai(val9, val10))
    {
        this.jiangValue = val9;
        if (this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val8, val11))
            return true;
    }

    this.jiangValue = 0;
    return false;
}

//检测是否胡牌（张）
pro.Check14Pai = function(val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11, val12, val13, val14)
{
    //如果是左边两个为将，右边为三重张或三连张
    if (this.CheckAAPai(val1, val2))
    {
        this.jiangValue = val1;
        if (this.Check12Pai(val3, val4, val5, val6, val7, val8, val9, val10, val11, val12, val13, val14))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val2, val3, val4))
    {
        this.jiangValue = val2;
        if (this.CheckABCPai(val1, val4, val5) && this.Check9Pai(val6, val7, val8, val9, val10, val11, val12, val13, val14))
            return true;
    }

    //如果是中间两个为将，左右边为三重张或三连张
    if (this.CheckAAPai(val4, val5))
    {
        this.jiangValue = val4;
        if (this.Check3Pai(val1, val2, val3) &&
            this.Check9Pai(val6, val7, val8, val9, val10, val11, val12, val13, val14))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val5, val6, val7))
    {
        this.jiangValue = val5;
        if (this.CheckABCPai(val4, val5, val8) && this.Check3Pai(val1, val2, val3) && this.Check6Pai(val9, val10, val11, val12, val13, val14))
            return true;
    }

    //如果是中间两个为将，左右边为三重张或三连张
    if (this.CheckAAPai(val7, val8))
    {
        this.jiangValue = val7;
        if (this.Check6Pai(val1, val2, val3, val4, val5, val6) &&
            this.Check6Pai(val9, val10, val11, val12, val13, val14))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val8, val9, val10))
    {
        this.jiangValue = val8;
        if (this.CheckABCPai(val7, val8, val11) && this.Check6Pai(val1, val2, val3, val4, val5, val6) && this.Check3Pai(val12, val13, val14))
            return true;
    }

    //如果是中间两个为将，左右边为三重张或三连张
    if (this.CheckAAPai(val10, val11))
    {
        this.jiangValue = val10;
        if (this.Check3Pai(val12, val13, val14) &&
            this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val8, val9))
            return true;
    }

    //如果中间两个为将
    if (this.CheckAAAPai(val11, val12, val13))
    {
        this.jiangValue = val11;
        if (this.CheckABCPai(val10, val11, val14) && this.Check9Pai(val1, val2, val3, val4, val5, val6, val7, val8, val9))
            return true;
    }

    //如果是右边两个为将，左右边为三重张或三连张
    if (this.CheckAAPai(val13, val14))
    {
        this.jiangValue = val13;
        if (this.Check12Pai(val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11, val12))
            return true;
    }

    this.jiangValue = 0;
    return false;
}

pro.CheckD3Y_HU = function() { //检查大三元
    //中发白三杠
    if(this.paiGang['J'].size() == 12)
    {
        //将牌
        var types = ['J','F','W','T','B', 'H'];
        for (var i=0; i<6; i++) {
            if(this.paiQi[types[i]].length == 2)
            {
                //如果是将
                if(this.paiQi[types[i]][0] == this.paiQi[types[i]][1])
                    return true;
            }
        }
    }
    return false;
}

pro.CheckL1S_HU = function() { //检测绿一色
    //只准有发财和条
    if (this.paiQi['F'].length > 0) return false;
    if (this.paiQi['W'].length > 0) return false;
    if (this.paiQi['B'].length > 0) return false;
    if (this.paiQi['H'].length > 0) return false;
    if (this.paiChi['F'].length > 0) return false;
    if (this.paiChi['W'].length > 0) return false;
    if (this.paiChi['B'].length > 0) return false;
    if (this.paiChi['H'].length > 0) return false;
    if (this.paiPeng['F'].length > 0) return false;
    if (this.paiPeng['W'].length > 0) return false;
    if (this.paiPeng['B'].length > 0) return false;
    if (this.paiPeng['H'].length > 0) return false;
    if (this.paiGang['F'].length > 0) return false;
    if (this.paiGang['W'].length > 0) return false;
    if (this.paiGang['B'].length > 0) return false;
    if (this.paiGang['H'].length > 0) return false;

    //对发财
    var types = ['J','F','W','T','B', 'H'];
    if(this.paiQi['J'].length == 2)
    {
        if(this.paiQi['J'][0] == 1 && this.paiQi['J'][1] == 1)
        {
            for (var i=1; i<6; i++)
            {
                if (types[i] == 'T') continue;
                if (this.paiQi[types[i]].length > 0) return false;
                if (this.paiChi[types[i]].length > 0) return false;
                if (this.paiPeng[types[i]].length > 0) return false;
                if (this.paiGang[types[i]].length > 0) return false;
            }

            //吃
            var len = this.paiChi['T'].length;
            if (len > 0)
            {
                for(var i=0; i<len; i++)
                {
                    if(this.paiChi['T'][i].value == 1) return false;
                    if(this.paiChi['T'][i].value == 5) return false;
                    if(this.paiChi['T'][i].value == 7) return false;
                    if(this.paiChi['T'][i].value == 9) return false;
                }
            }
            //碰
            len = this.paiPeng['T'].length;
            if (len > 0)
            {
                for(var i=0; i<len; i++)
                {
                    if(this.paiPeng['T'][i].value == 1) return false;
                    if(this.paiPeng['T'][i].value == 5) return false;
                    if(this.paiPeng['T'][i].value == 7) return false;
                    if(this.paiPeng['T'][i].value == 9) return false;
                }
            }
            //杠
            len = this.paiGang['T'].length;
            if (len > 0)
            {
                for(var i=0; i<len; i++)
                {
                    if(this.paiGang['T'][i].pai.value == 1) return false;
                    if(this.paiGang['T'][i].pai.value == 5) return false;
                    if(this.paiGang['T'][i].pai.value == 7) return false;
                    if(this.paiGang['T'][i].pai.value == 9) return false;
                }
            }
            //起
            len = this.paiQi['T'].length;
            if (len > 0)
            {
                for(var i=0; i<len; i++)
                {
                    if(this.paiQi['T'][i].value == 1) return false;
                    if(this.paiQi['T'][i].value == 5) return false;
                    if(this.paiQi['T'][i].value == 7) return false;
                    if(this.paiQi['T'][i].value == 9) return false;
                }
            }
        }
    }
    else
    {
        return false;
    }

    //如果有三张
    if (this.paiQi['T'].length == 3)
    {
        if (this.Check3Pai(this.paiQi['T'][0].value,this.paiQi['T'][1].value,this.paiQi['T'][2].value)) return true;
    }
    //如果有六张
    if (this.paiQi['T'].length == 6)
    {
        if (this.Check6Pai(this.paiQi['T'][0].value,this.paiQi['T'][1].value,this.paiQi['T'][2].value,this.paiQi['T'][3].value,this.paiQi['T'][4].value,this.paiQi['T'][5].value)) return true;
    }
    //九张
    if (this.paiQi['T'].length == 9)
    {
        if(this.Check9Pai(this.paiQi['T'][0].value,this.paiQi['T'][1].value,this.paiQi['T'][2].value,this.paiQi['T'][3].value,this.paiQi['T'][4].value,this.paiQi['T'][5].value,this.paiQi['T'][6].value,this.paiQi['T'][7].value,this.paiQi['T'][8].value)) return true;
    }
    //十二张
    if (this.paiQi['T'].length == 12)
    {
        if(this.Check12Pai(this.paiQi['T'][0].value,this.paiQi['T'][1].value,this.paiQi['T'][2].value,this.paiQi['T'][3].value,this.paiQi['T'][4].value,this.paiQi['T'][5].value,this.paiQi['T'][6].value,this.paiQi['T'][7].value,this.paiQi['T'][8].value,this.paiQi['T'][9].value,this.paiQi['T'][10].value,this.paiQi['T'][11].value)) return true;
    }

    return  false;
}

//检测是否是四杠
pro.Check4Gang_HU= function()
{
    var size = 0;
    var types = ['J', 'F', 'W', 'T', 'B', 'H'];
    for (var i=0; i<6; i++)
    {
        size += this.gangPai[types[i]].length;
    }

    if(size == 16)
    {
        //将牌
        for (var i=0; i<6; i++)
        {
            //如果是将
            if(this.CheckAAPai(this.paiQi[types[i]][0].value,this.paiQi[types[i]][1].value))
            {
                return true;
            }
        }

    }
    return false;
}

//检测是否连七对
pro.CheckL7D_HU= function()
{
    var types = ['J', 'F', 'W', 'T', 'B', 'H'];
    for (var i=2; i<5; i++)
    {
        if (this.paiQi[types[i]].length == 14)
        {
            if(this.paiQi[types[i]][0].value==1 && this.paiQi[types[i]][1].value==1 && this.paiQi[types[i]][2].value==2 && this.paiQi[types[i]][3].value==2
                && this.paiQi[types[i]][4].value==3 && this.paiQi[types[i]][5].value==3 && this.paiQi[types[i]][6].value==4 && this.paiQi[types[i]][7].value==4
                && this.paiQi[types[i]][8].value==5 && this.paiQi[types[i]][9].value==5 && this.paiQi[types[i]][10].value==6 && this.paiQi[types[i]][11].value==6
                && this.paiQi[types[i]][12].value==7&& this.paiQi[types[i]][13].value==7)
            {
                return true;
            }
            if(this.paiQi[types[i]][0].value==2 && this.paiQi[types[i]][1].value==2 && this.paiQi[types[i]][2].value==3 && this.paiQi[types[i]][3].value==3
                && this.paiQi[types[i]][4].value==4 && this.paiQi[types[i]][5].value==4 && this.paiQi[types[i]][6].value==5 && this.paiQi[types[i]][7].value==5
                && this.paiQi[types[i]][8].value==6 && this.paiQi[types[i]][9].value==6 && this.paiQi[types[i]][10].value==7 && this.paiQi[types[i]][11].value==7
                && this.paiQi[types[i]][12].value==8 && this.paiQi[types[i]][13].value==8)
            {
                return true;
            }
            if(this.paiQi[types[i]][0].value==3 && this.paiQi[types[i]][1].value==3 && this.paiQi[types[i]][2].value==4 && this.paiQi[types[i]][3].value==4
                && this.paiQi[types[i]][4].value==5 && this.paiQi[types[i]][5].value==5 && this.paiQi[types[i]][6].value==6 && this.paiQi[types[i]][7].value==6
                && this.paiQi[types[i]][8].value==7 && this.paiQi[types[i]][9].value==7 && this.paiQi[types[i]][10].value==8 && this.paiQi[types[i]][11].value==8
                && this.paiQi[types[i]][12].value==9 && this.paiQi[types[i]][13].value==9)
            {
                return true;
            }
        }
    }

    return false;
}

//检测是否胡十三幺
pro.Chekc13Y_HU= function()
{
    if (this.is13Y)
    {
        var types = ['J', 'F', 'W', 'T', 'B', 'H'];
        var i13YSize = [];
        for (var i=0; i<13; i++)
        {
            i13YSize[i] = false;
        }
        //中发白
        for (var i=0; i<this.paiQi[types[0]].length; i++)
        {
            if (this.paiQi[types[0]][i].value==1)
            {
                i13YSize[0]=true;
            }
            if (this.paiQi[types[0]][i].value==2)
            {
                i13YSize[1]=true;
            }
            if (this.paiQi[types[0]][i].value==3)
            {
                i13YSize[2]=true;
            }
        }
        //东南西北风
        for (var i=0; i<this.paiQi[types[1]].length; i++)
        {
            if(this.paiQi[types[1]][i].value==1)
            {
                i13YSize[3]=true;
            }
            if(this.paiQi[types[1]][i].value==2)
            {
                i13YSize[4]=true;
            }
            if(this.paiQi[types[1]][i].value==3)
            {
                i13YSize[5]=true;
            }
            if(this.paiQi[types[1]][i].value==4)
            {
                i13YSize[6]=true;
            }
        }

        //一九万
        for (var i=0; i<this.paiQi[types[2]].length; i++)
        {
            if(this.paiQi[types[2]][i].value==1)
            {
                i13YSize[7]=true;
            }
            if(this.paiQi[types[2]][i].value==9)
            {
                i13YSize[8]=true;
            }
        }

        //一九条
        for (var i=0; i<this.paiQi[types[3]].length; i++)
        {
            if(this.paiQi[types[3]][i].value==1)
            {
                i13YSize[9]=true;
            }
            if(this.paiQi[types[3]][i].value==9)
            {
                i13YSize[10]=true;
            }
        }

        //一九饼
        for (var i=0; i<this.paiQi[types[4]].length; i++)
        {
            if(this.paiQi[types[4]][i].value==1)
            {
                i13YSize[11]=true;
            }
            if(this.paiQi[types[4]][i].value==9)
            {
                i13YSize[12]=true;
            }
        }

        var count = 0;
        for (var i=0 ; i<13; i++)
        {
            if (i13YSize[i])
                count++;
        }

        if (count == 13) return true;
    }
    return false;
}

pro.checkJiang = function(pai) { //检测是否2,5,8做将

    if(pai == undefined || pai == null)
    {
        if ((this.jiangType != 'J' && this.jiangType != 'F') && (this.jiangValue == 2 || this.jiangValue == 5 || this.jiangValue == 8))
            return true;

    }else if ((pai.type != 'J' && pai.type != 'F') && (pai.value == 2 || pai.value == 5 || pai.value == 8))
    {
            return true;
    }


    return false;
}

pro.CheckPING_HU = function(jiang258) { //检测平胡

    if(!this.check_hu_before()){
        return false;
    }

    var jiangNum = 0;
    this.jiangValue = 0;
    this.majhong.jiang258 = jiang258;

    var huInfo = {};
    if (!this.majhong.checkHu(this.laiZiPai, this.laiZiNum, huInfo))
        return false;
    else {
        this.jiangType = huInfo['jiang'].type;
        this.jiangValue = huInfo['jiang'].value;
        logger.debug('jiangPai:', this.jiangType+this.jiangValue);
        jiangNum = 1;
    }

    if (jiang258 && jiangNum == 1 && this.checkJiang()) {
        return true;
    } else if (!jiang258 && jiangNum == 1) {
        return true;
    } else if (this.jiangType == this.laiZiPai.type && this.jiangValue == this.laiZiPai.value)
        return true;

    return false;

    // var iSize = this.paiQi['J'].length;
    // if (iSize > 0)
    // {
    //     //中发白
    //     if (iSize == 2)
    //     {
    //         if (!this.CheckAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             this.jiangValue = this.paiQi['J'][0].value;
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 3)
    //     {
    //         if(!this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 5)
    //     {
    //         if(this.CheckAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value)
    //             && this.CheckAAAPai(this.paiQi['J'][2].value, this.paiQi['J'][3].value, this.paiQi['J'][4].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][0].value;
    //             jiangNum++;
    //         }
    //         else if(this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value)
    //             && this.CheckAAPai(this.paiQi['J'][3].value, this.paiQi['J'][4].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][3].value;
    //             jiangNum++;
    //         }
    //         else
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 8)
    //     {
    //         if(this.CheckAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value)
    //             && this.CheckAAAPai(this.paiQi['J'][2].value, this.paiQi['J'][3].value, this.paiQi['J'][4].value)
    //             && this.CheckAAAPai(this.paiQi['J'][5].value, this.paiQi['J'][6].value, this.paiQi['J'][7].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][0].value;
    //             jiangNum++;
    //         }
    //         else if(this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value)
    //             && this.CheckAAPai(this.paiQi['J'][3].value, this.paiQi['J'][4].value)
    //             && this.CheckAAAPai(this.paiQi['J'][5].value, this.paiQi['J'][6].value, this.paiQi['J'][7].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][3].value;
    //             jiangNum++;
    //         }
    //         else if(this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value)
    //             && this.CheckAAAPai(this.paiQi['J'][3].value, this.paiQi['J'][4].value, this.paiQi['J'][5].value)
    //             && this.CheckAAPai(this.paiQi['J'][6].value, this.paiQi['J'][7].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][6].value;
    //             jiangNum++;
    //         }
    //         else
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 11)
    //     {
    //         if (this.CheckAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value)
    //             && this.CheckAAAPai(this.paiQi['J'][2].value, this.paiQi['J'][3].value, this.paiQi['J'][4].value)
    //             && this.CheckAAAPai(this.paiQi['J'][5].value, this.paiQi['J'][6].value, this.paiQi['J'][7].value)
    //             && this.CheckAAAPai(this.paiQi['J'][8].value, this.paiQi['J'][9].value, this.paiQi['J'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][0].value;
    //             jiangNum++;
    //         }
    //         else if (this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value)
    //             && this.CheckAAPai(this.paiQi['J'][3].value, this.paiQi['J'][4].value)
    //             && this.CheckAAAPai(this.paiQi['J'][5].value, this.paiQi['J'][6].value, this.paiQi['J'][7].value)
    //             && this.CheckAAAPai(this.paiQi['J'][8].value, this.paiQi['J'][9].value, this.paiQi['J'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][3].value;
    //             jiangNum++;
    //         }
    //         else if (this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value)
    //             && this.CheckAAAPai(this.paiQi['J'][3].value, this.paiQi['J'][4].value, this.paiQi['J'][5].value)
    //             && this.CheckAAPai(this.paiQi['J'][6].value, this.paiQi['J'][7].value)
    //             && this.CheckAAAPai(this.paiQi['J'][8].value, this.paiQi['J'][9].value, this.paiQi['J'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][6].value;
    //             jiangNum++;
    //         }
    //         else if (this.CheckAAAPai(this.paiQi['J'][0].value, this.paiQi['J'][1].value, this.paiQi['J'][2].value)
    //             && this.CheckAAAPai(this.paiQi['J'][3].value, this.paiQi['J'][4].value, this.paiQi['J'][5].value)
    //             && this.CheckAAAPai(this.paiQi['J'][6].value, this.paiQi['J'][7].value, this.paiQi['J'][8].value)
    //             && this.CheckAAPai(this.paiQi['J'][9].value, this.paiQi['J'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['J'][9].value;
    //             jiangNum++;
    //         }
    //         else
    //         {
    //             return false;
    //         }
    //     }
    //     else
    //     {
    //         return false;
    //     }
    // }
    //
    // //东南西北
    // iSize = this.paiQi['F'].length;
    // if (iSize > 0)
    // {
    //     if (iSize == 2)
    //     {
    //         if (!this.CheckAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             this.jiangValue = this.paiQi['F'][0].value;
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 3)
    //     {
    //         if(!this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 5)
    //     {
    //         if(this.CheckAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value)
    //             && this.CheckAAAPai(this.paiQi['F'][2].value, this.paiQi['F'][3].value, this.paiQi['F'][4].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][0].value;
    //             jiangNum++;
    //         }
    //         else if(this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value)
    //             && this.CheckAAPai(this.paiQi['F'][3].value, this.paiQi['F'][4].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][3].value;
    //             jiangNum++;
    //         }
    //         else
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 8)
    //     {
    //         if(this.CheckAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value)
    //             && this.CheckAAAPai(this.paiQi['F'][2].value, this.paiQi['F'][3].value, this.paiQi['F'][4].value)
    //             && this.CheckAAAPai(this.paiQi['F'][5].value, this.paiQi['F'][6].value, this.paiQi['F'][7].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][0].value;
    //             jiangNum++;
    //         }
    //         else if(this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value)
    //             && this.CheckAAPai(this.paiQi['F'][3].value, this.paiQi['F'][4].value)
    //             && this.CheckAAAPai(this.paiQi['F'][5].value, this.paiQi['F'][6].value, this.paiQi['F'][7].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][3].value;
    //             jiangNum++;
    //         }
    //         else if(this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value)
    //             && this.CheckAAAPai(this.paiQi['F'][3].value, this.paiQi['F'][4].value, this.paiQi['F'][5].value)
    //             && this.CheckAAPai(this.paiQi['F'][6].value, this.paiQi['F'][7].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][6].value;
    //             jiangNum++;
    //         }
    //         else
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 11)
    //     {
    //         if (this.CheckAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value)
    //             && this.CheckAAAPai(this.paiQi['F'][2].value, this.paiQi['F'][3].value, this.paiQi['F'][4].value)
    //             && this.CheckAAAPai(this.paiQi['F'][5].value, this.paiQi['F'][6].value, this.paiQi['F'][7].value)
    //             && this.CheckAAAPai(this.paiQi['F'][8].value, this.paiQi['F'][9].value, this.paiQi['F'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][0].value;
    //             jiangNum++;
    //         }
    //         else if (this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value)
    //             && this.CheckAAPai(this.paiQi['F'][3].value, this.paiQi['F'][4].value)
    //             && this.CheckAAAPai(this.paiQi['F'][5].value, this.paiQi['F'][6].value, this.paiQi['F'][7].value)
    //             && this.CheckAAAPai(this.paiQi['F'][8].value, this.paiQi['F'][9].value, this.paiQi['F'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][3].value;
    //             jiangNum++;
    //         }
    //         else if (this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value)
    //             && this.CheckAAAPai(this.paiQi['F'][3].value, this.paiQi['F'][4].value, this.paiQi['F'][5].value)
    //             && this.CheckAAPai(this.paiQi['F'][6].value, this.paiQi['F'][7].value)
    //             && this.CheckAAAPai(this.paiQi['F'][8].value, this.paiQi['F'][9].value, this.paiQi['F'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][6].value;
    //             jiangNum++;
    //         }
    //         else if (this.CheckAAAPai(this.paiQi['F'][0].value, this.paiQi['F'][1].value, this.paiQi['F'][2].value)
    //             && this.CheckAAAPai(this.paiQi['F'][3].value, this.paiQi['F'][4].value, this.paiQi['F'][5].value)
    //             && this.CheckAAAPai(this.paiQi['F'][6].value, this.paiQi['F'][7].value, this.paiQi['F'][8].value)
    //             && this.CheckAAPai(this.paiQi['F'][9].value, this.paiQi['F'][10].value))
    //         {
    //             this.jiangValue = this.paiQi['F'][9].value;
    //             jiangNum++;
    //         }
    //         else
    //         {
    //             return false;
    //         }
    //     }
    //     else
    //     {
    //         return false;
    //     }
    // }
    //
    // //万
    // iSize = this.paiQi['W'].length;
    // if (iSize > 0)
    // {
    //     if (iSize == 2)
    //     {
    //         if (!this.CheckAAPai(this.paiQi['W'][0].value, this.paiQi['W'][1].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //             this.jiangValue = this.paiQi['W'][0].value;
    //         }
    //     }
    //     else if (iSize == 3)
    //     {
    //         if (!this.CheckAAAPai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value))
    //         {
    //             if (!this.CheckABCPai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value))
    //             {
    //                 return false;
    //             }
    //         }
    //     }
    //     else if(iSize == 5)
    //     {
    //         if(!this.Check5Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if( iSize == 6)
    //     {
    //         if (!this.Check6Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value, this.paiQi['W'][5].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 8)
    //     {
    //         if (!this.Check8Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value, this.paiQi['W'][5].value, this.paiQi['W'][6].value, this.paiQi['W'][7].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 9)
    //     {
    //         if (!this.Check9Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value, this.paiQi['W'][5].value, this.paiQi['W'][6].value, this.paiQi['W'][7].value, this.paiQi['W'][8].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 11)
    //     {
    //         if(!this.Check11Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value, this.paiQi['W'][5].value, this.paiQi['W'][6].value, this.paiQi['W'][7].value, this.paiQi['W'][8].value, this.paiQi['W'][9].value, this.paiQi['W'][10].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 12)
    //     {
    //         if(!this.Check12Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value, this.paiQi['W'][5].value, this.paiQi['W'][6].value, this.paiQi['W'][7].value, this.paiQi['W'][8].value, this.paiQi['W'][9].value, this.paiQi['W'][10].value, this.paiQi['W'][11].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 14)
    //     {
    //         if(!this.Check14Pai(this.paiQi['W'][0].value, this.paiQi['W'][1].value, this.paiQi['W'][2].value, this.paiQi['W'][3].value, this.paiQi['W'][4].value, this.paiQi['W'][5].value, this.paiQi['W'][6].value, this.paiQi['W'][7].value, this.paiQi['W'][8].value, this.paiQi['W'][9].value, this.paiQi['W'][10].value, this.paiQi['W'][11].value, this.paiQi['W'][12].value, this.paiQi['W'][13].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else
    //     {
    //         return false;
    //     }
    // }
    //
    // //条
    // iSize = this.paiQi['T'].length;
    // if (iSize > 0)
    // {
    //     if (iSize == 2)
    //     {
    //         if (!this.CheckAAPai(this.paiQi['T'][0].value, this.paiQi['T'][1].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++
    //             this.jiangValue = this.paiQi['T'][0].value;
    //         }
    //     }
    //     else if (iSize == 3)
    //     {
    //         if (!this.CheckAAAPai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value))
    //         {
    //             if (!this.CheckABCPai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value))
    //             {
    //                 return false;
    //             }
    //         }
    //     }
    //     else if(iSize == 5)
    //     {
    //         if(!this.Check5Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if( iSize == 6)
    //     {
    //         if (!this.Check6Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value, this.paiQi['T'][5].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 8)
    //     {
    //         if (!this.Check8Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value, this.paiQi['T'][5].value, this.paiQi['T'][6].value, this.paiQi['T'][7].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 9)
    //     {
    //         if (!this.Check9Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value, this.paiQi['T'][5].value, this.paiQi['T'][6].value, this.paiQi['T'][7].value, this.paiQi['T'][8].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 11)
    //     {
    //         if(!this.Check11Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value, this.paiQi['T'][5].value, this.paiQi['T'][6].value, this.paiQi['T'][7].value, this.paiQi['T'][8].value, this.paiQi['T'][9].value, this.paiQi['T'][10].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 12)
    //     {
    //         if(!this.Check12Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value, this.paiQi['T'][5].value, this.paiQi['T'][6].value, this.paiQi['T'][7].value, this.paiQi['T'][8].value, this.paiQi['T'][9].value, this.paiQi['T'][10].value, this.paiQi['T'][11].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 14)
    //     {
    //         if(!this.Check14Pai(this.paiQi['T'][0].value, this.paiQi['T'][1].value, this.paiQi['T'][2].value, this.paiQi['T'][3].value, this.paiQi['T'][4].value, this.paiQi['T'][5].value, this.paiQi['T'][6].value, this.paiQi['T'][7].value, this.paiQi['T'][8].value, this.paiQi['T'][9].value, this.paiQi['T'][10].value, this.paiQi['T'][11].value, this.paiQi['T'][12].value, this.paiQi['T'][13].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else
    //     {
    //         return false;
    //     }
    // }
    //
    // //饼
    // iSize = this.paiQi['B'].length;
    // if (iSize > 0)
    // {
    //     if (iSize == 2)
    //     {
    //         if (!this.CheckAAPai(this.paiQi['B'][0].value, this.paiQi['B'][1].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //             this.jiangValue = this.paiQi['B'][0].value;
    //         }
    //     }
    //     else if (iSize == 3)
    //     {
    //         if (!this.CheckAAAPai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value))
    //         {
    //             if (!this.CheckABCPai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value))
    //             {
    //                 return false;
    //             }
    //         }
    //     }
    //     else if(iSize == 5)
    //     {
    //         if(!this.Check5Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if( iSize == 6)
    //     {
    //         if (!this.Check6Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value, this.paiQi['B'][5].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 8)
    //     {
    //         if (!this.Check8Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value, this.paiQi['B'][5].value, this.paiQi['B'][6].value, this.paiQi['B'][7].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 9)
    //     {
    //         if (!this.Check9Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value, this.paiQi['B'][5].value, this.paiQi['B'][6].value, this.paiQi['B'][7].value, this.paiQi['B'][8].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 11)
    //     {
    //         if(!this.Check11Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value, this.paiQi['B'][5].value, this.paiQi['B'][6].value, this.paiQi['B'][7].value, this.paiQi['B'][8].value, this.paiQi['B'][9].value, this.paiQi['B'][10].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else if (iSize == 12)
    //     {
    //         if(!this.Check12Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value, this.paiQi['B'][5].value, this.paiQi['B'][6].value, this.paiQi['B'][7].value, this.paiQi['B'][8].value, this.paiQi['B'][9].value, this.paiQi['B'][10].value, this.paiQi['B'][11].value))
    //         {
    //             return false;
    //         }
    //     }
    //     else if (iSize == 14)
    //     {
    //         if(!this.Check14Pai(this.paiQi['B'][0].value, this.paiQi['B'][1].value, this.paiQi['B'][2].value, this.paiQi['B'][3].value, this.paiQi['B'][4].value, this.paiQi['B'][5].value, this.paiQi['B'][6].value, this.paiQi['B'][7].value, this.paiQi['B'][8].value, this.paiQi['B'][9].value, this.paiQi['B'][10].value, this.paiQi['B'][11].value, this.paiQi['B'][12].value, this.paiQi['B'][13].value))
    //         {
    //             return false;
    //         }
    //         else
    //         {
    //             jiangNum++;
    //         }
    //     }
    //     else
    //     {
    //         return false;
    //     }
    // }
    //
    // if (jiang258 && jiangNum == 1 && this.checkJiang()) {
    //     return true;
    // } else if (!jiang258 && jiangNum == 1) {
    //     return true;
    // }
    //
    // return false;
}

//检查是否可以听长沙专属做法
pro.checkTing1 = function(pai, isTing){
    //在已经是能杠的基础上判断是否可以听(桥塞子玩法)
    //杠分三种直接取值 this.gangChoice
    //origin  1暗杠  2 别人打的杠 3明杠
    //比如目前手上有 333 55 67 (这个时候是胡58)
    //暗杠 摸一个3上来的话那么把四个3都删除掉，手上就是55 67是可以听胡的
    //别人打的杠 别人打了一个3 那么参数pai是有值的，把自己手里三个3删除掉。手上就是55 67 可以听胡
    //明杠 去掉这个明杠换成任意一个牌判断是否可以胡牌

    var check = function(_this) {
        var result = false;
        var types = ['W','T','B'];
        var _pai = new PaiPool().genPai("W1");
        for (var i=0; i<3; i++) {
            for (var j=0; j<9; j++) {
                _pai.type = types[i];
                _pai.value = j + 1;

                logger.debug('pai:', _pai);
                logger.debug('laizi:', _this.laiZiPai);

                if (_pai.type == _this.laiZiPai.type && _pai.value == _this.laiZiPai.value)
                    _this.laiZiNum++;
                else
                    _this.addPai(_pai, "noSync");

                result = _this.checkDaHu(_pai);

                if (_pai.type == _this.laiZiPai.type && _pai.value == _this.laiZiPai.value)
                    _this.laiZiNum--;
                else
                    _this.delPai(_pai);

                if (result)
                    return true;
            }
        }

        return false;
    };


    var _checkHu = function (_this, huArr) {
        if (huArr.length == 0)
            return false;
        else {
            if (huArr.length == 34) // 胡任意牌
                return true;
            else {
                var huInfo = {};
                // 把所有能胡的牌放进去看看将牌是否满足258
                for (var i=0; i<huArr.length; i++) {
                    var _pai = _this.majhong._transformR(huArr[i]);
                    if (_pai.type == _this.laiZiPai.type && _pai.value == _this.laiZiPai.value)
                        _this.laiZiNum++;
                    else
                        _this.addPai(_pai, "noSync");

                    result = _this.CheckPING_HU(true);

                    if (_pai.type == _this.laiZiPai.type && _pai.value == _this.laiZiPai.value)
                        _this.laiZiNum--;
                    else
                        _this.delPai(_pai);

                    if (result)
                        return true;
                }
            }
        }

        return false;
    };

    var result = false;
    var huArr = [];
    this.tingChoice = [];
    this.majhong.jiang258 = true;

    for (var i=0; i<this.gangChoice.length; i++) {
        var gangChoice = this.gangChoice[i];
        logger.debug('杠:', gangChoice);
        if (gangChoice.origin == 1) { // 暗杠
            this.delPai(this.gangChoice[i].pai);
            this.delPai(this.gangChoice[i].pai);
            this.delPai(this.gangChoice[i].pai);
            this.delPai(this.gangChoice[i].pai);

            result = check(this);
            if (!result) {
                huArr = this.majhong._checkHuArr();
                logger.debug('暗杠听胡:', huArr);
                result = _checkHu(this, huArr);
            }

            this.addPai(this.gangChoice[i].pai, "noSync");
            this.addPai(this.gangChoice[i].pai, "noSync");
            this.addPai(this.gangChoice[i].pai, "noSync");
            this.addPai(this.gangChoice[i].pai, "noSync");
        } else if (gangChoice.origin == 2) { // 别人打的牌
            this.delPai(this.gangChoice[i].pai);
            this.delPai(this.gangChoice[i].pai);
            this.delPai(this.gangChoice[i].pai);

            result = check(this);
            if (!result) {
                huArr = this.majhong._checkHuArr();
                logger.debug('放炮听胡:', huArr);
                result = _checkHu(this, huArr);
            }

            this.addPai(this.gangChoice[i].pai, "noSync");
            this.addPai(this.gangChoice[i].pai, "noSync");
            this.addPai(this.gangChoice[i].pai, "noSync");
        } else if (gangChoice.origin == 3) { // 明杠
            this.delPai(this.gangChoice[i].pai);

            result = check(this);
            if (!result) {
                huArr = this.majhong._checkHuArr();
                logger.debug('明杠听胡:', huArr);
                result = _checkHu(this, huArr);
            }

            this.addPai(this.gangChoice[i].pai, "noSync");
        }

        break;
    }

    if (result)
        return true;

    return false;
}

pro.getVisiblePaiNum = function (self, pai) {
    var num = 0;

    if (self) {
        if (pai.type == this.laiZiPai.type && pai.value == this.laiZiPai.value)
            num += (this.laiZiNum);
        else {
            for (var i=0; i<this.paiQi[pai.type].length; i++) {
                if (this.paiQi[pai.type][i].value == pai.value){
                    num++;
                }
            }
        }
    }

    for (var i=0; i<this.paiChi[pai.type].length; i++) {
        if (this.paiChi[pai.type][i].value == pai.value){
            num++;
        }
    }
    for (var i=0; i<this.paiPeng[pai.type].length; i++) {
        if (this.paiPeng[pai.type][i].value == pai.value){
            num+=3;
            break;
        }
    }
    for (var i=0; i<this.paiChu.length; i++) {
        if (this.paiChu[i].type == pai.type && this.paiChu[i].value == pai.value){
            num++;
        }
    }

    return num;
}
// 检测是否听牌
pro.checkTing = function(isTing) {
    this.tingChoice = [];

    this.majhong.checkTing(this.laiZiPai, this.laiZiNum, this.tingChoice);

    if (this.laiZiNum > 0) {
        for (var i=0; i<this.tingChoice.length; i++) {
            if (this.tingChoice[i]['hu'].length >= 34) { // 胡所有牌
                this.tingChoice[i]['jin'] = 1;
                this.tingChoice[i]['hu'] = [];
            }
        }
    }
    logger.debug('TingChoice:', this.tingChoice);
    if (this.tingChoice.length > 0)
        return true;
    else
        return false;
}

//判断是否有这张牌
pro.checkHavePai = function(pai){
    for (var i=0; i<this.paiQi[pai.type].length; i++) {
        if (this.paiQi[pai.type][i].value == pai.value){
            //logger.debug("玩家有这个牌可以打出去:%j", pai);
            return true;
        }
    }
    if (this.isJinPai(pai) == true && this.laiZiNum > 0){
        logger.error("玩家打了金牌哦要做判断是不是双金以上了");
        return true;
    }

    if(this.isGdGangPai(pai) == true && this.isHaveGdGangPai() == true){
        logger.error('玩家打了固定杠牌，注意要补牌');
        return true;
    }


    logger.error("玩家没有这个牌哦:%j", pai);
    this.debugPai();
    return false;
}

//取出一张手牌
pro.getOnePai = function(){

    if (this.paiQi['B'].length > 0){
        for(var i=0; i<this.paiQi['B'].length; i++){
            if (this.paiQi['B'][i].value == 3){
                return this.paiQi['B'][i];
            }
        }
        return this.paiQi['B'][this.paiQi['B'].length - 1];
    }

    if (this.paiQi['W'].length > 0){
        for(var i=0; i<this.paiQi['W'].length; i++){
            if (this.paiQi['W'][i].value == 7){
                return this.paiQi['W'][i];
            }
        }
        return this.paiQi['W'][this.paiQi['W'].length - 1];
    }

    if (this.paiQi['T'].length > 0){
        return this.paiQi['T'][0];
    }

    if (this.paiQi['F'].length > 0){
        return this.paiQi['F'][0];
    }

    if (this.paiQi['J'].length > 0){
        return this.paiQi['J'][0];
    }

    logger.debug("Ai 没有牌可以打了！！！");
}
pro.paiNumber = function(){
    return this.paiQi['B'].length + this.paiQi['T'].length + this.paiQi['W'].length + this.paiQi['J'].length + this.paiQi['F'].length
        +this.paiHaveGdGang.length + this.laiZiNum;
}
pro.debugPai = function(message){
   // return;

//    if(this.isRobot == true){
//        return false;
//    }
    if(message != undefined){
        logger.debug('%j',message);
    }


    logger.debug("我的UID：%j , name=%j",this.uid,this.player.nickName);
    logger.debug("我的手牌数目:" + this.paiNumber() +  "  金牌数量:" + this.laiZiNum + "   固定杠牌数： " + this.paiHaveGdGang.length);
    logger.debug("我现在固定杠牌:%j", this.paiHaveGdGang);
    logger.debug("我现在的手牌:%j", this.paiQi);
    logger.debug("我现在已经开杠的固定杠牌",this.paiGdGang);

    if (!this.laiZiPai || this.laiZiPai == null ||this.laiZiPai.type==undefined){
        return;
    }

    for (var i=0; i<this.paiQi[this.laiZiPai.type].length; i++) {
        if (this.paiQi[this.laiZiPai.type][i].value == this.laiZiPai.value){
            logger.error("什么时候癞子牌进来啦?:%j", this.paiQi[this.laiZiPai.type][i]);
        }
    }
}

pro.CheckBuBuGao_HU = function() { //检测是否步步高 同一花色内有三个连着的对子11 22 33
    var types = ['W','T','B'];
    var pais = [];
    for (var p=0; p<types.length; p++) {
        var len = this.paiQi[types[p]].length;
        if (len >= 6) {
            for (var i = 0; i < len; i++){
                if (len - i < 6){
                    break;
                }
                if (this.CheckAABBCCPai(this.paiQi[types[p]][i].value,this.paiQi[types[p]][i+1].value,this.paiQi[types[p]][i+2].value,
                    this.paiQi[types[p]][i+3].value,this.paiQi[types[p]][i+4].value,this.paiQi[types[p]][i+5].value) == true){
                    var isRepeat = false;
                    for (var t = 0; t < pais.length; t++){
                        if (pais[t].type == this.paiQi[types[p]][i].type && pais[t].value == this.paiQi[types[p]][i].value){
                            isRepeat = true;
                            break;
                        }
                    }
                    if (isRepeat == false){
                        pais.push(this.paiQi[types[p]][i]);
                        this.tianhuChoice.push({type:ChangShaTianHuType.BuBuGao, pais:[this.paiQi[types[p]][i],
                            this.paiQi[types[p]][i+1],this.paiQi[types[p]][i+2],this.paiQi[types[p]][i+3],
                            this.paiQi[types[p]][i+4],
                            this.paiQi[types[p]][i+5]]});
                    }
                }
            }
        }
    }

    return;
}


pro.CheckJinTongYuNv_HU = function(){
    var types = ['T','B'];
    var count = [0,0];

    for (var p=0; p<types.length; p++){
        var len = this.paiQi[types[p]].length;
        for (var i = 0; i < len; i++){
            if (this.paiQi[types[p]][i].value == 2){
                count[p] += 1;
            }
        }
    }
    if (count[0]>=2 && count[1]>= 2){
        this.tianhuChoice.push({type:ChangShaTianHuType.JinTongYuNv, pais:
            [{type:'T',value: 2},{type:'T',value: 2},
            {type:'B',value: 2},{type:'B',value: 2}]});

        return true;
    }

    return false;
}

pro.CheckYiZhiHua_HU = function(){
    var types = ['T','B','W'];
    var count = 0;
    var noJiang = true;
    for (var p=0; p<types.length; p++){
        var len = this.paiQi[types[p]].length;

        //一枝花：某一色只有一张牌并且是5
        if (len == 1 && this.paiQi[types[p]][0].value == 5){
            var pais = [];
            for (var i=0; i<types.length; i++) {
                for (var j=0; j<this.paiQi[types[i]].length; j++) {
                    pais.push(this.paiQi[types[i]][j]);
                }
            }
            this.tianhuChoice.push({type:ChangShaTianHuType.YiZhiHua, pais:pais});
            return true;
        }
        //整首牌只有一个5  也算一枝花
        for(var t = 0; t < len; t++){
            if (this.paiQi[types[p]][t].value == 5){
                count += 1;
            }
            if (this.paiQi[types[p]][t].value == 2 || this.paiQi[types[p]][t].value == 8){
                noJiang = false;
            }
        }
    }
    logger.debug("一枝花判断:" + count);
    if (noJiang == true && count == 1){
        var pais = [];
        for (var i=0; i<types.length; i++) {
            for (var j=0; j<this.paiQi[types[i]].length; j++) {
                pais.push(this.paiQi[types[i]][j]);
            }
        }
        this.tianhuChoice.push({type:ChangShaTianHuType.YiZhiHua, pais:pais});
    }

    return false;
}
//三同
pro.CheckSanTong_HU = function(){
    var types = ['W','B','T'];
    // 手中每个牌对应的张数
    var paiData = [[0,0,0,0,0,0,0,0,0], //W
        [0,0,0,0,0,0,0,0,0], // B
        [0,0,0,0,0,0,0,0,0]]; // T

    logger.debug("三同333:%j",this.paiQi);
    for (var i=0; i<types.length; i++) {
        for (var j = 0; j < this.paiQi[types[i]].length; j++) {
            var pai1 = this.paiQi[types[i]][j];
            paiData[i][pai1.value - 1]++;
        }

    }
    logger.debug("三同222:%j",paiData);

    var temCount2=[];
    //for (var i=0; i<types.length; i++) {
    for (var j=0; j<9; j++) {
        if (paiData[0][j] >= 2 && paiData[1][j] >= 2 && paiData[2][j] >= 2)
        {
            var temPai1={type:types[0],value:j+1};
            var temPai2={type:types[1],value:j+1};
            var temPai3={type:types[2],value:j+1};
            temCount2.push(temPai1,temPai1,temPai2,temPai2,temPai3,temPai3);

        }


    }
    //}

    if(temCount2.length>0)
    {

        logger.debug("三同:%j",temCount2);
        this.tianhuChoice.push({type:ChangShaTianHuType.SanTong, pais:temCount2});
    }
    return;
}
//当前是否是金牌
pro.isJinPai = function(pai){
    if (pai.type == this.laiZiPai.type && pai.value == this.laiZiPai.value){
        return true;
    }
    return false;
}


//更新当前玩家金牌数量信息 由于金牌不能用来吃碰等操作所以把金牌单独拿出去保存不要影响paiQi
//但是paiQi里面的牌又要算金牌
pro.updateJinNumber = function(){
    if(this.table.Data.isLaiZi == 0) return;
    var laiziNum = 0;
    var laiziIdx = -1;
    var laiziPais = [];
    logger.debug("检测到手牌中有最新癞子数组1:");
    this.debugPai();
    for (var i=0; i<this.paiQi[this.laiZiPai.type].length; i++) {
        if (this.paiQi[this.laiZiPai.type][i].value == this.laiZiPai.value) {
            logger.debug("检测到新的金牌我原来的这个类型的牌:%j", this.paiQi[this.laiZiPai.type]);
            if (laiziIdx == -1){
                laiziIdx = i;
            }
            laiziNum++;
            this.laiZiNum++;
        }
    }
    if(laiziNum > 0){
        logger.debug("index:" + laiziIdx + "    Num:" + laiziNum);
        laiziPais = this.paiQi[this.laiZiPai.type].splice(laiziIdx, laiziNum);
        this.majhong.delPai(this.laiZiPai, laiziNum);
    }
    logger.debug("检测到手牌中有最新癞子数组2:%j", laiziPais);
    this.debugPai();
}

pro.updateLaiZi = function(){
    if(this.table.Data.isLaiZi == 0) return;
    this.laiZiPai = {};
    this.laiZiNum = 0;
    this.laiZiPai = this.table.jinPai;
    logger.debug("最新癞子牌:%j" , this.laiZiPai);
    this.updateJinNumber();
}

//获取当前玩家手牌 癞子玩法要把癞子加回去
pro.paiQiLai = function(){
    if (this.laiZiNum <= 0 && this.paiHaveGdGang.length <= 0){
        return this.paiQi;
    }

    var msgPai  = JSON.parse(JSON.stringify(this.paiQi));
    //logger.debug("paiQiLai111:%j",msgPai);
    //logger.debug("paiQiLai222:%j,数量%d", this.laiZiPai,this.laiZiNum);
    var pais = msgPai[this.laiZiPai.type];

    var found = false;
    for (var i=pais.length-1; i>=0; i--) {
        if (this.laiZiPai.value > pais[i].value) {
            if (this.laiZiNum == 1){
                pais.splice(i+1, 0, this.laiZiPai);
            }else if (this.laiZiNum == 2){
                pais.splice(i+1, 0, this.laiZiPai,this.laiZiPai);
            }else if (this.laiZiNum == 3){
                pais.splice(i+1, 0, this.laiZiPai,this.laiZiPai,this.laiZiPai);
            }
            else if (this.laiZiNum == 4){
                pais.splice(i+1, 0, this.laiZiPai,this.laiZiPai,this.laiZiPai,this.laiZiPai);
            }
            found = true;
            break;
        }
    }
    if (!found){
        if (this.laiZiNum == 1){
            pais.unshift(this.laiZiPai);
        }else if (this.laiZiNum == 2){
            pais.unshift(this.laiZiPai,this.laiZiPai);
        }else if (this.laiZiNum == 3){
            pais.unshift(this.laiZiPai,this.laiZiPai,this.laiZiPai);
        }
        else if (this.laiZiNum == 4){
            pais.unshift(this.laiZiPai,this.laiZiPai,this.laiZiPai,this.laiZiPai);
        }
    }

    for(var j = 0 ; j < this.paiHaveGdGang.length ; j++){
        var gdGang = this.paiHaveGdGang[j];
        var gdPais = msgPai[gdGang.type];
        gdPais.unshift(gdGang);
    }

    logger.debug("发给客户端的牌%j",msgPai);

    //logger.debug("paiQiLai:%j",msgPai);
    return msgPai;
}

//胡是否已经加入到 this.huChoice 中了
pro.isHuExist=function(huType)
{
    for(var idx=0;idx<this.huChoice.length;idx++)
    {
        if(this.huChoice[idx].type==huType)
        {
            return true;
        }
    }

    return false;
}
//有其他大胡时不要有平胡 除了门清
pro.HaveDaHuNoPingHu=function(){

    logger.debug("在有其他大胡情况，删除平胡:%j",this.huChoice);
    if(this.huChoice.length>=2)
    {
        if(this.huChoice.length == 2 && this.isHuExist(WuHanHuType.MenQing))
        {
            return;
        }
        for(var idx=0;idx<this.huChoice.length;idx++)
        {
            if( this.huChoice[idx].type==WuHanHuType.PingHu)
            {
                this.huChoice.splice(idx,1);

                break;
            }
        }
    }

    logger.debug("在有其他大胡情况，删除平胡后:%j",this.huChoice);

}
//================wuhan====================
pro.updateGdGang = function(){
    this.gdGangPai = [];
    this.gdGuangNum = 0;
    this.gdGangPai = this.table.gdGangPai;
    logger.debug("最新固定杠牌:%j" , this.gdGangPai);
    this.updateGdGangNumber();
}

pro.updateGdGangNumber = function(){
    if(this.table.Data.isLaiZi == 0) return;
    this.debugPai();
    logger.debug('刷新固定杠牌1');

    var haveGdArr = [];
    for(var i = 0; i<this.gdGangPai.length; i++)
    {
        var gdPai = this.gdGangPai[i];
        for(var j = 0;j<this.paiQi[gdPai.type].length;j++)
        {
            if(this.paiQi[gdPai.type][j].value == this.gdGangPai[i].value)
            {
                haveGdArr.push(this.paiQi[gdPai.type][j]);
            }
        }
    }

    for(var q = 0;q < haveGdArr.length;q++){
        //logger.debug("手牌里那些牌是固定杠牌:%j", haveGdArr[q]);
        this.paiHaveGdGang.push(haveGdArr[q]);
        this.delPai(haveGdArr[q]);
    }

    logger.debug("检测到手牌中有的固定杠:%j", this.paiHaveGdGang);
    this.debugPai();
}

pro.isGdGangPai = function(pai){
    for(var i=0 ; i<this.gdGangPai.length;i++){
        if (pai.type == this.gdGangPai[i].type && pai.value == this.gdGangPai[i].value){
            return true;
        }
    }
    return false;
}

pro.isHaveGdGangPai = function(){
    if(this.paiHaveGdGang.length > 0){
        return true;
    }
    return false;
}

pro.checkKaiKou = function(){

    if(this.yingKaiKouScore() > 0){
        logger.debug("%j 开口了，可以胡",this.uid);
        return true;
    }else{
        logger.debug("%j 没开口，不能胡",this.uid);
        return false;
    }
}

//固定杠是否开过口
pro.checkGdKaiKou = function(){
    if(this.paiGdGang.length > 0){
        return true;
    }else{
        return false;
    }
}

//没有开口或者还有固定杠牌，都不能胡
pro.check_hu_before = function(){
    var isRet = false;

    if(this.isHaveGdGangPai() > 0){
        logger.debug("还有固定杠，不能胡:%j",this.paiHaveGdGang);
        return isRet;
    }

    if(!this.checkKaiKou()){
        return false;
    }

    return true;
}

//当前番数能胡牌吗,isTeShu(海底，杠上花，抢杠胡，少一番)
pro.kaiKouScoreCanHu = function(isDahu,isTeShu,notZiMo){
    var minScore = 0;
    var haveZhuang = false;

    if(isDahu == true){
        minScore = this.daHuCanHuScore;
    }else{
        haveZhuang = true;
        minScore = this.piHuCanHuScore;
    }

    if(isTeShu == true){
        minScore -= 1;
    }

    var isRet = true;
    var myScore = this.kaiKouScore();
    if(haveZhuang && (this.table.bankerUid == this.uid)){
        myScore += 1;
        logger.debug("平胡庄多加一分");
    }
    //让手里没有赖子，是硬胡,加一番
    if(this.laiZiNum <= 0 || this.checkYuanLaiHu()){
        myScore += 1;
        logger.debug("硬胡多加一分");
    }

    if(!notZiMo && this.table.LastOP["lastUid"] == this.uid){
        logger.debug("自摸多加一分");
        myScore += 1;
    }


    logger.debug("玩家当前胡牌分:%j",myScore);
    for (var uid in this.table.playerUids){

        if(uid == this.uid){
            continue;
        }

        var otherScore = this.table.playerUids[uid].kaiKouScore();
        logger.debug("其它玩家胡牌分:%j = %j",uid,otherScore);
        //平胡，庄家要多输一番
        if(haveZhuang && (this.table.bankerUid == uid)){
            otherScore += 1;
            logger.error("平胡庄家要多输一番%j",otherScore);
        }
        //放炮的人要多加一翻
        if(this.table.LastOP["lastUid"] == uid){
            otherScore += 1;
            logger.error("放炮多加一番%j",otherScore);
        }


        if((myScore + otherScore) < minScore)
        {
            logger.debug("玩家跟%j之间分数为%j,小于最小番分%j ",uid,(myScore + otherScore),minScore);
            isRet = false;
            break;
        }
    }

    return isRet;
}

pro.delPingHu = function(){
    for(var idx=0;idx<this.huChoice.length;idx++)
    {
        if(this.huChoice[idx].type==WuHanHuType.PingHu)
        {
            this.huChoice.splice(idx,1);
            break;
        }
    }
}

//是否是 一 九的赖子
pro.isYiJiuLai = function(){

    var types = ['W','T','B'];
    for (var i=0; i<types.length; i++) {

        if (this.table.jinPai.type == types[i] && (this.table.jinPai.value == 1 || this.table.jinPai.value == 9)){

            return true;
        }
    }

    return false;

}

pro.delHuType = function(huType)
{
    for(var idx=0;idx<this.huChoice.length;idx++)
    {
        if(this.huChoice[idx].type==huType)
        {
            this.huChoice.splice(idx,1);
            return true;
        }
    }

    return false;
}

pro.paiLeiBaoPush = function(pai){
    if (pai == null || pai == undefined)
    {
        return;
    }

    for(var uid in this.table.recordLeiBao){
        if(this.table.recordLeiBao[uid] == true){
            if(this.paiLeiBao[uid] == undefined){
                this.paiLeiBao[uid] = [];
            }
            this.paiLeiBao[uid].push(pai);
            logger.debug("paiLeiBaoPush uid %j  leibaoUid %j  push %j",uid,this.uid,this.paiLeiBao[uid]);

        }
    }


    // logger.debug("我打出去的牌数目0:" + this.paiChu.length + "  UID:" + this.uid);
}

//赖子当做原生的牌
pro.checkYuanLaiHu = function(pai){

    var yinhu = false;
    logger.debug("pai %j",pai);

    var oldNum = this.laiZiNum;
    logger.debug("checkYuanLaiHu1 %j",this.laiZiNum);
    this.debugPai();
    this.laiZiNum = 0;
    for(var i=0 ; i<oldNum ;i++){
        var addJin = this.addPai(this.table.jinPai,true);
        logger.debug("addJIn %j   %j",addJin,this.table.jinPai);
    }

    if(!!pai){
        this.addPai(pai,true);

        logger.debug("addPai11 %j   %j",pai);
    }

    logger.debug("checkYuanLaiHu2 %j",this.laiZiNum);
    this.debugPai();
    if(this.checkDaHu() || this.CheckPING_HU(false)){
        yinhu = true;
    }

    for(var i=0 ; i<oldNum ;i++){
        var delJin = this.delPai(this.table.jinPai);
        logger.debug("delJin %j   %j",delJin,this.table.jinPai);
    }

    if(!!pai){
        this.delPai(pai);
        logger.debug("delPai22 %j   %j",pai);
    }
    this.laiZiNum = oldNum;
    logger.debug("checkYuanLaiHu3 %j yinhu %j ",this.laiZiNum,yinhu);
    this.debugPai();
    return yinhu;
}

module.exports = playerMajhong;
