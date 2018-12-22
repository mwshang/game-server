
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
var moment = require('moment');

var pro = module.exports;

pro.lossPackGemNum = function (pid, tableId, val, cb) {
    logger.debug('lossPackGemNum', pid, val);
    var sql = 'INSERT INTO `qp_packlosslog`(`pid`,`tableId`,`num`) VALUES(?,?,?)';
    var args = [pid, tableId, val];
    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
        if (!!err) {
            logger.error('lossPackGemNum failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            pro.packLossCount(pid, val);
            utils.invokeCallback(cb, null, res.insertId);
        }
    });
}

var TypeOfCTime = {
    DAY: 1, WEEK: 2, MONTH: 3
}
pro.packLossCount = function (pid, val) {
    var todayStr = moment().format('YYYYMMDD');
    var sql = 'SELECT COUNT(*) as num FROM `qp_packlosscount` WHERE `type`=1 AND `pid`=? AND `cTime`=?';
    var args = [TypeOfCTime.DAY, pid, todayStr];
    pomelo.app.get('dbclient').query(sql, args, function (err, data) {
        if (!!data && data[0].num > 0) {
            // update
            var sql1 = 'UPDATE `qp_packlosscount` SET `num`=`num`+? WHERE `type`=1 AND `pid`=? AND `cTime`=?';
            var args1 = [val, pid, todayStr];
            pomelo.app.get('dbclient').query(sql1, args1, function (err, res) {
                logger.debug('update qp_packlosscount', err, res);
            });
        } else {
            // insert
            var sql2 = 'INSERT INTO `qp_packlosscount`(`pid`,`type`,`cTime`,`num`) VALUES(?,?,?,?)';
            var args2 = [pid, TypeOfCTime.DAY, todayStr, val];
            pomelo.app.get('dbclient').insert(sql2, args2, function (err, res) {
                logger.debug('insert qp_packlosscount', err, res);
            });
        }
    })
}