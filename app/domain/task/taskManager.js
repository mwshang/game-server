
var moment = require('moment');
var pomelo = require('pomelo');
var async = require('async');
var logger = require('pomelo-logger').getLogger('task-log', __filename);
var channelUtil = require('../../util/channelUtil');
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var messageService = require('../../services/messageService');
var sync2HallType = require('../../consts/consts').Sync2HallType;
var Event = require('../../consts/consts').HALL;

var TaskManager = function (app) {
    this.app = app;
};
var Instance = TaskManager.prototype;
module.exports = TaskManager;

Instance.__defineGetter__('model', function () {
    return this.app.get('ormModel');
});


Instance.hasTask = function (taskType) {
    return dataApi.task.findBy('type', taskType).length > 0;
}

Instance.onDaily = function (uid) {
	if (!this.model || !this.model.task) {
        return;
    }
    // 每日登录处理
    this.dailyLogin(uid);
    // 初始化每日任务
    this.initDailyTask({uid: uid});
}

/**
 *
 * @param uid
 */
Instance.dailyLogin = function (uid) {
    var self = this;
    this.model.dailySign.one({uid: uid}, function (err, data) {
       if (!!err) {
           logger.error('dailyLogin [uid: %d] err: %j', uid, err);
           return;
       }

        var now = moment().format('YYYY-MM-DD HH:mm:ss');
       if (!data) {
           // create
           self.model.dailySign.create({
               uid: uid, todayLogin: 1, loginDay: 1, lastSignTime: now, createTime: now
           }, function (err, res) {
               logger.debug('create new dailysign', uid, err, res);
           });
       } else {
           // update
           data.todayLogin = 1;
           data.lastSignTime = now;
            if (moment().diff(moment(data.lastSignTime), 'day') !== 1) {
                data.loginDay = 1;
            } else {
                data.loginDay = data.loginDay == 7 ? 1 : data.loginDay + 1;
            }

           data.save();

           // reward ...
           var rewardTemp = dataApi.dailySign.findById(data.loginDay);
           if (!rewardTemp) {
               logger.debug('not found reward templete id: %d, uid: %d', data.loginDay, uid);
               return;
           }

           self.sendReward2Player(uid, rewardTemp, function(err, res) {
               logger.debug('sendReward2Player id: %d, uid: %d', data.loginDay, uid);
           });
       }
    });
}

/**
 *
 * @param data
 */
Instance.onAction = function (data) {
    logger.debug('onAction', data);
    if (!this.model || !this.model.task) {
        return;
    }
    var self = this;
    var serverType = data.serverType;
    var actionNo = data.actionNo;   // 可能包括多个任务 type
    var actionVal = data.actionVal; // {playerUids: [], val: 1}

    var uids = actionVal.players || [];
    var val = actionVal.val;

    if (uids.length < 1) {
        logger.error('没有相应的任务玩家', data, actionNo);
        return;
    }

    var execType = [];
    if (actionNo && this.hasTask(actionNo)) {
        execType.push(actionNo);
    }

    var extTaskType = actionNo + (consts.GameNo[serverType] || 0);
    if (extTaskType > actionNo && this.hasTask(extTaskType)) {
        execType.push(extTaskType);
    }

    if (execType.length < 1) {
        logger.error('没有相应的任务类型', data, actionNo);
        return;
    }

    this.model.task.find({uid: uids, taskType: execType, status: 0}, function (err, taskVos) {
        logger.debug('find taskVo', err, taskVos.length);
        if (!!err || !taskVos || taskVos.length < 1)
            return;
        async.eachSeries(taskVos, function (item, callback) {
            logger.debug('doing userDoAction', item.uid, item.taskId);
            self.userDoAction(item, val, function (err, res) {
                logger.debug('doTaskAction res', res);
                callback(err, res);
            });
        }, function (err) {
            logger.debug("doTaskAction complete", err);
        });
    });

}


/**
 *
 * @param taskVo
 * @param taskVal
 * @param cb
 */
Instance.userDoAction = function (taskVo, taskVal, cb) {
        var uid = taskVo.uid;
        var taskTemplate = dataApi.task.findById(taskVo.taskId);
        if (!taskTemplate) {
            logger.error('onAction', '未找到任务配置数据', taskVo.taskId);
            cb('未找到任务配置数据');
            return;
        }

        taskVo.taskVal= parseInt(taskVo.taskVal) + parseInt(taskVal);

        if (taskTemplate.val <= taskVo.taskVal) {
            // 任务已完成
            taskVo.status = 1;
            this.onTaskFinish(taskVo, taskTemplate, cb);
        } else {
            logger.debug('userDoAction do save', taskVo.id);
            var hall = pomelo.app.get('hall');
            hall.sendMsgToPlayer(uid, 'taskProgress', {uid: uid, taskId: taskVo.taskId, taskVal: taskVo.taskVal});
            taskVo.save(function (err, res) {
                logger.debug('userDoAction do save complete', taskVo.id);
                cb(err);
            });
        }
}

/**
 *
 * @param taskVo
 * @param taskTemplate
 * @param cb
 */
Instance.onTaskFinish = function (taskVo, taskTemplate, cb) {
    if (taskTemplate.val > taskVo.taskVal || taskVo.status != 1) {
        // 任务未完成或已领取
        logger.debug('onTaskFinish', '任务未完成');
        cb('任务未完成');
        return;
    }

    // 任务奖励
    logger.debug('onTaskFinish', taskVo.uid, taskTemplate);
    var self = this;
    this.sendReward2Player(taskVo, taskTemplate, function (err, res) {
        logger.debug('onTaskFinish->update user scoreNum', taskVo.uid, taskTemplate);
        // 初始化后续任务
        if (taskTemplate.next > 0) {
            self.initNextTask(taskVo, taskTemplate.next, cb);
        } else {
            // 没有后续
            taskVo.save({status: 2}, function (err) {
                cb(err);
            });
        }
    });
}

