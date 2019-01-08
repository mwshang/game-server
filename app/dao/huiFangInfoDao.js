var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var moment = require('moment');

var huiFangInfoDao = module.exports;

huiFangInfoDao.createhuiFangInfo = function(msg, cb) {
    // 测试走这里
    var msgRecord = JSON.stringify(msg["record"]);
    logger.error("保存单场数据:"+ msg.huiFangNum);
    if (msgRecord.length > 49999){
        logger.error("为何如何长？？" + msgRecord.length);
        utils.invokeCallback(cb, "err", null);
        return;
    }
    logger.error("保存单场数据serverType:"+ msg.serverType);
    if(msg.serverType == undefined)
        msg.serverType = "";

    if(msg.uid3 == null || msg.uid3 == undefined)
    {
        msg.uid3=0;
    }
    if(msg.uid4 == null || msg.uid4 == undefined)
    {
        msg.uid4=0;
    }
    if(msg.uid5 == null || msg.uid5 == undefined)
    {
        msg.uid5=0;
        msg.uid6=0;
        msg.uid7=0;
        msg.uid8=0;
    }
    if (msg.baseScore == null || msg.baseScore == undefined) {
        msg.baseScore = 0
    }
    var sql = 'insert into qp_huiFangInfo (uid1,uid2,uid3,uid4,uid5,uid6,uid7,uid8,huiFangNum,record,serverType,baseScore) values (?,?,?,?,?,?,?,?,?,?,?,?)';
    var args = [msg.uid1,msg.uid2,msg.uid3,msg.uid4,msg.uid5,msg.uid6,msg.uid7,msg.uid8,msg.huiFangNum,msgRecord,msg.serverType,msg.baseScore];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create qp_huiFangInfo failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res.insertId);
        }
    });

};

/**
 msg.uid
 */
huiFangInfoDao.gethuiFangInfo = function(huiFangNum, cb) {
    var sql = "SELECT table_name FROM information_schema.TABLES WHERE table_schema = ? and table_name like 'qp_huiFangInfo%'";
    var dbName = pomelo.app.get('mysql').database;
    logger.debug('getPackGameRecords::dbName', dbName);
    pomelo.app.get('dbclient').query(sql, [dbName], function(err, res) {
        if ( err ) {
            logger.error('get bag by qp_playerHuiFang failed! ' + err.stack);
            utils.invokeCallback(cb, err, []);
            return;
        }
        else {
            var day1before = moment().subtract(1, 'days').format('YYYYMMDD');
            var day2before = moment().subtract(2, 'days').format('YYYYMMDD');

            var tables = [];
            for (var i=0; i<res.length; i++) {
                var tName = res[i].table_name;
                if(tName.indexOf(day1before) != -1 || tName.indexOf(day2before) != -1){
                    tables.push('select * from ' + tName + ' where huiFangNum = ' + huiFangNum);
                }
                if (tName.toLowerCase() == 'qp_huifanginfo') {
                    tables.push('select * from ' + tName + ' where huiFangNum = ' + huiFangNum);
                }
            }
            var sql = "select * from (" + tables.join(' union ') + ") as t ORDER BY t.recordTime desc LIMIT 1;";
            pomelo.app.get('dbclient').query(sql, [], function(err, res) {
                if (err) {
                    logger.error('get bag by gethuiFangInfo failed! ' + err.stack);
                    utils.invokeCallback(cb, err, []);
                    return;
                } else {
                    if (res) {
                        logger.debug("gethuiFangInfo res", res);
                        cb(null, res);
                    } else {
                        logger.debug("gethuiFangInfo null");
                        cb(null, []);
                    }
                }
            });
        }
    });
};


/**
 * Destroy a huiFangInfoDao
 *
 * @param {number} playerId
 * @param {function} cb
 */
huiFangInfoDao.destroy = function(cb) {
    var sql = 'delete from qp_huiFangInfo';
//    var sql = 'DELETE FROM qp_huiFangInfo WHERE datediff(curdate(), recordTime) > 1';
    pomelo.app.get('dbclient').query(sql, function(err, res) {
        utils.invokeCallback(cb, err, res);
    });
};

// 修改表名为日期后缀 备份三天
huiFangInfoDao.changeTableName = function(name, cb) {
    var sql = 'ALTER TABLE qp_huiFangInfo RENAME qp_huiFangInfo' + name;

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('alter table name for qp_huiFangInfo failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

// 创建新表
huiFangInfoDao.createTable = function(cb) {
    var sql = "CREATE TABLE qp_huiFangInfo (";
        sql += "id int(32) unsigned NOT NULL AUTO_INCREMENT,";
        sql += "uid1 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid2 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid3 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid4 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid5 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid6 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid7 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "uid8 int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "huiFangNum int(32) unsigned NOT NULL DEFAULT '0',";
        sql += "baseScore float(6,2) unsigned NOT NULL DEFAULT '1',";
        sql += "record text(30000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,";
        sql += "recordTime timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,";
        sql += "serverType varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',";
        sql += "PRIMARY KEY (id),";
        sql += "KEY huifangNum_recordTime (huiFangNum,recordTime))";

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('create table qp_huiFangInfo failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

// 删除过期表
huiFangInfoDao.dropTable = function(name, cb) {
    var sql = 'DROP TABLE IF EXISTS qp_huiFangInfo' + name;

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('drop table qp_huiFangInfo failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

