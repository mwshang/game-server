
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(pomelo.app.getServerType()+'-log', __filename);
var timer = require('../../util/timerGame');
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var Event = require('../../consts/consts').MajhongEvent;
var Const = require('../../consts/consts');
var messageService = require('../../services/messageService');
var IMVoice = require("../../3rd/imvoice").IMVoice;
var EventEmitter = require('events');

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
exports.TABLESTATUS = TABLESTATUS;

var READYSTATUS =
{
    UNREADY:0,          //未准备
    READY: 1            //准备
}
exports.READYSTATUS = READYSTATUS;

/**
 * Init areas
 * @param {Object} opts
 * @api public
 */
var Instance = function(opts) {
    //The map from player to entity
    //当前桌面最后打出的牌 打牌的人是谁
    this.app = opts.app;
    this.index = opts.index;                      //当前桌子INDEX
    this.huiFangNums = opts.config.huiFangNums;
    this.playerUids = {};                         //玩家UID组
    this.channel = null;                          //当前桌子会话CHANNEL
    this.channelName = '';
    this.bankerUid = 0;                           //庄家UID
    this.tableStatus = TABLESTATUS.UNGAME;         //桌子状态
    this.timeStatus = 0;                          //状态计时器 切换状态则清理
    this.offLinePlayers = [];                     //离线玩家数据
    // this.timeConfig = {};                         //游戏时间配置
    this.playerNum = 0;
    this.fangZhu = 0;                             //房主
    this.liuJu = false;                           //当前是否是流局
    this.jinPai = {};
    this.kaiPai = {};
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

    this.maxPerson = 4;
    //定时器
    this.timer = new timer({
        delegate: this,
        interval: 150
    });
    //语音
    this._imVoice = new IMVoice();
    //
    this.emitter = new EventEmitter();

    this.initTable(opts);
};

Instance.prototype.initTable = function () {
    this.Data = null;
    this.message = null;
    this.card = null;
    this.PlayerCls = null;
    //桌子启动
    //this.start();
    if (!this.Data || this.message || !this.card || !this.PlayerCls) {
        throw new Error('function must override ! to init this.Data, this.message, this.card, this.PlayerCls');
    }
}

Instance.prototype.__defineGetter__("Card", function() { return this.card; });
Instance.prototype.__defineGetter__("Message", function() { return this.message; });

Instance.prototype.__defineGetter__("ChannelName", function() { return this.channelName; });
Instance.prototype.__defineGetter__("App", function() { return this.app; });
Instance.prototype.__defineGetter__("PlayerUids", function() { return this.playerUids; });
Instance.prototype.__defineGetter__("BankerUid", function() { return this.bankerUid; });
Instance.prototype.__defineSetter__("BankerUid", function(value){this.bankerUid=value;});
Instance.prototype.__defineGetter__("Index", function() { return this.index; });
Instance.prototype.__defineGetter__("TableStatus", function() { return this.tableStatus; });
Instance.prototype.__defineSetter__("TableStatus", function(value){this.tableStatus=value;});
Instance.prototype.__defineGetter__("TimeConfig", function() { return this.app.get(this.ServerType)["time_config"];});
Instance.prototype.__defineGetter__("FangZhu", function() { return this.fangZhu; });
Instance.prototype.__defineGetter__("AiRobotUids", function() { return this.aiRobotUids; });
Instance.prototype.__defineGetter__("ChairArr", function() { return this.chairArr; });
Instance.prototype.__defineGetter__("LastOP", function() { return this.lastOP; });
Instance.prototype.__defineGetter__("CurrentOPArr", function() { return this.currentOPArr; });
Instance.prototype.__defineGetter__("ServerType", function() { return pomelo.app.getServerType(); });
//游戏时间配置
Instance.prototype.__defineGetter__("timeConfig", function() { return this.app.get(this.ServerType)["time_config"]; });
Instance.prototype.__defineGetter__("minPerson", function() { return  this.app.get(this.ServerType)["minPlayerNumbers"]; });

/**
 * @api public 创建table channel time启动
 */
Instance.prototype.start = function() {
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
    this.maxPerson = this.Data.person;
};
/*
 获取channel
 * */
