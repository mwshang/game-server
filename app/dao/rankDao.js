var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var utils = require('../util/utils');

var rank = module.exports;

rank.getCoinRank = function(type, cb) {
	var sql = 'SELECT * from qp_player ORDER BY coinNum DESC LIMIT 20';
	pomelo.app.get('dbclient').query(sql, function(err, res) {
		if (err) {
			logger.error('getRankInfo failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
            cb(null, res);
		}
	});
};

rank.getGemRank = function(type, cb) {
    var sql = 'SELECT * from qp_player ORDER BY gemNum DESC LIMIT 20';
    pomelo.app.get('dbclient').query(sql, function(err, res) {
        if (err) {
            logger.error('getGemRank failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            cb(null, res);
        }
    });
};