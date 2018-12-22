/**
 * Created by Administrator on 2017/6/22 0022.
 */
var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var packDao = require('./packDao');
var moment = require('moment');
var playerDao = require('./playerDao');
var settingsDao = require('./settingsDao');

var packPlayerDao = module.exports;

var MAX_APPLY_COUNT = 30;
var PACK_MAX_MEMBER_NUM_KEY = 'PACK_MAX_MEMBER_NUM';
var PACK_MAX_MIX_NUM_KEY = 'PACK_MAX_MIX_NUM';
/**
 * 申请加入
 * @param msg
 * @param cb
 */
packPlayerDao.createInfo = function (msg, cb) {
    async.waterfall([
        function (next) {
            settingsDao.getSettings(PACK_MAX_MEMBER_NUM_KEY, function (err, num) {
                msg.maxNum = num || 120;
                next();
            });
        },
        function (next) {
            var sql = "select * from qp_pack where packNum=?;";
            logger.debug('createInfo', sql, msg.packNum);
            pomelo.app.get('dbclient').query(sql, [msg.packNum], function (err, qRes) {
                logger.debug("createInfo1", qRes);
                if (!!err || !qRes || qRes.length < 1) {
                    utils.invokeCallback(cb, "俱乐部不存在", null);
                    return;
                }
                // 俱乐部人数上限150人
                if (!!qRes && qRes[0].num >= msg.maxNum) {
                    utils.invokeCallback(cb, "该俱乐部已满，无法继续申请", null);
                    return;
                }
                msg.pid = qRes[0].pid;
                next();
            });
        },
        function (next) {
            // 俱乐部申请上限100
            var sql = "select count(*) as num from `qp_packplayer` where pid=? and audit =0;";
            pomelo.app.get('dbclient').query(sql, [msg.pid], function (err, qRes) {
                if (!!qRes && qRes.length > 0 && qRes[0].num >= MAX_APPLY_COUNT) {
                    utils.invokeCallback(cb, "俱乐部主繁忙，等等再试", null);
                    return;
                }
                next();
            });
        },
        function (next) {
            packPlayerDao.getPackPlayer(msg.pid, msg.playerUid, function (err, playerInfo) {
                if (!!playerInfo && playerInfo.audit >= 0) {
                    utils.invokeCallback(cb, playerInfo.audit > 0 ? "玩家已加入俱乐部" : "已经存在该用户的申请", null);
                    return;
                }
                next(null, playerInfo);
            });
        },
        function (playerInfo, next) {
            var countSql = 'select count(*) as num from `qp_packplayer` where uid=? and audit >0;';
            pomelo.app.get('dbclient').query(countSql, [msg.playerUid], function (err, qRes) {
                logger.debug("createInfo2", qRes);
                if (!!qRes && qRes[0].num >= 5) {
                    utils.invokeCallback(cb, "最多只能拥有5个俱乐部哦", null);
                    return;
                }
                next(null, playerInfo);
            });
        },
        function (playerInfo, next) {
            //logger.debug('createInfo->  getPackPlayer', playerInfo);
            if (!!playerInfo) {
                if(playerInfo.audit == -1) {
                    // 拒绝加入情况
                    var diff = moment().diff(playerInfo.createTime, "seconds");
                    logger.debug('createInfo', diff);
                    if (diff < 3600) {
                        utils.invokeCallback(cb, "你的申请被拒绝，请稍后再试", null);
                        return;
                    }
                }
                if (playerInfo.audit < 0) {
                    var sql = "update qp_packplayer set audit=0, auditUid=0 where id=?";
                    pomelo.app.get('dbclient').query(sql, [playerInfo.id], function (err, uRes) {
                        if (!!err) {
                            logger.error('create qp_packplayer failed! ' + err.stack);
                            utils.invokeCallback(cb, err, null);
                            return;
                        } else {
                            utils.invokeCallback(cb, null, playerInfo.id);
                            return;
                        }
                    }.bind(this));
                }

                if (playerInfo.audit >= 0) {
                    utils.invokeCallback(cb, playerInfo.audit > 0 ? "玩家已加入俱乐部" : "已经存在该用户的申请", null);
                    return;
                }
            } else {
                logger.debug("创建俱乐部玩家数据%j", msg);
                var sql = 'insert into qp_packplayer (pid,uid,playerName,phone,audit) values (?,?,?,?,?)';
                var args = [msg.pid, msg.playerUid, msg.playerName, msg.phone, msg.audit];
                pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
                    if (!!err) {
                        logger.error('create qp_packplayer failed! ' + err.stack);
                        utils.invokeCallback(cb, err, null);
                    } else {
                        utils.invokeCallback(cb, null, res.insertId);
                    }
                    next(null);
                });
            }
        }

    ], function (err, ret) {
        if (!!err) {
            utils.invokeCallback(cb, err, null);
            return;
        }
    });
};

