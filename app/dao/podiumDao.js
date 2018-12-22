var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');

var podiumDao = module.exports;

/*
用于记录领奖模块例如 玩家A有未领奖的金币等 其他玩家赠送的金币钻石 VIP每天领取的金币钻石 是否领取了等
uid会有多份
* */

podiumDao.createPodium = function(msg, cb) {

    logger.debug("createUserRecord:%j", msg);

    var sql = 'insert into qp_podium (uid, userName ,record, type,giveUid,giveUserName,coin,gem, podiumKey) values (?, ?, ?, ?,?, ?, ?, ?,?)';
    var args = [msg.uid, msg.userName,msg.record,msg.type,msg.giveUid, msg.giveUserName, msg.coin, msg.gem, msg.podiumKey];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create createPodium failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res.insertId);
        }
    });

};

/**
 msg.uid
 */
podiumDao.getUserPodium = function(uid, cb) {
    var sql = 'select * from qp_podium where uid = ? and isGet = 0';
    var args = [uid];

    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
        if (err) {
            logger.error('get bag by getUserRecord failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (res)
            {
                logger.debug("getUserGameRecord res:");
                //logger.debug(res);
                cb(null, res);
            } else {
                logger.debug("getUserGameRecord null");
                cb(err, null);
            }
        }
    });
};

podiumDao.updateUserPodium = function(msg, cb) {
    var sql = 'update qp_podium set isGet = 1 where uid = ? and podiumKey = ?';
    var args = [msg.uid, msg.podiumKey];

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
 * Destroy a podiumDao
 *
 * @param {number} playerId
 * @param {function} cb
 */
podiumDao.destroy = function(msg, cb) {
    var sql = 'delete from qp_podium where uid = ? and podiumKey = ?';
    var args = [msg.uid, msg.podiumKey];

    pomelo.app.dbclinet.query(sql, args, function(err, res) {
        utils.invokeCallback(cb, err, res);
    });
};

