var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var eventManager = require('./../event/eventManager');
var utils = require('../../util/utils');
var Timer = require('./hallTimer');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var channelUtil = require('../../util/channelUtil');
var Code = require('../../consts/code');
var playerRecordDao = require('../../dao/playerRecordDao');
var systemConfigDao = require('../../dao/systemConfigDao');
var playerDao = require('../../dao/playerDao');
var rank = require('./rank');
var bagItem = require('./bagItem');
var bagDao = require('../../dao/bagDao');
var playerGameRecordDao = require('../../dao/playerGameRecordDao');
var randNumberDao = require('../../dao/randNumberDao');
var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var notifyMessage = require('../../../config/notifyMessage');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var settingsDao = require('../../dao/settingsDao');
var noticeDao = require('../../dao/noticeDao');
var packTable = require('./../pack/packTable');
var taskManager = require('../task/taskManager');
var FS = require('fs');
var _ = require('lodash');
var moment = require('moment');
/**
 * Init hall
 * @param {Object} opts
 * @api public
 */
var Instance = function(){
  this.players = {};
  this.channel = null;
  this.playerNum = 0;
  this.startTime = Date.now();

  //服务器活动第几天 目前每七天一轮询
  this.dayRecord = 1;

  //系统消息 来自具体游戏玩法记录
  this.playersMsg = [];
  this.timer = new Timer(this);

  //广播大厅消息内容
  this.messageDating = {};
  this.messageInterval = {};
  //游戏紧急通知内容
  this.gameNotifyMsg = '';
  this.notifyTimer = -1;
  this.notifyTimes = 0;

  // 所有房间号都由大厅分配
  this.randTableNum = [];
  // 桌子对应的服务器
  this.tableServers = {};
  // 回放号统一由大厅分配
  this.randHuiFangNum = [];

  // 所有的比赛场
  this.arenasByUid = {}; //  创建者uid: arena
  this.arenasByAid = {}; //  arenaid: arena
  this.randArenaNum = [];
  this.activeCfg = null;   //活动配置表
  //this.arenasEndByAid = {}; //结束比赛的 arena
  //热更表格消息通知测试接口，后面整理所有热更表格统一
  //FS.watchFile(pomelo.app.getBase() + '/config/notifyMessage.json', this.reLoad.bind(this));

    this.packTableMgr = new packTable(pomelo.app);

    this.task = new taskManager(pomelo.app);

  FS.watchFile(pomelo.app.getBase() + '/config/data/activeCfg.json',function(){
      this.reLoadCfg(this,"activeCfg",'/config/data/activeCfg.json')
  }.bind(this));
  this.start();
};

module.exports = Instance;
Instance.prototype.__defineGetter__("Players", function() { return this.players; });
Instance.prototype.__defineGetter__("DayRecord", function() { return this.dayRecord; });
Instance.prototype.__defineGetter__("PlayersMsg", function() { return this.playersMsg; });
Instance.prototype.__defineGetter__("PlayerNum", function() { return this.playerNum; });

/**
 * @api public
 */
//初始化接口
Instance.prototype.start = function()
{
    //服务器启动时间
    this.startTime = Date.now();
    //读取系统配置
    this.systemInit();

    //广播消息初始化
    //this.noticeInit();

    //初始化 活动配置
    this.reLoadCfg(this,"activeCfg",'/config/data/activeCfg.json');
    //模块初始化
    rank.resetRankData();

    //启动计时器
    this.timer.run();

    //桌子号
    /*for (var i = 100000; i <= 999999; i++)
      this.randTableNum.push(i);
    this.randTableNum.sort(function() { return Math.random()>0.5 ? -1 : 1;});*/

    //比赛场号
    for (var i = 100000; i <= 999999; i++)
      this.randArenaNum.push(i);
    this.randArenaNum.sort(function() { return Math.random()>0.5 ? -1 : 1;});

    this.testModules();

    pomelo.app.event.on(pomelo.events.START_ALL, function (data) {
        logger.debug('server start all!');
        //this.onServerAllStart();
        //logger.debug('server start all!', pomelo.app.get('ormModel'));
    }.bind(this));

   // pomelo.app.event.on(pomelo.events.REMOVE_SERVERS, function (data) {
   //     logger.debug('remove id:%j',data);
   // }.bind(this));
};

