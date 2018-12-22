/**
 * Created by Administrator on 2017/6/22 0022.
 */
var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var packPlayerDao = require('./packPlayerDao');
var _ = require('lodash');

var packDao = module.exports;


packDao.getPackNum = function (cb) {
    var sql = "select count(*) as num from qp_pack where packNum=?";
    var packNum = _.random(1000000, 9999999);
    var ares = [packNum];
    pomelo.app.get('dbclient').query(sql, ares, function (err, res) {
        if (!!err) {
            logger.error('create qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'create qp_pack failed! ', null);
            return;
        }
        logger.debug('getPackNum', err, res, res[0].num);
        if (res && res[0].num > 0) {
            getPackNum(cb);
        } else {
            utils.invokeCallback(cb, null, packNum);
        }
    });
}

packDao.checkPackNameExist = function (name, cb) {
    var sqlexist = 'select * from qp_pack where name=?';
    var argsexist = [name];
    pomelo.app.get('dbclient').query(sqlexist, argsexist, function (err, res) {
        if (!!err) {
            logger.error('create qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'create qp_pack failed! ');
            return;
        }
        if (!!res && res.length > 0) {
            logger.debug("createInfo res");
            cb("已经有这个俱乐部名字了请换一个");
            return;
        }
        cb();
    });
}

packDao.createInfo = function (msg, cb) {
    logger.debug("创建群数据%j", msg);
    async.waterfall([
        // 群创建
        function (next) {
            var sql = 'insert into qp_pack (packNum, name,picUrl,num,ownerUid,ownerName,operateUid,operateName,bHideRoom,createUid,createName) values (?,?,?,?,?,?,?,?,?,?,?)';
            var args = [msg.packNum, msg.name, msg.picUrl, 1, msg.ownerUid, msg.ownerName, msg.ownerUid, msg.ownerName, 0, msg.ownerUid, msg.ownerName];
            pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
                if (!!err) {
                    logger.error('create qp_pack failed! ' + err.stack);
                    utils.invokeCallback(cb, err, null);
                    return;
                }
                next(null, res.insertId);
            });
        },
        // 群主加入
        function (packId, next) {
            var sql = 'insert into qp_packplayer (pid,uid,playerName,phone,audit,auditUid) values (?,?,?,?,?,?)';
            var args = [packId, msg.ownerUid, msg.ownerName, '', 1, msg.ownerUid];
            pomelo.app.get('dbclient').insert(sql, args, function (err, ret) {
                if (!!err) {
                    logger.error('create qp_packplayer failed! ' + err.stack);
                    utils.invokeCallback(cb, err, null);
                } else {
                    utils.invokeCallback(cb, null, packId);
                }
            });
            next(null, 200);
        }
    ], function(err){
            if(err) {
                cb(err, {code: 500, error: err});
                return;
            }
        }
    );
};


