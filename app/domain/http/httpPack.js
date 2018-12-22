/**
 * Created by Administrator on 2017/8/10 0010.
 */
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var Code = require('../../consts/code');
var sync2HallType = require('../../consts/consts').Sync2HallType;
var playerDao = require('../../dao/playerDao');
var packPlayerDao = require('../../dao/packPlayerDao');
var packDao = require('../../dao/packDao');
var packAutoTableDao = require('../../dao/packAutoTableDao');
var packPayDao = require('../../dao/packPayDao');
var playerHuiFangDao = require('../../dao/playerHuiFangDao');
var packGameRecordDao = require('../../dao/packGameRecordDao');
var async = require('async');
var date = require('../../util/date');
var packConfig  = require('../../../config/pack');

var pack = module.exports;

/// ==================== 俱乐部相關操作 ====================

/**
 * 创建 俱乐部
 * @param msg {uid,name,picUrl,ownerUid,ownerName}
 * @param res
 */
pack.qp_createPack = function (msg, res) {
    if (!msg.ownerUid || !msg.uid || !msg.name || !msg.ownerName) {
        res.send({code: 500, error: '参数错误'});
        return;
    }

    async.waterfall([
        function (next) {
            playerDao.getPlayerByUid(msg.ownerUid,function(err,players) {
                if ( !players || players.length < 1 || players[0].vipLevel < 10 ) {
                    res.send({code: 500, error: "权限不够"});
                    return;
                }
                next();
            });
        },
        function (next) {
            packDao.getUserCreateNum(msg.ownerUid, function (err, row) {
                if ( !!err ) {
                    logger.error(err);
                    res.send({code: 500, error: err});
                    return;
                }

                logger.debug('qp_createPack::createNum', row);
                if ( row['createNum'] >= 3 ) {
                    res.send({code: 500, error: "最多能创建3个俱乐部"});
                    return;
                }
                next();
            });
        },
        function (next) {
            var countSql = 'select count(*) as num from `qp_packplayer` where uid=? and audit >0;';
            pomelo.app.get('dbclient').query(countSql, [msg.ownerUid], function (err, qRes) {
                logger.debug("createInfo2", qRes);
                if (!!qRes && qRes[0].num >= 5) {
                    res.send({code: 500, error: '最多只能拥有5个俱乐部哦'});
                    return;
                }
                next();
            });
        },
        function (next) {
            // get pack num
            packDao.getPackNum(function (err, packNum) {
                if (!!err) {
                    res.send({code: 500, error: "生成俱乐部号错误"});
                    return;
                }
                msg.packNum = packNum;
                next();
            });
        },
        function (next) {
            packDao.checkPackNameExist(msg.name, function (err) {
                if (!!err) {
                    next(err);
                    return;
                }
                next();
            })
        },
        function (next) {
            // check create condition
            pomelo.app.rpc.hall.packRemote.checkCreateCondition(null, msg, function (err) {
                if (!!err) {
                    next(err);
                    return;
                }
                next();
            });
        },
        function (next) {
            packDao.createInfo(msg, function(err, ret) {
                if (!!err) {
                    logger.error(err);
                    res.send({code: 500, error: err});
                    return;
                }

                res.send({code: 200, pid: ret});
            });
        }
    ], function (err) {
        if (!!err) {
            res.send({code: 500, error: err});
            return;
        }
    });
}

pack.qp_getPackByNum = function (msg, res) {
    if (!msg.uid || !msg.packNum) {
        res.send({code: 500, error: '参数错误'});
        return;
    }
    packDao.getInfoByNum(msg.packNum, function (err, packInfo) {
        if (!!err || !packInfo) {
            res.send({code: 500, error: err});
            return;
        }
        res.send({code: 200, data: packInfo});
    })
}
/**
 * 更新俱乐部信息
 * @param msg {uid,pid,operateUid}
 * @param res
 */
pack.qp_setOperatePack = function (msg, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!msg.uid || !msg.pid || !msg.operateUid) {
        logger.debug('参数错误');
        res.send({code: 500, error: '参数错误'});
        return;
    }

    playerDao.getPlayerByUid(msg.operateUid, function (err, playerOp) {
        if (!playerOp || playerOp.length == 0) {
            logger.error("没有该玩家:%d", msg.operateUid);
            res.send({code: 500, error: "没有该玩家:" + msg.operateUid});
            return;
        }
        //logger.debug("玩家%j",playerOp);
        var req = {
            pid: msg.pid,
            ownerUid: msg.uid,
            fields: ["operateUid", "operateName"],
            values: [msg.operateUid, playerOp[0].nickName]
        }
        packDao.updateInfos(req, function (err, ret) {
            if (!!err) {
                logger.error(err);
                res.send({code: 500, error: err});
            }
            else {
                res.send({code: 200, data: ret});
            }
        });

    });
}

