var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var playerDao = require('../../../dao/playerDao');
var consts = require('../../../consts/consts');

var exp = module.exports;

var Manager = function(opts) {
    logger.debug("AIManagerInit:%j", opts);
    this.aiType = opts.aiType;
	this.brainService = opts.brainService;
	this.robots = {};
};

module.exports = Manager;

Manager.prototype.start = function() {
	this.started = true;
    this.initAILists();
};

Manager.prototype.stop = function() {
	this.closed = true;
};

Manager.prototype.initAILists = function() {
    playerDao.getAIRobots(0, function(err, user)
    {
        if (err || !user) {
            logger.debug('初始化机器人失败');
            return;
        }
        for (var i = 0; i < user.length; i++){
            var robot = user[i];
            robot["work"] = 0;
            if (!this.robots[robot.uid]){
                this.robots[robot.uid] = robot;
            }
        }
        logger.debug("初始化机器人完成:" + user.length);
    }.bind(this));
};
/**
* Add a character into ai manager.
* Start the tick if it has not started yet.
*/
//添加托管
Manager.prototype.addAi = function(user,table) {
	if(!this.started || this.closed) {
		return;
	}
    user["isAuto"] = true;
    user["table"] = table;
	//create brain for the ai.
    var brain = this.brainService.getBrain(this.aiType, user);
    if (brain == null){
        logger.error("分配机器人类型失败");
        return null;
    }
    user["table"]=undefined;
    return brain;
};

Manager.prototype.addAiRebot = function(table) {
    if(!this.started || this.closed) {
        return;
    }
    if(!table) {
        logger.error("木有桌子ID");
        return null;
    }
    //pop rebot
    var robot = this.popAiRebot();
    if (robot == null){
        logger.warn("木有机器人拉赶紧申请");
        return null;
    }

    robot["table"] = table;
    //create brain for the ai.
    var brain = this.brainService.getBrain(this.aiType, robot);
    if (brain == null){
        logger.error("分配机器人类型失败");
        return null;
    }
    return robot;
};

/**
 * remove a character by id from ai manager
 */
Manager.prototype.removeAiRebot = function(id) {
    if (!this.robots[id]){
        logger.error("木有此机器人");
        return;
    }
    this.pushAiRebot(id);
};

/**
* pushAiRebot
*/
Manager.prototype.pushAiRebot = function(uid) {
	if(!this.started || this.closed) {
		return;
	}

    this.robots[uid]["work"] = 0;
};
/**
 * remove a character by id from ai manager
 */
Manager.prototype.popAiRebot = function() {
    if(!this.started || this.closed) {
        return;
    }
    var robosArr = [];
    for(uid in this.robots) {
        if (this.robots[uid]["work"] == 0){
            robosArr.push(uid);
        }
    }
    if (robosArr.length <= 0){
        return;
    }
    var xrandUid = Math.round(Math.random()*Math.random()*100) % robosArr.length;
    this.robots[robosArr[xrandUid]]["work"] = 1;
    var robot = this.robots[robosArr[xrandUid]];
    return robot;
};