//群主获取群信息
packDao.getListByOwnerUid = function (uid, cb) {
    var sql = "SELECT * FROM qp_pack WHERE ownerUid = ?";

    sql += ' ORDER BY createTime desc LIMIT 20';
    var args = [uid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('get list by qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'get list by qp_pack failed! ', null);
            return;
        } else {
            if (res) {
                logger.debug("getarenaRank res");
                cb(null, res);
            } else {
                logger.debug("getarenaRank null");
                cb(null, null);
            }
        }
    });
};
//群主获取群信息
packDao.getListByOperateUId = function (uid, cb) {
    var sql = "SELECT * FROM qp_pack WHERE operateUid=? ";

    sql += ' ORDER BY createTime desc LIMIT 20';
    var args = [uid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('get list by qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'get list by qp_pack failed! ', null);
            return;
        } else {
            if (res) {
                logger.debug("getarenaRank res");
                cb(null, res);
            } else {
                logger.debug("getarenaRank null");
                cb(null, null);
            }
        }
    });
};
//普通玩家 获取群信息
packDao.getList = function (uid, cb) {
    var sql = "SELECT pid FROM qp_packplayer WHERE uid = ?";
    var args = [uid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('get list by qp_packplayer failed! ' + err.stack);
            utils.invokeCallback(cb, "get list by qp_packplayer failed!", null);
            return;
        }
        else if (!res || res.length == 0) {
            logger.debug("res:%j", res);
            utils.invokeCallback(cb, null, res);
            return;
        }
        else {
            logger.debug("res222:%j", res);
            var sql1 = "SELECT * FROM qp_pack WHERE pid in ";

            var str = "(";
            for (var idx in res) {
                str += res[idx].pid + ",";
            }
            str = str.substr(0, str.length - 1);
            str += ")";
            sql1 += str;
            sql1 += ' ORDER BY createTime desc LIMIT 20';
            logger.debug("getList sql:" + sql1);
            pomelo.app.get('dbclient').query(sql1, "", function (err, res) {
                if (!!err) {
                    logger.error('get list by qp_pack failed! ' + err.stack);
                    utils.invokeCallback(cb, err, null);
                } else {
                    if (res) {
                        logger.debug("qp_pack res");
                        cb(null, res);
                    } else {
                        logger.debug("qp_pack null");
                        cb(null, null);
                    }
                }
            });
        }
    });

};

/**
 * 用户所在的群
 * @param uid
 * @param cb
 */
packDao.getPlayerPack = function (uid, cb) {
    var sql = 'SELECT * FROM `qp_pack` WHERE pid IN(SELECT pid FROM `qp_packplayer` WHERE uid=? and audit = 1);';
    pomelo.app.get('dbclient').query(sql, [uid], function (err, res) {
        if (!!err) {
            logger.error('get list by qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
            return;
        } else {
            logger.debug("qp_pack res");
            cb(null, res);
        }
    });
}

packDao.getInfo = function (pid, cb) {
    var sql = "SELECT * FROM qp_pack WHERE pid=? ";
    pomelo.app.get('dbclient').query(sql, [pid], function (err, res) {
        if (!!err) {
            logger.error(' getInfo qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, ' getInfo qp_pack failed! ', null);
            return;
        } else {
            if (res) {
                logger.debug("getInfo qp_pack res");
                cb(null, res[0]);
            } else {
                logger.debug("getInfo qp_pack null");
                cb(null, null);
            }
        }
    });
};

//删除群
packDao.delPack = function (pid, cb) {
    logger.debug("删除群");
    var sql = "DELETE FROM qp_packplayer WHERE  pid=? ";

    var args = [pid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.debug("删除群玩家失败：" + err);
        }

    });

    var sql1 = "DELETE FROM qp_pack WHERE  pid=? ";
    var args1 = [pid];
    pomelo.app.get('dbclient').query(sql1, args1, function (err, res) {
        if (!!err || res.affectedRows == 0) {
            logger.debug("删除群失败：" + err);
            utils.invokeCallback(cb, "删除群失败：", res.affectedRows);
            return;
        }
        utils.invokeCallback(cb, null, res.affectedRows);
    });

    var sql2 = "DELETE FROM qp_packAutoTable WHERE  pid=? ";
    var args2 = [pid];
    pomelo.app.get('dbclient').query(sql2, args2, function (err, res) {
        if (!!err) {
            logger.debug("删除群自动桌子失败：" + err);
        }
    });
}

packDao.addNum = function (pid, num, cb) {
    var sql1 = "update qp_pack set num=num+? WHERE  pid=? ";

    var args1 = [num, pid];
    pomelo.app.get('dbclient').query(sql1, args1, function (err, res) {
        if (res.affectedRows == 0) {
            logger.error("没有这个群了：" + pid);
            //return;
        }
        utils.invokeCallback(cb, err, res.affectedRows);
    });
}
//pid ,fields,values
//更新群信息
packDao.updateInfos = function (msg, cb) {
    logger.debug("更新群数据%j", msg);
    var sql = 'update qp_pack set ';
    var args = [];
    for (var tem = 0; tem < msg.fields.length; tem++) {
        sql += msg.fields[tem] + "=?,";
        args.push(msg.values[tem]);
    }
    sql = sql.substr(0, sql.length - 1);
    sql += " where pid=? and ownerUid=?";
    args.push(msg.pid, msg.ownerUid);
    logger.debug("sql:" + sql);
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('updateInfos qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'updateInfos qp_pack failed! ', null);
            return;
        }
        else if (res.affectedRows == 0) {
            utils.invokeCallback(cb, "填写参数有误，更新信息失败", null);
            return;
        }
        else {
            utils.invokeCallback(cb, null, res.affectedRows);
        }
    });
}