packPlayerDao.inviteJoin = function (msg, cb) {
    async.waterfall([
        function (next) {
            settingsDao.getSettings(PACK_MAX_MEMBER_NUM_KEY, function (err, num) {
                msg.maxNum = num || 120;
                next();
            });
        },
        function (next) {
            var sql = "select * from qp_pack where packNum=?;";
            logger.debug('createInfo', sql, msg.packNum);
            pomelo.app.get('dbclient').query(sql, [msg.packNum], function (err, qRes) {
                logger.debug("createInfo1", qRes);
                if (!!err || !qRes || qRes.length < 1) {
                    utils.invokeCallback(cb, "俱乐部不存在", null);
                    return;
                }
                // 俱乐部人数上限150人
                if (!!qRes && qRes[0].num >= msg.maxNum) {
                    utils.invokeCallback(cb, "该俱乐部已满，无法继续申请", null);
                    return;
                }
                msg.pid = qRes[0].pid;
                next();
            });
        },
        function (next) {
            packPlayerDao.getPackPlayer(msg.pid, msg.applyUid, function (err, playerInfo) {
                if (!!playerInfo && playerInfo.audit > 0) {
                    utils.invokeCallback(cb, playerInfo.audit > 0 ? "玩家已加入俱乐部" : "已经存在该用户的申请", null);
                    return;
                }
                next(null, playerInfo);
            });
        },
        function (playerInfo, next) {
            settingsDao.getSettings(PACK_MAX_MIX_NUM_KEY, function (err, num) {
                msg.maxMixNum = num || 5;
                next(null, playerInfo);
            });
        },
        function (playerInfo, next) {
            var countSql = 'select count(*) as num from `qp_packplayer` where uid=? and audit >0;';
            pomelo.app.get('dbclient').query(countSql, [msg.applyUid], function (err, qRes) {
                logger.debug("createInfo2", qRes);
                if (!!qRes && qRes[0].num >= msg.maxMixNum) {
                    utils.invokeCallback(cb, "玩家最多只能拥有5个俱乐部哦", null);
                    return;
                }
                next(null, playerInfo);
            });
        },
        function (playerInfo, next) {
            playerDao.getPlayerByUid(msg.applyUid, function (err, applyUser) {
                if (!!err || !applyUser) {
                    utils.invokeCallback(cb, '被邀请玩家不存在', null);
                    return;
                }
                next(null, playerInfo, applyUser[0]);
            })
        },
        function (playerInfo, applyUser, next) {
            logger.debug('createInfo->  getPackPlayer', playerInfo, applyUser);
            if (!!playerInfo) {
                if (playerInfo.audit > 0) {
                    utils.invokeCallback(cb, playerInfo.audit > 0 ? "玩家已加入俱乐部" : "已经存在该用户的申请", null);
                    return;
                } else {
                    var sql = 'update qp_packplayer set audit=1,  auditUid=? where id=?';
                    var args = [msg.uid, playerInfo.id];
                    pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
                        if (!!err) {
                            logger.error('create qp_packplayer failed! ' + err.stack);
                            utils.invokeCallback(cb, err, null);
                        } else {
                            //utils.invokeCallback(cb, null, 1);
                            next();
                        }
                    });
                }
            } else {
                logger.debug("创建俱乐部玩家数据%j", msg);
                var sql = 'insert into qp_packplayer (pid,uid,playerName,phone,audit) values (?,?,?,?,?)';
                var args = [msg.pid, applyUser.uid, applyUser.nickName, '', msg.audit];
                pomelo.app.get('dbclient').insert(sql, args, function (err, res) {
                    if (!!err) {
                        logger.error('create qp_packplayer failed! ' + err.stack);
                        utils.invokeCallback(cb, err, null);
                    } else {
                        //packDao.addNum(msg.pid, +1);
                        //utils.invokeCallback(cb, null, res.insertId);
                        next();
                    }
                });
            }
        },
        function (next) {
            packDao.addNum(msg.pid, +1);
            utils.invokeCallback(cb, null, 1);
            next(null);
        }
    ], function (err, ret) {
        if (!!err) {
            utils.invokeCallback(cb, err, null);
            return;
        }
    });
}
/**
 * 申请列表
 * @param pid
 * @param cb
 */
