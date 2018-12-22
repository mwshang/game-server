var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var QPPlayer = require('../domain/entity/player');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');


/*
玩家永久性游戏记录 例如每天赢了多少钱 每周下注了多少等等  用于排行榜 领奖 记录等 都是具体的游戏玩法金币、赌注记录
* */

var playerGameRecordDao = module.exports;

playerGameRecordDao.getGameRecordByUid = function(uid, cb){
	var sql = 'select * from qp_playerGameRecord where uid = ?';
	var args = [uid];

	pomelo.app.get('dbclient').query(sql,args,function(err, res) {
		if(err) {
			utils.invokeCallback(cb, err.message, null);
			return;
		}
		if(!res || res.length <= 0) {
			utils.invokeCallback(cb, err, null);
			return;
		} else {
			utils.invokeCallback(cb, null, res);
		}
	});
};

playerGameRecordDao.updateGameRecord = function (msg, cb)
{
    logger.debug("updateGameRecord 2:%j", msg);
	var sql = 'update qp_playerGameRecord set dayCoin = ?, weekCoin = ? ,dayChipIn = ? , totalChipIn = ? where uid = ?';
    var args = [msg.dayCoin,msg.weekCoin, msg.dayChipIn, msg.totalChipIn, msg.uid];
	pomelo.app.get('dbclient').query(sql,args,function(err, res)
    {
		if(err !== null)
        {
            logger.error('update updateGameRecord failed: ' + err.stack);
			utils.invokeCallback(cb,err.message, null);
		} else
        {
			if (!!res && res.affectedRows>0)
            {
                logger.error('update updateGameRecord success');
				utils.invokeCallback(cb,null,true);
			} else
            {
				logger.error('update updateGameRecord failed!');
				utils.invokeCallback(cb,null,false);
			}
		}
	});
};

playerGameRecordDao.createGameRecord = function (uid,cb){
    var sql = 'insert into qp_playerGameRecord (uid) values(?)';
    var loginTime = Date.now();
    var args = [uid];
    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, err, null);
            return;
        } else {
            var user = {uid: res.insertId};
            utils.invokeCallback(cb, null, user);
        }
    });
};
