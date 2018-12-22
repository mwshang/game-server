var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var safeBoxDao = module.exports;

/**
 * Create safeBoxDao
 *
 * @param {Number} playerId Player Id
 * @param {function} cb Call back function
 */
safeBoxDao.createSafeBox = function(msg, cb) {
    logger.debug("createSafeBox:%j", msg );
	var sql = 'insert into qp_safeBox (uid, giveCount,give ,coinNum,password) values (?, ?, ?,?, ?)';
	var args = [msg.uid, 0 ,'{}', 0, msg.password];

	pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
		if (err) {
			logger.error('create qp_safeBox failed! ' + err.stack);
            logger.error(err);
			utils.invokeCallback(cb, err, null);
		} else {
            logger.debug(res);
			utils.invokeCallback(cb, null, res);
		}
	});
	
};

/**
 * Find safeBoxDao by playerId
 * 
 * @param {Number} playerId Player id.
 * @param {function} cb Call back function.
 */
safeBoxDao.getSafeBox = function(playerId, cb) {
	var sql = 'select * from qp_safeBox where uid = ?';
	var args = [playerId];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('get getSafeBox  failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			if (res && res.length === 1) {
                utils.invokeCallback(cb, null, res[0]);
			} else {
				logger.error('getSafeBox not exist');
				utils.invokeCallback(cb, new Error(' getSafeBox not exist '), null);
			}
		}
	});
};

/**
 * Update safeBoxDao
 * @param {Object} safeBoxDao Bag object.
 * @param {function} cb Call back function.
 */
safeBoxDao.updateCoin = function(safeBox, cb) {
    var sql = 'update qp_safeBox set coinNum = ? where uid = ?';
    var args = [safeBox.coinNum, safeBox.uid];
    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
        if (err) {
            logger.error('write updateCoin failed!　' + sql + ' ' + JSON.stringify(bag));
        }
        utils.invokeCallback(cb, !!err);
    });
};

/**
 * Update safeBoxDao
 * @param {Object} safeBoxDao Bag object.
 * @param {function} cb Call back function.
 */
safeBoxDao.updatePassword = function(safeBox, cb) {
    var sql = 'update qp_safeBox set password = ? where uid = ?';
    var args = [safeBox.password, safeBox.uid];
    pomelo.app.get('dbclient').query(sql, args, function(err, res) {
        if (err) {
            logger.error('write updatePassword failed!　' + sql + ' ' + JSON.stringify(bag));
        }
        utils.invokeCallback(cb, !!err);
    });
};

/**
 * Update safeBoxDao
 * @param {Object} safeBoxDao Bag object.
 * @param {function} cb Call back function.
 */
safeBoxDao.updateGive = function(safeBox, cb) {
	var sql = 'update qp_safeBox set give = ?, giveCount = ? where uid = ?';
	var give = safeBox.give;
	if (typeof give !== 'string')
    {
        give = JSON.stringify(give);
	}
    logger.debug("updateGive:%j", safeBox);
	var args = [give, safeBox.giveCount,safeBox.uid];
	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('write qp_safeBox failed!　' + sql + ' ' + JSON.stringify(bag));
		}
		
		utils.invokeCallback(cb, !!err);
	});
};

/**
 * Destroy a safeBoxDao
 * 
 * @param {number} playerId
 * @param {function} cb
 */
safeBoxDao.destroy = function(playerId, cb) {
	var sql = 'delete from qp_safeBox where uid = ?';
	var args = [playerId];

	pomelo.app.dbclinet.query(sql, args, function(err, res) {
		utils.invokeCallback(cb, err, res);
	});
};