packPlayerDao.getApplyList = function (pid, cb) {
    var sql = "SELECT t.pid, t.packNum, t.`name`, t.num, t.notice, p.uid, p.playerName, p.phone, p.audit, a.headUrl " +
        "FROM `qp_pack` AS t, `qp_packplayer` AS p, `qp_player` as a WHERE a.uid=p.uid AND t.pid=p.pid AND p.pid=? AND p.audit=0;";
    pomelo.app.get('dbclient').query(sql, [pid], function (err, res) {
        logger.debug('packPlayerDao->getApplyList', err, res);
        if (!!err || !res) {
            utils.invokeCallback(cb, '获得申请列表错误', null);
            return;
        } else {
            cb(null, res || []);
        }
    });
}

packPlayerDao.getPlayerApplys = function (uid, cb) {
    var sql = "SELECT t.pid, t.packNum, t.`name`, t.num, t.notice, p.uid, p.playerName, p.phone, p.audit, a.headUrl " +
        "FROM `qp_pack` AS t, `qp_packplayer` AS p , `qp_player` as a WHERE a.uid=p.uid AND t.pid=p.pid AND p.uid=? AND (p.audit=0 OR p.audit=-2);";
    pomelo.app.get('dbclient').query(sql, [uid], function (err, res) {
        logger.debug('packPlayerDao->getPlayerApplys', err, res);
        if (!!err || !res) {
            utils.invokeCallback(cb, '获得申请列表错误', null);
            return;
        } else {
            cb(null, res || []);
        }
    });
}

packPlayerDao.playerCancelApply = function (uid, pid, cb) {
    var sql = "UPDATE qp_packplayer set audit=-2 WHERE uid=? and pid=?";
    pomelo.app.get('dbclient').query(sql, [uid, pid], function (err, res) {
        logger.debug('packPlayerDao->playerCancelApply', err, res);
        if (!!err || !res) {
            utils.invokeCallback(cb, '没有申请记录');
            return;
        } else {
            utils.invokeCallback(cb, err, res.affectedRows);
        }
    });
}

/**
 * 获取俱乐部里的玩家
 * @param pid
 * @param pageIndex
 * @param pageSize
 * @param cb
 */
packPlayerDao.getList = function (pid, pageIndex, pageSize, cb) {
    var sql = "SELECT p.`uid`,p.`nickName`,p.`headUrl`,t.notice FROM qp_packplayer as t, `qp_player` as p " +
        "WHERE p.uid = t.uid and t.pid = ? AND t.audit=1  ORDER BY t.createTime  desc LIMIT ?,?";
    var args = [pid, (pageIndex - 1) * pageSize, pageSize-0];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('get list by qp_packplayer failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (res) {
                logger.debug("getList res");
                cb(null, res);
            } else {
                logger.debug("getList null");
                cb(null, null);
            }
        }
    });
};

packPlayerDao.getPackPlayer = function (pid, uid, cb) {
    var sql = "SELECT * FROM qp_packplayer WHERE pid =? and uid=?;";
    var args = [pid, uid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            logger.error('get list by qp_packplayer failed! ' + err.stack);
            utils.invokeCallback(cb, err, null);
        } else {
            if (res.length > 0) {
                logger.debug("getPackPlayer res");
                cb(null, res[0]);
            } else {
                logger.debug("getPackPlayer null");
                cb(null, null);
            }
        }
    });
};

//删除俱乐部成员
packPlayerDao.delPackPlayer = function (msg, cb) {
    var sql = "update qp_packplayer set audit=-3 WHERE uid = ? and pid=?;";
    var args = [msg.delUid, msg.pid];
    pomelo.app.get('dbclient').query(sql, args, function (err, res) {
        if (!!err) {
            utils.invokeCallback(cb, err, res);
            return;
        }
        else if (res.affectedRows == 0) {
            utils.invokeCallback(cb, "没有该记录");
            return;
        }
        packDao.addNum(msg.pid, -1);
        logger.debug("删除玩家成功：" + msg.uid);
        utils.invokeCallback(cb, err, res.affectedRows);
    });
}