/**
 * 获取俱乐部列表
 * @param msg {uid,target}
 * @param res
 */
pack.qp_getPacks = function (msg, res) {
    if (!msg.uid || !msg.target) {
        res.send({code: 500, error: '参数错误'});
        return;
    }
    switch (msg.target) {
        case "owner":
            packDao.getListByOwnerUid(msg.uid, function (err, ret) {
                if (!!err) {
                    logger.error(err);
                    res.send({code: 500, error: err});

                }
                else {
                    res.send({code: 200, data: ret});
                }
            });
            break;
        case "operate":
            packDao.getListByOperateUId(msg.uid, function (err, ret) {
                if (!!err) {
                    logger.error(err);
                    res.send({code: 500, error: err});
                }
                else {
                    res.send({code: 200, data: ret});
                }
            });
            break;
        case "player":
            packDao.getList(msg.uid, function (err, ret) {
                if (!!err) {
                    logger.error(err);
                    res.send({code: 500, error: err});
                }
                else {
                    res.send({code: 200, data: ret});
                }
            });
            break;
    }

}

/**
 * 用户所在的俱乐部
 * @param msg
 * @param res
 */
pack.qp_getPlayerPack = function (msg, res) {
    if (!msg.uid) {
        logger.debug('参数错误');
        res.send({code: 500, error: '参数错误'});
        return;
    }

    packDao.getPlayerPack(msg.uid, function (err, ret) {
        if (!!err) {
            logger.error(err);
            res.send({code: 500, error: err});
        }
        else {
            res.send({code: 200, data: ret});
        }
    });
}

/**
 * 俱乐部成员列表
 * @param msg
 * @param res
 */
pack.qp_getPackMembers = function (msg, res) {
    if (!msg.uid || !msg.pid) {
        logger.debug('参数错误');
        res.send({code: 500, error: '参数错误'});
        return;
    }

    var pageIndex = msg.pageIndex || 1;
    var pageSize = msg.pageSize || 20;

    packPlayerDao.getList(msg.pid, pageIndex, pageSize, function (err, ret) {
        if (!!err) {
            logger.error(err);
            res.send({code: 500, error: err});
        }
        else {
            res.send({code: 200, data: ret});
        }
    });
}
/**
 * 删除俱乐部
 * @param msg {pid,uid}
 * @param res
 */
pack.qp_delPacks = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        logger.debug('没有俱乐部号' + msg.pid);
        res.send({code: 500, error: '参数错误'});
        return;
    }
    packDao.getInfo(msg.pid, function (err, packInfo) {
        if (packInfo.ownerUid != msg.uid) {
            res.send({code: 500, error: "只有俱乐部主可以删除俱乐部"});
            return;
        }

        packDao.delPack(msg.pid, function (err, ret) {
            if (!!err) {
                logger.error(err);
                res.send({code: 500, error: err});
            }
            else {
                //删除 俱乐部房间
                pomelo.app.rpc.hall.packRemote.delAutoTableCnfByPidRpc(null, msg, function (err, ret) {
                });
                res.send({code: 200, data: ret});
            }
        });
    });
}

/**
 * 隐藏俱乐部列表
 * @param msg {pid,ownerUid,bHideRoom}
 * @param res
 */
pack.qp_hidePack = function (msg, res) {
    if (!msg.pid || !msg.ownerUid) {
        logger.debug('没有俱乐部号' + msg.pid);
        res.send({code: 500, error: '参数错误'});
        return;
    }
    var req = {
        pid: msg.pid,
        fields: ["bHideRoom"],
        valus: [msg.bHideRoom]
    }
    packDao.updateInfos(req, function (err, ret) {
        if (!!err) {
            res.send({code: 500, error: ''});
            return;
        }
        //把大厅自动房间设置成隐藏
        pomelo.app.rpc.hall.packRemote.setHideAutoTableByPidRpc(null, msg, function (err, ret) {
        });

        res.send({code: 200});
    });
}

/**
 * 更新信息
 * @param msg {name,picUrl,ownerUid,ownerName,operateUid,operateName,bHideRoom,pid}
 * @param res
 */
