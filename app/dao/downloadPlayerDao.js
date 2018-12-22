var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var downloadPlayerDao = module.exports;

/**
 * 通过分享邀请码下载地址的玩家信息  玩家信息和邀请码
 *
 */
downloadPlayerDao.getAgentCode = function(deviceId, cb){
    var sql = 'select agentCode from qp_download_player where unionid = ?';
    var args = [deviceId];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, null, null);
            return;
        } else {
            utils.invokeCallback(cb, null, res[0].agentCode);
        }
    });
};



