var room = require('./room');
var timer = require('../../util/timerGame');
var logger = require('pomelo-logger').getLogger('wuhan-log', __filename);
var schedule = require('pomelo-scheduler');
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var Event = require('../../consts/consts').MajhongEvent;
var Const = require('../../consts/consts');
var Card = require('./card');
var Player = require('./player');
var Data = require('./data');
var Message = require('./message');
var messageService = require('../../services/messageService');
var Code = require('../../consts/code');
var IMVoice = require("../../3rd/imvoice").IMVoice;
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var TABLESTATUS =
{
    UNGAME:0,           //没有游戏状态还从没开始过
    SLEEP:1,            //休眠状态 没有开始（此时玩家人数不足）
    READY: 2,           //准备阶段 1秒进入下一阶段
    INITTABLE: 3,       //初始化牌桌阶段 包括 初始化玩家信息、数据信息、庄家判断、牌的初始化、洗牌、发牌
    GAMEING:4,          //游戏中状态
    GAMERESULT:5,        //游戏结果阶段 5秒给客户端展示阶段
    GAMEOVER:6           //游戏结束 桌子解散
}
var READYSTATUS =
{
    UNREADY:0,          //未准备
    READY: 1            //准备
}
var TABLE_MIN_COUNTS = 4;
var TABLE_MAX_COUNTS = 4; // 未来有可能观看模式

/*
服务器通知玩家操作
吃、碰、杠、补、胡、过、出牌
玩家可操作：
吃、碰、杠、补、胡、过、出牌
服务器主动给客户端发送：
发牌、同步玩家操作以及状态、结算
 {"opCard":{"opCard":{"type":"B", "value": 1}, "tian":[],"chi":[],"peng":1,"gang":0,"bu":0,"hu":1,"guo":1, "level":5}
* */

var MAJHONGTYPE = {
    "tian" : "tian",
    "chi" : "chi",
    "peng" : "peng",
    "gang" : "gang",
    "bu" : "bu",
    "hu" : "hu",
    "ting":"ting",
    "guo" : "guo"
}

var PLAYEROPTYPE = {
    "CHUPAI":"CHUPAI",
    "MOPAI":"MOPAI",
    "GANG":"GANG",
    "BU":"BU"
}
/**
* Init areas
* @param {Object} opts
* @api public
*/
var Instance = function(opts)
{
  //The map from player to entity
  //当前桌面最后打出的牌 打牌的人是谁
  this.huiFangNums = opts.config.huiFangNums;

  this.app = opts.app;
  this.index = opts.index;                      //当前桌子INDEX
  this.playerUids = {};                         //玩家UID组
  this.channel = null;                          //当前桌子会话CHANNEL
  this.channelName = '';
  this.bankerUid = 0;                           //庄家UID
  this.tableStatus = TABLESTATUS.UNGAME;         //桌子状态
  this.timeStatus = 0;                          //状态计时器 切换状态则清理
  this.offLinePlayers = [];                     //离线玩家数据
  this.timeConfig = {};                         //游戏时间配置
  this.playerNum = 0;
  this.fangZhu = 0;                             //房主
  this.liuJu = false;                           //当前是否是流局
  this.jinPai = {};

    this.piZi=[];                                 //cxp 皮子,
    this.gdGangPai = [];                          //固定杠 红中加皮子

    this.dissolutionTableUids = [];               //同意解散房间的人数超过3人则自动解散桌子
    this.dissolutionTimerID = 0;                  //定时器ID

    this.haidiUid = 0;                            //海底UID

    this.huUids = [];                               //本轮中胡牌的UID

    //lastOP格式：{uid:opType, "opCard":value]}
    //当前牌局最后一次的操作（某个玩家出牌，碰牌等等，只记录最后一个玩家的操作 每当玩家操作清空上一次重新赋值
    this.lastOP = {};

    //接下来应该轮到谁出牌了 防止作弊
    this.nextChuPai = 0;

    //玩家数组操作可引起的可操作类型数组玩家类型为key，每个玩家又可支持多个操作 优先级从大到小
    //playerOP数组 循环判断 [{"opCard":{"type":"B", "value": 1}, "tian":[],"chi":[],"peng":1,"gang":0,"bu":0,"hu":1,"guo":1, "level":5},]
    this.currentOPArr = [];

    //玩家回复的操作备份 每当处理完此次操作结果清空  当优先级低的操作先发来时候缓存
    this.playerOPBack = [];

    this.chairArr = [];                           //椅子号数组 每局都在变化 从庄家开始为0、1、2、3 上下家的记录
    this.chairArrBak = [];                        //最原始的椅子号 0 1 2 3 保存 为了方便每把椅子的变化

    this.aiRobotUids = {};                        //机器人列表

    this.tablePlayers = [];                        //记录玩家的uid  用于游戏结束后删除玩家登记在msghall里面的关联信息

    this.tablePaiZiAndLaiZi = {};                  //皮子与赖子

    this.recordLeiBao = {};                      //开始记录打牌，计算可能的累包

    this.gmLevel = 0;   //gm 权限

    //定时器
    this.timer = new timer(
    {
    delegate : this,
    interval : 150
    });
    //麻将牌
    this.card = new Card({table:this});


    //数据层
    this.Data = new Data({table:this,
      isHaveBaker:opts.config.banker,
      isLaiZi:opts.config.isLaiZi,
      niaoNum:opts.config.niao,
      roundsTotal:opts.config.rounds,
      menQing:opts.config.menQing,
      isPingHuNoPao:opts.config.isPingHuNoPao,
      isBuBuGao:opts.config.isBuBuGao,
      isJinTongYuNv:opts.config.isJinTongYuNv,
      isYiZhiHua:opts.config.isYiZhiHua,
      isSanTong:opts.config.isSanTong,
      aaGem:opts.config.aaGem,
      yuanLaiFan:opts.config.yuanLaiFan,
      fengLaiFan:opts.config.fengLaiFan,
      yiJiuLaiFan:opts.config.yiJiuLaiFan,
      lianJinFan:opts.config.lianJinFan,
      baseScore:opts.config.baseScore

    });
    //消息层
    this.message = new Message({table:this});
    //语音
    this._imVoice = new IMVoice();
    this.emitter = new EventEmitter();
    //桌子启动
    this.start();
};

Instance.prototype.__defineGetter__("ChannelName", function() { return this.channelName; });
Instance.prototype.__defineGetter__("App", function() { return this.app; });
Instance.prototype.__defineGetter__("PlayerUids", function() { return this.playerUids; });
Instance.prototype.__defineGetter__("BankerUid", function() { return this.bankerUid; });
Instance.prototype.__defineSetter__("BankerUid", function(value){this.bankerUid=value;});
Instance.prototype.__defineGetter__("Index", function() { return this.index; });
Instance.prototype.__defineGetter__("TableStatus", function() { return this.tableStatus; });
Instance.prototype.__defineSetter__("TableStatus", function(value){this.tableStatus=value;});
Instance.prototype.__defineGetter__("Message", function() { return this.message; });
Instance.prototype.__defineGetter__("TimeConfig", function() { return this.timeConfig; });
Instance.prototype.__defineGetter__("FangZhu", function() { return this.fangZhu; });
Instance.prototype.__defineGetter__("Card", function() { return this.card; });
Instance.prototype.__defineGetter__("AiRobotUids", function() { return this.aiRobotUids; });
Instance.prototype.__defineGetter__("ChairArr", function() { return this.chairArr; });
Instance.prototype.__defineGetter__("LastOP", function() { return this.lastOP; });
Instance.prototype.__defineGetter__("CurrentOPArr", function() { return this.currentOPArr; });
/**
* @api public 创建table channel time启动
*/
Instance.prototype.start = function()
{
  this.initTableConfig();
  this.initChannel();
  this.initIM();
  this.timer.run();
};
Instance.prototype.close = function(){
  logger.debug("桌子解散拉");
  this.tableStatus = TABLESTATUS.GAMEOVER;
  this.timer.close();
  this.offLinePlayers = [];
  for (var uid in this.playerUids){
     this.app.get("roomMgr").removePlayer(uid, 1);
  }
  this.removeAllAIRobots();
  this.deleteIM();
  this.deleteChannel();
  this.tablePlayers = [];
    this.emitter.removeAllListeners('table_player_change');
    this.emitter.removeAllListeners('table_game_started');
};
Instance.prototype.initTableConfig = function(){
  this.timeConfig = this.app.get("wuhan")["time_config"];
  TABLE_MIN_COUNTS = this.app.get("wuhan")["minPlayerNumbers"];
  TABLE_MAX_COUNTS = this.app.get("wuhan")["maxPlayerNumbers"];
};
/*
获取channel
* */
Instance.prototype.initChannel = function()
{
  this.channelName = channelUtil.getWuHanChannelName(this.index);
};
/**
* addPlayer to table
* @param {Object} e Player to add to the table.
*/
Instance.prototype.addPlayer = function(e) {
  var playerUids = this.playerUids;
  if(!e || !e.uid) {
    return false;
  }
  if(!!playerUids[e.uid]) {
    logger.error('添加玩家两次到同一个桌子 : %j', e);
    return false;
  }
  //注册新玩家
  this.registerPlayer(e);

  //第一个进来的是房主
  if (this.playerNum == 1){
      this.updateBanker();
  }
  //广播新玩家进入
  this.message.mjPlayerEnter(e);
//  setTimeout(function(){
//      this.message.mjPlayerEnter(e);
//  }.bind(this), 100);
    this.emitter.emit('table_player_change', {tableId: this.index,baseScore:this.Data.baseScore, num: this.playerNum, playerUids: this.chairArrBak, isFull: this.isFull()});
  return true;
};
Instance.prototype.registerPlayer = function(e)
{
    var position = this.updatePosition(e.uid);
    //同步给客户端
    e["position"] = position;

    this.playerUids[e.uid] = new Player({table:this,player:e,chair:position});

    this.playerNum++;

    //加入到channel
    this.addPlayer2Channel(e);

    this.tablePlayers.push(e.uid);

    logger.debug("新玩家进入当前桌子UID: " + e.uid + "位置:" + position);
    for (var i = 0; i < this.chairArr.length; i++){
        logger.debug("新玩家进入椅子分配2:" + this.chairArr[i]);
    }
};
Instance.prototype.updateBanker = function()
{
    //第一个进房间的人是房主+默认第一次的庄家
    if (this.playerNum == 1){
        for (var uid in this.playerUids){
            this.fangZhu = parseInt(uid);
            return;
        }
    }

    //代开的情况默认第一个位置是房主
    var isFangZhu = false;
    var firstUid = -1;
    for (var uid in this.playerUids){
        if (firstUid == -1){
            firstUid = parseInt(uid);
        }
        if (this.fangZhu == parseInt(uid)){
            isFangZhu = true;
            break;
        }
    }
    if (isFangZhu === false){
        this.fangZhu = firstUid;
    }

    this.bankerUid = this.Data.updateBaker();
    this.playerUids[this.bankerUid].Baker = 1;
    this.updateChair();
};
//更新新进来的玩家的位置
// 0 1 2  1退出了 再进来还应该是1； 0 1 2 2退出了再进来是2
Instance.prototype.updatePosition = function(uid){
    //中间插入情况
    for (var i = 0; i < 4; i++){
        if (i <= this.chairArrBak.length - 1){
            if (this.playerUids[this.chairArrBak[i]].position > i){
                this.chairArr.splice(i,0,uid);
                this.chairArrBak.splice(i,0,uid);
                return i;
            }
        }
    }

    //屁股插入
    this.chairArr.push(uid);
    this.chairArrBak.push(uid);

    return this.chairArr.length - 1;
};

