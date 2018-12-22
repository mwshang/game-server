var pomelo = require('pomelo');

var Message = function (opts) {
    this.table = opts.table;
};


Message.prototype.__defineGetter__("logger", function () {
    return require('pomelo-logger').getLogger.apply(this, [pomelo.app.getServerType(), __filename, this.table.index]);
});

/*
 发送当前桌子所有人
 * */
Message.prototype.push2Channel = function (eventType, msg) {
    this.table.App.get('gameService').pushByChannel(eventType, this.table.ChannelName, msg, function (err, res) {
        if (err) {
            this.logger.error("广播玩家信息失败1,ID: %j", eventType);
            this.logger.error(err.stack);
            return false;
        } else {
            //logger.debug("广播玩家信息成功,ID: %j", eventType);
            return true;
        }
    });

    //airebot
    if (Object.keys(this.table.AiRobotUids).length >= 1) {
        for (var uid in this.table.AiRobotUids) {
            this.table.AiRobotUids[uid].dispather(eventType, msg);
        }
    }
};
/*
 发送给某个人
 * */
Message.prototype.push2Player = function (eventType, uid, msg) {
    //logger.debug("push2Player:" + eventType);
    this.table.App.get('gameService').pushByPlayerUid(eventType, uid, msg, function (err, res) {
        if (err) {
            this.logger.error("发送给某人消息失败:" + uid);
            this.logger.error(err.stack);
        }
    });

    if (this.table.PlayerUids[uid].isRobot == true) {
        this.table.AiRobotUids[uid].dispather(eventType, msg);
    }
};

module.exports = Message;