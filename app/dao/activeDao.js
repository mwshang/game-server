var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var activeDao = module.exports;

/**
 * dayLogin 每日是否登陆
 * vipCount vip
 * loginTimes:连续登陆次数
 */
activeDao.createActive = function(uid, cb) {
	var sql = 'insert into qp_active (uid, loginTimes, dayLogin, vipCount,' +
        'dayShareFriend,dayReqFriend,dayBigWheel,dayGold) values (?,?,?,?,?,?,?,?)';
	var args = [uid,0,0,0,0,0,0,0];

	pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
		if (err) {
			logger.error('create createActive for createActive failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else
        {
			utils.invokeCallback(cb, null, res);
		}
	});
};

/**
 */
activeDao.getActiveByUid = function(uid, cb) {
	var sql = 'select * from qp_active where uid = ?';
	var args = [uid];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('get getActiveByUid by playerId for getActiveByUid failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			if (res && res.length === 1){
				cb(null, res[0]);
			} else{
				logger.error('getActiveByUid not exist');
				utils.invokeCallback(cb, null, null);
			}
		}
	});
};

/**
 * Update bag
 * @param {Object} bag Bag object.
 * @param {function} cb Call back function.
 */
activeDao.update = function(msg, cb) {
	var sql = 'update qp_active set loginTimes = ?, dayLogin = ?, vipCount = ?, ' +
        'dayShareFriend = ?,dayReqFriend = ?,dayBigWheel = ? where uid = ?';

	var args = [msg.loginTimes,msg.dayLogin,msg.vipCount,
                msg.dayShareFriend,msg.dayReqFriend,msg.dayBigWheel,
                msg.uid];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('write mysql failed!　');
		}
		
		utils.invokeCallback(cb, !!err);
	});
};


/**计算连续登陆次数
 */
activeDao.setContinueDay = function(msg, cb) {
    var sql = 'update qp_active set loginTimes = 0 where dayLogin = ?';
    var args = [0];
    pomelo.app.get('dbclient').query(sql,args, function(err, res) {
        if (err) {
            logger.error('setContinueDay mysql failed!　' + sql + ' ' + JSON.stringify(bag));
        }
        logger.debug("重置连续登陆次数成功");
        utils.invokeCallback(cb, !!err);
    });
};

/**重置每日登陆
 */
activeDao.resetEveryDay = function(msg, cb) {
    var sql = 'update qp_active set dayLogin = 0,dayShareFriend = 0,dayBigWheel = 0, dayGold = 0';
    var args = [];
    pomelo.app.get('dbclient').query(sql,args, function(err, res) {
        if (err) {
            logger.error('write mysql failed!　' + sql + ' ' + JSON.stringify(bag));
        }
        logger.debug("重置每日登陆成功");
        utils.invokeCallback(cb, !!err);
    });
};

/**
 *
 */
activeDao.destroy = function(uid, cb) {
	var sql = 'delete from qp_active where uid = ?';
	var args = [uid];

	pomelo.app.dbclinet.query(sql, args, function(err, res) {
		utils.invokeCallback(cb, err, res);
	});
};