pack.qp_updatePackInfo = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        logger.debug('没有俱乐部号' + msg.pid);
        res.send({code: 500, error: '参数错误'});
        return;
    }
    packDao.getInfo(msg.pid, function (err, packInfo) {
        if (packInfo.ownerUid != msg.uid) {
            res.send({code: 500, error: "只有俱乐部主可以修改俱乐部信息"});
            return;
        }

        packDao.updateInfo(msg, function (err, ret) {
            if (!!err) {
                logger.error(err);
                res.send({code: 500, error: err});
            }
            else {
                res.send({code: 200, data: ret});
            }
        });
    });
}

/**
 * 充值俱乐部房卡
 * @param msg {uid, fangKa, type:'fangKa'}
 * @param res
 */
pack.qp_AddPackGem = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.fangKa) {
        res.send({code: Code.FAIL, error: '参数错误'});
        return;
    }

    async.waterfall([
        function (next) {
            packDao.getInfo(msg.pid, function (err, packInfo) {
                if (!!err || !packInfo) {
                    res.send({code: Code.FAIL, error: '俱乐部不存在'});
                    return;
                }
                if (packInfo.ownerUid != msg.uid) {
                    res.send({code: Code.FAIL, error: '没有操作权限'});
                    return;
                }
                next();
            });
        },
        function (next) {
            playerDao.getPlayerByUid(msg.uid, function (err, users) {
                if (!!err || !users || users.length < 1) {
                    res.send({code: Code.FAIL, error: '操作用户不存在'});
                    return;
                }

                if (users[0].gemNum < Math.abs(msg.fangKa)) {
                    res.send({code: Code.FAIL, error: '钻石不足'});
                    return;
                }
                next();
            });
        },
        function (next) {
            pomelo.app.rpc.hall.msgRemote.updatePlayerFromGame(null,
                {type: sync2HallType.fangKaOffline, uid: msg.uid, fangKa: msg.fangKa > 0 ? -msg.fangKa : msg.fangKa},
                function (err, tables) {
                    //logger.debug('httpPack->qp_getPackTablesList->getTableListRpc', err,tables);
                    if (!!err) {
                        logger.error(err);
                        res.send({code: Code.FAIL, error: err});
                        return;
                    }
                    //
                    packPayDao.addPackPayLog(msg.pid, msg.uid, 1, msg.fangKa, function () {
                    });
                    packDao.updatePackGemNum(msg.pid, msg.fangKa, function (err, data) {
                        if (!!err) {
                            logger.error(err);
                            res.send({code: Code.FAIL, error: ''});
                            return;
                        }
                        res.send({code: 200});
                    })
                });
        }
    ], function (err) {
        if (!!err) {
            res.send({code: Code.FAIL, error: err});
            return;
        }
    });
}

/**
 * 提取俱乐部房卡
 * @param msg {uid, fangKa, type:'fangKa'}
 * @param res
 */
pack.qp_drawPackGem = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.fangKa) {
        res.send({code: Code.FAIL, error: '参数错误'});
        return;
    }

    packDao.getInfo(msg.pid, function (err, packInfo) {
        if (!!err || !packInfo) {
            res.send({code: Code.FAIL, error: '俱乐部不存在'});
            return;
        }
        if (packInfo.ownerUid != msg.uid) {
            res.send({code: Code.FAIL, error: '没有操作权限'});
            return;
        }
        if (packInfo.gemNum < +packInfo.fangKa) {
            res.send({code: Code.FAIL, error: '俱乐部钻石不足'});
            return;
        }

        packDao.updatePackGemNum(msg.pid, -msg.fangKa, function (err, data) {
            if (!!err) {
                logger.error(err);
                res.send({code: Code.FAIL, error: err});
                return;
            }
            packPayDao.addPackPayLog(msg.pid, msg.uid, 2, msg.fangKa, function () {});
            pomelo.app.rpc.hall.msgRemote.updatePlayerFromGame(null, {
                type: sync2HallType.fangKaOffline,
                uid: msg.uid,
                fangKa: msg.fangKa
            }, function (err, tables) {
                //logger.debug('httpPack->qp_getPackTablesList->getTableListRpc', err,tables);
                if (!!err) {
                    logger.error(err);
                    res.send({code: Code.FAIL, error: ''});
                    return;
                }

                res.send({code: 200});
            });
        })
    });

}

