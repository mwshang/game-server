
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);
var dataApi = require('../../util/dataApi');
var consts = require('../../consts/consts');
var Code = require('../../consts/code');
var messageService = require('../../services/messageService');
var Event = require('../../consts/consts').HALL;
var Arena = module.exports;
var date = require('../../util/date');
var arenaRankDao= require('../../dao/arenaRankDao');
var fangKa= require('./fangKa');
var playerState={
    None:0,
    Enroll: 1,//报名等等
    InTable:2,//开始比赛
    WaitStart:3,//等等比赛
    CloseArena:4,//结束比赛
}
var arenaState={
    None:0,//报名等等
    Start: 1,//开始比赛
    CurClose:2,//这轮结束

    CloseArena:3//这轮结束
}
Arena.getCfg= function(serverType,arg)
{
    logger.debug("比赛场配置serverType:"+serverType);
   var cfg= pomelo.app.get(serverType);
   if(!!cfg)
   {
       logger.debug("比赛场配置arg:"+arg);
       logger.debug("比赛场配置:%j",cfg["Arean"][arg]);
       return cfg["Arean"][arg];
   }

}
Arena.createArena = function(uid, name, serverType, opts,cfgs,cb) {
    //客户端传过来是字符串需要转换下
//    opts=JSON.parse(msg.opts);
//    cfgs=JSON.parse(msg.cfgs);
//    if(cfgs.tableNum==25)
//        cfgs.tableNum=1;

    logger.debug("创建比赛场配置opts:%j",opts);
    logger.debug("创建比赛场配置cfgs:%j",cfgs);
    var hall = pomelo.app.get("hall");
    var player = hall.players[uid];
    if (player == null) {
        logger.error("获取玩家错误");
        cb(null,"获取玩家错误");
        return;
    }

    // 先判断用户是否有代理权限
    if (player.vipLevel < 20) {
        cb(null,"您没有权限创建比赛场!");
        return;
    }
    if(hall.arenasByUid[uid] !=undefined)
    {
        logger.debug("已经存在比赛场了状态："+ hall.arenasByUid[uid].status );
    }
    // 判断用户是否已经有创建好的比赛场
    if (!!hall.arenasByUid[uid] ) {
        logger.debug("已经存在比赛场了："+ hall.arenasByUid[uid].id );
        cb(null, Code.OK, hall.arenasByUid[uid].id);
        return;
    }
    var isIn= Arena.checkPlayerInArena(uid,function(){});
    if(isIn == true)
    {
        logger.error("已经在比赛场中了，不能创建比赛场！");
        cb(null, "已经在比赛场中了，不能创建比赛场！");
        return;
    }
    var isNeedGem=Arena.getCfg(serverType,"isArenaGemNeed");
    var totalPlayer = Arena.getCfg(serverType,"tablePlayer") * cfgs.tableNum;
    if(totalPlayer == NaN){
        logger.error("tableNum数据有错");
        cb(null, "tableNum数据有错");
        return;
    }
    logger.debug("totalPlayer:"+totalPlayer);
    var needGem=0;
    if(isNeedGem==1)
    {
      needGem = Arena.getCfg(serverType,"arenaGemNum")[totalPlayer];
      logger.debug("是否需要创建费用："+isNeedGem+","+needGem+","+player.gemNum);
      if(isNeedGem==1 && player.gemNum< needGem)
      {
        logger.error("钻石不够创建比赛场");
        cb(null, "钻石不够创，不能创建比赛场！");
        return;
      }
    }
    //logger.error("测试:" + date.timeHourFormat(Date.now()));
    // 创建比赛场
    hall.arenasByUid[uid] = {};
    hall.arenasByUid[uid].needGem=needGem;
    var arena=hall.arenasByUid[uid];
    hall.arenasByUid[uid].id = hall.popArenaNum();
    hall.arenasByUid[uid].ownerUid = uid;
    hall.arenasByUid[uid].name = name;  //创建者名字

    hall.arenasByUid[uid].serverType = serverType;

    hall.arenasByUid[uid].opts = opts;  // isArena=1, tableNum, gemNeed,gemNum...

    //arenaName  比赛场名字 isNeedPwd 是否需要密码 Pwd 密码
    //tablePlayerCnt  每桌人数 tableNum 桌子数量 startTime
    //enrollGem  报名钻石
    hall.arenasByUid[uid].cfgs = cfgs;

    hall.arenasByUid[uid].playerIds = []; // 报名玩家id数组
    hall.arenasByUid[uid].curPlayerIds = []; // 当前开始比赛的玩家
    hall.arenasByUid[uid].curNum=0;     //玩家数量
    hall.arenasByUid[uid].curArena=0;  //比赛轮数
    hall.arenasByUid[uid].players = {}; // 报名玩家  id:player
    //hall.arenasByUid[uid].auditNum = 0;
    hall.arenasByUid[uid].status = arenaState.None; // 0 未开始  1 进行中  2 已结束
    if(!!cfgs.startTime)
        hall.arenasByUid[uid].startTime = cfgs.startTime;
    hall.arenasByUid[uid].endTime = null;
    hall.arenasByUid[uid].tables = [];
    hall.arenasByUid[uid].tableNum=cfgs.tableNum;
    hall.arenasByUid[uid].rankPlayers=[];
    hall.arenasByUid[uid].tablePlayerCnt=Arena.getCfg(serverType,"tablePlayer"); //每桌人数


    hall.arenasByUid[uid].totalPlayer = totalPlayer;
    hall.arenasByUid[uid].upPlayerCnt =Arena.getUpPlayerCnt(totalPlayer,arena.tablePlayerCnt);   //晋级人数
    hall.arenasByUid[uid].opts.rounds=Arena.getCfg(serverType,"rounds")[totalPlayer];   //一桌玩几把
    hall.arenasByUid[uid].isGemNeed= Arena.getCfg(serverType,"isArenaGemNeed");     //是否需要创建费用
    hall.arenasByUid[uid].enrollGem =cfgs.enrollGem;   //报名费用
    hall.arenasByUid[uid].totalArena=Arena.getCfg(serverType,"arenaRounds")[totalPlayer];  //总轮数
    hall.arenasByAid[hall.arenasByUid[uid].id] = hall.arenasByUid[uid];

    var award=Arena.getCfg(serverType,"Award")[totalPlayer];
    logger.debug("award%j",award);
    award= JSON.parse(JSON.stringify(award));
    var totalGem=cfgs.enrollGem * totalPlayer;
    logger.debug("totalGem %d",totalGem);
    for(var awd in award)
    {
        award[awd]["value"]=Math.floor(totalGem * ( award[awd]["value"]/10000))
    }
    hall.arenasByUid[uid].award=award;
    logger.debug("award:%j",award);
    logger.debug("award:%j",award["1"]["value"]);
    cb(null, Code.OK, hall.arenasByUid[uid].id);
//    var arena=hall.arenasByUid[uid];
//    var msg={
//        aid:arena.id,
//        ownerUid:arena.ownerUid,
//        name:arena.name,
//        serverType:arena.serverType,
//        startTime:date.timeFormat(arena.startTime),
//        endTime:date.timeFormat(Date.now()),
//        playerIds:arena.playerIds,
//        rankList:arena.rankPlayers
//    };
//    arenaRankDao.createInfo(msg,function(err, res){
//        logger.debug("保存比赛场数据成功");
//    });
};