Instance.prototype.updatePlayerServerInfo = function(uid, serverId, ip) {
    if(!!this.playerUids[uid]) {
        this.playerUids[uid]["serverId"] = serverId;
        this.playerUids[uid]["ip"] = ip;
    }
};

/**
 * Remove Player form table
 * @return {boolean} remove result
 */
Instance.prototype.removePlayer = function(uid, type) {
    var playerUids = this.playerUids;
    var sid = playerUids[uid];
    if(!sid){
        logger.error('玩家不在麻将桌子' +  uid);
        return false;
    }
    if (this.tableStatus != TABLESTATUS.UNGAME && this.tableStatus != TABLESTATUS.GAMEOVER){
        logger.debug("游戏中不能离开房间了:" + uid + "  当前房间状态:" + this.tableStatus);
        return false;
    }
    //通知当前桌子其他人玩家XX离开
    this.message.mjPlayerLeave(uid);

    //移除channel
    setTimeout(function(){
        this.removePlayerFromChannel(uid);
    }.bind(this),100);

    //椅子号删除
    for (var i = 0; i < this.chairArr.length; i++){
        if (this.chairArr[i] == uid){
            this.chairArr.splice(i,1);
        }
    }
    for (var i = 0; i < this.chairArrBak.length; i++){
        if (this.chairArrBak[i] == uid){
            this.chairArrBak.splice(i,1);
        }
    }

    //刷新session
    var BackendSessionService = pomelo.app.get('backendSessionService');
    BackendSessionService.getByUid(sid.player.serverId, uid,function(err, BackendSessions){
        logger.error("删除玩家session 1:" + sid.player.serverId + "   uid:" + uid);
        logger.debug(BackendSessions);
        if (BackendSessions != undefined && BackendSessions != null && BackendSessions.length > 0
            && !!BackendSessions[0]){
            logger.error("删除玩家session 2:");
            var gameId = BackendSessions[0].get('gameId');
            BackendSessions[0].set('gameId', "0");
            if (gameId != undefined && gameId > 0)
                BackendSessions[0].set('backupGameId', gameId);
            BackendSessions[0].pushAll(function () {
            }.bind(this));
        }

        //frontendId, sid, key, value, cb
        //BackendSessionService.push(sid.player.serverId,BackendSessionService,"gameId",0,null);
    }.bind(this));

    delete playerUids[uid];
    this.playerNum--;
    if (this.tableStatus != TABLESTATUS.GAMEOVER) {
        logger.debug('table_player_change2');
        this.emitter.emit('table_player_change', {tableId: this.index, num: this.playerNum, playerUids: this.chairArrBak, isFull: this.isFull()});
    }
    return true;
};
/*
每新的一轮椅子号就会变化。默认0是庄家的椅子号接下来是庄家的下家 对家 上家
* */
Instance.prototype.updateChair = function(){
    this.chairArr = [];
    logger.debug("新一轮庄家：" + this.bankerUid);
    this.chairArr.push(this.bankerUid);
    for (var i = 0; i < this.chairArrBak.length; i++){
        if (this.bankerUid == this.chairArrBak[i]){
            if (i == 0){
                this.chairArr.push(this.chairArrBak[1]);
                this.chairArr.push(this.chairArrBak[2]);
                this.chairArr.push(this.chairArrBak[3]);
                break;
            }else if (i == 1){
                this.chairArr.push(this.chairArrBak[2]);
                this.chairArr.push(this.chairArrBak[3]);
                this.chairArr.push(this.chairArrBak[0]);
                break;
            }else if (i == 2){
                this.chairArr.push(this.chairArrBak[3]);
                this.chairArr.push(this.chairArrBak[0]);
                this.chairArr.push(this.chairArrBak[1]);
                break;
            }else if (i == 3){
                this.chairArr.push(this.chairArrBak[0]);
                this.chairArr.push(this.chairArrBak[1]);
                this.chairArr.push(this.chairArrBak[2]);
                break;
            }
        }
    }
    for (var i = 0; i < this.chairArr.length; i++){
        var chairUid = this.chairArr[i];
        for (var uid in this.playerUids){
            if (chairUid == uid){
                this.playerUids[uid].Chair = i;
                break;
            }
        }
    }
    for (var i = 0; i < this.chairArr.length; i++){
        logger.debug("新一轮椅子分配:" + this.chairArr[i]);
    }
}
Instance.prototype.resetCard = function(){
    //武汉最后要留9张牌
    this.card.xiPai(true,true,false);//cxp
    //this.card.xiPai();
}
Instance.prototype.resetPlayer = function(){
    for (var uid in this.playerUids){
        this.playerUids[uid].reset();
    }
}
/*
 重新回到准备状态
 * */
Instance.prototype.resetTable = function()
{
    this.tableStatus = TABLESTATUS.SLEEP;
    this.timeStatus = 0;
    this.bankerUid = 0;
    this.nextChuPai = 0;
    this.haidiUid = 0;
    this.liuJu = false;
    this.lastOP = {};
    this.playerOPBack = [];
    this.currentOPArr = [];
    this.huUids = [];
    this.gdGangPai = [];
    this.recordLeiBao = {};
    this.Data.resetData();
};
Instance.prototype.gameInit = function()
{
    logger.debug("新一桌开始");
    //清理牌桌 玩家数据 牌山
    this.resetTable();
    this.resetPlayer();
    this.resetCard();
    this.updateBanker();
    this.message.mjGameStart();
    //初始化玩家手里牌
    this.initCards2Player();
    //开始游戏
    this.gameStart();
}
Instance.prototype.gameStart = function()
{
    if (this.app.get("packMgr")) {
        if (this.Data.roundsNum < 1) {
            logger.debug('gameInit-> open new table');
            this.app.get("packMgr").tableStartReAuto(this.index);
        }
        this.emitter.emit('table_game_started', {tableId: this.index});
    }
    //扣除掉天胡显示的时间
    var timeDelay = this.tianhuTimeShow();
    //timeDelay += this.buGdGangTime();

    logger.debug("gameStart:%d",timeDelay);
    this.Data.initHuiFang();
    setTimeout(function(){
        //开金牌
        this.updateJin();
        //判断庄家是否有操作（起手有 杠 胡的可能）,有则缓存到可操作数组列表通知玩家操作并等待玩家操作 没有则通知庄家出牌
        this.updateLastOP(this.bankerUid,PLAYEROPTYPE.CHUPAI,this.bankerUid);
        var isOp = this.isNotifyPlayerOp(this.bankerUid,null,false,null);
        if (isOp == false){
            //通知庄家出牌
            this.message.mjNotifyDelCards(this.bankerUid);
        }else{
            this.notifyPlayerOp();
        }
    }.bind(this), timeDelay * 1000);
}