/**
 * 申请加入俱乐部
 * @param msg {pid,playerUid,playerName,phone,auditUid}
 * @param res
 */
pack.qp_packApplyJoin = function (msg, res) {
    if (!msg.packNum || !msg.playerUid) {
        logger.debug('没有俱乐部号' + msg.packNum);
        res.send({code: 500, error: '参数错误'});
        return;
    }

    if (msg.packNum != parseInt(msg.packNum)) {
        res.send({code: 500, error: '俱乐部号错误'});
        return;
    }

    msg.audit = 0;
    packPlayerDao.createInfo(msg, function (err, ret) {
        if (!!err) {
            logger.error("qp_addPackPlayer222:" + err);
            res.send({code: 500, error: err});
        }
        else {
            pomelo.app.rpc.hall.packRemote.notifyPackState(null, {pid: msg.pid, playerUid: msg.playerUid}, function (err) {

            });
            res.send({code: 200, data: ret});
        }
    });
}

/**
 * 申请列表
 * @param msg {uid, pid}
 * @param res
 */
pack.qp_packApplyList = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        logger.debug('没有俱乐部号' + msg.pid);
        res.send({code: 500, error: '参数错误'});
        return;
    }

    packPlayerDao.getApplyList(msg.pid, function (err, applyInfo) {
        if (!!err) {
            res.send({code: 500, error: err});
        }
        else {
            res.send({code: 200, data: applyInfo});
        }
    });
}

/**
 * 用户申请列表
 * @param msg
 * @param res
 */
pack.qp_playerApplyList = function (msg, res) {
    if (!msg.uid) {
        res.send({code: 500, error: '参数错误'});
        return;
    }
    packPlayerDao.getPlayerApplys(msg.uid, function (err, applyInfo) {
        if (!!err) {
            res.send({code: 500, error: err});
        }
        else {
            res.send({code: 200, data: applyInfo});
        }
    });
}

/**
 * 取消申请
 * @param msg
 * @param res
 */
pack.qp_playerCancelApply = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        logger.debug('没有俱乐部号' + msg.pid);
        res.send({code: 500, error: '参数错误'});
        return;
    }
    packPlayerDao.playerCancelApply(msg.uid, msg.pid, function (err, data) {
        if (!!err) {
            res.send({code: 500, error: err});
            return;
        }
        else {
            pomelo.app.rpc.hall.packRemote.notifyPackState(null, {pid: msg.pid, playerUid: msg.uid}, function (err) {

            });
            res.send({code: 200, data: data});
        }
    });
}

/**
 * 审核成员申请
 * @param msg   {applyUid, pid, audit:(1||-1), auditUid}
 * @param res
 */
pack.qp_packAuthJoin = function (msg, res) {
    if (!msg.pid || !msg.applyUid || !msg.audit) {
        logger.debug('参数错误' + msg);
        res.send({code: 500, error: "参数错误"});
        return;
    }

    if (!(msg.audit == 1 || msg.audit == -1)) {
        logger.debug('参数错误' + msg);
        res.send({code: 500, error: "参数错误"});
        return;
    }

    packDao.getInfo(msg.pid, function (err, packinfo) {
        if (!!err || !packinfo) {
            res.send({code: 500, error: "俱乐部不存在"});
            return;
        }
        if (packinfo.ownerUid != msg.auditUid) {
            logger.debug('id为%d用户没有审核的权限,俱乐部号%d', msg.auditUid, msg.pid);
            res.send({code: 500, error: "该用户没有审核的权限"});
            return;
        }

        packPlayerDao.auditPackPlayer(msg, function (err, ret) {
            if (!!err) {
                logger.error("qp_addPackPlayer111:" + err);
                res.send({code: 500, error: err});
            }
            else {
                pomelo.app.rpc.hall.packRemote.notifyAuthJoinPack(null, {uid: msg.applyUid, pid: msg.pid, audit: msg.audit, packName: packinfo.name}, function (err) {

                })
                res.send({code: 200, data: ret.affectedRows});
            }
        });
    });
}

/**
 * 退出俱乐部
 * @param msg {uid,pid,delUid}
 * @param res
 */
