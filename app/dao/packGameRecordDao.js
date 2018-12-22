var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var moment = require('moment');

var pro = module.exports;

pro.addRecord = function (msg, tableInfo, ungame, cb) {
    logger.debug("创建游戏记录", msg/*, tableInfo*/);
    var record = JSON.stringify(msg.data);
    if (ungame == 0 || !msg.data || !msg.data.result || msg.data.result.length < 1) {
        utils.invokeCallback(cb, 'null record!');
        return;
    }
    var sql = 'insert into qp_packgamerecord (`pid`,uid1,uid2,uid3,uid4,uid5,uid6,uid7,uid8, `fangHao`,`rounds`,`tableType`,`ungame`, `record`) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var args = [msg.pid,
        tableInfo['table'].chairArr.length > 0 ? tableInfo['table'].chairArr[0] : 0,
        tableInfo['table'].chairArr.length > 1 ? tableInfo['table'].chairArr[1] : 0,
        tableInfo['table'].chairArr.length > 2 ? tableInfo['table'].chairArr[2] : 0,
        tableInfo['table'].chairArr.length > 3 ? tableInfo['table'].chairArr[3] : 0,
        tableInfo['table'].chairArr.length > 4 ? tableInfo['table'].chairArr[4] : 0,
        tableInfo['table'].chairArr.length > 5 ? tableInfo['table'].chairArr[5] : 0,
        tableInfo['table'].chairArr.length > 6 ? tableInfo['table'].chairArr[6] : 0,
        tableInfo['table'].chairArr.length > 7 ? tableInfo['table'].chairArr[7] : 0,
        msg.tableId, tableInfo.config.rounds, tableInfo.tableType, ungame, record];
    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
        if (!!err) {
            logger.error('创建游戏记录2 ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (tableInfo['table'] && tableInfo['table'].chairArr.length > 0) {
                pro.addPlayCount(msg.pid, tableInfo['table'].chairArr);
            }
            utils.invokeCallback(cb, null, res.insertId);
        }
    });
};

var addPlayCountImp = function (pid, playerUids) {
    if (playerUids.length < 1)
        return;
    var today = moment().format('YYYYMMDD');
    var uid = playerUids.shift();
    var sql = "select * from qp_packplaycount where pid=? and uid=? and playTime=?";
    var args = [pid, uid, today];
    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
        if (!!err || !res || res.length < 1) {
            // insert
            sql = "insert into qp_packplaycount(pid,uid,num,playTime) values(?,?,?,?);";
            args = [pid, uid, 1, today];
            pomelo.app.get('dbclient').query(sql, args, function (err, res) {
                addPlayCountImp(pid, playerUids);
            });
        } else {
            sql = "update qp_packplaycount set num=num+1 where id=?";
            pomelo.app.get('dbclient').query(sql, [res[0].id], function (err, res) {
                addPlayCountImp(pid, playerUids);
            });
        }
    });
}
pro.addPlayCount = function (pid, playerUids) {
    if (playerUids.length < 1)
        return;
    addPlayCountImp(pid, playerUids);
}

pro.getPackGameRecords = function(pid, pageIndex, pageSize, cb) {
    var sql = "SELECT table_name FROM information_schema.TABLES WHERE table_schema = ? and table_name like 'qp_packgamerecord%'";
    // var sql = "SELECT table_name FROM information_schema.TABLES WHERE table_name like 'qp_huiFangInfo%'";
    pomelo.app.get('dbclient').query(sql, ['majhong'], function(err, res) {
        if (err) {
            logger.error('get bag by qp_packgamerecord failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            var tables = [];
            var map = {};
            for (var i=0; i<res.length; i++) {
                if(!map[res[i].table_name]){
                    tables.push(res[i].table_name);
                    map[res[i].table_name] = 1;
                }
            }

            var sql = "";
            var args = [];
            for (var i=0; i<tables.length; i++) {
                sql += 'select * from ' + tables[i] + ' where pid = ?';
                if (i != tables.length - 1)
                    sql += ' union ';
                args.push(pid);
            }
            sql += ' ORDER BY recordTime desc LIMIT ?, ?';
            args.push((pageIndex - 1) * pageIndex, +pageSize);
            pomelo.app.get('dbclient').query(sql, args, function(err, res) {
                if (err) {
                    logger.error('get bag by qp_packgamerecord failed! ' + err.stack);
                    utils.invokeCallback(cb, err, null);
                } else {
                    if (res) {
                        logger.debug("qp_packgamerecord res");
                        cb(null, res);
                    } else {
                        logger.debug("qp_packgamerecord null");
                        cb(null, null);
                    }
                }
            });
        }
    });
};


/**
 * Destroy a qp_packgamerecord
 *
 * @param {number} playerId
 * @param {function} cb
 */
pro.destroy = function(cb) {
    var sql = 'delete from qp_packgamerecord';
    pomelo.app.get('dbclient').query(sql, function(err, res) {
        utils.invokeCallback(cb, err, res);
    });
};

// 修改表名为日期后缀 备份三天
pro.changeTableName = function(name, cb) {
    var sql = 'ALTER TABLE qp_packgamerecord RENAME qp_packgamerecord' + name;

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('alter table name for qp_packgamerecord failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

// 创建新表
pro.createTable = function(cb) {
    var sql = "CREATE TABLE qp_packgamerecord (";
    sql += "id int(11) unsigned NOT NULL AUTO_INCREMENT,";
    sql += "pid int(11) NOT NULL DEFAULT '0',";
    sql += "uid1 int(11) NOT NULL DEFAULT '0',";
    sql += "uid2 int(11) NOT NULL DEFAULT '0',";
    sql += "uid3 int(11) NOT NULL DEFAULT '0',";
    sql += "uid4 int(11) NOT NULL DEFAULT '0',";
    sql += "uid5 int(11) NOT NULL DEFAULT '0',";
    sql += "uid6 int(11) NOT NULL DEFAULT '0',";
    sql += "uid7 int(11) NOT NULL DEFAULT '0',";
    sql += "uid8 int(11) NOT NULL DEFAULT '0',";
    sql += "fangHao int(11) NOT NULL DEFAULT '0',";
    sql += "rounds int(11)  NOT NULL DEFAULT '0',";
    sql += "tableType varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',";
    sql += "ungame int(11) NOT NULL DEFAULT '0',";
    sql += "record text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,";
    sql += "recordTime timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,";
    sql += "PRIMARY KEY (id)) ";
    sql += "ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;";

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('create table qp_packgamerecord failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

// 删除过期表
pro.dropTable = function(name, cb) {
    var sql = 'DROP TABLE IF EXISTS qp_packgamerecord' + name;

    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err)
            logger.error('drop table qp_packgamerecord failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};



