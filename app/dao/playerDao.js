var logger = require('pomelo-logger').getLogger('database-log', __filename);
var pomelo = require('pomelo');
var dataApi = require('../util/dataApi');
var QPPlayer = require('../domain/entity/player');
var consts = require('../consts/consts');
var async = require('async');
var utils = require('../util/utils');
var moment = require('moment');


var activeDao = require('./activeDao');
var bagDao = require('./bagDao');

var playerDao = module.exports;

/**
 * Get an user's all players by userId
 * @param {Number} uid User Id.
 * @param {function} cb Callback function.
 */
playerDao.getPlayerByUid = function(uid, cb){
	var sql = 'select * from qp_player where uid = ?';
	var args = [uid];

	pomelo.app.get('dbclient').query(sql,args,function(err, res) {
		if(err) {
			utils.invokeCallback(cb, err.message, null);
			return;
		}
		if(!res || res.length <= 0) {
			utils.invokeCallback(cb, err, null);
			return;
		} else {
			utils.invokeCallback(cb, null, res);
		}
	});
};

/**
 * Get an user's all players by userId
 * @param {Number} uid User Id.
 * @param {function} cb Callback function.
 */
playerDao.getPlayerObjByUid = function(uid, cb){
    logger.debug("playerDao.getPlayerObjByUid == " + uid);
    var sql = 'select * from qp_player where uid = ?';
    var args = [uid];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, null, null);
            return;
        } else {
            utils.invokeCallback(cb, null, new QPPlayer(res[0]));
        }
    });
};

/**
 * get by Name
 * @param {String} name Player name
 * @param {function} cb Callback function
 */
playerDao.getPlayerByName = function(name, cb){
    var sql = 'select * from qp_player where userName = ?';
    var args = [name];

    pomelo.app.get('dbclient').query(sql,args,function(err, res){
        if (err !== null){
            utils.invokeCallback(cb, err.message, null);
        } else if (!res || res.length <= 0){
            utils.invokeCallback(cb, null, null);
        } else{
            utils.invokeCallback(cb,null, res);
        }
    });
};

/**
 * get by Name
 * @param {String} name Player name
 * @param {function} cb Callback function
 */
playerDao.getPlayerObjByName = function(name, cb){
	var sql = 'select * from qp_player where userName = ?';
	var args = [name];

	pomelo.app.get('dbclient').query(sql,args,function(err, res){
		if (err !== null){
			utils.invokeCallback(cb, err.message, null);
		} else if (!res || res.length <= 0){
			utils.invokeCallback(cb, null, null);
		} else{
			utils.invokeCallback(cb,null, new QPPlayer(res[0]));
		}
	});
};

/**
 * Get all the information of a player, include equipments, bag, skills, tasks.
 * @param {String} playerId
 * @param {function} cb
 */
playerDao.getPlayerAllInfo = function (playerId, cb) {
	async.parallel
    ([
		function(callback)
        {
			playerDao.getPlayerObjByUid(playerId, function(err, player)
            {
				if(!!err || !player) {
					logger.error('Get user for playerDao failed! ' + err.stack);
				}
				callback(err,player);
			});
		}
//		function(callback)
//        {
//            activeDao.getActiveByUid(playerId, function(err, active)
//            {
//				if(!!err || !active)
//                {
//                    //msg.uid,msg.loginTimes,msg.dayLogin,msg.vipCount
//                    var msg = {};
//                    msg["uid"] = playerId;
//                    msg["loginTimes"] = 0;
//                    msg["dayLogin"] = 0;
//                    msg["vipCount"] = 0;
//                    activeDao.createActive(msg, function(err, active)
//                    {
//                        if (!!err || !active)
//                        {
//                            logger.error("Get getActiveByUid for getActiveByUid failed!");
//                        }
//                        else
//                        {
//                            activeDao.getActiveByUid(playerId, function(err, active){
//                                logger.debug("activeDao1 : %j",active);
//                                callback(err,active);
//                            });
//                        }
//                    });
//				}
//                else
//                {
//                    logger.debug("activeDao2 : %j",active);
//                    callback(err,active);
//                }
//
//			});
//		}
//		function(callback)
//        {
//            bagDao.getBagByPlayerId(playerId, function(err, bag) {
//                if(!!err || !bag) {
//                    logger.error('Get bag for bagDao failed! ' + err.stack);
//                }
//                callback(err,bag);
//            });
//		}
	],
	function(err, results)
    {
        //logger.debug("activeDao3 : %j",results[1]);
		var player = results[0];
        //var bag    = results[1];

        //player["active"] = results[1];
        //player.bag = bag;
        //logger.error("bag info:%j" ,player.bag.items);

		if (!!err){
			utils.invokeCallback(cb,err);
		}else{
			utils.invokeCallback(cb,null,player);
		}
	});
};