//审核
packPlayerDao.auditPackPlayer = function (msg, cb) {
    async.waterfall([
        function (next) {
            settingsDao.getSettings(PACK_MAX_MEMBER_NUM_KEY, function (err, num) {
                msg.maxNum = num || 120;
                next();
            });
        },
        function (next) {
            var sql = "select * from qp_pack where pid=?;";
            logger.debug('createInfo', sql, msg.pid);
            pomelo.app.get('dbclient').query(sql, [msg.pid], function (err, qRes) {
                logger.debug("createInfo1", qRes);
                if (!!err || !qRes || qRes.length < 1) {
                    utils.invokeCallback(cb, "俱乐部不存在", null);
                    return;
                }
                // 俱乐部人数上限150人
                if (msg.audit == 1 && !!qRes && qRes[0].num >= msg.maxNum) {
                    utils.invokeCallback(cb, "该俱乐部已满，无法继续加入", null);
                    return;
                }
                msg.pid = qRes[0].pid;
                next();
            });
        },
        function (next) {
            packPlayerDao.getPackPlayer(msg.pid, msg.applyUid, function (err, ret) {
                if (!!err || !ret) {
                    utils.invokeCallback(cb, '申请不存在');
                    return;
                }
                if (ret.audit != 0) {
                    utils.invokeCallback(cb, '申请不存在!');
                    return;
                }
                next();
            });
        },
        function (next) {
            var sql = "update qp_packplayer set audit=?,auditUid=? WHERE uid = ? and pid=? ";
            var args = [msg.audit, msg.auditUid, msg.applyUid, msg.pid];
            pomelo.app.get('dbclient').query(sql, args, function (err1, res1) {
                if (!!err1) {
                    utils.invokeCallback(cb, err1, res1);
                    return;
                }
                logger.debug('auditPackPlayer', res1);
                if (msg.audit == 1 && res1.affectedRows >= 0) {
                    logger.debug("auditPackPlayer 增加");
                    packDao.addNum(msg.pid, +1);
                }
                utils.invokeCallback(cb, err1, res1);
                next(null);
            });
        }
    ], function (err) {
        if (!!err) {
            utils.invokeCallback(cb, err, null);
            return;
        }
    });
}

/**
 * 更新成员信息
 * @param msg
 * @param cb
 */
packPlayerDao.updateMemberNote = function (msg, cb) {
    var sql = "update qp_packplayer set notice=? WHERE uid = ? and pid=? ";
    var args = [msg.note, msg.uid, msg.pid];
    pomelo.app.get('dbclient').query(sql, args, function (err1, res1) {
        logger.debug('updateMemberNote', err1, res1);
        if (!!err1) {
            utils.invokeCallback(cb, err1, null);
            return;
        }
        utils.invokeCallback(cb, null, res1.affectedRows);
    });
}

/**
 * 玩家所在俱乐部id
 * @param uid
 * @param cb
 */
packPlayerDao.getPlayerPackIds = function (uid, cb) {
    var sql = "select pid from  qp_packplayer WHERE uid = ? and audit=1;";
    pomelo.app.get('dbclient').query(sql, [uid], function (err1, res1) {
        logger.debug('getPlayerPackIds', err1, res1.length);
        if (!!err1) {
            utils.invokeCallback(cb, err1, null);
            return;
        }
        utils.invokeCallback(cb, null, res1);
    });
}

/**
 * 玩家所在俱乐部 成员信息
 * @param uid
 * @param cb
 */
packPlayerDao.getPlayerPackMemberInfo = function (uid, cb) {
    var sql = "select * from  qp_packplayer WHERE uid = ? and audit=1;";
    pomelo.app.get('dbclient').query(sql, [uid], function (err1, res1) {
        logger.debug('getPlayerPackIds', err1, res1.length);
        if (!!err1) {
            utils.invokeCallback(cb, err1, null);
            return;
        }
        utils.invokeCallback(cb, null, res1);
    });
}

/**
 *
 * @param pid
 * @param uids
 * @param gameType
 */
packPlayerDao.updateMemberLastJoin = function (pid, uids, gameType) {
    var sql = "update qp_packplayer set lastJoin=? where pid=? and audit=1 and uid in (?);"
    var args = [gameType, pid, uids];
    pomelo.app.get('dbclient').query(sql, args, function (err1, res1) {
        logger.debug('getPlayerPackIds', err1, res1.length);
    });
}


