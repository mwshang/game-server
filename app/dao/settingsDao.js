var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var settingsDao = module.exports;

/**
 * 系统设置
 *
 */
settingsDao.getSettings = function(key, cb){
    var sql = 'select value from qp_settings where qp_settings.key = ?';
    var args = [key];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, null, null);
            return;
        } else {
            utils.invokeCallback(cb, null, res[0].value);
        }
    });
};

settingsDao.getSettingList = function(keys, cb){
    var sql = 'select `key`, value from qp_settings where qp_settings.key in ('+keys+')';

    pomelo.app.get('dbclient').query(sql,function(err, res) {
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

settingsDao.setSettings = function(key, val, cb){
    var sql = 'select `key`, value from qp_settings where qp_settings.key = ?';
    var args = [key];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err || (!res || res.length <= 0)) {
            var sql = 'insert into qp_settings(`key`, `value`) values(?,?)';
            pomelo.app.get('dbclient').query(sql,[key, val],function(err, res) {
                if(err) {
                    utils.invokeCallback(cb, err.message, null);
                    return;
                } else {
                    utils.invokeCallback(cb, null, res.insertId);
                    return;
                }
            })
        } else {
            var sql = 'update qp_settings set `value`=? where `key`= ?';
            pomelo.app.get('dbclient').query(sql, [val, key],function(err, res) {
                if(err) {
                    utils.invokeCallback(cb, err.message, null);
                    return;
                } else {
                    utils.invokeCallback(cb, null, res.changedRows);
                    return;
                }
            })
        }
    });
};


