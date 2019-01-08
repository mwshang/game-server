var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var moment = require('moment');
var playerHuiFangDao = module.exports;
/*
用于记录打牌回放记录
* */
 /**
  `uid1-4` int(32) unsigned NOT NULL DEFAULT '0',\
  `record` varchar(10000) COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',\
  `type` int(10) unsigned NOT NULL DEFAULT '0', \
  `fangHao` int(32) unsigned NOT NULL DEFAULT '0',\
  `recordTime` timestamp NOT NULL default CURRENT_TIMESTAMP,\

  record用来记录每个玩家的uid 名字 总积分 每局的回放号 输赢积分 时间等
 */
 playerHuiFangDao.createHuiFangRecord = function(msg, cb) {
    var msgRecord = JSON.stringify(msg["record"]);
    //logger.debug("createHuiFangRecord:%j", msg);
    //var nowDate = new Date();
    //var nowTime = nowDate.toLocaleDateString() + " "+ nowDate.toLocaleTimeString();
    if (msgRecord.length > 39999){
        logger.error("数据了太大:" + msgRecord.length);
        utils.invokeCallback(cb, "error", null);
        return;
    }
    if (!msg.uid1 || !msg.uid2 || !msg.fangHao){
        logger.error("保存回放记录错误内容不对:%j",msg);
        utils.invokeCallback(cb, "error", null);
        return;
    }
     if(msg.uid3 == null || msg.uid3 == undefined)
     {
         msg.uid3 = 0;
     }

     if(msg.uid4 == null || msg.uid4 == undefined)
     {
         msg.uid4 = 0;
     }
    //兼容之前的麻将
    if (!msg.uid5){
        msg.uid5 = 0;
        msg.uid6 = 0;
        msg.uid7 = 0;
        msg.uid8 = 0;
    }
    if(msg.serverType == undefined)
        msg.serverType = "";

    if(!msg.fangZhu)
        msg.fangZhu=0;
    if(!msg.daiKai)
        msg.daiKai=0;

     if(!msg.pid)
         msg.pid=0;

      if (!msg["baseScore"]) {
          msg["baseScore"] = 0
      }

    var sql = 'insert into qp_playerHuiFang (uid1,uid2,uid3,uid4,uid5,uid6,uid7,uid8,fangHao,record,type,serverType,fangZhu,daiKai,pid,baseScore) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var args = [msg.uid1,msg.uid2,msg.uid3,msg.uid4,msg.uid5,msg.uid6,msg.uid7,msg.uid8,msg.fangHao,msgRecord,msg.type,msg.serverType,msg.fangZhu,msg.daiKai,msg.pid,msg["baseScore"]];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create playerRecordDao failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug("createHuiFangRecord success");
            utils.invokeCallback(cb, null, res.insertId);
        }
    });

};