/**
 * Update a player
 * @param {Object} player The player need to update, all the propties will be update.
 * @param {function} cb Callback function.
 */
playerDao.updatePlayer = function (player, cb)
{
//    var b = new Buffer(player.nickName);
//    var nickName = b.toString('base64');
    if (player.nickName == ""){
        player.nickName = "?";
    }
	var sql = 'update qp_player set GM = ?, regType = ? ,deviceID=?,userName = ? , password = ?, nickName = ? , userSex = ?, headUrl = ?, vipLevel = ?, coinNum = ?, gemNum = ?, charm = ?, firstPaid = ?, phoneNumber = ?, clientType = ?, scoreNum = ? where uid = ?';
    var args = [player.GM, player.regType,player.deviceID, player.userName, player.password, player.nickName, player.userSex, player.headUrl, player.vipLevel, player.coinNum, player.gemNum, player.charm, player.firstPaid, player.phoneNumber, player.clientType, player.scoreNum,player.uid];
   logger.debug("更新玩家信息:" + player.deviceID);
	pomelo.app.get('dbclient').query(sql,args,function(err, res)
    {
		if(err !== null) {
      logger.error(err);
			utils.invokeCallback(cb,err.message, null);
		} else {
			if (!!res && res.affectedRows>0)
      {
        logger.debug('update player success!');
				utils.invokeCallback(cb,null,true);
			} else {
				logger.error('update player failed!');
				utils.invokeCallback(cb,null,false);
			}
		}
	});
};

playerDao.createUser = function (username, password, from, deviceID, nickName,headUrl,passwordRecord,userSex,osPlatform,province,city,curVersion,cb){
        if (nickName == ""){
        nickName = "?";
    }

    osPlatform = osPlatform != undefined ? (osPlatform=='ios'?1:0) : 1;
    province = province != undefined ? province :'';
    city = city != undefined ? city :'';
    curVersion = curVersion != undefined ? curVersion :'1.0';
    from = from != undefined ? from :'1';

    logger.debug("username:%j,password:%j,from:%j,deviceID:%j,nickName:%j,headUrl:%j,passwordRecord：%j,userSex:%j,osPlatform:%j,province%j,ctiy:%j,curVersion:%j",username, password, from, deviceID, nickName,headUrl,passwordRecord,userSex,osPlatform,province,city,curVersion)

    var sql = 'insert into qp_player (deviceID,regType,userName,password,loginCount,nickName,headUrl,userSex,clientType,province,city,curVersion,gemNum) values(?,?,?,?,?,?,?,?,?,?,?,?,5)';
    var args = [deviceID, from, username, password,1, nickName,headUrl,userSex,osPlatform,province,city,curVersion];

    pomelo.app.get('dbclient').query(sql,args,function(err, res) {
        if(err) {
            logger.error(err);
            utils.invokeCallback(cb, err.message, null);
            return;
        }

        if(!res || res.length <= 0) {
            logger.debug("err 1");
            utils.invokeCallback(cb, err, null);
            return;
        } else {
            var user = {uid: res.insertId};
            logger.debug("createUser ok");
            if (nickName == deviceID) {
                sql = 'update qp_player set nickName=? where uid=?';
                pomelo.app.get('dbclient').query(sql,[user.uid, user.uid],function(err, res) {
                    logger.debug("update nickname with uid", err);
                });
            }
            utils.invokeCallback(cb, null, user);
        }
    });
};

// 绑定邀请码
playerDao.bingAgentCode = function (deviceID, agentCode, cb){
  var sql = 'update qp_player set agentCode=? where deviceID=?;';
  var args = [agentCode, deviceID];

  pomelo.app.get('dbclient').query(sql,args,function(err, res) {
    if(err) {
      logger.error(err);
      utils.invokeCallback(cb, err.message, null);
      return;
    }

    if (!!res && res.affectedRows>0)
    {
      logger.debug('bingAgentCode success!');
      utils.invokeCallback(cb,null,true);
    } else {
      logger.error('bingAgentCode failed!');
      utils.invokeCallback(cb,null,false);
    }
  });
};

// 赠送钻石
playerDao.rewardGem = function (uid, gemNum, cb){
  var sql = 'update qp_player set gemNum=gemNum+?, rewardGemNum=rewardGemNum+? where uid=?;';
  var args = [gemNum, gemNum, uid];

  pomelo.app.get('dbclient').query(sql,args,function(err, res) {
    if(err) {
      logger.error(err);
      utils.invokeCallback(cb, err.message, null);
      return;
    }

    if (!!res && res.affectedRows>0)
    {
      logger.debug('rewardGem success!');
      utils.invokeCallback(cb,null,true);
    } else {
      logger.error('rewardGem failed!');
      utils.invokeCallback(cb,null,false);
    }
  });
};