Instance.prototype.onServerAllStart = function () {
    this.randHuiFangNum = _.shuffle(_.range(100000, 999999));
    this.randTableNum =   _.shuffle(_.range(100000, 999999));
    this.noticeInit();
    this.packTableMgr.loadAutoTables();
}
//系统配置初始化
Instance.prototype.systemInit = function()
{
//    systemConfigDao.getSystemConfig(0 ,function(err, config)
//    {
//        if (config && config.length > 0)
//        {
//            logger.debug("当前服务器第几天:" + config[0].dayRecord);
//            this.dayRecord = config[0].dayRecord;
//        }
//    }.bind(this));
};

Instance.prototype.noticeInit = function () {
    noticeDao.getNoticeList('11, 12', function (err, data) {
        if (!err && data) {
            data.map(function (d) {
                if (d.type == 11) {
                    this.messageInit(d);
                } else {
                    this.intervalMessageInit(d);
                }
            }.bind(this));
        } else {
            logger.error('公告消息读取错误！！')
        }
    }.bind(this));
}

Instance.prototype.messageInit = function(msg){
   //logger.debug(notifyMessage);
   this.messageDating = msg;

   setTimeout(function(){
      var channelService = pomelo.app.get('channelService');
      channelService.broadcast('connector' ,Event.hallMessageNotify , {"hallMessageNotify": this.messageDating}, {binded: true}, function(err){
          if(err){
              logger.debug("广播大厅消息失败:%j", err);
          }
      });
   }.bind(this), 10000);
}

Instance.prototype.intervalMessageInit = function (msg) {
    if (this.intervalSchId) {
        this.timer.cancelSchedule(this.intervalSchId);
    }
    logger.debug('intervalMessageInit', msg);
    msg.intervalTime = (+msg.intervalTime * 1000) || 90000
    // 间隔时间最小90000毫秒
    msg.intervalTime = Math.max(msg.intervalTime, 90000);
    if (!msg.startTime) {
        msg.startTime = moment().format('YYYY-MM-DD HH:mm:ss');
    }
    if (!msg.endTime) {
        //  默认当前时间+40s
        msg.endTime = moment().add(40, 's').format('YYYY-MM-DD HH:mm:ss');
    }

    if (msg.endTime && moment(msg.endTime).format('x') - Date.now() <= 0) {
        return;
    }
    this.messageInterval = msg;
    logger.debug('intervalMessageInit2');
    // 每10秒检查一次

    var startTime = moment(msg.startTime).format('x') - Date.now() < 0 ? Date.now() : new Date(msg.startTime).getTime();
    logger.debug('intervalMessageInit',  moment(startTime).format());
    this.intervalSchId = this.timer.addSchedule(
        {start: startTime,  period: msg.intervalTime - 0},
        this.sendIntervalMessage.bind(this),
        msg
    );
}

Instance.prototype.sendIntervalMessage = function (msg) {
    logger.debug('sendIntervalMessage', Date.now());
    if (msg.startTime && moment(msg.startTime).format('x') - Date.now() > 0) {
        return;
    }
    if (msg.endTime && moment(msg.endTime).format('x') - Date.now() <= 0) {
        logger.debug('sendIntervalMessage--> del', this.intervalSchId);
        this.timer.cancelSchedule(this.intervalSchId);
        return;
    }
    setTimeout(function(){
        var channelService = pomelo.app.get('channelService');
        channelService.broadcast('connector' ,Event.hallTempNotify , {"hallTempNotify": msg}, {binded: true}, function(err){
            if(err){
                logger.debug("广播大厅消息失败:%j", err);
            }
        });
    }.bind(this), 100);
}
//推送给玩家大厅消息
Instance.prototype.sendNotifyMsg = function(player){
    messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallMessageNotify, {"hallMessageNotify": this.messageDating});
    if (this.messageInterval) {
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, Event.hallIntervalMessageNotify, {"hallMessageNotify": this.messageInterval});
    }
}

