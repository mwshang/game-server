var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var moment = require('moment');
var playerRecordDao = module.exports;

/*
用于记录玩家的喊话 聊天 打牌时候的炸弹 领奖等消息 即带整个消息内容的记录
* */

 /**
msg:uid
msg:record
msg:type
msg:recordTime
 */
playerRecordDao.createUserRecord = function(msg, cb) {
    var nowTime = Date.now();

    //{"uid":100003,"userName":"a2","serverId":"hall-server-1","type":4,"record":"a"}
    logger.debug("createUserRecord:%j", msg);
    //var nowDate = new Date();
    //var nowTime = nowDate.toLocaleDateString() + " "+ nowDate.toLocaleTimeString();

    var sql = 'insert into qp_userRecord (uid, userName ,record, type) values (?, ?, ?, ?)';
    var args = [msg.uid, msg.userName,msg.record,msg.type];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create playerRecordDao failed! ' + err.stack + " nowDate = " + nowTime);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res.insertId);
        }
    });

};

/**
 msg.type
 */
playerRecordDao.getUserGameRecord = function(msg, cb) {
    var sql = 'select * from qp_userRecord where type = ? ORDER BY recordTime ASC LIMIT 10';
    var args = [msg.type];

    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
        if (err) {
            logger.error('get bag by getUserRecord failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (res)
            {
                logger.debug("getUserGameRecord res");
                cb(null, res);
            } else {
                logger.debug("getUserGameRecord null");
                cb(null, null);
            }
        }
    });
};


/**
 * Destroy a playerRecordDao
 *
 * @param {number} playerId
 * @param {function} cb
 */
playerRecordDao.destroy = function(uid, cb) {
    var sql = 'delete from qp_playerRecord where uid = ?';
    var args = [uid];

    pomelo.app.dbclinet.query(sql, args, function(err, res) {
        utils.invokeCallback(cb, err, res);
    });
};

