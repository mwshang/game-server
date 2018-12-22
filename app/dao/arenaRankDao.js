/**
 * Created by Administrator on 2017/6/22 0022.
 */
var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var moment = require('moment');
var arenaRankDao = module.exports;


arenaRankDao.createInfo = function(msg, cb) {

    logger.error("保存比赛场数据%j",msg);
    if(msg.serverType == undefined )
        msg.serverType = "";

    if(msg.startTime==undefined)
        msg.startTime=msg.endTime;

    var playerIds=JSON.stringify(msg.playerIds);
    var rankList=JSON.stringify(msg.rankList);
    var sql = 'insert into qp_arenaRank (aid,ownerUid,name,serverType,startTime,endTime,playerIds,rankList) values (?,?,?,?,?,?,?,?)';
    var args = [msg.aid,msg.ownerUid,msg.name,msg.serverType,msg.startTime,msg.endTime,playerIds,rankList];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create qp_arenaRank failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res.insertId);
        }
    });

};

//获取参加过的比赛场数据
arenaRankDao.getArenaList = function(uid, cb) {

  var day1before = moment().subtract(1, 'days').format('YYYYMMDD');
  var day2before = moment().subtract(2, 'days').format('YYYYMMDD');

  var tables=["qp_arenaRank","qp_arenaRank"+day1before,"qp_arenaRank"+day2before];

  var funcs=[];
  var j = 0;
  for (var i=0; i<tables.length; i++) {
    funcs.push(function (cb) {
      // logger.debug("读取表："+tables[j++]);
      var temtable=tables[j++];
      var sql = "";
      var args = [];
      sql += 'select * from ' + temtable + ' where playerIds like '+"'%" + uid + "%' or ownerUid =?" ;
      args.push(uid);
      sql += ' ORDER BY recordTime desc LIMIT 10';
      logger.debug(sql);
      pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (err) {
          logger.debug("没有表:"+temtable);
          cb(null,[]);
        } else {
          if (res.length>0) {
            logger.debug("getArenaList res:"+temtable);
            cb(null, res);
          } else {
            logger.debug("getArenaList null:"+temtable);
            cb(null, []);
          }
        }
      });
    });
  }
  async.series(funcs, function(err, results){
//    logger.debug("错误:",err);
//    logger.debug("%j",results);
    var rets=[];
    for (var j=0; j<results.length; j++) {
      if(!results[j]){
        logger.error("结果有空值：%j",results[j]);
      }
      else
      {
        if (results[j].length > 0) {
          logger.error("结果长度：%d",results[j].length);
          for(var tem in results[j])
          {
            if(rets.length>10)
            {
              break;
            }
            rets.push(results[j][tem]);
          }

        }
      }
    }
    logger.debug("getArenaList res");
    cb(null, rets);
  });
//    var sql = "";
//    var args = [];
//    for (var i=0; i<tables.length; i++) {
//        sql += 'select * from ' + tables[i] + ' where playerIds like '+"'%" + uid + "%' or ownerUid =?" ;
//        if (i != tables.length - 1)
//            sql += ' union ';
//        args.push(uid);
//    }
//    sql += ' ORDER BY recordTime desc LIMIT 20';
//    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
//        if (err) {
//            logger.error('get bag by getArenaList failed! ' + err.stack);
//            utils.invokeCallback(cb, err, null);
//        } else {
//            if (res) {
//                logger.debug("getarenaRank res");
//                cb(null, res);
//            } else {
//                logger.debug("getarenaRank null");
//                cb(null, null);
//            }
//        }
//    });

};
/**
 msg.uid
 */
arenaRankDao.getInfo = function(aid, cb) {
    var day1before = moment().subtract(1, 'days').format('YYYYMMDD');
    var day2before = moment().subtract(2, 'days').format('YYYYMMDD');

    var tables=["qp_arenaRank","qp_arenaRank"+day1before,"qp_arenaRank"+day2before];
  var funcs=[];
  var j = 0;
  for (var i=0; i<tables.length; i++) {
    funcs.push(function (cb) {
      // logger.debug("读取表："+tables[j++]);
      var temtable=tables[j++];
      var sql = "";
      var args = [];
      sql += 'select * from ' + temtable + ' where aid = ?';
      args.push(aid);
      sql += ' ORDER BY recordTime desc LIMIT 1';
      logger.debug(sql);
      pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (err) {
          logger.debug("没有表:"+temtable);
          cb(null,[]);
        } else {
          if (res.length>0) {
            logger.debug("getarenaRank res:"+temtable);
            cb(null, res);
          } else {
            logger.debug("getarenaRank null:"+temtable);
            cb(null, []);
          }
        }
      });
    });
  }
  async.series(funcs, function(err, results){
//    logger.debug("错误:",err);
//    logger.debug("%j",results);
    var rets=[];
    for (var j=0; j<results.length; j++) {
      if(!results[j]){
        logger.error("结果有空值：%j",results[j]);
      }
      else
      {
        if (results[j].length > 0) {
          logger.error("结果长度：%d",results[j].length);
          for(var tem in results[j])
          {
            if(rets.length>1)
            {
              break;
            }
            rets.push(results[j][tem]);
          }

        }
      }
    }
    logger.debug("getarenaRank res");
    cb(null, rets);
  });
//    var sql = "";
//    var args = [];
//    for (var i=0; i<tables.length; i++) {
//        sql += 'select * from ' + tables[i] + ' where aid = ?';
//        if (i != tables.length - 1)
//            sql += ' union ';
//        args.push(aid);
//    }
//    sql += ' ORDER BY recordTime desc LIMIT 1';
//    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
//        if (err) {
//            logger.error('get bag by getarenaRank failed! ' + err.stack);
//            utils.invokeCallback(cb, err, null);
//        } else {
//            if (res) {
//                logger.debug("getarenaRank res");
//                cb(null, res);
//            } else {
//                logger.debug("getarenaRank null");
//                cb(null, null);
//            }
//        }
//    });

};
/**
 * Destroy a arenaRankDao
 *
 * @param {number} playerId
 * @param {function} cb
 */
arenaRankDao.destroy = function(cb) {
    var sql = 'delete from qp_huiFangInfo';
//    var sql = 'DELETE FROM qp_arenaRank WHERE datediff(curdate(), recordTime) > 1';
    pomelo.app.get('dbclient').query(sql, function(err, res) {
        utils.invokeCallback(cb, err, res);
    });
};

// 修改表名为日期后缀 备份三天
arenaRankDao.changeTableName = function(name, cb) {
    var sql = 'ALTER TABLE qp_arenaRank RENAME qp_arenaRank' + name;

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('alter table name for qp_arenaRank failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};
// 创建新表
arenaRankDao.createTable =function(cb){
    var sql ="CREATE TABLE `qp_arenaRank` (";
    sql+="`id` int(11) NOT NULL AUTO_INCREMENT,";
    sql+="`aid` int(11) NOT NULL ,";
    sql+="`ownerUid` int(11) NOT NULL,";
    sql+="`name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,";
    sql+="`serverType` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,";
    sql+=" `startTime` timestamp NULL DEFAULT NULL,";
    sql+="`endTime` timestamp NULL DEFAULT NULL,";
    sql+="`playerIds` varchar(2000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,";
    sql+="`rankList` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,";
    sql+="`recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,";
    sql+="PRIMARY KEY (`id`) ) ";

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('create table qp_arenaRank failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

// 删除过期表
arenaRankDao.dropTable = function(name, cb) {
    var sql = 'DROP TABLE IF EXISTS qp_arenaRank' + name;

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('drop table qp_huiFangInfo failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};