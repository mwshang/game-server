var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var chargeOrderDao = module.exports;

/**
 * 创建订单号
 * order_status:0 创建  1：ping返回成功  2：发送给玩家成功  3：充值失败或者没有Ping返回过
 */
chargeOrderDao.createChargeOrder = function(msg, cb) {
	var sql = 'insert into qp_chargeOrder (uid, channel, serverId, order_status,order_no,shopId) values (?,?,?,?,?,?)';
	var args = [msg.uid,msg.channel,msg.serverId,0,msg.order_no,msg.shopId];

	pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
		if (err) {
			logger.error('create createChargeOrder for createActive failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else
        {
			utils.invokeCallback(cb, null, res);
		}
	});
};

/**获取订单号详细信息
 */
chargeOrderDao.getChargeOrder = function(order_no, cb) {
	var sql = 'select * from qp_chargeOrder where order_no = ?';
	var args = [order_no];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('get getChargeOrder by playerId for getChargeOrder failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			if (res && res.length === 1)
            {
				cb(null, res[0]);
			} else
            {
				logger.error('getActiveByUid not exist or res > 1');
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
chargeOrderDao.updatechargeOrder = function(msg, cb) {
	var sql = 'update qp_chargeOrder set order_status = ? where order_no = ?';
	var args = [msg.order_status,msg.order_no];

	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('chargeOrderDao write mysql failed!　');
		}
		
		utils.invokeCallback(cb, !!err);
	});
};