//解散房间
Arena.removeArena = function(uid,cb)
{
    var hall = pomelo.app.get("hall");
    var player = hall.players[uid];
    if (player == null) {
        logger.error("获取玩家错误");
        cb(null,"获取玩家错误");
        return;
    }

    // 先判断用户是否有代理权限
    if (player.vipLevel < 20) {
        cb(null,"您没有权限创建比赛场!");
        return;
    }
    var arena= hall.arenasByUid[uid];
    if(arena ==undefined)
    {
        logger.debug("没有该用户创建的比赛" );
        cb(null,"没有该用户创建的比赛场!");
        return;
    }

    if(arena.status>=arenaState.Start)
    {
        logger.debug("比赛场已经开始不能解散："+ hall.arenasByUid[uid].status );
        cb(null,"比赛场已经开始不能解散!");
        return;
    }

    if(arena.ownerUid!=uid)
        logger.error("出错了，不是该玩家创建的比赛场%j",arena);

    Arena.noticeALLPlayerByAid(Event.hallArenaRemove,arena.id,true,{arenaId:arena.id});
    Arena.close(arena.id,cb);
//    delete hall.arenasByUid[uid];
//    delete hall.arenasByAid[arena.id];


}

//获取比赛场列表
Arena.getCanJoinArenaList = function(cb)
{
    var hall = pomelo.app.get("hall");
    var arenas=[];
    //logger.debug("比赛场列表：%j",hall.arenasByAid);
    for(var tem in hall.arenasByAid)
    {
        if(hall.arenasByAid[tem].status==arenaState.None){
            var arena=hall.arenasByAid[tem];
            var temArena= {
                id: arena.id,
                opts: arena.opts,
                ownerUid: arena.ownerUid,
                name: arena.name,
                serverType: arena.serverType,
                cfgs:JSON.parse(JSON.stringify(arena.cfgs)),
                award:arena.award[1]["value"],
                startTime:date.timeLocalFormat(arena.startTime)
            }

            temArena.cfgs.Pwd=undefined;
            arenas.push(temArena);
        }
    }
    cb(null,Code.OK,arenas);
}

