
var logger = require('pomelo-logger').getLogger('task-log', __filename);
var utils = require('../../util/utils');
var pomelo = require('pomelo');
var taskType = require('../../consts/consts').TaskType;

var Task = function (app) {
    //当前APP
    logger.debug('Task init');
    this.app = app;

    this.app.event.on('player_do_action', this.onTableAction.bind(this, this.app.getServerType()));
};

var Instance = Task.prototype;

Instance.onTableAction = function (serverType, data) {
    logger.debug('onTableAction', data);
    if (data.isValid) {
        pomelo.app.rpc.hall.taskRemote.doAction(null, {serverType: serverType, actionNo: taskType.JoinGame, actionVal: {players: data.players, val: 1}}, function (err, res) {
            logger.debug('task doAction complete!');
        });

        pomelo.app.rpc.hall.taskRemote.doAction(null, {serverType: serverType, actionNo: taskType.WinGame, actionVal: {players: data.winner, val: 1}}, function (err, res) {
            logger.debug('task doAction complete!');
        });

        if (data.isPackTable == 1) {
            pomelo.app.rpc.hall.taskRemote.doAction(null, {serverType: serverType, actionNo: taskType.JoinPackGame, actionVal: {players: data.players, val: 1}}, function (err, res) {
                logger.debug('task doAction complete!');
            });
        }

        if (data.bigWiner && data.bigWiner.length > 0) {
            pomelo.app.rpc.hall.taskRemote.doAction(null, {serverType: serverType, actionNo: taskType.BigWinner, actionVal: {players: data.bigWiner, val: 1}}, function (err, res) {
                logger.debug('task doAction complete!');
            });
        }

        if (data.fangzhu) {
            pomelo.app.rpc.hall.taskRemote.doAction(null, {serverType: serverType, actionNo: taskType.CreateRoom, actionVal: {players: [data.fangzhu], val: 1}}, function (err, res) {
                logger.debug('task doAction complete!');
            });
        }
    }
}

module.exports = Task;