pack.qp_quitPack = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.delUid) {
        res.send({code: 500, error: "参数错误"});
        return;
    }

    packDao.getInfo(msg.pid, function (err, packinfo) {
        if (!packinfo) {
            res.send({code: 500, error: "俱乐部不存在"});
            return;
        }
        if (packinfo.ownerUid == msg.delUid) {
            res.send({code: 500, error: "俱乐部主不能退出俱乐部"});
            return;
        }

        packPlayerDao.delPackPlayer(msg, function (err, ret) {
            if (!!err) {
                logger.error(err);
                res.send({code: 500, error: err});
            }
            else {
                pomelo.app.rpc.hall.packRemote.notifyQuitPack(null, {pid: msg.pid, uid: msg.uid}, function () {
                    
                });
                res.send({code: 200, data: ret});
            }
        });
    });
}

/**
 * 踢人出俱乐部
 * @param msg {uid,pid,delUid}
 * @param res
 */
pack.qp_delPackPlayer = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.delUid) {
        res.send({code: 500, error: "参数错误"});
        return;
    }

    packDao.getInfo(msg.pid, function (err, packinfo) {
        if (packinfo.ownerUid != msg.uid) {
            res.send({code: 500, error: "该用户没有踢人的权限"});
            return;
        }

        if (msg.delUid == packinfo.ownerUid) {
            res.send({code: 500, error: "别瞎忙活了，俱乐部主不能踢"});
            return;
        }
        packPlayerDao.delPackPlayer(msg, function (err, ret) {
            if (!!err) {
                logger.error(err);
                res.send({code: 500, error: err});
            }
            else {
                pomelo.app.rpc.hall.packRemote.notifyQuitPack(null, {pid: msg.pid, uid: msg.delUid}, function () {

                });
                res.send({code: 200, data: ret});
            }
        });
    });
}


/**
 * 创建自动房间
 * @param msg {uid,pid,roomName,roomConfig,bDisable,serverType}
 * @param res
 */
pack.qp_createAutoTable = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.serverType || !msg.roomConfig) {
        res.send({code: 500, error: '参数错误'});
        return;
    }

    try {
        var cnf = JSON.parse(msg.roomConfig);
        async.waterfall([
            function (next) {
                packDao.getInfo(msg.pid, function (err, packinfo) {
                    if (!!err || !packinfo) {
                        res.send({code: 500, error: "俱乐部不存在"});
                        return;
                    }
                    if (packinfo.operateUid != msg.uid) {
                        logger.debug('id为%d用户没有创建俱乐部的自动房间的权限：俱乐部号%d', msg.uid, msg.pid);
                        res.send({code: 500, error: "用户没有创建俱乐部的自动房间的权限"});
                        return;
                    }
                    logger.debug('qp_createAutoTable', packConfig.packLossMode);
                    if (packConfig.packLossMode == 2 && packinfo.gemNum < 1) {
                        res.send({code: 500, error: "钻石不足"});
                        return;
                    }
                    next(null, packinfo);
                });
            },
            function (packinfo, next) {
                var servers = pomelo.app.getServersByType(cnf.serverType);
                if (!servers || servers.length < 1) {
                    res.send({code: 500, error: 'can not find servers.'});
                    return;
                }
                var serverId = servers[0]['id'];

                pomelo.app.rpc.hall.packRemote.getPackTablesWillLoss(null, {pid: msg.pid}, function (err, cost) {
                    if (!!err) {
                        res.send({code: 500, error: 'can not find servers.'});
                        return;
                    }

                    logger.debug('qp_createAutoTable old cost: %d', cost);
                    if (packConfig.packLossMode == 2) {
                        // 俱乐部模式 强制房主付费
                        cnf.aaGem = 0;
                    }
                    pomelo.app.rpc[cnf.serverType].gRemote.getTableNeedFangKa(serverId, {pid: msg.pid, config: cnf}, function (err, num) {
                        logger.debug('getTableNeedFangKa->back', num, packinfo.gemNum);
                        if (!!err) {
                            res.send({code: 500, error: err});
                            return;
                        }
                        // 俱乐部扣费模式
                        var need = cost + num;
                        logger.debug('qp_createAutoTable', packConfig.packLossMode, need , packinfo.gemNum);
                        if (packConfig.packLossMode == 2 && need > packinfo.gemNum) {
                            res.send({code: 500, error: "钻石不足"});
                            return;
                        }
                        next(null, need);
                    });
                });

            },
            function (needGem, next) {
                // 玩家扣费模式
                if (packConfig.packLossMode == 1) {
                    pomelo.app.rpc.hall.msgRemote.checkPlayerEnoughGem(null, {uid: msg.uid, needNum: needGem}, function (err, hasEnoughGem) {
                        if (!!err) {
                            res.send({code: 500, error: "找不到玩家"});
                            return;
                        }
                        if (!hasEnoughGem) {
                            res.send({code: 500, error: "钻石不足"});
                            return;
                        }
                        next();
                    });
                } else {
                    next();
                }
            },
            function (next) {
                packAutoTableDao.getPackAutoTableSetting(msg, function (err, data) {
                    if (data && data.length >= 3) {
                        res.send({code: 500, error: "最多创建3个自动房间配置"});
                        return;
                    }
                    next();
                });
            },
            function (next) {
                packAutoTableDao.createInfo(msg, function (err, ret) {
                    if (!!err) {
                        logger.error(err);
                        res.send({code: 500, error: err});
                    } else {
                        msg.id = ret;
                        //给大厅发消息，存入俱乐部信息
                        pomelo.app.rpc.hall.packRemote.addPackAutoTableRpc(null, msg, function (err, ret) {
                            logger.debug('hall.packRemote.addPackAutoTableRpc', err, ret);
                            res.send({code: 200, data: ret});
                        });
                    }
                    next(null);
                });
            }
        ], function (err) {
            if (!!err) {
                res.send({code: 500, error: err});
            }
        });
    } catch (ex) {
        logger.debug('qp_createAutoTable', ex);
        res.send({code: 500, error: '开房配置错误'});
        return;
    }
}