Arena.getArenaEnrolledList = function(uid, arenaId, cb) {
    var hall = pomelo.app.get("hall");
    var player = hall.players[uid];
    if (player == null) {
        logger.error("获取玩家错误");
        cb(null, "获取玩家错误");
        return;
    }

    var arena = hall.arenasByAid[arenaId];
    if (arena == null || arena == undefined) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束!");
        return;
    }

    var players = [];

    for (var id in arena.playerIds) {

        players.push(arena.players[arena.playerIds[id]]);
    }
    //logger.debug("players:%j",arena.playerIds);
    var ret={
        id:arena.id,
        ownerUid:arena.ownerUid,
        name :arena.name,
        opts:arena.opts,
        players:players,
        startTime:date.timeLocalFormat(arena.startTime),
        cfgs:JSON.parse(JSON.stringify(arena.cfgs)),
        arenaState:arena.status,
        award:arena.award
    };

    cb(null, Code.OK, ret);
};
//进入比赛场
Arena.enterArena = function(uid,arenaId,cb){

    var hall = pomelo.app.get("hall");
    var player = hall.players[uid];
    if (player == null) {
        logger.error("获取玩家错误");
        cb(null, "获取玩家错误");
        return;
    }

    var arena = hall.arenasByAid[arenaId];
    if (arena == null || arena == undefined) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束!");
        return;
    }

    var ret={
        id:arena.id,
        ownerUid:arena.ownerUid,
        name :arena.name,
        arenaName:arena.cfgs.arenaName,
        opts:arena.opts,
        isNeedPwd:0
    };

    if (!arena.players[uid])
    {
        if(arena.cfgs.isNeedPwd==1)
        {
            ret.isNeedPwd=1;
            logger.debug("进入比赛场：%j",ret);
            cb(null,Code.OK,ret)
        }
        //ret.curAudit=arena.players[uid].audit;
        logger.debug("进入比赛场：%j",ret);
        cb(null,Code.OK,ret)
    }
    else
    {

        //ret.curAudit = -1;
        logger.debug("进入比赛场：%j",ret);
        cb(null,Code.OK,ret) //没有这个玩家
    }

}

//验证密码
Arena.checkArenaPwd = function(uid,arenaId,pwd,cb)
{
    var hall = pomelo.app.get("hall");
    var player = hall.players[uid];
    if (player == null) {
        logger.error("获取玩家错误");
        cb(null, "获取玩家错误");
        return;
    }

    var arena = hall.arenasByAid[arenaId];
    if (arena == null || arena == undefined) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束!");
        return;
    }

    if(arena.cfgs.isNeedPwd==1 && arena.cfgs.Pwd!=pwd)
    {
        cb(null, "进入房间的密码错误!");
        return;
    }
    cb(null, Code.OK);
}

//报名
Arena.enrollArena = function (uid, arenaId,pwd, cb) {
    var hall = pomelo.app.get("hall");
    var player = hall.getPlayer(uid,"jsJson");
    if (!player) {
        logger.error("获取玩家错误");
        cb(null, "获取玩家错误");
        return;
    }
    var arena = hall.arenasByAid[arenaId];

    if (!arena || arena.status >= arenaState.Start) {
        logger.error("比赛场不存在或者已开始，不能接受报名");
        cb(null, "比赛场不存在或者已开始，不能接受报名!");
        return;
    }


    if (arena.cfgs.isNeedPwd == 1 && arena.cfgs.Pwd!=pwd) {

        cb(null,"密码错误!");
        return;
    }
    if(!!arena.players[uid])
    {
        logger.debug("已经在这个比赛中了!");
        cb(null, Code.OK);
        return;
    }
    if(arena.totalPlayer<=arena.playerIds.length)
    {
        logger.debug("比赛场人数够了不能再加入!");
        cb(null, Code.OK);
        return;
    }
    var temArena= hall.arenasByUid[uid];
    if(!!temArena && temArena.id!=arenaId)
    {
        logger.debug("已经创建过比赛场，不能加入别人创建！");
        cb(null, "已经创建过比赛场，不能加入别人创建！");
        return;
    }

    var isIn= Arena.checkPlayerInArena(uid,function(){});
    if(isIn.aid>0 && (isIn.state>0))
    {
        logger.debug("已经其他比赛中报名了，不能报名！");
        cb(null, "已经其他比赛中报名了，不能报名！");
        return;
    }
//    if (arena.ownerUid == uid) {
//        logger.error("群主不能加入自己创建的比赛场");
//        cb(null,"群主不能加入自己创建的比赛场!");
//        return;
//    }

    var _player = {};
    _player.uid = hall.players[uid].uid;
    _player.nickName = hall.players[uid].nickName;
    _player.headUrl = hall.players[uid].headUrl;
   // _player.audit = 0;   //审核状态 0 是待审核，1 是审核通过，2 是审核拒绝 3 删除
    _player.state = playerState.Enroll;   //0 报名中 1 开始比赛 2 结束比赛

    _player.coinNum = 0; //积分
    _player.rank = 0; //排名
    _player.award = 0;  //奖励


    if(hall.players[uid].gemNum<arena.enrollGem)
    {
        cb(null,"用户钻石不够，请联系代理购买");
        return;
    }

    _player.player=player;
    arena.players[uid] = _player;
    arena.playerIds.push(uid);
    Arena.noticeALLPlayerByAid(Event.hallArenaPlayerIn,arena.id,true,{"players": arena.players[uid]});
//    var owner = hall.players[arena.ownerUid];
//    if (owner != null && owner != undefined) {
//        messageService.pushMessageToPlayer({
//            uid: arena.ownerUid,
//            sid: owner.serverId
//        }, Event.hallArenaEnroll, {"players": arena.players[uid]});
//    }

    logger.debug("当前报名人数："+arena.playerIds.length);
    if(arena.totalPlayer==arena.playerIds.length)
    {
        Arena.arenaStart(arena.id,function(){});
    }
    cb(null, Code.OK);


};