//开金牌(金牌就是赖子)
Instance.prototype.updateJin = function(){
    var time = 1;
    if(this.Data.isLaiZi >0)
    {
        this.jinPai = this.card.jinPai();
        logger.debug("新一轮金牌:%j", this.jinPai);

        //cxp
        this.piZi = this.card.piZi(this.jinPai);
        this.gdGangPai.push({type:'J',value:1},this.piZi[0],this.piZi[1]);


        this.tablePaiZiAndLaiZi['p1'] = this.piZi[0];
        this.tablePaiZiAndLaiZi['p2'] = this.piZi[1];
        this.tablePaiZiAndLaiZi['p3'] = {type:'J',value:1};
        this.tablePaiZiAndLaiZi['laiZi'] = this.jinPai;

        this.Data.updateHuiFang({"type": 9, pai:this.jinPai});
        this.Data.updateHuiFang({"type": 10, pai:this.tablePaiZiAndLaiZi});

        this.message.mjJinPai(this.tablePaiZiAndLaiZi);

        logger.debug("新一轮固定杠:%j", this.gdGangPai);

        for (var uid in this.playerUids){
            this.playerUids[uid].updateLaiZi();
            this.playerUids[uid].updateGdGang();
        }

    }

    return time;
}
Instance.prototype.isJinTable = function(pai){
    if (pai.type == this.jinPai.type && pai.value == this.jinPai.value && this.Data.isLaiZi>0){
        return true;
    }
    return false;
}

Instance.prototype.isGdGangPai = function(pai){
    for(var i=0 ; i<this.gdGangPai.length;i++){
        if (pai.type == this.gdGangPai[i].type && pai.value == this.gdGangPai[i].value){
            return true;
        }
        return false;
    }
}

Instance.prototype.tianhuTimeShow = function(){
    var time = 0.1;
    for (var uid in this.playerUids){
        if (this.playerUids[uid].tianhuChoice.length > 0){
            time = this.playerUids[uid].tianhuChoice.length * 3;
        }
    }
    return time;
}

//cxp
//Instance.prototype.buGdGangTime = function(){
//    var time = 0;
//    var isHavaGdGang = false;
//    for (var p = 0; p < 12; p++){
//        isHavaGdGang = false;
//        for (var i = 0; i < this.chairArr.length; i++){
//            if (this.playerUids[this.chairArr[i]].isHaveGdGangPai() == true){
//                //如果有花牌则补花流程 最开始的补花数量和游戏中摸一个花的花牌数量不一样
//                time += 0.5;
//                this.playerUids[this.chairArr[i]].playerGdGangPai('over')
//                if (this.playerUids[this.chairArr[i]].isHaveGdGangPai() == true){
//                    isHavaGdGang = true;
//                }
//            }
//        }
//        if (isHavaGdGang == false){
//            break;
//        }
//    }
//
//    return time;
//}


/*
nextUid 接下来轮到谁出牌
lastUid 最后一次出牌的玩家
* */
Instance.prototype.updateLastOP = function(nextUid,nextOp,lastUid,msgLast){

    if (nextUid == undefined || nextUid == null){
        this.lastOP["nextUid"] = "";
        this.lastOP["nextOp"] = "";
    }else{
        this.lastOP["nextUid"] = nextUid;
        this.lastOP["nextOp"] = nextOp;
    }
    if (lastUid == undefined || lastUid == null){
        this.lastOP["lastUid"] = "";
    }else{
        this.lastOP["lastUid"] = lastUid;
    }
    if (msgLast == undefined || msgLast == null){
        this.lastOP["lastMsg"] = "";
    }else{
        this.lastOP["lastMsg"] = JSON.parse(JSON.stringify(msgLast));
    }
    logger.debug("更新最新最后一次操作:%j" , this.lastOP);
}

/*
添加到会话组
* */
Instance.prototype.addPlayer2Channel = function(data) {
    if(data)
    {
        //logger.debug("addPlayer2Channel:%j",data);
        this.app.get('gameService').add(data.uid,data.userName,this.channelName,data.serverId);
        return true;
    }
    return false;
};
/*
移除会话组
* */
Instance.prototype.removePlayerFromChannel = function(uid) {
    logger.debug("移除玩家channel 1");
    if(uid) {
        logger.debug('移除玩家从channel组 ', uid);
        this.app.get('gameService').leave(uid,this.channelName);
        return true;
    }
    return false;
};

/*
获取当前桌子状态
每个人的详细信息状态
桌子状态
* */
Instance.prototype.getTableStatus = function(myUid)
{
    if (myUid == undefined || myUid == null){
        myUid = -1;
    }
    var msg = {};
    //4个玩家的详细信息
    var players = [];
    for (var uid in this.playerUids){
        var player = {};
        player = this.playerUids[uid].playerStatus(myUid);
        players.push(player);
    }
    msg["players"] = players;
    msg["tableStatus"] = this.tableStatus;
    msg["banker"] = this.bankerUid;
    msg["lastOP"] = this.lastOP;
    msg["tableId"] = this.index;
    msg["fangZhu"] = this.fangZhu;
    msg["chairArr"] = this.chairArrBak;
    msg["nextChuPai"] = this.nextChuPai;

    //桌子配置信息
    msg["isHaveBanker"] = this.Data.isHaveBaker;
    msg["niaoNum"] = this.Data.niaoNum;
    msg["roundsTotal"] = this.Data.roundsTotal;
    msg["isLaiZi"] = this.Data.isLaiZi;
    //base score
    msg["baseScore"] = this.Data["baseScore"];
    //msg["menQing"] = this.Data.menQing;
   // msg["isPingHuNoPao"] = this.Data.isPingHuNoPao;
    //msg["isBuBuGao"] = this.Data.isBuBuGao;
   // msg["isJinTongYuNv"] = this.Data.isJinTongYuNv;
    //msg["isYiZhiHua"] = this.Data.isYiZhiHua;
    //msg["isSanTong"] = this.Data.isSanTong;




    msg["currRounds"] = this.Data.roundsNum + 1;
    msg["mjNumber"] = 14;
    msg["havePai"] = this.card.leftPaiCount();
    //判断当前离线重连玩家是否可操作 如果是则提示他 从缓存里面取是否有这个人的UID
    //轮到当前掉线玩家 打牌 操作牌
    msg["currOp"] = {};
    var isOp = 0;
    for (var i = 0; i < this.currentOPArr.length; i++){
        var playerOp = this.currentOPArr[i];
        if (myUid == playerOp.uid){
            msg["currOp"] = playerOp;
            isOp = 1;
        }
    }

    msg["currOp"]["isOp"] = isOp;

    if (this.isOffLinePlayer(myUid) == true || this.tableStatus >= TABLESTATUS.GAMEING){
        msg["isOffline"] = 1;
    }else{
        msg["isOffline"] = 0;
    }

    //当前是否处于解散桌子状态
    msg["dissolutionTable"] = -1;
    if (this.dissolutionTableUids.length > 0){
        var dissolutionTable = {};
        dissolutionTable["disArr"] = this.dissolutionTableUids;//同意解散的人的数组 第一个就是申请者
        dissolutionTable["result"] = this.dissolutionTableUids.length >= 3 ? 1 : 0;//当前结果
        dissolutionTable["time"] = 180;
        msg["dissolutionTable"] = dissolutionTable;
    }

    //当前是否是海底捞状态 轮到谁海底捞了
    if (this.haidiUid > 0){
        msg["haidiUid"] = this.haidiUid;
    }

    //IM
    if (!!this.IMInfo && !!this.IMInfo.roomId && this.IMInfo.roomId > 0){
        msg["imRoomId"] = this.IMInfo.roomId;
    }else{
        msg["imRoomId"] = -1;
    }

    //jinpai
//    if (this.Data.isLaiZi>0 &&Object.keys(this.jinPai).length > 0){
//        logger.debug("金牌:" + Object.keys(this.jinPai).length);
//        msg["jin"] = this.jinPai;
//    }

//laizi and jinpai
    msg["piZiAndLaiZi"] = this.tablePaiZiAndLaiZi;
    logger.debug("固定杠与赖子%j",this.tablePaiZiAndLaiZi);

    msg["yuanLaiFan"] = this.Data.yuanLaiFan;
    msg["fengLaiFan"] = this.Data.fengLaiFan;
    msg["yiJiuLaiFan"] = this.Data.yiJiuLaiFan;
    msg["lianJinFan"] = this.Data.lianJinFan;
    msg["aaGem"] = this.Data.aaGem;

//dai kai
    if (this.app.get("roomMgr").isRePrivateTable(this.index) == true){
        msg["isRePrivateTable"] = 1;
    }

    var pid = this.app.get("roomMgr").getTableOwnPackId(this.index);
    if (pid != 0) {
        msg["isRePrivateTable"] = this.app.get("roomMgr").isRealRePrivateTable(this.index) == true ? 1 : 0;
        msg["pid"] = pid;
    }

    //logger.debug("当前房间状态:%j", msg);
    return msg;
};
/*
是否当前玩家都是准备状态
* */
Instance.prototype.isAllReadyStatus = function()
{
    var playerUids = this.playerUids;
    for (var uid in playerUids){
        if (playerUids[uid].IsReady == READYSTATUS.UNREADY){
            return false;
        }
    }
    return true;
};
/*
同步数据给房间列表
* */
Instance.prototype.syncPlayer2Room = function()
{

};
/*
 同步数据给房间列表
 * */
