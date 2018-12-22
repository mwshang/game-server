var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');
var Bag = require('../domain/entity/bag');


var bagDao = module.exports;

/**
 * Create Bag
 *
 * @param {Number} playerId Player Id
 * @param {function} cb Call back function
 */
bagDao.createBag = function(playerId, cb) {
    logger.debug("createBag PlayerId:" + playerId);
	var sql = 'insert into qp_bag (uid, items, itemCount) values (?, ?, ?)';
	var args = [playerId, '[]', 20];

	pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
		if (err) {
			logger.error('create bag for bagDao failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			var bag = new Bag({uid: res.insertId});
			utils.invokeCallback(cb, null, bag);
		}
	});
	
};

/**
 * Find bag by playerId 
 * 
 * @param {Number} playerId Player id.
 * @param {function} cb Call back function.
 */
bagDao.getBagByPlayerId = function(playerId, cb) {
	var sql = 'select * from qp_bag where uid = ?';
	var args = [playerId];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('get bag by playerId for bagDao failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			if (res && res.length === 1) {
				var result = res[0];
                logger.error("bags:" + result.items);
				var bag = new Bag({ uid: result.uid, itemCount: result.itemCount, items: JSON.parse(result.items) });
				cb(null, bag);
			} else {
				logger.error('bag not exist');
				utils.invokeCallback(cb, new Error(' bag not exist '), null);
			}
		}
	});
};

/**
 * Update bag
 * @param {Object} bag Bag object.
 * @param {function} cb Call back function.
 */
bagDao.update = function(bag, cb) {
    logger.debug("bagUpdate:%j" + bag.items);
	var sql = 'update qp_bag set items = ? where uid = ?';
	var items = bag.items;
	if (typeof items !== 'string') {
		items = JSON.stringify(items);
	}
	
	var args = [items, bag.uid];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('write mysql failed!　' + sql + ' ' + JSON.stringify(bag));
		}
		
		utils.invokeCallback(cb, !!err);
	});
};

/**
 * Destroy a bag
 * 
 * @param {number} playerId
 * @param {function} cb
 */
bagDao.destroy = function(playerId, cb) {
	var sql = 'delete from qp_bag where uid = ?';
	var args = [playerId];

	pomelo.app.dbclinet.query(sql, args, function(err, res) {
		utils.invokeCallback(cb, err, res);
	});
};