//取消比赛场报名
Arena.cancelEnrollArena = function(uid,arenaId,cb)
{
    var hall = pomelo.app.get("hall");
    var player = hall.players[uid];
    if (!player) {
        logger.error("获取玩家错误");
        cb(null, "获取玩家错误");
        return;
    }

    var arena = hall.arenasByAid[arenaId];
    if (!arena) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束!");
        return;
    }
    if (!arena.players[uid])
    {
        logger.error("比赛场不存在该玩家");
        cb(null, "比赛场不存在该玩家!");
        return;
    }
    if(arena.status>=arenaState.Start)
    {
        logger.error("比赛场比赛场已经开始,不能退出!");
        cb(null, "比赛场比赛场已经开始,不能退出!");
        return;
    }

    Arena.noticeALLPlayerByAid(Event.hallArenaPlayerRemove,arena.id,true,{"players": arena.players[uid]});
    delete  arena.players[uid];
    for(var temId in arena.playerIds)
    {
        if(arena.playerIds[temId]==uid)
        {
            arena.playerIds.splice(temId,1);

            break;
        }
    }
    var ret={
        state:1
    }
    cb(null,Code.OK,ret);

}

//审核
Arena.auditArenaEnrollment = function(uid, arenaId, playerUid, audit, cb) {
    var hall = pomelo.app.get("hall");
    var arena = hall.arenasByUid[uid];
    if (!arena || arena.status >= arenaState.Start) {
        logger.error("比赛场不存在或者比赛场已开始比赛后不能审核");
        cb(null, "比赛场不存在或者比赛场已开始比赛后不能审核!");
        return;
    }
    var owner = hall.players[uid];
    var player = arena.players[playerUid];
    if (!owner || !player) {
        logger.error("获取玩家错误:owner:%d; player:%d;",uid,playerUid);
        cb(null, "获取玩家错误");
        return;
    }

    if (arena.id != arenaId) {
        logger.error("比赛场号不对");
        cb(null, "比赛场赛区号错误!");
        return;
    }

    //player.audit = audit;

    if(audit == 2){
        Arena.noticeALLPlayerByAid(Event.hallArenaPlayerRemove,arena.id,false,{"players": arena.players[playerUid]});
        for(var idx=0;idx<arena.playerIds.length;idx++){

           if( arena.playerIds[idx]==playerUid){
               arena.playerIds.splice(idx,1);

               break;
           }
        }
       // ret.delPlayers.push( arena.players[playerUid]);

        delete arena.players[playerUid];
    }
    else{

        if(audit == 1)
        {
            arena.auditNum=0;
            for(var temId in arena.players)
            {

                if(arena.players[temId].audit == 1)
                {
                    arena.auditNum++;
                }
            }
            Arena.noticeALLPlayerByAid(Event.hallArenaPlayerIn,arena.id,false,{"players": arena.players[playerUid]});
        }
        this.debug(arena);


   }
//    var _player= hall.players[playerUid];
//    if(!!_player){
//
//        logger.debug("审核通知：%j",_player);
//        // 通知玩家审核结果
//        messageService.pushMessageToPlayer({
//            uid: _player.uid,
//            sid: _player.serverId
//        }, Event.hallArenaAudit, {"audit": audit});
//
//    }

   cb(null, Code.OK,1);
};



//检查比赛场是否可以开始
Arena.checkCanStart=function(uid,players)
{
    var hall = pomelo.app.get("hall");
    var arena = hall.arenasByUid[uid];
    if (!arena || arena.status >= arenaState.Start ) {
        return false;
    }

    if (arena.playerIds.length>1 && arena.playerIds.length %4==0) {

        for(var temId in arena.playerIds)
        {
            var user =  hall.getPlayer(arena.playerIds[temId],"jsJson");
            if(!user)
            {
                logger.error("还有人没有：" + arena.playerIds[temId]);
                players.push(arena.players[arena.playerIds[temId]]);
            }
        }

        if(players.length>0)
        {
            return false;
        }

        return true;
    }
    return false;
}

