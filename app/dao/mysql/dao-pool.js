// var _poolModule = require('generic-pool');
var mysql = require('mysql');
/*
 * Create mysql connection pool.
 */
var createMysqlPool = function(app) {
	var mysqlConfig = app.get('mysql');
	return mysql.createPool(mysqlConfig);

	// return new _poolModule.Pool({
	// 	name: 'mysql',
	// 	create: function(callback) {
	// 		var mysql = require('mysql');
	// 		var client = mysql.createConnection({
	// 			host: mysqlConfig.host,
	// 			user: mysqlConfig.user,
	// 			password: mysqlConfig.password,
	// 			database: mysqlConfig.database
	// 		});
	//
	// 		logger.debug('mysql createConnection');
	// 		callback(null, client);
	// 	},
	// 	validateAsync: function (client, cb) {
	// 		client.ping(function(err) {
	// 			if (err) {
	// 				logger.error('mysql connection lost');
	// 				cb(false);
	// 			} else {
	// 				logger.debug('mysql responded to ping');
	// 				cb(true);
	// 			}
	// 		});
	// 	},
	// 	destroy: function(client) {
	// 		logger.debug('mysql destroyConnection');
	// 		client.end();
	// 	},
	// 	max: 10,
	// 	idleTimeoutMillis : 30000,
	// 	log : function(str, level) {
	// 		logger.debug(str);
	// 	}
	// });
};

exports.createMysqlPool = createMysqlPool;