Instance.prototype.isGameover = function()
{
    if (this.dissolutionTableUids.length >= this.maxPerson){
        return true;
    }
    if (this.tableStatus == TABLESTATUS.GAMEOVER){
        return true;
    }
    return false;
};
/*
同步数据给客户端
* */
Instance.prototype.syncPlayer2Client = function()
{
    var msg = [];
    this.message.push2Channel(Event.mjPlayerInfoChange,msg);
};

/*当前桌子是否满员
* */
Instance.prototype.isFull = function(){
    if (this.playerNum >= TABLE_MAX_COUNTS)
        return 1;
    else
        return -1;
};

/*
根据不同状态做不同处理
* */
Instance.prototype.update = function() {

    //logger.debug("当前桌子状态：" + this.tableStatus);
    //logger.debug("当前桌子人数：" + Object.keys(this.playerUids).length);
    if (this.tableStatus == TABLESTATUS.GAMEOVER){
        return;
    }
    if (Object.keys(this.playerUids).length < TABLE_MIN_COUNTS){
        this.tableStatus = TABLESTATUS.UNGAME;
        return;
    }
    if (this.tableStatus == TABLESTATUS.UNGAME && Object.keys(this.playerUids).length >= TABLE_MIN_COUNTS){
        this.tableStatus = TABLESTATUS.SLEEP;
        this.timeStatus  = 0;
    }
    if(Object.keys(this.playerUids).length >= TABLE_MIN_COUNTS && this.tableStatus == TABLESTATUS.SLEEP)
    {
        //logger.debug("切换桌子到准备状态：" );
        this.timeStatus++;
        //如果所有玩家都是准备状态
        if (this.isAllReadyStatus() == true) {
            this.timeStatus = 0;
            this.tableStatus = TABLESTATUS.READY;
        }
    }
    if (this.tableStatus == TABLESTATUS.READY) {
        logger.debug("切换桌子到开始状态：" );
        this.gameInit();
        this.tableStatus = TABLESTATUS.INITTABLE;
    }
    else if (this.tableStatus == TABLESTATUS.INITTABLE){
        this.tableStatus = TABLESTATUS.GAMEING;
    }
    else if (this.tableStatus == TABLESTATUS.GAMERESULT){
        //结算完成再把状态设置为SLEEP
        this.timeStatus = 0;
        this.Data.calGameResult();
        this.tableStatus = TABLESTATUS.SLEEP;
    }
};

/*当前桌子人数
 * */
Instance.prototype.getPlayerNumbers = function(){
    return Object.keys(this.playerUids).length - Object.keys(this.aiRobotUids).length;
};

/*********************************************麻将牌操作******************************************/
/*
 给每个玩家发牌 闲13张 庄家14张
 * */
Instance.prototype.initCards2Player = function()
{
    //var pais = this.card.faPai_debug();
    var pais = this.card.faPai(13);
    for (var i = 0; i < this.chairArr.length; i++){
        this.playerUids[this.chairArr[i]].initHandCards(pais[i.toString()]);
    }
    //同步牌数量
    this.message.mjSyncParams();
}
/*
 判断是否有操作行为
 * */
Instance.prototype.isNotifyPlayerOp = function(playerUid,pai,isGang,selfUid)
{
    var t = false;
    var nextUid = this.getNextUid(selfUid);
    if (playerUid == undefined || playerUid == null){
        for(var uid in this.playerUids){
            //自己出的牌引起的操作忽略自己，并且自己出的牌只有下家可以吃
            if (uid == selfUid){
                continue;
            }
            var isCanChi = false;
            if (!!pai && nextUid >-1 && uid == nextUid){
                isCanChi = true;
            }
            var msg = this.playerUids[uid].checkOPCard(pai,isGang,isCanChi);
            logger.debug("检测结果1 %j", msg);
            if (msg["level"] > -1){
                this.currentOPArr.push(msg);
                t = true;
            }
        }
    }else{
        //只判断一个的操作 肯定是与吃无关的
        var isCanChi = false;
        if(this.playerUids[playerUid] == undefined || this.playerUids[playerUid] == null){
            return t;
        }

        var msg = this.playerUids[playerUid].checkOPCard(pai,isGang,isCanChi);
        logger.debug("检测结果2 %j", msg);
        if (msg["level"] > -1){
            this.currentOPArr.push(msg);
            t = true;
        }
    }
    //记录下来用于回放
    if (t == true){
        this.Data.updateHuiFang({type:3});
    }
    return t;
}
/*
 通知客户端玩家操作
 摸牌自己引起操作  打牌引起别人有操作
 * */
Instance.prototype.notifyPlayerOp = function(playerUid)
{
    this.nextChuPai = -1;
    if (playerUid == undefined || !playerUid){
        for(var uid in this.playerUids){
            this.playerUids[uid].notifyOPCard();
        }
    }else{
        this.playerUids[playerUid].notifyOPCard();
    }
}
/*
同步客户端玩家操作
{"opType":"chi", opCard:{type:"B", value:"1"} ,"index":index};
* */
Instance.prototype.updatePlayerOp = function(msg)
{
    logger.debug("玩家操作行为%j", msg);
    if (this.tableStatus == TABLESTATUS.GAMERESULT){
        logger.error("游戏结算阶段不接受任何操作行为1");
        return false;
    }

//    if (this.dissolutionTableUids.length > 0){
//        logger.error("有人申请解散房间状态不处理消息:%j" + msg);
//        return false;
//    }

    //是否可以终结当前操作情况
    var isOver = this.isInterruptPlayerOP(msg);
    //终结操作直接同步对应玩家操作 清理缓存列表
    if (isOver == true){

        this.Data.updateHuiFang({type:4});

        //清理缓存
        for(var uid in this.playerUids){
            this.playerUids[uid].clearOPcard();
        }

        //有人胡了。并且curr还有人没选择那么暂时不清理.
        if (!!this.playerOPBack[0] && !!this.playerOPBack[0].level && this.playerOPBack[0].level == 3){
            logger.debug("测试多人胡牌问题");
        }else{
            this.currentOPArr = [];
        }

        var isHu = false;
        //除非胡操作之外其实都是只有一次即this.playerOPBack.length == 1
        for (var i = 0; i < this.playerOPBack.length; i++){
            var playerOp = this.playerOPBack[i];
            if (playerOp["opType"] === MAJHONGTYPE.chi && this.huUids.length <= 0){
                this.updatePlayerChiCard(playerOp);
            }else if (playerOp["opType"] === MAJHONGTYPE.peng && this.huUids.length <= 0){
                this.updatePlayerPengCard(playerOp);
            }else if (playerOp["opType"] === MAJHONGTYPE.gang && this.huUids.length <= 0){
                this.updatePlayerGangCard(playerOp);
            }else if (playerOp["opType"] === MAJHONGTYPE.bu && this.huUids.length <= 0){
                this.updatePlayerBuCard(playerOp);
            }else if (playerOp["opType"] === MAJHONGTYPE.guo && this.huUids.length <= 0){
                this.updatePlayerGuoCard(playerOp);
            }else if (playerOp["opType"] === MAJHONGTYPE.hu){
                isHu = this.updatePlayerHuCard(playerOp);
                if (isHu){
                    this.huUids.push(playerOp.uid);
                }
            }else if (playerOp["opType"] === MAJHONGTYPE.ting){
                this.updatePlayerTingCard(playerOp);
            }
        }
        this.playerOPBack = [];
        this.Data.huifangOP = [];
        if (isHu == true){
            this.huUids.push(playerOp.uid);
        }
    }
    //有人胡牌了 判断是否全部能胡的人都做了选择了
    if (this.huUids.length > 0){
        for (var j = 0; j < this.currentOPArr.length; j++){
            if (this.currentOPArr[j].level == 3){
                logger.debug("发现还有其他玩家可以胡直接让其他玩家胡了");
                // {"uid":101189,"opCard":{"type":"T","value":1},"level":-1,"chi":[],"peng":0,"gang":[],"bu":[],"hu":0}
                var msg = {};
                msg["uid"] = this.currentOPArr[j].uid;
                msg["opCard"] = this.currentOPArr[j].opCard;
                this.updatePlayerHuCard(msg);
            }
        }
        // 游戏结束 去结算
        this.currentOPArr = [];
        this.tableStatus = TABLESTATUS.GAMERESULT;
    }

}

Instance.prototype.getMaxPlayerLevel = function(){
    var Maxlevel = -1;
    for (var i = 0; i < this.currentOPArr.length; i++){
        var playerOp = this.currentOPArr[i];
        var level = playerOp.level;
        logger.debug("当前最大操作优先级" + level);
        if (level > Maxlevel){
            Maxlevel = level;
        }
    }
    //还要监测已经操作的玩家的优先级才知道哪个最大
    for (var i = 0; i < this.playerOPBack.length; i++){
        var playerOpBk = this.playerOPBack[i];
        if (playerOpBk.level > Maxlevel){
            Maxlevel = playerOpBk.level;
        }
    }

    return Maxlevel;
}