//比赛场开始
Arena.arenaStart=function(arenaId,cb)
{
    var hall = pomelo.app.get("hall");
    var arena = hall.arenasByAid[arenaId];
    if (!arena || arena.status == arenaState.CloseArena) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束!");
        return;
    }
    if (arena.status == arenaState.Start) {
        logger.error("比赛场已开始");
        cb(null,"比赛场已开始!");
        return;
    }

    var players=[];
    var ret={
        state:0,    //0 表示 不能开启，1 表示可以开始
        offlinePlayers:players
    };

    arena.status = arenaState.Start;
    if(arena.curArena==0)
    {
        arena.curPlayerIds=arena.playerIds;
        for(var tem in arena.players)
        {
           arena.rankPlayers.push(arena.players[tem]);
           arena.players[tem].coinNum=1000;  //初始积分
            //扣除报名费
           fangKa.changeFangKa(arena.players[tem].uid,-arena.enrollGem);
        }
        fangKa.changeFangKa(arena.ownerUid,-arena.needGem);

      //给群主推送比赛结束
        var _player = hall.players[arena.ownerUid];
        if(!!_player){
            messageService.pushMessageToPlayer({
                    uid: _player.uid,
                    sid: _player.serverId

                }, Event.hallArenaState,
                {curArena:arena.curArena ,arenaState:arena.status});
        }
    }

    arena.curNum=arena.curPlayerIds.length;
    if(arena.curNum % arena.tablePlayerCnt!=0)
    {
        logger.error("比赛场 玩家人数出现问题1" +arena.curNum );
        logger.error("比赛场 玩家人数出现问题2" +arena.tablePlayerCnt );
        return;
    }
    // 在game xxx-server-default 中开启比赛场
    var servers = pomelo.app.getServersByType(arena.serverType);
    var msg=
    {
        aid:arena.id,
        opts: arena.opts,
        playerIds:[],
        players:{},
        tableNum: arena.tableNum,
        isArena:1,
        curArena:arena.curArena,
        totalArena:arena.totalArena
    };
    logger.debug("发给桌子的状态：%j",msg);
    for(var pl in arena.curPlayerIds)
    {
        var user = arena.players[arena.curPlayerIds[pl]];
        if(!hall.players[arena.curPlayerIds[pl]])
        {
            logger.error("有玩家掉线不能开始："+arena.curPlayerIds[pl]);
            user.player.isOffline=1;
        }
        else
        {
            user.player.isOffline=0;
        }


        msg.players[user.uid]=user;

        msg.playerIds.push(user.uid);
    }

//    for(var temId in arena.curPlayerIds)
//    {
//        var user =  hall.getPlayer(arena.curPlayerIds[temId],"jsJson");
//        if(!user)
//        {
//            logger.error("有玩家掉线不能开始："+temId);
//            return;
//        }
//
//
//        msg.players[user.uid]=user;
//        msg.playerIds.push(user.uid);
//    }


    Arena.debug(arena);
    pomelo.app.rpc[arena.serverType].gRemote.arenaStart(servers[0].id, msg, function (tem,err, tableIds) {
        if (err != Code.OK)
            logger.error("开始比赛场出错: %j", err);
        else {
            var n =  arena.tableNum;
            arena.tables=tableIds;

            logger.debug("开始比赛人数："+msg.playerIds.length);
            logger.debug("开始的桌子号：%j",tableIds);
            logger.debug("开始的桌子数量：%j",n);
            for(var j=0;j<n;j++)
            {
                for (var i=j* 4,coun=0; i<msg.playerIds.length,coun<4; i++,coun++) {

                    arena.players[msg.playerIds[i]].state = playerState.InTable;
                    var _player = hall.players[msg.playerIds[i]];

                    if(!_player) continue;

                    logger.debug("发送 比赛 信息:%d, %d",i,coun);
                    messageService.pushMessageToPlayer({
                            uid: _player.uid,
                            sid: _player.serverId

                        }, Event.hallArenaStart,
                        {tableId : tableIds[j],
                            serverType:arena.serverType,
                            isArena:1,
                            curArena:arena.curArena,
                            playerCnt:arena.curNum,
                            upCnt:arena.upPlayerCnt
                        });
                }
            }

            arena.started = true;

//            setTimeout(function(){
//                logger.error("开始关闭比赛场");
//                Arena.arenaClose(arena.id,function(){});
//            }.bind(this),30 *1000);

            ret.state=1;
            cb(null, Code.OK,ret);
        }
    });

}