pack.qp_getAutoTableSetting = function (msg, res) {
    if (!msg.pid || !msg.uid ) {
        res.send({code: 500, error: '参数错误'});
        return;
    }
    packDao.getInfo(msg.pid, function (err, packinfo) {
        if (!!err || !packinfo) {
            res.send({code: 500, error: "俱乐部不存在"});
            return;
        }
        if (packinfo.operateUid != msg.uid) {
            logger.debug('id为%d该用户没有俱乐部的操作的权限：俱乐部号%d', msg.uid, msg.pid);
            res.send({code: 500, error: "该用户没有俱乐部的操作的权限"});
            return;
        }

        packAutoTableDao.getPackAutoTableSetting(msg, function (err, data) {
            if (!!err) {
                res.send({code: 500, error: err});
            } else {
                res.send({code: 200, data: data});
            }
        });
    });

}

/**
 * 获取俱乐部房间
 * @param msg {pid}
 * @param res
 */
pack.qp_getPackTablesList = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        res.send({code: Code.FAIL, error: '参数错误'});
        return;
    }
    logger.debug('qp_getPackTablesList1', msg);
    pomelo.app.rpc.hall.packRemote.getTableListLocal(null, msg, function (err, tables) {
        //logger.debug('httpPack->qp_getPackTablesList->getTableListRpc', err,tables);
        if (!!err) {
            logger.error(err);
            res.send({code: Code.FAIL, error: ''});
            return;
        }
        logger.debug('qp_getPackTablesList2: %j', tables);
        // 临时处理 再次过滤pid
        var iList = [];
        (tables || []).map(function (t) {
            if (t.conf.pid == msg.pid) {
                iList.push(t);
            }
        });
        res.send({code: 200, tables: iList});
    });
}

/**
 * 获取俱乐部房间(通过Rpc)
 * @param msg {pid}
 * @param res
 */
pack.qp_getPackTablesListRpc = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        res.send({code: Code.FAIL, error: '参数错误'});
        return;
    }
    logger.debug('qp_getPackTablesListRpc', msg);
    pomelo.app.rpc.hall.packRemote.getTableListRpc(null, msg, function (err, tables) {
        //logger.debug('httpPack->qp_getPackTablesList->getTableListRpc', err,tables);
        if (!!err) {
            logger.error(err);
            res.send({code: Code.FAIL, error: ''});
            return;
        }
        logger.debug('qp_getPackTablesListRpc2', tables);
        res.send({code: 200, tables: tables});
    });
}

/**
 * 删除自动房间
 * @param msg {pid uid autoId}
 * @param res
 */
pack.qp_delPackAutoTable = function (msg, res) {
    if (!msg.autoId || !msg.uid) {
        res.send({code: Code.FAIL, error: '参数错误'});
        return;
    }

    packDao.getInfo(msg.pid, function (err, packinfo) {

        if (!packinfo || packinfo.operateUid != msg.uid) {
            logger.debug('id为%该用户没有删除俱乐部的自动房间的权限：俱乐部号%d', msg.uid, msg.pid);
            res.send({code: 500, error: "该用户没有删除俱乐部的自动房间的权限"});
            return;
        }

        packAutoTableDao.delTable(msg.autoId, function (err, ret) {
            if (!!err) {
                logger.debug("删除:" + err);
                res.send({code: 500, error: err});
                return;
            }

            // 删除 大厅里的房间
            pomelo.app.rpc.hall.packRemote.delAutoTableCnfRpc(null, msg, function (err, ret) {
            });
            res.send({code: 200});
        }.bind(this));
    }.bind(this));
}