// 更新 玩家次数
playerDao.updatePlayerTime = function (uid, time, cb){
  var sql = 'update qp_player set playedTime=playedTime+? where uid=?;';
  var args = [time, uid];

  pomelo.app.get('dbclient').query(sql,args,function(err, res) {
    if(err) {
      logger.error(err);
      utils.invokeCallback(cb, err.message, null);
      return;
    }

    if (!!res && res.affectedRows>0)
    {
      logger.debug('updatePlayerTime success!');
      utils.invokeCallback(cb,null,true);
    } else {
      logger.error('updatePlayerTime failed!');
      utils.invokeCallback(cb,null,false);
    }
  });
};
/*获取所有机器人
* */
playerDao.getAIRobots = function(uid, cb){
    var sql = 'select * from qp_player where GM >= 100 limit 50';
    pomelo.app.get('dbclient').query(sql,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, err, null);
            return;
        } else {
            utils.invokeCallback(cb, null, res);
        }
    });
};

/*获取所有玩家
 * */
playerDao.getAllPlayers = function(uid, cb){
    var sql = 'select * from qp_player';
    pomelo.app.get('dbclient').query(sql,function(err, res) {
        if(err) {
            utils.invokeCallback(cb, err.message, null);
            return;
        }
        if(!res || res.length <= 0) {
            utils.invokeCallback(cb, err, null);
            return;
        } else {
            utils.invokeCallback(cb, null, res);
        }
    });
};


/**
 * Update a player
 * @param {Object} player The player need to update, all the propties will be update.
 * @param {function} cb Callback function.
 */
playerDao.updatePlayerByKey = function (uid,key,value, cb)
{
//    var b = new Buffer(player.nickName);
//    var nickName = b.toString('base64');

    if (!uid || !key){
        logger.error("updatePlayerByKey uid:%j,key:%j",uid,key);
        return;
    }
    var sql = 'update qp_player set '+key+' = ? where uid = ?';
    var args = [value,uid];
    logger.debug("更新玩家信息:%j  key:%j",uid,key);
    logger.debug("updatePlayerByKey_args:%j",args);
    pomelo.app.get('dbclient').query(sql,args,function(err, res)
    {
        if(err !== null) {
            logger.error(err);
            utils.invokeCallback(cb,err.message, null);
        } else {
            if (!!res && res.affectedRows>0)
            {
                logger.debug('update player %j success!',key);
                utils.invokeCallback(cb,null,true);
            } else {
                logger.error('update player %j failed!',key);
                utils.invokeCallback(cb,"update "+key+"error",false);
            }
        }
    });
};
//firstPaid
playerDao.updateFirstPaid = function(uid){
    var sql = "SELECT COUNT(*) as count from qp_payrecord where playerId = ?";
    var args = [uid];
    logger.debug("updateFirstPaid_args:%j",args);
    pomelo.app.get('dbclient').query(sql,args,function(err, res)
    {
        if(err !== null) {
            logger.error(err);
        } else {
            if (!!res && res[0].count > 0)
            {
                playerDao.updatePlayerByKey(uid,'firstPaid',res[0].count+"",function(err,user){
                    if(!err){
                        logger.debug('update player firstPaid successful');
                    }else{
                        logger.error(err);
                    }
                })
            } else {
                logger.debug('player firstPaid %j',res[0].count);
            }
        }
    });
}

playerDao.creatRewardGemInfo = function(rewardGemInfo,cb){

    if(rewardGemInfo.uid == undefined || rewardGemInfo.rewardGem == undefined || rewardGemInfo.beforeGem == undefined){
        logger.error("creatRewardGemInfo_rewardGemInfo:%j",rewardGemInfo);
        return false;
    }

    var rewardGem = parseInt(rewardGemInfo.rewardGem);
    var beforeGem = parseInt(rewardGemInfo.beforeGem);
    var afterGem = beforeGem + rewardGem;
    var type = parseInt(rewardGemInfo.type);

    var sql = 'insert into qp_rewardGemInfo (uid,rewardGem,beforeGem,afterGem,type,createTime) values (?,?,?,?,?,?)';
    var args = [rewardGemInfo.uid,rewardGem,beforeGem,afterGem,type,moment().format()];

    logger.debug("creatRewardGemInfo args %j",args);

    pomelo.app.get('dbclient').insert(sql, args, function(err, res) {
        if (err) {
            logger.error('create creatRewardGemInfo failed! ' + err.stack);
            //utils.invokeCallback(cb, err, null);
        } else {
            logger.debug('create creatRewardGemInfo success !');
            //var bag = new Bag({uid: res.insertId});
            //utils.invokeCallback(cb, null, null);
        }
    });
}