Arena.arenaClose = function(arenaId,cb)
{
    var hall = pomelo.app.get("hall");
    var arena = hall.arenasByAid[arenaId];
    if (!arena || arena.status == arenaState.CloseArena) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束!");
        return;
    }
    var servers = pomelo.app.getServersByType(arena.serverType);
    var msg={
        aid:arenaId
    };
    pomelo.app.rpc[arena.serverType].gRemote.arenaCloseRpc(servers[0].id, msg, function (tem,err) {
        if (err != Code.OK)
        {
            cb(null,"关闭比赛场出错: "+err);
            logger.error("关闭比赛场出错: %j", err);
        }
        else {
            Arena.noticeALLPlayerByAid(Event.hallArenaRemove,arena.id,true,{arenaId:arena.id});
            Arena.close(arena.id,cb);
        }
    });
}

//查询跟这个用户相关的比赛场
Arena.getArenaList = function(uid,cb)
{
    var ret={
        arenas:[]
    };
    var hall = pomelo.app.get("hall");

    for(var arenaId in hall.arenasByAid )
    {
        var temArena= hall.arenasByAid[arenaId];
        if(temArena.status==arenaState.None) continue;

        if(!!temArena.players[uid] ||temArena.ownerUid==uid)
        {

            var arena={
                id:arenaId,
                startTime:temArena.startTime==undefined?"": date.timeLocalFormat(temArena.startTime),
                endTime:temArena.endTime==undefined?"":date.timeLocalFormat(temArena.endTime)
                //coinNum:hall.arenasByAid[arenaId].players[uid].coinNum
            }
            ret.arenas.push(arena);
        }
    }
    arenaRankDao.getArenaList(uid,function(err,res){
        for(var arenaId in res )
        {
            var temArena= res[arenaId];
                var arena={
                    id:temArena.aid,
                    startTime:temArena.startTime==undefined?"": date.timeLocalFormat(temArena.startTime),
                    endTime:temArena.endTime==undefined?"" :date.timeLocalFormat(temArena.endTime)
                };
                ret.arenas.push(arena);
        }
        logger.debug("比赛场列表结果%j",ret);
        cb(null,Code.OK,ret);
    });


}
// 获取比赛排行榜
Arena.getArenaRankList = function(arenaId, cb) {
    var hall = pomelo.app.get("hall");
    var arena=hall.arenasByAid[arenaId];

    if(!!arena){

        if(arena.status == arenaState.None)
        {
            cb(null,"比赛场还没有开始");
            return;
        }
        if(arena.rankPlayers.length!=arena.playerIds.length)
        {
            arena.rankPlayers=[];

            for(var tem in arena.players)
            {
                if(/*arena.players[tem].audit==1 &&*/ arena.players[tem].state == playerState.CloseArena)
                {
                    arena.rankPlayers.push(arena.players[tem]);
                }
            }
            arena.rankPlayers.sort(function(a,b){ return b.coinNum-a.coinNum;});
        }
        logger.debug("比赛场结果：%j",arena);
        cb(null,Code.OK,arena.rankPlayers);
        return;
    }
    else
    {
        arenaRankDao.getInfo(arenaId,function(err,res){
            if(!res || res.length==0)
            {
                logger.debug("没有改结果");

                cb(null,"没有该结果");
                return;
            }
            logger.debug("数据库：%j",res[0].rankList);
            var list=JSON.parse(res[0].rankList);
            res.rankList=list;
            cb(null,Code.OK,res.rankList);
        });
    }
};


// 比赛场结束
Arena.close = function (arenaId, cb) {
    var hall = pomelo.app.get("hall");

    var arena = hall.arenasByAid[arenaId];
    if (arena == null || arena == undefined) {
        logger.error("比赛场不存在或者已结束");
        cb(null, "比赛场不存在或者已结束");
        return;
    }

    logger.debug("比赛场1111111 结束%j",arena);


    arena.status = arenaState.CloseArena;
    arena.endTime= Date.now();
    //给群主推送比赛结束
    var _player = hall.players[arena.ownerUid];
    if(!!_player){
        messageService.pushMessageToPlayer({
                uid: _player.uid,
                sid: _player.serverId

            }, Event.hallArenaState,
            {curArena:arena.curArena ,arenaState:arena.status});
    }
    //hall.arenasEndByAid[arenaId] = arena;
    var msg={
        aid:arena.id,
        ownerUid:arena.ownerUid,
        name:arena.name,
        serverType:arena.serverType,
        startTime:arena.startTime==undefined?date.timeFormat(Date.now()): date.timeFormat(arena.startTime),
        endTime:date.timeFormat(arena.endTime),
        playerIds:arena.playerIds,
        rankList:arena.rankPlayers
    };
    arenaRankDao.createInfo(msg,function(err, res){
        logger.debug("保存比赛场数据成功");
    });


    delete hall.arenasByAid[arenaId];
    delete hall.arenasByUid[arena.ownerUid];

    cb(null,Code.OK);

};


