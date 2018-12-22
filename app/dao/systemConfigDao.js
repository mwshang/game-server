var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var systemConfigDao = module.exports;

/**
 * 登录奖励相关
 *
 */
systemConfigDao.getSystemConfig = function(uid, cb){
    var sql = 'select * from qp_systemConfig where id = ?';
    var args = [uid];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, null, null);
            return;
        } else {
            utils.invokeCallback(cb, null, res);
        }
    });
};

systemConfigDao.setSystemConfig = function(dayRecord, cb){
    var sql = 'update qp_systemConfig set dayRecord = ? where id = ?';
    var args = [dayRecord, 0];
    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            logger.error('写入systemconfig成功数据库失败!　' + ' stack:' + err.stack);
            return;
        }
        else {
            logger.debug("写入systemconfig成功");
        }
    });
};


