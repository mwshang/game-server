var dataApi = require('../../util/dataApi');
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var channelUtil = require('../../util/channelUtil');
var Code = require('../../consts/code');
var systemConfigDao = require('../../dao/systemConfigDao');
var huiFangInfoDao = require('../../dao/huiFangInfoDao');
var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var arenaRankDao = require('../../dao/arenaRankDao');
var schedule = require('pomelo-scheduler');
var activeDao = require('../../dao/activeDao');
var packGameRecordDao = require('../../dao/packGameRecordDao');
var rank = require('./rank');
var active = require('./active');
var moment = require('moment');

var Timer = function(hall, interval)
{
  this.hall = hall;
  this.interval = interval||1000;
};

module.exports = Timer;

Timer.prototype.run = function ()
{
    //每天5点更新 每日登陆 活动基本信息
    //schedule.scheduleJob('59 34 16 * * *', this.cronZeroJob, {id:1});
    logger.debug("大厅定时器启动");
    schedule.scheduleJob('30 00 00 * * *', this.cronClearHuiFang, {id:2});
   // schedule.scheduleJob('59 47 21 * * *', this.cronClearHuiFang, {id:2});
    //每隔60分钟保存所以玩家信息
    //schedule.scheduleJob('59 00 * * * *', this.cronSyncDBJob, {id:3}

    //test
//    setInterval (function () {
//        var msg = {};
//        msg.contents = "为了更好的游戏体验，临时维护5分钟，祝您游戏愉快";
//        msg.type = 2;
//        this.hall.sendTempNotifyMsg(msg);
//    }.bind(this),30000);
};

Timer.prototype.close = function ()
{
    //备份数据
    this.cronSyncDBJob(null);
};

/*每60分钟保存玩家信息一次
* */
Timer.prototype.cronSyncDBJob = function(data)
{
    logger.debug("每隔10分钟更新一次");
    var hall = pomelo.app.get('hall');
    if (hall != null){
        hall.sync2DBPlayers();
        hall.sync2DBUserRecord();
    }
}

/*五点定点更新
* */
Timer.prototype.cronZeroJob = function(data)
{
    logger.debug("刷新每天数据");

    //当前天数加一 最多保留7天
    pomelo.app.get("hall").addDay();
    systemConfigDao.setSystemConfig(pomelo.app.get("hall").toDay());

    //连续登陆 记录
    activeDao.setContinueDay(null,null);

    //所有玩家active还原
    activeDao.resetEveryDay(null,null);

    //排行榜刷新
    rank.resetRankData();

    //vip天数减1 查询所有是VIP的人 再统一减
}

/*五点定点清理回放数据
 * */
Timer.prototype.cronClearHuiFang = function(data)
{
    logger.debug("清理每天回放数据");

    var yesterday = moment().subtract(1, 'days').format('YYYYMMDD');
    playerHuiFangDao.changeTableName(yesterday, function () {
        logger.debug("备份回放信息1");

        playerHuiFangDao.createTable(function () {
            logger.debug("创建新回放表1");
        });
    });

    huiFangInfoDao.changeTableName(yesterday, function () {
        logger.debug("备份回放信息2");

        huiFangInfoDao.createTable(function () {
            logger.debug("创建新回放表1");
        });
    });
    arenaRankDao.changeTableName(yesterday, function () {
        logger.debug("备份比赛场信息2");

        arenaRankDao.createTable(function () {
            logger.debug("创建新比赛场表1");
        });
    });

    packGameRecordDao.changeTableName(yesterday, function () {
        logger.debug("备份俱乐部信息2");

        packGameRecordDao.createTable(function () {
            logger.debug("创建新俱乐部场表1");
        });
    });

    var day3before = moment().subtract(3, 'days').format('YYYYMMDD');
//    playerHuiFangDao.dropTable(day3before, function () {
//        logger.debug("删除过期回放表1");
//    });

    huiFangInfoDao.dropTable(day3before, function () {
        logger.debug("删除过期回放表1");
    });

    arenaRankDao.dropTable(day3before, function () {
        logger.debug("删除过期比赛场");
    });

    packGameRecordDao.dropTable(day3before, function () {
        logger.debug("删除过期表1");
    });
    // playerHuiFangDao.destroyAll(function(){
    //     logger.debug("清理回放信息1");
    // });
    //
    // huiFangInfoDao.destroy(function(){
    //    logger.debug("清理回放信息2");
    // });

    active.resetActive();

    //清理游戏服务器房间号
//    pomelo.app.rpc.quanzhou.mjRemote.updateTimeEvent("", "", function(){
//
//    });

}

/**
 *
 * @param cron
 * @param cb
 * @param data
 * @returns {*}
 */
Timer.prototype.addSchedule = function (cron, cb, data) {
    return schedule.scheduleJob(cron, cb, data);
}

/**
 *
 * @param id
 * @returns {*}
 */
Timer.prototype.cancelSchedule = function (id) {
    return schedule.cancelJob(id);
}