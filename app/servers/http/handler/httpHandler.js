var Code = require('../../../consts/code');
var channelUtil = require('../../../util/channelUtil');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var pomelo = require('pomelo');

module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};

var pro = Handler.prototype;

/*http.httpHandler.httpHandlerTest
* */
pro.httpHandlerTest = function(msg, session, next) {
    var uid = msg.uid;
    if(!uid) {
        next(null, {code: Code.FAIL});
        return;
    }
    logger.error("httpHandlerTest");
    next(null, {code: Code.OK,"httpHandlerTest":"httpHandlerTest"});
};