//保存每桌的分数
Arena.saveTableScore = function(arenaId,tableId,players)
{
    logger.debug("比赛场%d 中 %d号桌子 结束 ",arenaId,tableId);
    var hall = pomelo.app.get("hall");
    var arena=hall.arenasByAid[arenaId];
    if(!arena)
    {
        logger.error("比赛场为空："+arenaId);
        return;
    }

    for(var n in players)
    {
        arena.players[players[n].uid]["coinNum"]=players[n]["coinNum"];
        arena.curNum--;
        arena.players[players[n].uid].state = playerState.WaitStart;
    }

    arena.rankPlayers.sort(function(a,b){ return b.coinNum-a.coinNum;});

    var tableNum= arena.tableNum;
    logger.debug("比赛场22222 结束:"+arena.curNum+","+ tableNum);
    if(arena.curNum == 0)
    {
        arena.status=arenaState.CurClose;

            var playerCnt= arena.upPlayerCnt;
            if(playerCnt>=arena.tablePlayerCnt)
            {
                var nextPlayerIds=[];

                for(var idx=0;idx<arena.rankPlayers.length;idx++)
                {
                    if(idx<arena.curPlayerIds.length)
                    {
                        arena.rankPlayers[idx].curArena=arena.curArena;
                        if(/*!!hall.players[arena.rankPlayers[idx].uid]*/
                            /*&&*/ nextPlayerIds.length<playerCnt)
                        {
                            arena.rankPlayers[idx].coinNum+=1000;
                            nextPlayerIds.push(arena.rankPlayers[idx].uid);
                        }
                        else
                        {
                            logger.debug("玩家被淘汰：%j",arena.rankPlayers[idx]);
                            arena.rankPlayers[idx].state= playerState.CloseArena;
                        }
                    }
                }
                //掉线人太多不够
//                if(nextPlayerIds.length!=playerCnt)
//                {
//                    var tem=nextPlayerIds.length %arena.tablePlayerCnt; //多余玩家
//                    for(var idx=nextPlayerIds.length-1;idx>=0;idx--)
//                    {
//                        logger.debug("凑不够晋级的人，自己舍弃掉一桌，玩家被淘汰：%j",arena.players[nextPlayerIds[idx]]);
//                        arena.players[nextPlayerIds[idx]].state= playerState.CloseArena;
//
//                        nextPlayerIds.splice(idx,1);
//                        tem--;
//                        if(tem==0)
//                            break;
//                    }
//                }

                //清理掉掉线淘汰的用户后 重新排名 发送这轮淘汰玩家的奖励
                arena.rankPlayers.sort(function(a,b){ return b.coinNum-a.coinNum;});

                var curArena=arena.curArena;
                setTimeout(function () {
                    for(var idx=0;idx<arena.rankPlayers.length;idx++)
                    {
                        arena.rankPlayers[idx].rank=idx+1;
                        if(arena.rankPlayers[idx].curArena == curArena
                            && arena.rankPlayers[idx].state == playerState.CloseArena)
                        {
                            Arena.sendAward(arena.id,arena.rankPlayers[idx],0);
                        }

                    }

                }.bind(this),6000); // 留一段时间查看比分排行榜, 10分钟后解散比赛场
                arena.curPlayerIds = nextPlayerIds;
                arena.curArena++;
                arena.tableNum = nextPlayerIds.length/arena.tablePlayerCnt;

                if(nextPlayerIds.length<arena.tablePlayerCnt)
                {
                    playerCnt=nextPlayerIds.length;
                }
                else
                {
                    arena.opts.rounds=Arena.getCfg(arena.serverType,"rounds")[arena.upPlayerCnt];
                    setTimeout(function () {
                        for(var uid in arena.curPlayerIds)
                        {
                            var player=arena.players[arena.curPlayerIds[uid]];
                            //player.coinNum=1000 * (arena.curArena+1)
                            var _player = hall.players[arena.curPlayerIds[uid]];
                            if(!!_player){
                                messageService.pushMessageToPlayer({
                                        uid: _player.uid,
                                        sid: _player.serverId

                                    }, Event.hallArenaUp,
                                    {uid:player.uid,rank:player.rank});
                            }
                        }
                        setTimeout(function(){
                            Arena.arenaStart(arena.id,function(){});
                        }.bind(this),  5000);
                    }.bind(this),  10000); // 留一段时间查看比分排行榜, 10分钟后解散比赛场
                }
                arena.upPlayerCnt = Arena.getUpPlayerCnt(playerCnt,arena.tablePlayerCnt);
            }



        //可以参加比赛的人
        setTimeout(function () {
            //人数不够一桌的时候解散比赛场
            if(playerCnt<arena.tablePlayerCnt)
            {
                for(var idx=0;idx< arena.rankPlayers.length;idx++)
                {
                    arena.rankPlayers[idx].state= playerState.CloseArena;
                    arena.rankPlayers[idx].rank=idx+1;
                    if(arena.tablePlayerCnt>idx)
                    {
                        arena.rankPlayers[idx].curArena=arena.curArena;
                        Arena.sendAward(arena.id,arena.rankPlayers[idx],1);
                    }
                }
                //判读下是否还有下一轮
                Arena.close(arenaId,function(){});
            }
        }.bind(this),  3000);
    }
}

