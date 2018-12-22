var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var noticeDao = module.exports;


/**
 * 
 * @param uid
 * @param cb
 */
noticeDao.getNoticeList = function(type, cb) {
	/*var sql = 'SELECT f.* FROM (SELECT `type`, MAX(id) AS id FROM `qp_notice`'
	+ ' GROUP BY `type` HAVING `type` IN ('+type+') ORDER BY UNIX_TIMESTAMP(`createdtime`) DESC) AS g'
	+ ' INNER JOIN `qp_notice` AS f ON g.type=f.type AND g.id = f.id;';*/

	var sql = 'SELECT * FROM `qp_notice` AS b WHERE NOT EXISTS(SELECT 1 FROM qp_notice WHERE `type`= b.`type`'
		+ 'AND b.`createdtime`<`createdtime` ) AND `type` IN ('+type+')';

	pomelo.app.get('dbclient').query(sql, function(err, res) {
		logger.debug("getNoticeList", err, res);
		if (err) {
			logger.error('get getNoticeList failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			cb(null, res);
		}
	});
};

/**
 *
 * @param msg
 * @param cb
 */
noticeDao.addNotice = function (msg, cb) {
	var sql = 'insert into `qp_notice`(`type`, contents, uid, title, startTime, endTime, intervalTime) values(?,?,?,?,?,?,?);';
	var args = [msg.type, msg.content, msg.uid, msg.title, msg.startTime, msg.endTime, msg.intervalTime];
	pomelo.app.get('dbclient').query(sql, args, function(err, res) {
		if (err) {
			logger.error('get getNoticeList failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
			cb(null, res.insertId);
		}
	});
}