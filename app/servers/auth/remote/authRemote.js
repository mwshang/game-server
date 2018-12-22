var tokenService = require('../../../util/token');
var playerDao = require('../../../dao/playerDao');
var Code = require('../../../consts/code');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var DEFAULT_SECRET = 'pomelo_session_secret';
var DEFAULT_EXPIRE = 6 * 60 * 60 * 1000;	// default session expire time: 6 hours

module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app)
{
	this.app = app;
	var session = app.get('session') || {};
	this.secret = session.secret || DEFAULT_SECRET;
	this.expire = session.expire || DEFAULT_EXPIRE;
};

var pro = Remote.prototype;

/**
 * Auth token and check whether expire.
 *
 * @param  {String}   token token string
 * @param  {Function} cb
 * @return {Void}
 */
pro.auth = function(token, cb) {
	var res = tokenService.parse(token, this.secret);
	if(!res) {
		cb(Code.ENTRY.FA_TOKEN_INVALID);
		return;
	}
	if(!checkExpire(res, this.expire)) {
		cb(Code.ENTRY.FA_TOKEN_EXPIRE);
		return;
	}
	playerDao.getPlayerByUid(res.uid, function(err, players) {
		if(err || !players || players.length == 0) {
			logger.debug("player not exist");
			cb(Code.ENTRY.FA_USER_NOT_EXIST);
			return;
		}
		logger.debug("auth ok");
		cb(null, Code.OK, players[0]);
	});
};

/**
 * Check the token whether expire.
 *
 * @param  {Object} token  token info
 * @param  {Number} expire expire time
 * @return {Boolean}        true for not expire and false for expire
 */
var checkExpire = function(token, expire) {
	if(expire < 0) {
		// negative expire means never expire
		return true;
	}

	return (Date.now() - token.timestamp) < expire;
};