//获取晋级人数
Arena.getUpPlayerCnt = function(total,tablePlayerCnt)
{

    var sub1=total/tablePlayerCnt;
    var  sub2=0;
    if(sub1>tablePlayerCnt)
    {
        sub2=  sub1 - (total/tablePlayerCnt)%tablePlayerCnt;
    }
    else{
        sub2=  tablePlayerCnt;
    }
    var playerCnt=total-sub2;  //可以参加比赛的人
    logger.debug("可以晋级的人数："+playerCnt);
    return playerCnt;
}


//检查玩家是否在比赛场中
Arena.checkPlayerInArena = function(uid,cb)
{
    var hall = pomelo.app.get("hall");
    var arena = null;
    var ret={aid:-1,ownerUid:-1,state:-1,playerState:playerState.None};
    for(var aid in hall.arenasByAid)
    {
      arena= hall.arenasByAid[aid];
      if(!arena) continue;

      for(var temuid in arena.players)
      {
         // logger.debug("检查 是否在比赛场中uid："+temuid);
          if(temuid == uid )
          {
              if(arena.players[temuid].state == playerState.CloseArena)
              {
                  break;
              }
              else
              {
                  if(arena.ownerUid==temuid)
                  {
                      ret={aid:arena.id,ownerUid:arena.ownerUid,state:2,
                          playerState:arena.players[temuid].state};
                      cb(null,Code.OK,ret);
                  }
                  else
                  {
                      ret = {aid:arena.id,ownerUid:arena.ownerUid,state:1,
                          playerState:arena.players[temuid].state};
                      cb(null,Code.OK,ret);
                  }

                  return ret;
              }
          }
      }
    }
    arena = hall.arenasByUid[uid];
    if(!!arena)
    {
        ret = {aid:arena.id,ownerUid:arena.ownerUid,state:-1,playerState:playerState.None};
        cb(null,Code.OK,ret);
        return ret;
    }
    ret={aid:-1,ownerUid:-1,state:-1,playerState:playerState.None};
    cb(null,Code.OK,ret);
    return ret;
}

//通知所有人
Arena.noticeALLPlayerByAid = function(event,aid,isFangZhu,data)
{
    var hall = pomelo.app.get("hall");
    var arena = hall.arenasByAid[aid];
    if(isFangZhu==true)
    {
        var _player = hall.players[arena.ownerUid];
        if(!!_player){
            messageService.pushMessageToPlayer({
                    uid: _player.uid,
                    sid: _player.serverId

                }, event,
                data);
        }
    }
    for (var i=0; i<arena.playerIds.length; i++) {
        var uid=arena.playerIds[i];


        if(!arena.players[uid])
        {
            logger.error("playerIds 和 players 不相等:"+uid);
            logger.error("players:%j",arena.players);
            logger.error("playerIds:%j",arena.playerIds)
        }
        if(!arena.players[uid])
            continue;

        var _player = hall.players[uid];
        if(!!_player){
            messageService.pushMessageToPlayer({
                    uid: _player.uid,
                    sid: _player.serverId

                }, event,
                data);
        }

    }
}

//玩家掉线
Arena.playerUidOff = function(uid)
{
//    var aid=Arena.checkPlayerInArena(uid,function(){});
//    if(aid.aid==-1 && aid.state==-1) return;
//
//    Arena.cancelEnrollArena(uid,aid,function(){});
}

//发送奖励
Arena.sendAward = function(arenaId,palyer,isClose)
{
    var hall = pomelo.app.get("hall");
    var arena=hall.arenasByAid[arenaId];

    var award=arena.award;

    for(var awd in award)
    {
        if(award[awd]["minRank"]<=palyer.rank && palyer.rank<=award[awd]["maxRank"])
        {
            palyer["award"]=award[awd]["value"];
            fangKa.changeFangKa(palyer.uid,+award[awd]["value"]);
            logger.debug("发送奖励：%j",palyer);
            var _player = hall.players[palyer.uid];
            if(!!_player){
                messageService.pushMessageToPlayer({
                        uid: _player.uid,
                        sid: _player.serverId

                    }, Event.hallArenaSendAward,
                    {player:palyer,isClose:isClose});
            }

           return;
        }

    }

    logger.debug("玩家没有奖励被淘汰:"+palyer.uid);
    var _player = hall.players[palyer.uid];
    if(!!_player){
        logger.debug("玩家没有奖励被淘汰1111:"+palyer.uid);
        messageService.pushMessageToPlayer({
                uid: _player.uid,
                sid: _player.serverId

            }, Event.hallArenaSendAward,
            {player:palyer,isClose:isClose});
    }
}

Arena.debug = function(arena)
{
    logger.debug("比赛场信息：%j",arena);
}