Instance.prototype.initChannel = function()
{
    this.channelName = channelUtil.getQiDongDBChannelName(this.index);
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
    this.emitter.emit('table_player_change', {num: this.playerNum, playerUids: this.chairArrBak, isFull: this.isFull()});
    return true;
};

Instance.prototype.registerPlayer = function(e)
{
    var position = this.updatePosition(e.uid);
    //同步给客户端
    e["position"] = position;

    this.playerUids[e.uid] = new this.PlayerCls({table:this,player:e,chair:position});

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
    for (var i = 0; i < this.maxPerson; i++){
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
        this.emitter.emit('table_player_change', {num: this.playerNum, playerUids: this.chairArrBak, isFull: this.isFull()});
    }
    return true;
};
/**
 * 每新的一轮椅子号就会变化。默认0是庄家的椅子号接下来是庄家的下家 对家 上家
 */
Instance.prototype.updateChair = function(){
    this.chairArr = [];
    logger.debug("新一轮庄家：" + this.bankerUid);
    this.chairArr.push(this.bankerUid);
    for (var i = 0; i < this.chairArrBak.length; i++){
        if (this.bankerUid == this.chairArrBak[i]){
            if (i == 0){
                this.chairArr.push(this.chairArrBak[1]);
                if (this.Data.person >= 3){
                    this.chairArr.push(this.chairArrBak[2]);
                }
                if (this.Data.person >= 4){
                    this.chairArr.push(this.chairArrBak[3]);
                }
                break;
            }else if (i == 1){
                if (this.Data.person >= 3){
                    this.chairArr.push(this.chairArrBak[2]);
                }
                if (this.Data.person >= 4){
                    this.chairArr.push(this.chairArrBak[3]);
                }
                this.chairArr.push(this.chairArrBak[0]);
                break;
            }else if (i == 2){
                if (this.Data.person >= 4){
                    this.chairArr.push(this.chairArrBak[3]);
                }
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
    //this.card.xiPai(true, true, true);
    throw new Error('function resetCard must override !');
}
Instance.prototype.resetPlayer = function(){
    for (var uid in this.playerUids){
        this.playerUids[uid].reset();
    }
}

/**
 * 重新回到准备状态
 */
Instance.prototype.resetTable = function() {
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
    this.Data.resetData();
};

// 获取听牌信息
Instance.prototype.getTingChoice = function (uid) {
    var tingChoice = this.playerUids[uid].getTingChoice();

    // 检测所胡的某个牌还剩几张
    for (var i=0; i<tingChoice.length; i++) {
        var ting = tingChoice[i];
        for (var j=0; j<ting['hu'].length; j++) {
            ting['num'][j] = this.calcLeftPaiNum(uid, ting['hu'][j]);
        }
    }

    logger.debug("听牌信息:%j", tingChoice);

    return tingChoice;
}
// 统计某张牌还剩几张
Instance.prototype.calcLeftPaiNum = function(uid, pai){
    var num = 0;
    for (var _uid in this.playerUids){
        num += this.playerUids[_uid].getVisiblePaiNum(uid == _uid ? true : false, pai);
    }

    return 4-num;
}

/**
 *
 * @param nextUid 接下来轮到谁出牌
 * @param nextOp
 * @param lastUid 最后一次出牌的玩家
 * @param msgLast
 */
Instance.prototype.updateLastOP = function(nextUid,nextOp,lastUid,msgLast) {
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

/**
 * 添加到会话组
 * @param data
 * @returns {boolean}
 */
Instance.prototype.addPlayer2Channel = function(data) {
    if(data)
    {
        //logger.debug("addPlayer2Channel:%j",data);
        this.app.get('gameService').add(data.uid,data.userName,this.channelName,data.serverId);
        return true;
    }
    return false;
};
/**
 * 移除会话组
 * @param uid
 * @returns {boolean}
 */
Instance.prototype.removePlayerFromChannel = function(uid) {
    logger.debug("移除玩家channel 1");
    if(uid) {
        logger.debug('移除玩家从channel组 ', uid);
        this.app.get('gameService').leave(uid,this.channelName);
        return true;
    }
    return false;
};

/**
 * 是否当前玩家都是准备状态
 * @returns {boolean}
 */
Instance.prototype.isAllReadyStatus = function()
{
    var playerUids = this.playerUids;
    for (var uid in playerUids){
        if (playerUids[uid].IsReady == READYSTATUS.UNREADY){
            return false;
        }
    }

    if (Object.keys(playerUids).length < this.maxPerson){
        return false;
    }

    return true;
};

/**
 * 同步数据给房间列表
 */
Instance.prototype.syncPlayer2Room = function()
{

};

/*当前桌子人数
 * */
Instance.prototype.getPlayerNumbers = function () {
    return Object.keys(this.playerUids).length - Object.keys(this.aiRobotUids).length;
};

Instance.prototype.gameInit = function () {
    throw new Error('function gameInit must override !');
}
Instance.prototype.gameStart = function () {
    throw new Error('function gameStart must override !');
}
Instance.prototype.getTableStatus = function (myUid) {
    throw new Error('function getTableStatus must override !');
}
Instance.prototype.getTableStatus = function (myUid) {
    throw new Error('function getTableStatus must override !');
}

Instance.prototype.update = function () {
    throw new Error('function update must override !');
}
/**
 * 同步数据给房间列表
 * @returns {boolean}
 */
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

/**
 * 同步数据给客户端
 */
Instance.prototype.syncPlayer2Client = function()
{
    var msg = [];
    this.message.push2Channel(Event.mjPlayerInfoChange,msg);
};

/**
 * 当前桌子是否满员
 * @returns {number}
 */
Instance.prototype.isFull = function(){
    if (this.playerNum >= this.maxPerson)
        return 1;
    else
        return -1;
};

/**
 * 通知客户端玩家操作
 * 摸牌自己引起操作  打牌引起别人有操作
 * @param playerUid
 */
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

/**
 * 获取当前玩家的下家uid或者上家uid
 * @param selfUid
 * @returns {*}
 */
Instance.prototype.getNextUid = function(selfUid) {
    if (selfUid == undefined || selfUid == null)
        return -1;
    for (var i = 0; i < this.chairArr.length; i++) {
        if (this.chairArr[i] == selfUid){
            //4人模式
            if (this.chairArr.length > 2){
                if (i < 3){
                    return this.chairArr[i+1];
                }else{
                    return this.chairArr[0];
                }
            }else{//2人模式
                if ( i == 1){
                    return this.chairArr[0];
                }else{
                    return this.chairArr[1];
                }
            }
        }
    }
    logger.error("没有下家？？");
    return -1;
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
    if (Object.keys(this.playerUids).length < this.maxPerson){
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
    if (this.dissolutionTableUids.length >= this.maxPerson){
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
    if (this.dissolutionTableUids.length >= this.maxPerson){
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

    if (Object.keys(this.playerUids).length >= 1 && Object.keys(this.playerUids).length < this.maxPerson
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

/**
 * 机器人主动请求进入本桌子
 * @param e
 * @returns {boolean}
 */
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


/**
 * 更新玩家离线游戏
 * @param uid
 */
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
    if (this.playerNum >= this.maxPerson){
        return true;
    }
    if (this.tableStatus >= TABLESTATUS.INITTABLE){
        return true;
    }else{
        return false;
    }

}

/**
 * "IMInfo": { "roomId": 340908, "roomName": "test room1", "head": "", "roomType": 1, "scope": 0, "maxUserNumber": 10 }
 */
Instance.prototype.initIM = function(){
    this.IMInfo = {};
    this._imVoice.CreateRoom(this.channelName, this.maxPerson, function(roomInfo, err) {
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

Instance.prototype.gmQiPai = function(msg){
    //uid pai  "H2"
    logger.debug("gmQiPai 1:" + msg);
    if (!!this.playerUids[msg.uid]/* && this.playerUids[msg.uid].player.vipLevel >= 10*/){
        logger.debug("gmQiPai,%j",msg);
        this.playerUids[msg.uid].gmQiPai = msg.pai;
    }
};

Instance.prototype.deleteChannel = function(){
    this.app.get('gameService').removeChannelByName(this.channelName);
}

/**
 * 关闭桌子
 */
Instance.prototype.closeTable = function(){
    this.Data.gameOver();
}

module.exports = Instance;