/**
 * 禁用自动房间
 * @param msg {uid, pid, autoId,bDisable}
 * @param res
 */
pack.qp_setDisableAutoTable = function (msg, res) {
    if (!msg.autoId || !msg.uid) {
        res.send({code: Code.FAIL, error: '参数错误'});
        return;
    }

    packDao.getInfo(msg.pid, function (err, packinfo) {
        if (!packinfo || packinfo.operateUid != msg.uid) {
            logger.debug('id为%d该用户没有设置俱乐部的自动房间的权限：俱乐部号%d', msg.uid, msg.pid);
            res.send({code: 500, error: "该用户没有设置俱乐部的自动房间的权限"});
            return;
        }

        packAutoTableDao.updateInfo(msg.autoId, "bDisable", msg.bDisable, function (err, ret) {

            if (!!err) {
                logger.error(err);
                res.send({code: 500, error: err});
            }
            else {
                res.send({code: 200, data: ret});
                //给大厅发消息，存入俱乐部信息
                pomelo.app.rpc.hall.packRemote.setDisableAutoTableRpc(null, msg, function (err, ret) {
                });
            }
        });

    });
}

/**
 * 俱乐部成员开桌子
 * @param msg
 * @param res
 */
pack.qp_memberCreateTable = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.serverType || !msg.roomConfig) {
        res.send({code: 500, error: '参数错误'});
        return;
    }

    try {
        var cnf = typeof msg.roomConfig === 'string' ? JSON.parse(msg.roomConfig) : msg.roomConfig;
        packDao.getInfo(msg.pid, function (err, packinfo) {
            if (!!err) {
                logger.debug('俱乐部信息错误：俱乐部号%d', msg.uid, msg.pid);
                res.send({code: 500, error: "俱乐部信息错误"});
                return;
            }

            packPlayerDao.getPackPlayer(msg.pid, msg.uid, function (err, data) {
                if (!!err) {
                    res.send({code: 500, error: "不在俱乐部中，不能创建俱乐部房间"});
                    return;
                }
                if (data.audit !== 1) {
                    res.send({code: 500, error: "不在俱乐部中，不能创建俱乐部房间"});
                    return;
                }

                msg.roomConfig = JSON.parse(msg.roomConfig);
                //给大厅发消息，存入俱乐部信息
                pomelo.app.rpc.hall.packRemote.addPackMemberTableRpc(null, msg, function (err, ret) {
                    logger.debug("qp_memberCreateTable->addPackMemberTableRpc", err, ret)
                    if (!!err) {
                        logger.error(err);
                        res.send({code: 500, error: err});
                    } else {
                        res.send({code: 200, data: ret});
                    }
                });
            })
        });
    } catch (ex) {
        res.send({code: 500, error: '开房配置错误'});
        return;
    }
}

/**
 * 修改俱乐部成員信息
 * @param msg {pid, uid, note}
 * @param res
 */
pack.qp_updateMemberNote = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.note) {
        res.send({code: 500, error: '参数错误'});
        return;
    }

    packPlayerDao.updateMemberNote(msg, function (err, ret) {
        if (!!err) {
            res.send({code: 500, error: "err"});
            return;
        }
        if (ret > 0) {
            res.send({code: 200});
        } else {
            res.send({code: 500, error: '俱乐部成员不存在'});
        }

    })
}

pack.qp_updatePackNotice = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.notice) {
        res.send({code: 500, error: '参数错误'});
        return;
    }

    packDao.updateNotice(msg.pid, msg.uid, msg.notice, function (err, ret) {
        if (!!err) {
            logger.error(err);
            res.send({code: 500, error: err});
        }
        else {
            res.send({code: 200, data: ret});
        }
    });
}

pack.qp_quickJoin = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        res.send({code: 500, error: '参数错误'});
        return;
    }
    pomelo.app.rpc.hall.packRemote.getFreeTable(null, msg, function (err, ret) {
        if (!!err) {
            res.send({code: 500, error: err});
            return;
        }
        res.send({code: 200, data: ret});
    });
}

