var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');
var moment = require('moment');

var yylDao = module.exports;

/**
 * 系统设置
 *
 */
yylDao.addInfo = function(uid,betNum,rewardNum,type,nickName,cards,cb){
    logger.debug("create yyl info:" + uid);
    var sql = 'insert into qp_yylStateInfo (uid,betNum,rewardNum,type,nickName,cards,createTime) values (?,?,?,?,?,?,?)';
    var args = [uid,betNum,rewardNum,type,nickName,String(cards),moment().format()];

    logger.debug("yylInfo args %j",args);

    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create yylinfo for bagDao failed! ' + err.stack);
            //utils.invokeCallback(cb, err, null);
        } else {
            logger.debug('create yylinfo success !');
            //var bag = new Bag({uid: res.insertId});
            //utils.invokeCallback(cb, null, null);
        }
    });
}


yylDao.getSettings = function(key, cb){
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

yylDao.getSettingList = function(keys, cb){
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

yylDao.setSettings = function(key, val, cb){
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

//抽奖记录
yylDao.getInfoByUid = function(uid,cb){
    var sql = 'select * from qp_yylStateInfo where uid = ? ORDER BY createTime desc LIMIT 10';
    var args = [uid];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error(' yylinfo for bagDao failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug('create yylinfo success:%j',res);
            utils.invokeCallback(cb, null, res);
        }
    });
}


//中奖信息
yylDao.getRewardInfoByUid = function(uid,cb){
    var sql = 'select * from qp_yylStateInfo where uid = ? and type > 1 ORDER BY createTime desc LIMIT 10';
    var args = [uid];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error(' yylinfo for bagDao failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug('create yylinfo success:%j',res);
            utils.invokeCallback(cb, null, res);
        }
    });
}

//所有人中的大奖信息
yylDao.getBigRewardInfoByUid = function(type,cb){
    if (type < 1){
        type = 5;
    }
    var sql = 'select * from qp_yylStateInfo where type > ? ORDER BY createTime desc LIMIT 10';
    var args = [type];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error(' yylinfo for bagDao failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.debug('create yylinfo success:%j',res);
            utils.invokeCallback(cb, null, res);
        }
    });
}

//当前连中信息
yylDao.getLianZhongInfoByUid = function(uid,cb){

    var sql = 'SELECT * from qp_yylStateInfo where uid = ? ORDER BY createTime desc LIMIT 20';
    var args = [uid];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error(' getLianZhongInfoByUid for bagDao failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            //logger.debug('create getLianZhongInfoByUid success:%j',res);
            utils.invokeCallback(cb, null, res);
        }
    });
}

//当前10中几
yylDao.getRewardInTenByUid = function(uid,cb){

    var sql = 'SELECT * from qp_yylStateInfo where uid = ? ORDER BY createTime desc LIMIT 10';
    var args = [uid];
    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error(' getRewardInTenByUid for bagDao failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            //logger.debug('create getLianZhongInfoByUid success:%j',res);
            utils.invokeCallback(cb, null, res);
        }
    });
}
