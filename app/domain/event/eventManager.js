
var pomelo = require('pomelo');
var playerEvent = require('./playerEvent');
var logger = require('pomelo-logger').getLogger('majhong-log', __filename);
var exp = module.exports;

/**
 * Listen event for entity
 */
exp.addEvent = function(player)
{
    //playerEvent.addEventForPlayer(player);
    addSaveEvent(player);
};

/**
 * Add save event for player
 * @param {Object} player The player to add save event for.
 */
function addSaveEvent(player) {
	var app = pomelo.app;
	player.on('save', function()
    {
        logger.debug("保存玩家信息");
		app.get('sync').flush('playerSync.updatePlayer', player.uid, player.toJSON());
	});

  player.on('updateBaseInfo', function()
  {
      logger.debug("保存玩家基础信息");
      app.get('sync').exec('playerSync.updateBaseInfo', player.uid, player.toJSON());
  });
  player.on('updatePlayedTime', function()
  {
    logger.debug("保存玩家局数信息");
    app.get('sync').exec('playerSync.updatePlayedTime', player.uid, player.toJSON());
  });

    player.on('updateScoreNum', function()
    {
        logger.debug("保存玩家积分信息");
        app.get('sync').exec('playerSync.updateSocreNum', player.uid, player.toJSON());
    });

    player.on('updateGoldNum', function()
    {
        logger.debug("保存玩家金币信息");
        app.get('sync').exec('playerSync.updateGoldNum', player.uid, player.toJSON());
    });

    player.on('updateActive', function()
    {
        logger.debug("保存玩家本人每日登陆等信息");
        app.get('sync').exec('activeSync.updateActive', player.uid, player.active);
    });
    player.on('offLine', function()
    {
        logger.debug("保存玩家本人 offLine 信息");
        if (app.get('sync').flushByUid) {
            app.get('sync').flushByUid(player.uid);
        } else {
            app.get('sync').flush('playerSync.updateGoldNum', player.uid, player.toJSON());
            app.get('sync').flush('activeSync.updateActive', player.uid, player.active);
        }

        app.get('sync').exec('playerSync.updateOffLineTime', null,player.uid);
    });

    player.on('updateLogin', function()
    {
        app.get('sync').flush('playerSync.updateLoginTime', null,this);
    });

    player.on('addRewardGemInfo',function(rewardGemInfo){
        app.get('sync').flush('playerSync.addRewardGemInfo', null,rewardGemInfo);
    });


//	player.bag.on('save', function() {
//		app.get('sync').exec('bagSync.updateBag', player.bag.uid, player.bag);
//	});

//	player.equipments.on('save', function() {
//		app.get('sync').exec('equipmentsSync.updateEquipments', player.equipments.id, player.equipments);
//	});
}