pack.qp_packGameHistory = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        logger.debug('参数错误' + msg);
        res.send({code: 500, error: "参数错误"});
        return;
    }
    msg.pageIndex = msg.pageIndex || 1;
    msg.pageSize = msg.pageSize || 10;
    playerHuiFangDao.getPackGameRecords(msg.pid, msg.pageIndex, msg.pageSize, function (err, data) {
        if (!!data){
            for (var i = 0; i < data.length; i++){
                var jsonObj = JSON.parse(data[i].record);
                if(jsonObj == undefined || jsonObj == null || jsonObj.length <= 0){
                    continue;
                }
                if (jsonObj[jsonObj.length - 1]["result"] == undefined || jsonObj[jsonObj.length - 1]["result"] == null){
                    continue;
                }
                var onePai = jsonObj[jsonObj.length - 1]["result"];
                logger.debug("one:" + typeof(onePai) + "  length:" + onePai.length);
                var lastMsg = [];
                for (var p = 0; p < onePai.length; p++){
                    var totalScore = {};
                    totalScore["uid"] = onePai[p].uid;
                    totalScore["nickName"] = onePai[p].userName;
                    totalScore["coinNum"] = onePai[p].coinNum;
                    lastMsg.push(totalScore);
                }

                data[i]["lastResult"] = lastMsg;
                data[i]["record"] = [];
                data[i]["record"] = jsonObj;
                data[i]["recordTime"] = date.timeFormat(data[i]["recordTime"]);
            }

            res.send({code: Code.OK, record:data});
        }

        res.send({code: Code.OK, record:""});
    });
}

pack.qp_packGameRecord = function (msg, res) {
    if (!msg.pid || !msg.uid) {
        logger.debug('参数错误' + msg);
        res.send({code: 500, error: "参数错误"});
        return;
    }
    msg.pageIndex = msg.pageIndex || 1;
    msg.pageSize = msg.pageSize || 10;
    packGameRecordDao.getPackGameRecords(msg.pid, msg.pageIndex, msg.pageSize, function (err, data) {
        if (!!data){
            res.send({code: Code.OK, record:data});
        }
        res.send({code: Code.OK, record:""});
    });
}

pack.qp_packInviteJoin = function (msg, res) {
    if (!msg.pid || !msg.applyUid || !msg.uid) {
        logger.debug('参数错误' + msg);
        res.send({code: 500, error: "参数错误"});
        return;
    }
    if (msg.applyUid != parseInt(msg.applyUid)) {
        res.send({code: 500, error: '被邀请人错误'});
        return;
    }
    packDao.getInfo(msg.pid, function (err, packinfo) {
        if (!!err || !packinfo) {
            res.send({code: 500, error: "俱乐部不存在"});
            return;
        }
        if (packinfo.ownerUid != msg.uid) {
            logger.debug('id为%d用户没有审核的权限,俱乐部号%d', msg.uid, msg.pid);
            res.send({code: 500, error: "该用户没有审核的权限"});
            return;
        }

        msg.audit = 1;
        msg.packNum = packinfo.packNum;
        packPlayerDao.inviteJoin(msg, function (err, ret) {
            if (!!err) {
                logger.error("qp_addPackPlayer111:" + err);
                res.send({code: 500, error: err});
            }
            else {
                pomelo.app.rpc.hall.packRemote.notifyAuthJoinPack(null, {uid: msg.applyUid, pid: msg.pid, audit: msg.audit, packName: packinfo.name}, function (err) {

                })
                res.send({code: 200, data: ret.affectedRows});
            }
        });
    });
}

/**
 * gm后台通知
 * @param msg
 * @param res
 */
pack.gmPackNotify = function (msg, res) {
    if (!msg.pid || !msg.uid || !msg.type) {
        res.send({code: 500, error: '参数错误'});
        return;
    }

    switch (+msg.type) {
        case 1: // 审核 {type: 1, uid, pid, audit:1|-1, packName}
            pomelo.app.rpc.hall.packRemote.notifyAuthJoinPack(null, {uid: msg.uid, pid: msg.pid, audit: msg.audit, packName: msg.packName}, function (err) {});
            break;
        case 2: // 踢人 {type: 2, uid, pid, packName}
            pomelo.app.rpc.hall.packRemote.notifyQuitPack(null, {pid: msg.pid, uid: msg.uid}, function () {});
            break;
        default:
            logger.error('参数错误');
            break;
    }
    res.send({code: 200});
}