/*
是否终结掉当前操作进行下一步
* */
Instance.prototype.isInterruptPlayerOP = function(msg)
{
    //msg:{"opType":"chi", opCard:{type:"B", value:"1"} ,"index":index};
    //playerOp {"opCard":{"opCard":{"type":"B", "value": 1}, "tian":[],"chi":[],"peng":1,"gang":0,"bu":0,"hu":1,"guo":1, "level":5}
    //读取最大优先级  1 chi  2 peng  3 hu
    logger.debug("当前玩家操作剩余数组:%j",this.currentOPArr );
    if (this.currentOPArr.length <= 0){
        logger.debug("没有当前UID的操作忽略:%j:" + msg);
        return false;
    }
    var isHaveUid = false;
    for (var i = 0; i < this.currentOPArr.length; i++){
        var playerOp = this.currentOPArr[i];
        var level = playerOp.level;
        if (msg.uid == playerOp.uid){
            //网络方面延迟判断
            if (msg.opType == "chi"){
                if (!msg.opCard || msg.opCard.type != playerOp.opCard.type || msg.opCard.value != playerOp.opCard.value
                    || playerOp.chi.length <= 0){
                    logger.error("为啥没有找到吃的具体牌呢:%j", msg);
                    return false;
                }
            }
            if (msg.opType == "peng"){
                if (!msg.opCard || msg.opCard.type != playerOp.opCard.type || msg.opCard.value != playerOp.opCard.value){
                    logger.error("为啥没有找到碰的具体牌呢:%j", msg);
                    return false;
                }
            }

            isHaveUid = true;
            //回放操作记录
            this.Data.huifangOP.push(msg);
            this.currentOPArr.splice(i,1);//删除掉已经操作过的玩家数组
            if (msg.opType != MAJHONGTYPE.guo){

                //这里Level 要赋值为玩家选择的Level 而不是默认最大的
                if (!!msg.opType){
                    if (msg.opType == "chi"){
                        msg["level"] = 1;
                    }else if (msg.opType == "peng" || msg.opType == "bu"
                        ||msg.opType == "gang"){
                        msg["level"] = 2;
                    }else if (msg.opType == "hu"){
                        msg["level"] = 3;
                    }else if (msg.opType == "ting"){
                        msg["level"] = 0;
                    }
                    else{
                        logger.error("为啥没有找到类型:%j", msg);
                        return false;
                    }
                    if (msg["level"] > level){
                        logger.error("用户操作咋可能比我保持的还高:%j", msg);
                        return false;
                    }
                    //判断可以胡的玩家是否选择了碰或者吃 那么本轮肯定也不可以胡
                    if (level == 3 && msg["level"] < 3){
                        this.playerUids[msg.uid].playerCancelHu();
                    }
                }
                this.playerOPBack.push(msg);
                //听牌处理 如果是听牌那么直接返回true不用走下面流程
                if (msg.opType == "ting" && !!playerOp["ting"] && playerOp["ting"].length > 0){
                    logger.debug("玩家选择听牌");
                    return true;
                }
                break;
            }else{
                //如果胡牌的人选择了过牌那么本轮不可以胡
                if (level == 3){
                    this.playerUids[msg.uid].playerCancelHu();
                }
                break;
            }
        }
    }

    if (isHaveUid == false){
        logger.error("没有轮到当前玩家操作啊:%j", msg);
        logger.error("当前可操作玩家:%j", this.currentOPArr);
        logger.error("当前桌子玩家:%j", this.chairArr);
        return false;
    }

    var Maxlevel = this.getMaxPlayerLevel();
    logger.debug("玩家操作最大优先级:" + Maxlevel);
    //如果优先级最高那么清空数组直接返回true 并且如果数组为空则代表全部操作完成那么直接返回true
    //只是吃则直接返回
    if (Maxlevel == 1){
        //还有人没有选择
        if (this.currentOPArr.length > 0){
            return false;
        }
        if (this.playerOPBack.length <= 0){
            this.playerOPBack.push(msg);
        }
        return true;
    }
    //碰和吃 优先级碰高 两个人都做了操作 只有碰做了操作 或者是一个人又能吃又能碰
    if (Maxlevel == 2){
        //2个人或者1个人都做完了操作 肯定返回true  一个人又能吃又能碰肯定走这个流程 不会走下面
        if (this.currentOPArr.length == 0){
            //两个人都过牌 或者一个人选择了过牌即不吃不碰
            if (this.playerOPBack.length <= 0){
                this.playerOPBack.push(msg);
                return true;
            }
            //只有一个人想要操作 或  自己选择了吃或者碰
            else if (this.playerOPBack.length == 1){
                return true;
            }
            //正常肯定是两个人 否则就出问题了
            else if (this.playerOPBack.length > 1){
                if (this.playerOPBack[0].level > this.playerOPBack[1].level){
                    //干掉优先级低的
                    this.playerOPBack.splice(1,1);
                }else{
                    this.playerOPBack.splice(0,1);
                }
                return true;
            }
        }else{
            //碰的人优先做了操纵 那么直接返回true中断等待 吃的人做了操纵那么等待碰的人的选择
            if (this.playerOPBack.length == 1){
                if (this.playerOPBack[0].level == 2){
                    return true;
                }else{
                    logger.debug("吃碰组合判断有人做了操作但是是过还剩下另外一个热做操作");
                    return false;
                }
            }
            //有人做了操作但是是过牌 无视他继续等待
            else{
                return false;
            }
        }
    }
    //吃 碰 胡 3种都有  胡优先级最高 并且支持多家一起胡牌
    if (Maxlevel == 3){
        //都选择操作了
        if (this.currentOPArr.length == 0){
            //把不是胡的人都干掉 只留胡的 然后推送给每一个胡牌的玩家
            var opTemp = [];
            for (var j = 0; j < this.playerOPBack.length; j++){
                var tempHu = this.playerOPBack[j];
                if (tempHu.level == 3){
                    opTemp.push(tempHu);
                }
            }
            this.playerOPBack = opTemp;
            if (this.playerOPBack.length > 1){
                this.updateJieHu();
            }
            return true;

        }else{
            //还有人没有操作
            //如果最高优先级胡牌的玩家还有没操作的那么就要一直等待下去
             for (var j = 0; j < this.currentOPArr.length; j++){
                 if (this.currentOPArr[j].level == 3){
                     return false;
                 }
             }
            //如果有人胡牌那么直接删除掉不少胡牌的玩家 直接返回
            var opTemp = [];
            for (var j = 0; j < this.playerOPBack.length; j++ ){
                var tempHu = this.playerOPBack[j];
                if (tempHu.level == 3){
                    opTemp.push(tempHu);
                }
            }
            //有人胡牌了 并且当前没操作的玩家里面也没有胡的了那么直接同步胡
            if (opTemp.length > 0){
                this.playerOPBack = opTemp;
                if (this.playerOPBack.length > 1){
                    this.updateJieHu();
                }
                return true;
            }
        }
    }

    //所有人全部点的过牌 那么就是过牌
    if (this.playerOPBack.length <= 0 && this.currentOPArr.length <= 0 && Maxlevel == -1){
        this.playerOPBack.push(msg);
        return true;
    }
    logger.error("什么原因没有检测到中断?");
    return false;
}

/*
 同步客户端玩家出牌
 @param msg = {//mwshang
    uid,
    opCard:{
        type,//F
        value,//1
    }
 }
 * */
