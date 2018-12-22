
var Code = require('../../../consts/code');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var pomelo = require('pomelo');

module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
    this.app = app;
};

var pro = Remote.prototype;

pro.doAction = function (msg, cb) {
    this.app.get('hall').task.onAction(msg);
    utils.invokeCallback(cb, null, Code.OK);
}