var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');

var fangkaRecordDao = module.exports;

fangkaRecordDao.createFangkaRecord = function(msg, cb) {

    logger.debug("createFangkaRecord:%j", msg);
    var sql = 'insert into qp_fangkaRecord (uid, userName , type,giveUid,giveUserName,gemNum) values (?, ?, ?, ?,?,?)';
    var args = [msg.uid, msg.userName,msg.type,msg.giveUid, msg.giveUserName, msg.gemNum];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create createPodium failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug('createFangkaRecord success! ');
            utils.invokeCallback(cb, null, res.insertId);
        }
    });

};

/**
 msg.uid
 */
fangkaRecordDao.getFangkaRecord = function(uid, cb) {
    var sql = 'select * from qp_fangkaRecord where uid = ?';
    var args = [uid];
    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
        if (err) {
            logger.error('get getFangkaRecord  failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (res)
            {
                logger.debug("getFangkaRecord success:");
                cb(null, res);
            } else {
                logger.debug("getFangkaRecord null");
                cb(err, null);
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
fangkaRecordDao.destroy = function(uid, cb) {
    var sql = 'delete from qp_fangkaRecord where uid = ?';
    var args = [uid];

    pomelo.app.dbclinet.query(sql, args, function(err, res) {
        if (err)
            logger.error('delete one from qp_fangkaRecord failed! ' + err.stack);

        utils.invokeCallback(cb, err, res);
    });
};