Instance.prototype.updatePlayerDelCard = function(msg)
{
    if (this.playerUids[msg.uid] == undefined || !this.playerUids[msg.uid]){
        logger.error("玩家出牌但是没有找到此玩家:" + msg.uid);
        return false;
    }
    if (this.nextChuPai != msg.uid){
        logger.error("玩家出牌但是玩家没找到或者没轮到玩家出牌:" + this.nextChuPai + "  我的UID：" + msg.uid);
        return false;
    }
    if (this.tableStatus == TABLESTATUS.GAMERESULT){
        logger.error("游戏结算阶段不接受任何操作行为2");
        return false;
    }
    //这个玩家是否有这张牌 是否轮到他出牌
    if (this.playerUids[msg.uid].checkHavePai(msg.opCard) == false){
        logger.error("玩家出牌但是木有这个牌:%j", msg.opCard);
        return false;
    }
    //玩家打了这个牌是否会变成相公 2 5 8 11 14 17
    var leftPaiCount = this.playerUids[msg.uid].paiNumber();

    if (leftPaiCount != 2 && leftPaiCount != 5 && leftPaiCount != 8 && leftPaiCount != 11
        && leftPaiCount != 14){

        this.playerUids[msg.uid].debugPai();

        //return this.playerUids[msg.uid].paiQi['B'].length + this.playerUids[msg.uid].paiQi['T'].length + this.playerUids[msg.uid].paiQi['W'].length + this.playerUids[msg.uid].paiQi['J'].length + this.playerUids[msg.uid].paiQi['F'].length
        //    +this.playerUids[msg.uid].paiHaveGdGang.length + this.playerUids[msg.uid].laiZiNum;

        logger.error("玩家"+msg.uid+"出牌但是会相公:"+ leftPaiCount);
        return false;
    }
    //这个玩家是否杠过了杠过了只能打最后一张摸上来的牌
    if (this.playerUids[msg.uid].IsGang == 1){
        if (msg.opCard.type != this.playerUids[msg.uid].paiLast.type ||
            msg.opCard.value != this.playerUids[msg.uid].paiLast.value){
            logger.error("玩家已经杠了不能换牌出:%j", msg.opCard);
            return false;
        }
    }
    var check = false;
    var isJin = false;
    var isGdGang = false;

    if (this.isJinTable(msg.opCard) == true){
        isJin = true;
        //this.playerUids[msg.uid].delJinPai();
    }

    if (this.playerUids[msg.uid].isGdGangPai(msg.opCard)){
        isGdGang = true;
    }

    this.playerUids[msg.uid].playerDelPai(msg.opCard);
    //记录最后打牌的人
    this.updateLastOP(null,null,msg.uid,null);
    var nextUid = this.getNextUid(msg.uid);
    //出这个牌引起的其他玩家的操作如果有操作则执行通知操作流程 如果没有则给下家发牌操作

    //如果打出去的是金牌则不能有任何操作其他玩家
    if (isJin == true || isGdGang == true){
        check = false;
        //打出去的 赖子或者固定杠牌，要算分的。给前端发补牌的消息
        this.playerUids[msg.uid].updateGdGangNoBuPai(msg.opCard);

    }else{
        //出这个牌引起的其他玩家的操作如果有操作则执行通知操作流程 如果没有则给下家发牌操作
        check = this.isNotifyPlayerOp(null,msg.opCard,false,msg.uid);
    }

    if (check == true){
        //如果都过了则是轮到下家摸牌备份下家摸牌
        this.updateLastOP(nextUid,PLAYEROPTYPE.MOPAI,msg.uid,null);
        this.notifyPlayerOp(null);
    }else{
        //给当前玩家的下家发牌
        this.updatePlayerMoCard(nextUid);
    }

    return true;
}
/*
给玩家发了一张牌逻辑
* */
Instance.prototype.updatePlayerMoCard = function(nextUid){

    logger.debug("轮到某玩家摸牌了:" + nextUid);
    if (nextUid < 0 || this.playerUids[nextUid] == undefined){
        logger.error("报错了摸牌找不到玩家");
        return;
    }
    if (this.card.leftPaiCount() > 13){
        var lastPai = this.playerUids[nextUid].playerQiPai();
        this.updateLastOP(null,null,nextUid);
        //判断玩家是否有操作例如杠或者胡有则通知没有则通知下家出牌
        var sigCheck =  this.isNotifyPlayerOp(nextUid,null,false,null);
        this.playerUids[nextUid].paiLast = lastPai;
        if (sigCheck == true){
            this.updateLastOP(nextUid,PLAYEROPTYPE.CHUPAI,nextUid);
            this.notifyPlayerOp(nextUid);
        }else{
            this.message.mjNotifyDelCards(nextUid);
        }
    }
    else if (this.card.leftPaiCount() >= 10 && this.card.leftPaiCount()  <= 13 ){
        logger.debug("准备海底捞月:%j",nextUid);
        var lastPai = this.playerUids[nextUid].playerQiPai();
        this.playerUids[nextUid].IsHaiDi = 1;

        this.updateLastOP(null,null,nextUid);
        var sigCheck =  this.isNotifyPlayerOp(nextUid,null,false,null);
        this.playerUids[nextUid].paiLast = lastPai;

        var nextXiaUid = this.getNextUid(nextUid);

        if (sigCheck == true){
            this.updateLastOP(nextXiaUid,PLAYEROPTYPE.MOPAI,nextUid,null);
            this.notifyPlayerOp(nextUid);
        }else{
            //给当前玩家的下家发牌
            this.updatePlayerMoCard(nextXiaUid);
        }

        //推送给第一个人是否海底捞月 然后按顺序
        //this.message.mjHaiDiPai(nextUid);
    }
    else if (this.card.leftPaiCount()  < 10){
        logger.debug("游戏结束 流局1");
        this.liuJu = true;
        this.tableStatus = TABLESTATUS.GAMERESULT;
    }
}

/*
 同步客户端玩家吃牌
 * */
Instance.prototype.updatePlayerChiCard = function(msg){
    //同步吃 判断玩家是否 有操作 通知吃牌玩家打牌 监听打牌消息
    this.playerUids[msg.uid].playerChiPai(msg.index, msg.opCard);
    logger.debug("updatePlayerChiCard-------------1");
    logger.debug("msg:" + JSON.stringify(msg));
    logger.debug("player:" + JSON.stringify(this.playerUids[msg.uid]));
    logger.debug("updatePlayerChiCard-------------2");
    //只能判断玩家是否可以杠 不能胡
    this.playerUids[msg.uid].IsCanHu = false;
    if (this.isNotifyPlayerOp(msg.uid,null,false,null) == true){
        this.updateLastOP(msg.uid,PLAYEROPTYPE.CHUPAI,msg.uid,null);
        this.notifyPlayerOp(msg.uid);
    }else{
        this.message.mjNotifyDelCards(msg.uid);
    }
}
/*
 同步客户端玩家碰牌
 * */
Instance.prototype.updatePlayerPengCard = function(msg){
    //同步碰 判断玩家是否有操作 有则操作 没有则通知玩家打牌
    this.playerUids[msg.uid].playerPengPai(msg.opCard);
    //只能判断玩家是否可以杠 不能胡
    this.playerUids[msg.uid].IsCanHu = false;
    if (this.isNotifyPlayerOp(msg.uid,null,false,null) == true){
        this.updateLastOP(msg.uid,PLAYEROPTYPE.CHUPAI,msg.uid,null);
        this.notifyPlayerOp(msg.uid);
    }else{
        this.message.mjNotifyDelCards(msg.uid);
    }
}

Instance.prototype.checkPlayerGangCard = function(nextUid,nextXiaUid,gangPai){
    //最后操作的人是杠的人
    this.updateLastOP(null,null,nextUid);
    if (this.playerUids[nextUid].checkHu_GSH(gangPai[0],gangPai[1]) == true){
        //游戏结束玩家胡了直接通知玩家胡了
        var msg = {};
        msg["uid"] = nextUid;
        msg["opCard"] = this.playerUids[nextUid].huChoice[0].pais[0];
        this.updatePlayerHuCard(msg);
        this.tableStatus = TABLESTATUS.GAMERESULT;
        return;
    }
    //判断其他玩家是否能胡情况
    var isOtherHu = false;
    for (var otherUid in this.playerUids){
        if (otherUid != nextUid){
            if (this.playerUids[otherUid].checkHu_GSP(gangPai[0],gangPai[1]) == true && this.playerUids[otherUid].IsCanHu == true){
                //通知其他玩家可以胡操纵 存到缓存数组
                logger.debug("有人杠上炮啦");
                this.playerUids[otherUid].setOPcardHu(this.playerUids[otherUid].huChoice[0].pais[0]);
                this.currentOPArr.push(this.playerUids[otherUid].PlayerOP);
                this.Data.updateHuiFang({type:3});
                this.playerUids[otherUid].notifyOPCard();
                isOtherHu = true;
            }
        }
    }
    if (isOtherHu == true){
        //更新下一个操行是下家摸牌
        this.updateLastOP(nextXiaUid,PLAYEROPTYPE.MOPAI,nextUid);
        return;
    }
    //都没有操作 给下家摸牌操作
    this.updatePlayerMoCard(nextXiaUid);
}

/*
 同步客户端玩家杠牌
 * */
Instance.prototype.updatePlayerGangCard = function(msg){
    //this.currentOPArr  是否有这个玩家的杠
    //杠之前判断是否有玩家能够胡这个牌 即抢杠 有则通知玩家抢杠等待操作 没有则执行杠流程
    var nextUid = msg.uid;
    var nextXiaUid = this.getNextUid(nextUid);
    var gangPai = [];
    var isHu = false;
    //只有明杠可以抢
    if (this.playerUids[msg.uid].getGangType(msg.opCard) == -1){
        //出问题了
        logger.error("没有这个杠异常处理1");
        return;
    }
    if (this.playerUids[msg.uid].getGangType(msg.opCard) == 3){
        for(var optherUid in this.playerUids){
            if (optherUid == msg.uid){
                continue;
            }
            var sigCheck =  this.playerUids[optherUid].checkHu_QGH(msg.opCard,true);
            logger.debug("检测抢杠胡结果：" + sigCheck);
            if (this.playerUids[optherUid].IsCanHu == false){
                sigCheck = false;//当前玩家忍炮了当前局不能抢杠
            }
            if (sigCheck == true){
                //抢杠胡 通知玩家胡 并且是抢杠胡
                this.playerUids[optherUid].setOPcardHu(msg.opCard);
                this.currentOPArr.push(this.playerUids[optherUid].PlayerOP);
                this.Data.updateHuiFang({type:3});
                this.playerUids[optherUid].notifyOPCard();
                this.updateLastOP(nextUid,PLAYEROPTYPE.GANG,nextUid);
                isHu = true;
            }
        }
        if (isHu == false){
            this.playerUids[nextUid].playerGangPai(msg.opCard,gangPai);
        }
    }
    else{
        this.playerUids[nextUid].playerGangPai(msg.opCard,gangPai);
    }
    if (isHu == false){
        this.checkPlayerGangCard(nextUid,nextXiaUid,gangPai);
    }
}