/**
 *
 * @param uid
 * @param event
 * @param data
 */
Instance.prototype.sendMsgToPlayer = function (uid, event, data) {
    var player = this.getPlayer(uid);
    if (!!player) {
        messageService.pushMessageToPlayer({uid:player.uid, sid : player.serverId}, event, data);
    }
}

//推送给玩家紧急临时公告
Instance.prototype.sendTempNotifyMsg = function(msg){
  this.gameNotifyMsg = msg;
  if (this.notifyTimer > -1){
      clearInterval(this.notifyTimer);
  }

  this.notifyTimer = setInterval(function () {
    logger.error("啦啦啦啦啦了2");
    msg.times = msg.times || 5;
    msg.times = Math.min(msg.times, 50);
    if (!!msg.times){
        if (this.notifyTimes >= msg.times){
            this.notifyTimes = 0;
            clearInterval(this.notifyTimer);
            return;
        }
        this.notifyTimes++;
    }
    var channelService = pomelo.app.get('channelService');
    channelService.broadcast('connector' ,Event.hallTempNotify , {"hallTempNotify": this.gameNotifyMsg}, {binded: true}, function(err){
        if(err){
            logger.debug("广播大厅消息失败:%j", err);
        }
    });
  }.bind(this),90000);

}
//关闭
Instance.prototype.close = function()
{
  this.timer.close();
};
//添加新玩家到大厅缓存
Instance.prototype.addPlayer = function(e) {
  var players = this.players;
  //this.getAllPlayersID();
  if(!!players[e.uid])
  {
    logger.error('大厅添加玩家两次: %j', e);
    return false;
  }
  //添加事件
  eventManager.addEvent(e);
  players[e.uid] = e;
  this.playerNum++;
  //最后一次登录时间
    if (!moment().isSame(e.lastLoginTime, 'day')) {
        logger.debug('hall-> initDailyTask', e.uid);
        this.task.initDailyTask({uid: e.uid});
    }
  e.updateLogin();
  return true;
};

//保存玩家所在游戏服服务器和玩家IP
Instance.prototype.updatePlayer = function(uid, serverId, ip) {
  var players = this.players;
  if(!!players[uid])
  {
    players[uid].serverId = serverId;
    players[uid].ip = ip;
  }
};

//移除玩家从大厅
Instance.prototype.removePlayer = function(uid, isSave)
{
  var players = this.players;
  this.getAllPlayersID();
  var e = players[uid];
  if(!e){
      logger.error('玩家不在大厅' +  uid);
      return false;
  }
  if (isSave > 0){
      //e.save();
      e.offLineSave();
  }
  delete players[uid];
  this.playerNum--;
  return true;
};
//同步所以玩家DB
Instance.prototype.sync2DBPlayers = function() {
    for(var uid in this.players)
    {
        this.players[uid].save();
    }
};
//同步所有UserRecords信息
Instance.prototype.sync2DBUserRecord = function() {
    for (var i = 0; i < this.playersMsg.length; i++)
    {
        playerRecordDao.createUserRecord(this.playersMsg[i], null);
    }

    this.playersMsg.splice(0,this.playersMsg.length);
};
//获取玩家信息通过UID
Instance.prototype.getPlayer = function(uid,isJson) {
  var entityId = this.players[uid];
  if(!!entityId) {
    if (isJson == undefined || isJson == null || !isJson){
        return entityId;
    }
    //需要封装新的JSON数据否则数据会被截断RPC不支持function传输
    var temp = entityId.toJSON();
    temp["ip"] = entityId.ip;
    temp["serverId"] = entityId.serverId;
    return temp;
  }

  logger.error("大厅没有找到此玩家1：" + uid);
  return null;
};
//获取玩家信息通过名字
Instance.prototype.getPlayerByName = function(userName) {

    for (var uid in this.players){
        var player = this.players[uid];
        if (!!player && player.userName == userName){
            return player;
        }
    }

    logger.error("大厅没有找到此玩家2：" + userName);
    return null;
};
//当前大厅是否为空
Instance.prototype.isEmpty = function(){
  return this.playerNum === 0;
};
//当前服务器天数
Instance.prototype.toDay = function(){
    logger.debug("今天是第几天:" + this.dayRecord);
    return this.dayRecord;
};
//服务器添加一天
Instance.prototype.addDay = function(){
    logger.debug("现在是第几天:" + this.dayRecord);
    this.dayRecord += 1;
    if (this.dayRecord >= 7)
    {
        this.dayRecord = 1;
    }
};
/*添加消息记录
 * */