playerHuiFangDao.getHuiFangRecord = function(msg, cb) {

    var day1before = moment().subtract(1, 'days').format('YYYYMMDD');
    var day2before = moment().subtract(2, 'days').format('YYYYMMDD');

    var tables=["qp_playerHuiFang","qp_playerHuiFang"+day1before,"qp_playerHuiFang"+day2before];

    logger.debug("table:%j",tables);
    var funcs=[];
    var j = 0;
    for (var i=0; i<tables.length; i++) {
        funcs.push(function (cb) {
            // logger.debug("读取表："+tables[j++]);
            var temtable=tables[j++];
            var sql = "";
            var args = [];

            sql += 'select * from ' + temtable + ' where uid1 = ? OR uid2 = ? OR uid3 = ? OR uid4 = ? OR uid5 = ? OR uid6 = ? OR uid7 = ? OR uid8 = ?';

            args.push(msg.uid);
            args.push(msg.uid);
            args.push(msg.uid);
            args.push(msg.uid);
            args.push(msg.uid);
            args.push(msg.uid);
            args.push(msg.uid);
            args.push(msg.uid);

            sql += ' ORDER BY recordTime desc LIMIT 10';
            logger.debug(sql);
            pomelo.app.get('dbclient').query(sql, args, function (err, res) {
                if (err) {
                    // logger.error('get bag by getHuiFangRecord failed! ' + err.stack);
                    //  utils.invokeCallback(cb, err, null);
                    logger.debug("没有表:"+temtable);
                    cb(null,[]);
                } else {
                    if (res.length>0) {
                        logger.debug("getHuiFangRecord res:"+temtable);
                        cb(null, res);
                    } else {
                        logger.debug("getHuiFangRecord null:"+temtable);
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
        logger.debug("getHuiFangRecord res");
        cb(null, rets);
    });
};

playerHuiFangDao.getPackGameRecords = function(pid, pageIndex, pageSize, cb) {
    var sql = "SELECT table_name FROM information_schema.TABLES WHERE table_schema = ? and table_name like 'qp_playerHuiFang%'";
    // var sql = "SELECT table_name FROM information_schema.TABLES WHERE table_name like 'qp_huiFangInfo%'";
    var dbName = pomelo.app.get('mysql').database;
    logger.debug('getPackGameRecords::dbName', dbName);
    pomelo.app.get('dbclient').query(sql, [dbName], function(err, res) {
        if (err) {
            logger.error('get bag by qp_playerHuiFang failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            //logger.debug('getPackGameRecords::table_name', res);
            var day1before = moment().subtract(1, 'days').format('YYYYMMDD');
            var day2before = moment().subtract(2, 'days').format('YYYYMMDD');

            var tables = [];
            for (var i=0; i<res.length; i++) {
                var tName = res[i].table_name;
                if(tName.indexOf(day1before) != -1 || tName.indexOf(day2before) != -1){
                    tables.push('select * from ' + tName + ' where pid = ' + pid);
                }
                if (tName == 'qp_playerhuifang' || tName == 'qp_playerHuiFang') {
                    tables.push('select * from ' + tName + ' where pid = ' + pid);
                }
            }

            var sql = "select * from (" + tables.join(' union ') + ") as t ORDER BY t.recordTime desc LIMIT ?, ?;";
            var args = [(pageIndex-1)*(+pageSize), +pageSize];
            pomelo.app.get('dbclient').query(sql, args, function(err, res) {
                if (err) {
                    logger.error('get bag by qp_playerHuiFang failed! ' + err.stack);
                    utils.invokeCallback(cb, err, null);
                } else {
                    if (res) {
                        logger.debug("qp_playerHuiFang res");
                        cb(null, res);
                    } else {
                        logger.debug("qp_playerHuiFang null");
                        cb(null, null);
                    }
                }
            });
        }
    });
};

/**
 * Destroy a playerRecordDao
 *
 * @param {number} playerId
 * @param {function} cb
 */
playerHuiFangDao.destroy = function(uid, cb) {
    var sql = 'delete from qp_playerHuiFang where uid1 = ?';
    var args = [uid];

    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
      if (err)
        logger.error('delete one from qp_playerHuiFang failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

playerHuiFangDao.destroyAll = function(cb) {
    var sql = 'delete from qp_playerHuiFang';
//    var sql = 'DELETE FROM qp_playerHuiFang WHERE datediff(curdate(), recordTime) > 1';
    pomelo.app.get('dbclient').query(sql, function(err, res) {
      if (err)
        logger.error('delete from qp_playerHuiFang failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

// 修改表名为日期后缀 备份三天
playerHuiFangDao.changeTableName = function(name, cb) {
  var sql = 'ALTER TABLE qp_playerHuiFang RENAME qp_playerHuiFang' + name;

  pomelo.app.get('dbclient').query(sql, function(err, res) {
    if (err)
      logger.error('alter table name for qp_playerHuiFang failed! ' + err.stack);

    utils.invokeCallback(cb, err, res);
  });
};

// 创建新表
playerHuiFangDao.createTable = function(cb) {
  var sql = "CREATE TABLE qp_playerHuiFang (";
    sql += "id int(32) unsigned NOT NULL AUTO_INCREMENT,";
    sql += "uid1 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid2 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid3 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid4 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid5 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid6 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid7 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "uid8 int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "baseScore float(6,2) unsigned NOT NULL DEFAULT '1',";
    sql += "record varchar(20000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',";
    sql += "type int(10) unsigned NOT NULL DEFAULT '0',";
    sql += "fangHao int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "recordTime timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,";
    sql += "serverType varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',";
    sql += "fangZhu int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "daiKai int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "pid int(32) unsigned NOT NULL DEFAULT '0',";
    sql += "PRIMARY KEY (id), KEY `recordTime`(`recordTime`))";

  pomelo.app.get('dbclient').query(sql, function(err, res) {
    if (err)
      logger.error('create table qp_playerHuiFang failed! ' + err.stack);

    utils.invokeCallback(cb, err, res);
  });
};

// 删除过期表
playerHuiFangDao.dropTable = function(name, cb) {
  var sql = 'DROP TABLE IF EXISTS qp_playerHuiFang' + name;

  pomelo.app.get('dbclient').query(sql, function(err, res) {
    if (err)
      logger.error('drop table qp_playerHuiFang failed! ' + err.stack);

    utils.invokeCallback(cb, err, res);
  });
};

//代开
playerHuiFangDao.getHuiFangRecordByDaiKai = function(msg, cb) {

  var day1before = moment().subtract(1, 'days').format('YYYYMMDD');
  var day2before = moment().subtract(2, 'days').format('YYYYMMDD');

  var tables=["qp_playerHuiFang","qp_playerHuiFang"+day1before,"qp_playerHuiFang"+day2before];

  logger.debug("table:%j",tables);
  var funcs=[];
  var j = 0;
  for (var i=0; i<tables.length; i++) {
    funcs.push(function (cb) {
      // logger.debug("读取表："+tables[j++]);
      var temtable=tables[j++];
      var sql = "";
      var args = [];

      sql += 'select * from ' + temtable + ' where fangZhu = ? and daiKai = 1';

      args.push(msg.uid);

      sql += ' ORDER BY recordTime desc LIMIT 10';
      logger.debug(sql);
      pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (err) {
          // logger.error('get bag by getHuiFangRecord failed! ' + err.stack);
          //  utils.invokeCallback(cb, err, null);
          logger.debug("没有表:"+temtable);
          cb(null,[]);
        } else {
          if (res.length>0) {
            logger.debug("getHuiFangRecordByDaiKai res:"+temtable);
            cb(null, res);
          } else {
            logger.debug("getHuiFangRecordByDaiKai null:"+temtable);
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
    logger.debug("getHuiFangRecordByDaiKai res");
    cb(null, rets);
  });
//    var sql = "";
//    var args = [];
//    for (var i=0; i<tables.length; i++) {
//        sql += 'select * from ' + tables[i] + ' where fangZhu = ? and daiKai = 1';
//        if (i != tables.length - 1)
//            sql += ' union ';
//        args.push(msg.uid);
//    }
//    sql += ' ORDER BY recordTime desc LIMIT 10';
//    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
//        if (err) {
//            logger.debug("sql:" + sql);
//            logger.error("args:", args);
//            logger.error('get bag by getHuiFangRecord failed! ' + err.stack);
//            utils.invokeCallback(cb, err, null);
//        } else {
//            if (res) {
//                logger.debug("getHuiFangRecord res");
//                cb(null, res);
//            } else {
//                logger.debug("getHuiFangRecord null");
//                cb(null, null);
//            }
//        }
//    });

};