packDao.updatePackGemNum = function (pid, addNum, cb) {
    var sql = 'update qp_pack set gemNum=gemNum+?, consume=consume+? where pid=?';
    var args = [addNum, Math.abs(addNum), pid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('updateInfos qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'updatePackGemNum failed! ', null);
            return;
        }
        else if (res.affectedRows == 0) {
            utils.invokeCallback(cb, "填写参数有误，更新信息失败", null);
            return;
        }
        else {
            utils.invokeCallback(cb, null, res.affectedRows);
        }
    });
}
packDao.updateInfo = function (msg, cb) {
    logger.debug("更新群数据%j", msg);
    var sql = 'update qp_pack set name=?,picUrl=?,ownerUid=?,ownerName=?,operateUid=?,operateName=?,bHideRoom=?';

    sql += " where pid=?";
    var args = [msg.name, msg.picUrl, msg.ownerUid, msg.ownerName, msg.operateUid, msg.operateName, msg.bHideRoom, msg.pid];

    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('updateInfo qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, 'updateInfo qp_pack failed! ', null);
            return;
        } else {
            utils.invokeCallback(cb, null, res.affectedRows);
        }
    });
}

packDao.getUserCreateNum = function (uid, cb) {
    var sql = "select count(*) as createNum from qp_pack where createUid = ?";
    pomelo.app.get('dbclient').query(sql, [uid], function (err, res) {
        if (!!err) {
            logger.error('getUserCreateNum failed! ' + err.stack);
            utils.invokeCallback(cb, 'getUserCreateNum failed! ', null);
            return;
        } else {
            utils.invokeCallback(cb, null, res[0]);
        }
    });
}

packDao.updateNotice = function (pid, uid, notice, cb) {
    async.waterfall([
        function (next) {
            var sql = "select * from qp_pack where pid=?";
            var args = [pid];
            pomelo.app.get('dbclient').query(sql, args, function (err, res) {
                if (!!err || !res) {
                    logger.error('群不存在' + err.stack);
                    utils.invokeCallback(cb, '群不存在', null);
                    return;
                }

                if (res[0].ownerUid != uid) {
                    logger.error('没有操作权限');
                    utils.invokeCallback(cb, '没有操作权限', null);
                    return;
                }
                next();
            });
        },
        function (next) {
            var sql = "update qp_pack set notice=? where pid=?";
            var args = [notice, pid];
            pomelo.app.get('dbclient').query(sql, args, function (err, res) {
                if (!!err || !res) {
                    logger.error('更新失败' + err.stack);
                    utils.invokeCallback(cb, '更新失败', null);
                    return;
                } else {
                    utils.invokeCallback(cb, null, res.affectedRows);
                }

                next(null, 200);
            });
        }
    ], function(err){
        if(err) {
            utils.invokeCallback(cb, err);
            return;
        }
    });
}

packDao.getInfoByNum = function (packNum, cb) {
    var sql = "SELECT * FROM qp_pack WHERE packNum=? ";
    pomelo.app.get('dbclient').query(sql, [packNum], function (err, res) {
        if (!!err || !res) {
            logger.error(' getInfo qp_pack failed! ' + err.stack);
            utils.invokeCallback(cb, ' getInfo qp_pack failed! ', null);
            return;
        } else {
            logger.debug("getInfo qp_pack res");
            cb(null, res[0]);
        }
    });
}