Instance.prototype.addUserRecord = function(msg)
{
    //logger.debug("addUserRecord:%j", msg);
    this.playersMsg.push(msg);
};
Instance.prototype.reLoadCfg = function(self,filedName, filename) {
    var tem= pomelo.app.get
    logger.debug("hall test 2:"+tem);
    var path=pomelo.app.getBase() + filename;
    if(!FS.existsSync(path))
    {
        logger.error("配置文件不存在:"+path);
        return;
    }
    var tem  = FS.readFileSync(path, 'utf8');
    logger.debug("hall reLoadCfg 2:"+path);
    logger.debug(tem);
    if(!!tem)
    {
        self[filedName] = JSON.parse(tem);
        logger.debug("hall reLoadCfg 3:%j", self[filedName]);
    }
}

/**
 * 废弃 公告移到数据库
 * @param event
 * @param filename
 */
Instance.prototype.reLoad = function(event, filename) {
    var notifyMessage  = FS.readFileSync(pomelo.app.getBase() + '/config/notifyMessage.json', 'utf8');
    logger.debug("hall reLoad 2:");
    logger.debug(notifyMessage);
    this.messageDating = JSON.parse(notifyMessage).quangang;
    logger.debug("hall reLoad 3:%j", this.messageDating);
 }

/*测试模块相关
* */
Instance.prototype.testModules = function()
{
};

Instance.prototype.getAllPlayersID = function() {
    logger.debug("当前大厅还有多少人:" + this.playerNum);
};

Instance.prototype.popArenaNum = function(){
  if (this.randArenaNum.length > 0){
    return this.randArenaNum.pop();
  }
  else{
    this.randArenaNum = [];
    for (var i = 100000; i <= 999999; i++){
      this.randArenaNum.push(i);
    }
    //logger.debug("randArenaNum：%j",this.randArenaNum);
    this.randArenaNum.sort(function() { return Math.random()>0.5 ? -1 : 1;});
    return this.randArenaNum.pop();
  }
};

Instance.prototype.popTableNum = function(){
  if (this.randTableNum.length > 0){
    return this.randTableNum.pop();
  }
  else{
    this.randTableNum = [];
    for (var i = 100000; i <= 999999; i++){
        if (!this.tableServers[i]) {
            this.randTableNum.push(i);
        }
    }

    this.randTableNum.sort(function() { return Math.random()>0.5 ? -1 : 1;});
    return this.randTableNum.pop();
  }
};

Instance.prototype.updateTableServer = function(tableNum, serverId){
  this.tableServers[tableNum] = serverId;
};

Instance.prototype.getTableServer = function(tableNum){
  return this.tableServers[tableNum];
};

/**
 * 房间解散回收房间号
 * @param tableNum
 */
Instance.prototype.recycleTableNum = function (tableNum) {
    delete this.tableServers[tableNum];
}

/**
 * 回收房间号
 * @param serverId
 */
Instance.prototype.recycleServerTableNum = function (serverId) {
    var self = this;
    _.forOwn(this.tableServers, function (key, val) {
        if (self.tableServers[key] == serverId) {
            delete self.tableServers[key];
        }
    })
}

Instance.prototype.popHuiFangNum = function(count) {
  if (this.randHuiFangNum.length > count) {
    // return this.randHuiFangNum.pop();
    return this.randHuiFangNum.splice(0, count);
  } else {
      this.randHuiFangNum = _.shuffle(_.range(100000, 999999));
      // return this.randHuiFangNum.pop();
      return this.randHuiFangNum.splice(0, count);
  }
}