/**
 * 发送任务奖励
 * @param uid
 * @param taskTemplate
 * @param cb
 */
Instance.sendReward2Player = function (taskVo, taskTemplate, cb) {
    var uid = taskVo.uid;
    var rewardNum = taskTemplate.reward;
    var self = this;
    this.model.settings.one({key: 'ACTIVE_SCORE_RATE'}, function (err, data) {
        logger.debug('ACTIVE_SCORE_RATE', err, data);
        if (!err && data ) {
            rewardNum = (1 + (data.value || 0)) * rewardNum;
        }

        var hall = pomelo.app.get('hall');
        var user =  hall.getPlayer(uid);
        if (!user){
            logger.error('sendReward2Player player not found: uid: %d, temp: %j', uid, taskTemplate);
            cb('没有找打玩家');
            return
        }

        logger.debug('sendReward2Player task: %j, templete: %j',taskVo, taskTemplate );
        if (taskTemplate.rewardType == sync2HallType.fangKa) {
            // gemNum
            user.updateFangka(rewardNum, true);
            messageService.pushMessageToPlayer({uid:uid, sid : user.serverId}, Event.hallUpdatePlayerAttr, {"gemNum":user.gemNum});
        } else if (taskTemplate.rewardType == sync2HallType.goldNum) {
            // goldNum
            user.updateGoldNum(rewardNum);
            messageService.pushMessageToPlayer({uid:uid, sid : user.serverId}, Event.hallUpdatePlayerAttr, {"goldNum":user.goldNum});
        } else if (taskTemplate.rewardType == sync2HallType.scoreNum) {
            // scoreNum
            user.updateScoreNum(rewardNum);
            messageService.pushMessageToPlayer({uid:uid, sid : user.serverId}, Event.hallUpdatePlayerAttr, {"scoreNum":user.scoreNum});
        } else {
            logger.error('奖励类型不存在');
            cb('奖励类型不存在');
            return
        }

        var next = null;
        if (taskTemplate.next > 0) {
            taskVo.taskId = taskTemplate.next;
            next = self.buildTaskView(taskVo);
        }
        hall.sendMsgToPlayer(uid, 'taskFinish', {uid: uid, taskId: taskTemplate.id, reward: rewardNum, next: next});
        cb(null);
    });
}

Instance.initNextTask = function (taskVo, taskId, cb) {
    var taskTemplate = dataApi.task.findById(taskId);
    if (!!taskTemplate) {
        taskVo.taskId = taskId;
        if (taskTemplate.val <= taskVo.taskVal) {
            // 任务已完成
            this.onTaskFinish(taskVo, taskTemplate, cb);
        } else {
            taskVo.save({status: 0}, function (err) {
                cb(err);
            });
        }
    } else {
        taskVo.save({status: 2}, function (err) {
            cb(err);
        })
    }
}
/**
 *
 * @param msg
 */
Instance.initDailyTask = function (msg) {
    var self = this;
    if (!this.model || !this.model.task)
        return;
    var tasks = dataApi.task.findByAttrs({index: 1, cycle: 1});
    logger.debug('initDailyTask', tasks);
    tasks.map( function(task) {
        self.model.task.one({taskType: task.type, uid: msg.uid}, function (err, data) {
            logger.debug('initDailyTask-> findTaskVo', err, data);
            if (!!err) {
                return;
            }
            if (!data) {
                // 新建
                self.model.task.create({
                    uid: msg.uid, taskId: task.id, taskType: task.type, taskVal: 0, status: 0, createTime: moment().format('YYYY-MM-DD HH:mm:ss')
                }, function (err, res) {
                    logger.debug('create new task', msg, task, err, res);
                });
            } else {
                // 存在同类型任务
                data.save({taskId: task.id, taskVal: 0, status: 0}, function (err, res) {
                    logger.debug('update new task', msg, task, err, res);
                });
            }
        });
    });
}

/**
 *
 * @param msg
 * @param cb
 */
Instance.getTaskInfo = function (msg, cb) {
    var self = this;
    var list = [];
    this.model.task.find({uid: msg.uid, status: 0}, function (err, taskVos) {
        if (!!err || taskVos.length < 1) {
            utils.invokeCallback(cb, null, []);
            return;
        }
        taskVos.map(function (taskVo) {
            list.push( self.buildTaskView(taskVo));
            list = list.concat(self.buildTaskList(taskVo));
        });
        utils.invokeCallback(cb, null, list);
    });
}

Instance.buildTaskView = function (taskVo) {
    var template = dataApi.task.findById(taskVo.taskId);
    return {
        id: taskVo.id,
        taskId: taskVo.taskId,
        taskName: template.name,
        taskDesc: template.desc,
        taskVal: template.val,
        progress: taskVo.taskVal,
        rewardType: template.rewardType,
        rewardVal: template.reward
    };
}

Instance.buildTaskList = function (taskVo) {
    var templates = dataApi.task.findByAttrs({"type": taskVo.taskType});
    var curTemp = dataApi.task.findById(taskVo.taskId);
    var list = [];
    templates.map(function (template) {
        if (template.index < curTemp.index) {
            list.push({
                id: taskVo.id,
                taskId: taskVo.taskId,
                taskName: template.name,
                taskDesc: template.desc,
                taskVal: template.val,
                progress: taskVo.taskVal,
                rewardType: template.rewardType,
                rewardVal: template.reward
            });
        }
    });
    return list;
}