Instance.prototype.checkPlayerBuCard = function(nextUid){
    this.updateLastOP(null,null,nextUid);

    //判断玩家是否有操作例如杠或者胡有则通知没有则通知下家出牌
    var sigCheck =  this.isNotifyPlayerOp(nextUid,null,false,null);
    if (sigCheck == true){
        this.updateLastOP(nextUid,PLAYEROPTYPE.CHUPAI,nextUid,null);
        this.notifyPlayerOp(nextUid);
    }else{
        this.message.mjNotifyDelCards(nextUid);
    }
}

/*
 同步客户端玩家补牌从屁股摸一张牌 其实就是发牌给玩家并重新走判断中断流程
 * */
Instance.prototype.updatePlayerBuCard = function(msg){
    var nextUid = msg.uid;
    if (this.playerUids[msg.uid].getGangType(msg.opCard) == -1){
        //出问题了
        logger.error("没有这个杠异常处理2");
        return;
    }
    //只有明杠可以抢
    if (this.playerUids[msg.uid].getGangType(msg.opCard) == 3){
        var sigCheck =  this.isNotifyPlayerOp(null,msg.opCard,true,msg.uid);
        if (sigCheck == true){
            this.updateLastOP(nextUid,PLAYEROPTYPE.BU,nextUid,msg);
            this.notifyPlayerOp(null);
            return;
        }else{
            this.playerUids[nextUid].playerBuPai(msg.opCard);
        }
    }else{
        this.playerUids[nextUid].playerBuPai(msg.opCard);
    }

    this.checkPlayerBuCard(nextUid);
}
/*
 同步客户端玩家胡牌
 * */
Instance.prototype.updatePlayerHuCard = function(msg){
    //同步玩家胡牌 并标记胡的详细信息给其他玩家用于展示
    var nextUid = msg.uid;
    if (nextUid > 0){
        return this.playerUids[nextUid].playerHuPai(msg.opCard);
    }else{
        return false;
    }
}

/*
 同步客户端玩家海底捞月信息
 * */
Instance.prototype.updatePlayerHaiDiCard = function(msg){
    logger.debug("玩家发送海底选择:%j", msg);
    if (this.card.leftPaiCount()  > 1 ){
        logger.error("还没到海底呢玩家就发送海底了拒绝！！！");
        return;
    }
    //同步玩家胡牌 并标记胡的详细信息给其他玩家用于展示
    var nextUid = msg.uid;
    var status = msg.status;
    this.playerUids[nextUid].IsHaiDi = status;
    if (status == 1){//赌海底牌
        //判断自己是否可胡 判断其他玩家是否可胡 可胡直接胡了 结算
        this.updateLastOP(null,null,nextUid,null);
        var isHu = this.playerUids[nextUid].playerHaiDiPai();
        if (isHu == false){
            this.liuJu = true;
        }
        this.tableStatus = TABLESTATUS.GAMERESULT;
    }
    //不赌海底拍
    else if (status == 0){
        logger.debug("不赌海底");
        var nextXiaUid = this.getNextUid(nextUid);
        if (this.playerUids[nextXiaUid].IsHaiDi == -1){
            this.message.mjHaiDiPai(nextXiaUid);//通知下一个是否想赌海底拍
        }
        //没人赌海底牌则结束 流局了
        else if (this.playerUids[nextXiaUid].IsHaiDi == 0){
            logger.debug("游戏结束 流局2");
            this.liuJu = true;
            this.tableStatus = TABLESTATUS.GAMERESULT;
        }
    }
}
/*
 客户端玩家过牌
 this.lastOP["nextUid"] = "";
 this.lastOP["nextOp"] = "";
 * */
Instance.prototype.updatePlayerGuoCard = function(msg){
    logger.debug("玩家过牌接下来出牌的是:%j", this.lastOP);
    if (!!this.lastOP["nextUid"] && this.lastOP["nextOp"] ){
        //回放
        this.Data.updateHuiFang({type:5,opResult:msg});
        if (this.lastOP["nextOp"] == PLAYEROPTYPE.MOPAI){
            this.updatePlayerMoCard(this.lastOP["nextUid"]);
        }
        else if (this.lastOP["nextOp"] == PLAYEROPTYPE.CHUPAI){
            this.message.mjNotifyDelCards(this.lastOP["nextUid"]);
        }
        else if (this.lastOP["nextOp"] == PLAYEROPTYPE.GANG){
            var nextUid = this.lastOP["nextUid"];
            var nextXiaUid = this.getNextUid(nextUid);
            var gangPai = [];
            this.playerUids[this.lastOP["nextUid"]].playerGangPai(this.lastOP["lastMsg"].opCard,gangPai);
            this.checkPlayerGangCard(nextUid,nextXiaUid,gangPai);
        }
        else if (this.lastOP["nextOp"] == PLAYEROPTYPE.BU){
            
            var origin = this.playerUids[this.lastOP["nextUid"]].getGangType(this.lastOP["lastMsg"].opCard,this.lastOP["lastMsg"].index);
            this.playerUids[this.lastOP["nextUid"]].playerBuPai(this.lastOP["lastMsg"].opCard,origin);
            this.checkPlayerBuCard(this.lastOP["nextUid"]);
        }
    }
}
/*
 获取当前玩家的下家uid或者上家uid
 * */
Instance.prototype.getNextUid = function(selfUid)
{
//    for (var i = 0; i < this.chairArr.length; i++){
//        logger.debug("新一轮椅子分配1:" + this.chairArr[i]);
//    }
    //logger.debug("selfUid:" + selfUid);

    if (selfUid == undefined || selfUid == null)
        return -1;
    for (var i = 0; i < this.chairArr.length; i++){
        if (this.chairArr[i] == selfUid){
            if (i < 3){
                return this.chairArr[i+1];
            }else{
                return this.chairArr[0];
            }
        }
    }
    logger.error("没有下家？？");
    return -1;

}


// 统计某张牌还剩几张
Instance.prototype.calcLeftPaiNum = function(uid, pai){
    var num = 0;
    for (var _uid in this.playerUids){
        num += this.playerUids[_uid].getVisiblePaiNum(uid == _uid ? true : false, pai);
    }

    return 4-num;
}

//桌子解散 游戏结束
Instance.prototype.gameOver = function(){
    logger.debug("当前牌局结束拉T人解散桌子:" + this.tableStatus);
    this.tableStatus = TABLESTATUS.GAMEOVER;
    for (var uid in this.playerUids){
        this.app.get("roomMgr").leavePrivateRoom(uid, 1);
    }
}

// 清理玩家和服务器之间的关联
Instance.prototype.clearTablePlayers = function () {
    // for (var i in this.tablePlayers){
    //     // 向大厅请求删除玩家所在游戏服务器的登记信息
    //     this.app.rpc.hall.msgRemote.deletePlayerInGameServer('', {uid: this.tablePlayers[i], serverId: this.app.get('serverId')}, function(err, code) {
    //         logger.debug('session不传 删除uid和服务器关联');
    //     });
    // }
    this.tablePlayers = [];
}


//申请解散房间 status 1 2 3  (1代表申请者申请者肯定同意的  2代表同意 3代表拒绝)
Instance.prototype.dissolutionTable = function(msg){
    logger.debug("申请解散房间0:%j",msg);
    if (Object.keys(this.playerUids).length < 4){
        logger.debug("人数不足四个无法解散房间");
        return false;
    }
    var status = msg.status;
    //避免重复发送
    for (var i = 0; i < this.dissolutionTableUids.length; i++){
        if (this.dissolutionTableUids[i] == msg.uid){
            logger.debug("申请解散房间1:" + this.dissolutionTableUids.length);
            return false;
        }
    }
    if (this.dissolutionTableUids.length >= 3){
        return false;
    }
    //申请解散房间者 避免重复申请 如果俩人同时发送的话
    if (status == 1 && this.dissolutionTableUids.length <= 0){
        this.dissolutionTableUids.push(msg.uid);
        logger.debug("申请解散房间2:");
        this.message.mjDissolutionTable(msg);
        this.dissolutionTimerID = setTimeout(function(){
            this.listenerDisolution();
        }.bind(this), 180000);
    }
    if (status == 2 && this.dissolutionTableUids.length > 0){//同意解散人数加1
        this.dissolutionTableUids.push(msg.uid);
        this.message.mjDissolutionTable(msg);
    }
    if (status == 3 && this.dissolutionTableUids.length > 0){//游戏继续
        this.dissolutionTableUids = [];
        clearTimeout(this.dissolutionTimerID);
        this.message.mjDissolutionTable(msg);
        return;
    }
    //超过3人同意解散则解散房间
    if (this.dissolutionTableUids.length >= 3){
        clearTimeout(this.dissolutionTimerID);
        this.Data.gameOver();
    }
}
//申请解散房间超时处理 超时则直接解散房间
Instance.prototype.listenerDisolution = function (){
    logger.error("超时解散房间处理但是没人申请解散哦0");
    if (this.dissolutionTableUids.length <= 0){
        logger.error("超时解散房间处理但是没人申请解散哦1");
        return false;
    }
    //游戏结束
    this.Data.gameOver();
}

/****************************************************************************************************/
/************************************** AIRobot ***********************************/
Instance.prototype.addAIRobot = function(){
    if (this.isFull() == 1){
        return false;
    }
    this.app.get("roomMgr").AiManager.addAiRebot(this);
};

