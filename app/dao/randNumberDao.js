var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');

var randNumberDao = module.exports;
/*
用于生成随机6位数 创建房间 创建回放码用
* */
randNumberDao.getRandNumber = function(cb) {
    var sql = 'SELECT random_num FROM (SELECT FLOOR(RAND() * 999999) AS random_num FROM qp_randNumber UNION SELECT FLOOR(RAND() * 999999) AS random_num) AS ss  WHERE "random_num" NOT IN (SELECT randNumber FROM qp_randNumber) LIMIT 1';
    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err) {
            logger.error('create createRandNumber failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug(res);
            logger.debug(res[0].random_num);
            var sql1 = 'insert into qp_randNumber (randNumber) values (?)';
            var args1 = [res[0].random_num];
            logger.debug("准备生成随机数啦1");
            pomelo.app.get('dbclient').query(sql1, args1, function(err1, res1) {
                logger.debug("准备生成随机数啦3");
                if (err1) {
                    logger.error('create createRandNumber failed! ' + err1.stack);
                    utils.invokeCallback(cb, err1, null);
                } else {
                    //utils.invokeCallback(cb, null, res1.insertId);
                }
            });

            utils.invokeCallback(cb, null, res[0].random_num);
        }
    });
};

randNumberDao.destroy = function(cb) {
    var sql = 'delete from qp_randNumber';
    pomelo.app.dbclinet.query(sql, function(err, res) {
        utils.invokeCallback(cb, err, res);
    });
};

