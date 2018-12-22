var logger = require('pomelo-logger').getLogger('database-log', __filename);

// mysql CRUD
var sqlclient = module.exports;

var _pool;

var NND = {};

/*
 * Init sql connection pool
 * @param {Object} app The app for the server.
 */
NND.init = function(app){
	_pool = require('./dao-pool').createMysqlPool(app);
};

/**
 * Excute sql statement
 * @param {String} sql Statement The sql need to excute.
 * @param {Object} args The args for the sql.
 * @param {fuction} cb Callback function.
 *
 */
NND.query = function(sql, args, cb){
	// _pool.acquire(function(err, client) {
	_pool.getConnection(function (err, client) {
		if (!!err) {
			logger.error('[sqlqueryErr] '+err.stack);
			return;
		}

		if (typeof args == 'function') {
			cb = args;
			client.query(sql, function(err, res) {
				logger.debug(sql, err);
				// _pool.release(client);
				client.release();
				cb(err, res);
			});
		} else {
			client.query(sql, args, function(err, res) {
				logger.debug(sql, err);
				// _pool.release(client);
				client.release();
				cb(err, res);
			});
		}
	});
};

/**
 * Close connection pool.
 */
NND.shutdown = function(){
	// _pool.destroyAllNow();
	_pool.end();
};

/**
 * init database
 */
sqlclient.init = function(app) {
	if (!!_pool){
		return sqlclient;
	} else {
		NND.init(app);
		sqlclient.insert = NND.query;
		sqlclient.update = NND.query;
		sqlclient.delete = NND.query;
		sqlclient.query = NND.query;
		return sqlclient;
	}
};

/**
 * shutdown database
 */
sqlclient.shutdown = function(app) {
	NND.shutdown(app);
};