Instance.prototype.popRobot = function(){
    //直接踢掉第一个机器人
    for(var uid in this.playerUids){
        if (this.playerUids[uid].isRobot == true){
            this.removeRobotLeave(uid, 1);
            break;
        }
    }
};

Instance.prototype.isAddAIRobot = function(){

    return false;
    if (Object.keys(this.aiRobotUids).length >= 3)
    {
        return false;
    }

    if (Object.keys(this.playerUids).length >= 1 && Object.keys(this.playerUids).length < TABLE_MIN_COUNTS
        && this.timeStatus >= 5){
        return true;
    }
    return false;
};
Instance.prototype.isAllAIRobots = function(){
    for(var uid in this.playerUids){
        //logger.debug("isAllAIRobots:" + this.playerUids[uid].isRobot);
        if (this.playerUids[uid].isRobot == false)
            return false;
    }
    return true;
};
Instance.prototype.removeAllAIRobots = function(){
    for(var uid in this.playerUids){
        if (this.playerUids[uid].isRobot == true){
            this.removeRobotLeave(uid, 1);
        }
    }
};
/*机器人主动请求进入本桌子
 * */
Instance.prototype.addRobotEnter = function(e){
    var playerUids = this.playerUids;
    if(!e || !e.Robot) {
        return false;
    }
    if(!!playerUids[e.Robot.uid]) {
        logger.error('添加机器人两次到同一个桌子 :' + e.Robot.uid);
        return false;
    }
    //记录玩家信息
    this.registerPlayer(e.Robot);
    this.playerUids[e.Robot.uid].isRobot = true;
    this.playerUids[e.Robot.uid].IsReady = READYSTATUS.READY;
    logger.debug("机器人进入当前桌子UID: " + e.Robot.uid);

    //广播新玩家进入
    if (!!e.Robot["table"]){
        e.Robot["table"] = null;
    }

    this.message.mjPlayerEnter(e.Robot);

    //加入到AI列表 后面用于通知
    this.aiRobotUids[e.Robot.uid] = e;

    return true;
};
Instance.prototype.removeRobotLeave = function(uid, type) {

    var playerUids = this.playerUids;
    var sid = playerUids[uid];
    if(!sid)
    {
        logger.error('机器人不在斗牛桌子' +  uid);
        return false;
    }
    //通知当前桌子其他人玩家XX离开
    this.message.mjPlayerLeave(uid);

    delete playerUids[uid];
    this.playerNum--;

    //通知aimanager回收
    this.app.get("roomMgr").AiManager.removeAiRebot(uid);
    this.aiRobotUids[uid].close();
    delete this.aiRobotUids[uid];

    return true;
};


/*
 更新玩家离线游戏
 * */
Instance.prototype.updateOffLinePlayer = function(uid)
{
    logger.debug("有玩家中途掉线:" + uid);
    if (this.isOffLinePlayer(uid) == false){
        this.offLinePlayers.push(uid);
    }
    if (!!this.playerUids[uid]){
        this.playerUids[uid].isOffLine = 1;
    }
    logger.debug("目前离线玩家数组:" + this.offLinePlayers.length);
    this.message.mjPlayerOffLine(uid,1);
}

Instance.prototype.isOffLinePlayer = function(uid)
{
    logger.debug("检测离线玩家数组:" + this.offLinePlayers.length);
    for (var i = 0; i < this.offLinePlayers.length; i++){
        logger.debug("当前掉线玩家数组:" + this.offLinePlayers[i] + "   我的UID：" + uid);
        if (this.offLinePlayers[i] == uid) {
            return true;
        }
    }
    return false;
}

Instance.prototype.removeOffLinePlayer = function(uid){
    logger.debug("有玩家掉线回来了:" + uid);
    for (var i = 0; i < this.offLinePlayers.length; i++){
        if (this.offLinePlayers[i] == uid){
            this.offLinePlayers.splice(i,1);
            break;
        }
    }
    if (!!this.playerUids[uid]){
        this.playerUids[uid].isOffLine = 0;
    }
    this.message.mjPlayerOffLine(uid,0);
    logger.debug("目前离线玩家数组:" + this.offLinePlayers.length);
}

Instance.prototype.isGameing = function(){
    logger.debug("玩家退出判断是否在游戏中");
    if (this.tableStatus >= TABLESTATUS.INITTABLE){
        return true;
    }else{
        return false;
    }

}

/*
 "IMInfo": {
 "roomId": 340908,
 "roomName": "test room1",
 "head": "",
 "roomType": 1,
 "scope": 0,
 "maxUserNumber": 10
 }
* */
Instance.prototype.initIM = function(){
    this.IMInfo = {};
    this._imVoice.CreateRoom(this.channelName, TABLE_MAX_COUNTS, function(roomInfo, err) {
        if (!!err) {
            return;
        }
        this.IMInfo = roomInfo;
        if (!!this.IMInfo.roomId){
            this.message.push2Channel(Const.Event.chatIm,{"imRoomId": this.IMInfo.roomId});
        }
    }.bind(this));
}

Instance.prototype.deleteIM = function(){
    if (!!this.IMInfo && !!this.IMInfo.roomId && this.IMInfo.roomId > 0){
        var imId = this.IMInfo.roomId;
        this._imVoice.DelRoom(imId, function(roomInfo, err){
            logger.debug("删除房间信息:%j",err );
        }.bind(this));
    }
}
//赵君有特殊权限。上线去掉.
Instance.prototype.gmQiPai = function(msg){
    //uid pai  "H2"
    logger.debug("gmQiPai 1:" + msg);
    if (!!this.playerUids[msg.uid] && (this.playerUids[msg.uid].player.vipLevel >= this.gmLevel)){
        logger.debug("gmQiPai,%j",msg);
        this.playerUids[msg.uid].gmQiPai = msg.pai;
    }
};

Instance.prototype.deleteChannel = function(){
    this.app.get('gameService').removeChannelByName(this.channelName);
}

/*
 是否是截胡 武汉麻将只能胡一个人
 * */
Instance.prototype.updateJieHu = function(){
    //this.playerOPBack this.chairArr

    logger.debug("武汉麻将要出现截胡0:%j", this.playerOPBack);

    var xia = -1;
    var dui = -1;
    var shang = -1;
    var maxHu = -1;
    var curUid = this.lastOP["lastUid"];//放炮的人
    var xiaJiaUid = this.getNextUid(curUid);
    var duiJiaUid = this.getNextUid(xiaJiaUid);
    var shangJiaUid = this.getNextUid(duiJiaUid);
    logger.debug("curUid:"    +  curUid);
    logger.debug("xiaJiaUid:" +  xiaJiaUid);
    logger.debug("duiJiaUid:" +  duiJiaUid);
    logger.debug("shangJiaUid:" +  shangJiaUid);
    var uids=[xiaJiaUid,duiJiaUid,shangJiaUid]; //胡的顺序
    var op={};
    for(var j=0; j<uids.length;j++)
    {
        for (var i = 0; i < this.playerOPBack.length; i++){
            if (this.playerOPBack[i].uid == uids[j]){
                op = JSON.parse(JSON.stringify(this.playerOPBack[i]));
                this.playerOPBack = [];
                this.playerOPBack.push(op);
                logger.debug("胡的人：%d,uid:%d",j,uids[j]);
                return;
            }
        }
    }
}

/*
 同步客户端玩家 固定杠操作（是否补牌）
 * */
Instance.prototype.updatePlayerGdGangOp = function(msg)
{
    if (this.playerUids[msg.uid] == undefined || !this.playerUids[msg.uid]){
        logger.error("玩家固定杠操作，但没有找到此玩家:" + msg.uid);
        return false;
    }
    var player = this.playerUids[msg.uid];
    player.gdGangBuPai = msg.gdGangBuPai;

    logger.debug("%j 固定杠是否补牌 %j",msg.uid,player.gdGangBuPai);

    return true;
}

//关闭桌子
Instance.prototype.closeTable = function(){
    this.Data.gameOver();
}

// 获取听牌信息
Instance.prototype.getTingChoice = function (uid) {
    if ( uid == undefined || uid == null ) {
        logger.error('uid error');
        return [];
    }
    if ( this.playerUids[uid] == undefined || this.playerUids[uid] == null ) {
        logger.error('playerUids error');
        return [];
    }
    var tingChoice = [];
    if ( !!this.playerUids[uid] ) {
        tingChoice = this.playerUids[uid].getTingChoice();
    }
    // 检测所胡的某个牌还剩几张
    for (var i = 0; i < tingChoice.length; i++) {
        var ting = tingChoice[i];
        for (var j = 0; j < ting['hu'].length; j++) {
            ting['num'][j] = this.calcLeftPaiNum(uid, ting['hu'][j]);
        }
    }

    logger.debug("听牌信息:%j", tingChoice);

    return tingChoice;
}

// 统计某张牌还剩几张
Instance.prototype.calcLeftPaiNum = function (uid, pai) {
    var num = 0;
    for (var _uid in this.playerUids) {
        num += this.playerUids[_uid].getVisiblePaiNum(uid == _uid ? true : false, pai);
    }

    return 4 - num;
}

module.exports = Instance;
