var logger = require('pomelo-logger').getLogger('database-log', __filename);
var playerDao = require('../playerDao');
var moment = require('moment');

module.exports =
{
	  updatePlayer:function(client, player, cb)
    {
        //console.debug("写入数据内容2:%j", player);
        var sql = 'update qp_player set gemNum = ?, rewardGemNum = ? where uid = ?';
        var args = [player.gemNum, player.rewardGemNum, player.uid];
        client.query(sql,args,function(err, res)
        {
            if(err !== null)
            {
                logger.error('写入玩家数据库失败!　' + sql + '   内容' + JSON.stringify(player) + ' stack:' + err.stack);
            }
            //console.debug("写入数据库成功");
            if(!!cb && typeof cb == 'function')
            {
                cb(!!err);
            }
        });
	},
  updatePlayedTime:function(client, player, cb)
  {
    //logger.debug("玩家更新次数:%j",player);
    //console.debug("写入数据内容2:%j", player);
    var sql = 'update qp_player set playedTime = ? where uid = ?';
    var args = [ player.playedTime, player.uid];
    client.query(sql,args,function(err, res)
    {
      if(err !== null)
      {
        logger.error('写入玩家数据库失败!　' + sql + '   内容' + JSON.stringify(player) + ' stack:' + err.stack);
      }
      //console.debug("写入数据库成功");
      if(!!cb && typeof cb == 'function')
      {
        cb(!!err);
      }
    });
  },

    updateSocreNum:function(client, player, cb)
    {
        //logger.debug("玩家更新次数:%j",player);
        //console.debug("写入数据内容2:%j", player);
        var sql = 'update qp_player set scoreNum = ? where uid = ?';
        var args = [ player.scoreNum, player.uid];
        client.query(sql,args,function(err, res)
        {
            if(err !== null)
            {
                logger.error('写入玩家数据库失败!　' + sql + '   内容' + JSON.stringify(player) + ' stack:' + err.stack);
            }
            //console.debug("写入数据库成功");
            if(!!cb && typeof cb == 'function')
            {
                cb(!!err);
            }
        });
    },
    updateGoldNum:function(client, player, cb) {
        //logger.debug("玩家更新次数:%j",player);
        //console.debug("写入数据内容2:%j", player);
        var sql = 'update qp_player set goldNum = ? where uid = ?';
        var args = [ player.goldNum, player.uid];
        client.query(sql,args,function(err, res) {
            if(err !== null) {
                logger.error('写入玩家数据库失败!　' + sql + '   内容' + JSON.stringify(player) + ' stack:' + err.stack);
            }
            //console.debug("写入数据库成功");
            if(!!cb && typeof cb == 'function') {
                cb(!!err);
            }
        });
    },

    updateOffLineTime:function(client,uid){

        if(!uid){
            logger.error("updateOffLineTime uid:%j",uid);
            return;
        }

        playerDao.updatePlayerByKey(uid,'offLineTime',moment().format(),function(err,user){
            if(!err){
                logger.debug('update offLineTime successful');
            }else{
                logger.debug(err);
            }
        })
    },

    updateLoginTime:function(client,player){

        if(!player){
            logger.error("updateLoginTime uid:%j",player);
            return;
        }

        var lastLoginTime = moment().format();

        player.lastLoginTime = lastLoginTime;

        playerDao.updatePlayerByKey(player.uid,'lastLoginTime',lastLoginTime,function(err,user){
            if(!err){
                logger.debug('update lastLoginTime successful');
            }else{
                logger.debug(err);
            }
        });

    },


//    updatePlayer:function(client, player, cb)
//    {
//        console.debug("写入数据内容2:%j", player);
//        var sql = 'update qp_player set userName = ? , password = ?, nickName = ? , userSex = ?, vipLevel = ?, coinNum = ?, gemNum = ?, charm = ?, firstPaid = ?,scoreNum = ? where uid = ?';
//        var args = [player.userName, player.password, player.nickName, player.userSex, player.vipLevel, player.coinNum, player.gemNum, player.charm, player.firstPaid,player.scoreNum,player.uid];
//
//        client.query(sql,args,function(err, res)
//        {
//            if(err !== null)
//            {
//                console.error('写入玩家数据库失败!　' + sql + '   内容' + JSON.stringify(player) + ' stack:' + err.stack);
//            }
//            console.debug("写入数据库成功");
//            if(!!cb && typeof cb == 'function')
//            {
//                cb(!!err);
//            }
//        });
//    },

    updateBaseInfo:function(client, player, cb)
    {
        logger.debug("写入数据内容3:%j", player);
        if (player.nickName == ""){
            player.nickName = "?";
        }
        var sql = 'update qp_player set nickName = ? ,password = ?, userSex = ?, headUrl = ? where uid = ?';
        var args = [player.nickName,player.password, player.userSex, player.headUrl, player.uid];

        client.query(sql,args,function(err, res)
        {
            if(err !== null)
            {
                logger.error('写入玩家数据库失败!　' + sql + '   内容' + JSON.stringify(player) + ' stack:' + err.stack);
            }
            logger.debug("写入数据库成功");
            if(!!cb && typeof cb == 'function')
            {
                cb(!!err);
            }
        });
    },

    addRewardGemInfo:function(client,rewardGemInfo,cb){
        if(!rewardGemInfo){
           logger.error("addRewardGemInfo_rewardGemInfo " ,rewardGemInfo);
           return;
        }

        logger.debug("rewardGemInfo %j",rewardGemInfo);

        playerDao.creatRewardGemInfo(rewardGemInfo,function(){
            if(!err){
                logger.debug('add addRewardGemInfo successful');
            }else{
                logger.debug(err);
            }
        });
    }
};
