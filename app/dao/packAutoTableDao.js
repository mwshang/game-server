var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');


var pro = module.exports;

pro.createInfo = function (msg, cb) {
    logger.debug("创建自动房间%j", msg);
    var sql = 'insert into qp_packautotable (pid,roomName,roomConfig,bDisable,serverType,createUid) values (?,?,?,?,?,?)';
    var args = [msg.pid, msg.roomName, msg.roomConfig, msg.bDisable, msg.serverType, msg.uid];
    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
        if (!!err) {
            logger.error('create qp_packautotable failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res.insertId);
        }
    });
};

pro.getPackAutoTableSetting = function (msg, cb) {
    var sql = "SELECT * FROM qp_packautotable WHERE pid=? and bDisable=0;";
    pomelo.app.get('dbclient').query(sql, [msg.pid], function (err, res) {
        if (!!err) {
            logger.error('qp_packautotable failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug("getInfo qp_packautotable res");
            cb(null, res);
        }
    });
}


//普通玩家 获取群自动房间信息
pro.loadAll = function (cb) {
    var sql = "SELECT * FROM qp_packautotable ";

    pomelo.app.get('dbclient').query(sql, "", function (err, res) {
        if (!!err) {
            logger.error('get list by qp_packPlayer failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {

            if (res) {
                logger.debug("pro.loadAll res");
                cb(null, res);
            } else {
                logger.debug("pro.loadAll null");
                cb(null, null);
            }
        }
    });

};

/**
 msg.uid
 */
pro.getInfo = function (id, cb) {
    var sql = "SELECT * FROM qp_packautotable WHERE id=? ";

    pomelo.app.get('dbclient').query(sql, [id], function (err, res) {
        if (!!err) {
            logger.error(' getInfo qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (res) {
                logger.debug("getInfo qp_packautotable res");
                cb(null, res);
            } else {
                logger.debug("getInfo qp_packautotable null");
                cb(null, null);
            }
        }
    });
};

//删除群
pro.delTable = function (id, cb) {
    logger.debug("删除群AutoTable ");
    var sql = "DELETE FROM qp_packautotable WHERE  id=? ";

    pomelo.app.get('dbclient').query(sql, [id], function (err, res) {
        utils.invokeCallback(cb, err, res);
    });
}

pro.updateInfo = function (id, name, val, cb) {
    var req = {
        fields: [name],
        values: [val],
        id: id
    }
    pro.updateInfos(req, cb);
}
//更新群信息
pro.updateInfos = function (msg, cb) {
    logger.error("更新群数据%j", msg);
    var sql = 'update qp_packautotable set ';
    var args = [];
    for (var tem = 0; tem < msg.fields.length; tem++) {
        sql += msg.fields[tem] + "=?,";
        args.push(msg.values[tem]);
    }
    sql = sql.substr(0, sql.length - 1);
    sql += " where id=?";
    args.push(msg.id);

    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
        if (!!err) {
            logger.error('create qp_packautotable failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res);
        }
    });
}



