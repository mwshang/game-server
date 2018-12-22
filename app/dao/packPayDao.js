
/**
 * Created by jxy on 2017/6/22 0022.
 * 群消耗统计相关
 */
var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var packPlayerDao = require('./packPlayerDao');

var packPayDao = module.exports;

/**
 * 群房卡充值|提取记录
 * @param pid
 * @param uid
 * @param type
 * @param val
 * @param cb
 */
packPayDao.addPackPayLog = function (pid, uid, type, val, cb) {
    logger.debug('addPackPayLog', pid, uid, type, val);
    var sql = 'INSERT INTO `qp_packpaylog`(`pid`,`optUid`,`type`,`num`) VALUES(?,?,?,?)';
    var args = [pid, uid, type, val];
    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
        if (!!err) {
            logger.error('addPackPayLog failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            utils.invokeCallback(cb, null, res.insertId);
        }
    });
}