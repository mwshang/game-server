SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS  `pay_record_temp_gem`;
CREATE TABLE `pay_record_temp_gem` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playerId` int(11) NOT NULL,
  `traceNo` varchar(60) NOT NULL,
  `orderNo` varchar(60) NOT NULL,
  `orderAmount` float(11,0) NOT NULL,
  `orderTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payChannel` varchar(5) NOT NULL,
  `productName` varchar(32) NOT NULL,
  `productNum` int(11) NOT NULL,
  `status` tinyint(2) NOT NULL,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completeTime` varchar(15) DEFAULT NULL,
  `platform` varchar(20) DEFAULT 'xy' COMMENT '平台',
  PRIMARY KEY (`id`),
  KEY `orderTime` (`orderTime`) USING BTREE,
  KEY `payChannel` (`payChannel`),
  KEY `productName` (`productName`),
  KEY `playerId` (`playerId`),
  KEY `playerId_productName` (`playerId`,`productName`),
  KEY `status` (`status`,`orderTime`),
  KEY `orderNo` (`orderNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `pay_record_temp_gold`;
CREATE TABLE `pay_record_temp_gold` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playerId` int(11) NOT NULL,
  `traceNo` varchar(60) NOT NULL,
  `orderNo` varchar(60) NOT NULL,
  `orderAmount` float(11,0) NOT NULL,
  `orderTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payChannel` varchar(5) NOT NULL,
  `productName` varchar(32) NOT NULL,
  `productNum` int(11) NOT NULL,
  `status` tinyint(2) NOT NULL,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completeTime` varchar(15) DEFAULT NULL,
  `platform` varchar(20) DEFAULT 'xy' COMMENT '平台',
  PRIMARY KEY (`id`),
  KEY `orderTime` (`orderTime`) USING BTREE,
  KEY `payChannel` (`payChannel`),
  KEY `productName` (`productName`),
  KEY `playerId` (`playerId`),
  KEY `playerId_productName` (`playerId`,`productName`),
  KEY `status` (`status`,`orderTime`),
  KEY `orderNo` (`orderNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_10mindata`;
CREATE TABLE `qp_10mindata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `newUsers` int(11) DEFAULT NULL,
  `activeUsers` int(11) DEFAULT NULL,
  `buyCards` int(11) DEFAULT NULL,
  `usedCards` int(11) DEFAULT NULL,
  `leftCards` int(11) DEFAULT NULL,
  `openTables` int(11) DEFAULT NULL,
  `createdTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `type` smallint(6) NOT NULL DEFAULT '-1' COMMENT '-1 合计  0 钻石 1金币',
  PRIMARY KEY (`id`),
  KEY `createTime` (`createdTime`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_active`;
CREATE TABLE `qp_active` (
  `uid` int(10) NOT NULL DEFAULT '0',
  `loginTimes` int(10) DEFAULT '0',
  `dayLogin` int(10) DEFAULT '0',
  `vipCount` int(10) DEFAULT '0',
  `dayShareFriend` int(10) DEFAULT '0',
  `dayReqFriend` int(10) DEFAULT '0',
  `dayBigWheel` int(10) DEFAULT '0',
  `dayGold` int(10) DEFAULT '0',
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

insert into `qp_active`(`uid`,`loginTimes`,`dayLogin`,`vipCount`,`dayShareFriend`,`dayReqFriend`,`dayBigWheel`,`dayGold`) values
(138181,0,0,0,0,0,0,0),
(138182,0,0,0,0,0,0,0),
(138183,0,0,0,0,0,0,0),
(138184,0,0,0,0,0,0,0),
(138185,0,0,0,0,0,0,0),
(138186,0,0,0,0,0,0,0),
(138187,0,0,0,0,0,0,0),
(138188,0,0,0,0,0,0,0),
(138189,0,0,0,0,0,0,0);
DROP TABLE IF EXISTS  `qp_adv`;
CREATE TABLE `qp_adv` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` tinyint(4) DEFAULT NULL COMMENT '类型: 1文本 2 图片 3 图文',
  `ownerUid` int(11) DEFAULT NULL COMMENT '所有者id',
  `createUid` int(11) DEFAULT NULL COMMENT '创建者id',
  `title` varchar(100) DEFAULT NULL COMMENT '标题',
  `text` varchar(255) DEFAULT NULL COMMENT '文本内容',
  `imgUrl` varchar(255) DEFAULT NULL COMMENT '图片url',
  `flag` int(11) DEFAULT NULL COMMENT '标签',
  `createTime` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_arena_daily`;
CREATE TABLE `qp_arena_daily` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `matchId` int(11) NOT NULL COMMENT '赛事ID',
  `name` varchar(100) DEFAULT NULL,
  `openTime` int(11) DEFAULT NULL COMMENT '开赛次数',
  `playerNum` int(11) DEFAULT NULL COMMENT '玩家参与人数(去重)',
  `totalCondition` varchar(50) DEFAULT NULL COMMENT '总报名费用',
  `totalReward` varchar(50) DEFAULT NULL,
  `createTime` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_arena_info`;
CREATE TABLE `qp_arena_info` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL DEFAULT '0',
  `timeMap` text COLLATE utf8_bin,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_arena_list`;
CREATE TABLE `qp_arena_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL COMMENT '比赛名',
  `type` int(10) DEFAULT NULL COMMENT '1:人满开赛 2:定点开赛 10:天梯赛',
  `maxPerson` int(11) DEFAULT NULL COMMENT '最大玩家数',
  `maxTime` int(11) DEFAULT NULL COMMENT '每人参加的最大次数',
  `stage` text COMMENT '淘汰规则',
  `tablePerson` int(11) DEFAULT NULL COMMENT '每桌人数',
  `signCondition` varchar(100) DEFAULT NULL COMMENT '报名费 {type: ''goldNum'', amount: 1000}',
  `rewards` text COMMENT '奖励 {min:1,max:1,type:''goldNum'',amount:1000}',
  `totalRewards` varchar(100) DEFAULT NULL COMMENT '奖励总和{''goldNum'':xxx,''gemNum'':XXX}',
  `serverType` varchar(100) DEFAULT NULL COMMENT '游戏类型',
  `roomConfigId` int(11) NOT NULL COMMENT '房间配置id',
  `createTime` datetime DEFAULT NULL,
  `startDate` varchar(20) DEFAULT NULL COMMENT '开始时间',
  `endDate` varchar(20) DEFAULT NULL COMMENT '结束时间',
  `arenaTime` varchar(30) DEFAULT '0' COMMENT '每天开启时间',
  `signTime` varchar(30) DEFAULT NULL,
  `endTime` varchar(30) DEFAULT NULL COMMENT '天梯赛结算时间',
  `cycleDay` int(11) DEFAULT '1' COMMENT '天梯赛周期',
  `del` int(11) DEFAULT '0' COMMENT '0:正常 1:删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_arena_match_log`;
CREATE TABLE `qp_arena_match_log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `ownerId` int(11) NOT NULL DEFAULT '0',
  `type` int(11) NOT NULL DEFAULT '0',
  `matchId` int(11) NOT NULL DEFAULT '0',
  `serverType` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT '',
  `signNum` int(11) NOT NULL DEFAULT '0',
  `playerIds` text COLLATE utf8_bin,
  `state` int(11) DEFAULT '0' COMMENT '0:未开始 1:报名阶段 2:比赛中 4:结束',
  `startTime` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `totalReward` text COLLATE utf8_bin COMMENT '奖励详情',
  `ext` varchar(1000) COLLATE utf8_bin NOT NULL DEFAULT '{}',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_arena_rank`;
CREATE TABLE `qp_arena_rank` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL DEFAULT '0',
  `matchId` int(11) NOT NULL DEFAULT '0',
  `arenaId` int(11) NOT NULL DEFAULT '0',
  `matchName` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT '',
  `rank` int(11) NOT NULL DEFAULT '0',
  `score` int(11) NOT NULL DEFAULT '0',
  `reward` varchar(200) COLLATE utf8_bin NOT NULL DEFAULT '[]',
  `state` int(11) NOT NULL DEFAULT '0' COMMENT '0new|1read|2award',
  `recordTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_arenarank`;
CREATE TABLE `qp_arenarank` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aid` int(11) NOT NULL,
  `ownerUid` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `serverType` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `startTime` timestamp NULL DEFAULT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `playerIds` varchar(2000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `rankList` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_arenarank20181123`;
CREATE TABLE `qp_arenarank20181123` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aid` int(11) NOT NULL,
  `ownerUid` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `serverType` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `startTime` timestamp NULL DEFAULT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `playerIds` varchar(2000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `rankList` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_arenarank20181128`;
CREATE TABLE `qp_arenarank20181128` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aid` int(11) NOT NULL,
  `ownerUid` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `serverType` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `startTime` timestamp NULL DEFAULT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `playerIds` varchar(2000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `rankList` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_arenarank20181129`;
CREATE TABLE `qp_arenarank20181129` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aid` int(11) NOT NULL,
  `ownerUid` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `serverType` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `startTime` timestamp NULL DEFAULT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `playerIds` varchar(2000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `rankList` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_backenduser`;
CREATE TABLE `qp_backenduser` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `name` varchar(45) NOT NULL,
  `mail` varchar(45) NOT NULL,
  `password` varchar(32) NOT NULL,
  `isAgent` tinyint(1) NOT NULL DEFAULT '0',
  `createdTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `level1Agent` int(11) DEFAULT '0' COMMENT 'Level1 agent UID',
  `level2Agent` int(11) DEFAULT '0' COMMENT 'level2 agent UID',
  `bonusOut` float DEFAULT '0',
  `bonusTotal` float DEFAULT '0',
  `agentId` varchar(6) NOT NULL,
  `rootAgent` int(11) DEFAULT '0',
  `agentLevel` tinyint(1) DEFAULT '3',
  `phoneNumber` varchar(32) DEFAULT NULL,
  `bonusPercent` int(11) DEFAULT '0',
  `initPassword` varchar(32) DEFAULT NULL,
  `extl9Agent` int(11) DEFAULT '0',
  `extl8Agent` int(11) DEFAULT '0',
  `extl7Agent` int(11) DEFAULT '0',
  `extl6Agent` int(11) DEFAULT '0',
  `extl5Agent` int(11) DEFAULT '0',
  `extl4Agent` int(11) DEFAULT '0',
  `extl3Agent` int(11) DEFAULT '0',
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`uid`),
  KEY `uid` (`uid`) USING BTREE,
  KEY `agentId` (`agentId`) USING BTREE,
  KEY `createdTime` (`createdTime`) USING BTREE,
  KEY `agent` (`level1Agent`,`level2Agent`) USING BTREE,
  KEY `rootAgent` (`rootAgent`,`createdTime`) USING BTREE,
  KEY `phoneNumber` (`phoneNumber`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=629 DEFAULT CHARSET=utf8;

insert into `qp_backenduser`(`id`,`uid`,`name`,`mail`,`password`,`isAgent`,`createdTime`,`level1Agent`,`level2Agent`,`bonusOut`,`bonusTotal`,`agentId`,`rootAgent`,`agentLevel`,`phoneNumber`,`bonusPercent`,`initPassword`,`extl9Agent`,`extl8Agent`,`extl7Agent`,`extl6Agent`,`extl5Agent`,`extl4Agent`,`extl3Agent`,`updateTime`) values
(115,100002,'运营2','','123456',5,'2017-08-10 15:04:25',0,0,0,0,'303242',0,null,null,0,null,0,0,0,0,0,0,0,'2018-11-20 12:25:29'),
(116,100000,'运营','10000@163.com','123456',5,'2017-07-15 14:39:18',0,0,3023,null,'303240',0,null,null,0,null,0,0,0,0,0,0,0,'2018-11-20 12:25:29'),
(117,100001,'运营1','100001@123.com','123456',5,'2017-07-15 15:08:49',0,0,null,0.5,'306525',0,1,null,0,null,0,0,0,0,0,0,0,'2018-11-20 12:25:29');
DROP TABLE IF EXISTS  `qp_bag`;
CREATE TABLE `qp_bag` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `items` varchar(5000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `itemCount` int(10) unsigned NOT NULL DEFAULT '0',
  `equip` varchar(3000) DEFAULT '{}',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_bairenplayerrecord`;
CREATE TABLE `qp_bairenplayerrecord` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `baiRenResultId` int(11) DEFAULT NULL,
  `uid` int(11) DEFAULT NULL,
  `tableId` int(11) DEFAULT NULL,
  `level` int(11) DEFAULT NULL COMMENT '百人场次级别1:初级2:中级 3:高级',
  `role` int(11) DEFAULT NULL COMMENT '在角色 0：观察者，1：下注，2：上庄3：上桌',
  `chipGold` int(32) DEFAULT NULL COMMENT '投注金额',
  `currentGold` int(32) DEFAULT NULL COMMENT '剩余金币',
  `inComeGold` int(32) DEFAULT NULL COMMENT '收支',
  `serverType` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_bairenplayerrecord_log`;
CREATE TABLE `qp_bairenplayerrecord_log` (
  `Id` int(11) NOT NULL,
  `baiRenResultId` int(11) DEFAULT NULL,
  `uid` int(11) DEFAULT NULL,
  `tableId` int(11) DEFAULT NULL,
  `level` int(11) DEFAULT NULL COMMENT '百人场次级别1:初级2:中级 3:高级',
  `role` int(11) DEFAULT NULL COMMENT '在角色 0：观察者，1：下注，2：上庄3：上桌',
  `chipGold` int(32) DEFAULT NULL COMMENT '投注金额',
  `currentGold` int(32) DEFAULT NULL COMMENT '剩余金币',
  `inComeGold` int(32) DEFAULT NULL COMMENT '收支',
  `serverType` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_bairenresult`;
CREATE TABLE `qp_bairenresult` (
  `Id` int(32) NOT NULL AUTO_INCREMENT,
  `tableId` int(11) DEFAULT '0' COMMENT '桌子号',
  `level` int(11) DEFAULT NULL COMMENT '百人场次级别1:初级2:中级 3:高级',
  `playerNum` int(11) DEFAULT '0' COMMENT '玩家总人数',
  `chipInNum` int(11) DEFAULT '0' COMMENT '投注人数',
  `bankerId` int(11) DEFAULT '0' COMMENT '庄家id',
  `isRobot` int(11) DEFAULT '0' COMMENT '是否是机器人 0 不是机器人，1 为机器人',
  `playerRuningGold` int(32) DEFAULT '0' COMMENT '流水',
  `chipInCal` int(32) DEFAULT '0' COMMENT '累计计入投注玩家金币结算',
  `playerBankerCal` int(32) DEFAULT '0' COMMENT '累计计入每把庄主金币结算',
  `winChipTime` int(11) DEFAULT '0' COMMENT '赢的下注次数',
  `totalChipTime` int(11) DEFAULT '0' COMMENT '总下注次数',
  `bankerChangeGold` int(32) DEFAULT '0' COMMENT '庄家变动金币',
  `currentTableNum` int(11) DEFAULT NULL COMMENT '当前桌子数',
  `serverId` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `serverType` varchar(255) CHARACTER SET utf8 DEFAULT NULL COMMENT '服务器类型',
  `putCards` varchar(20000) CHARACTER SET utf8 DEFAULT NULL COMMENT '出牌',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_bairenresult_log`;
CREATE TABLE `qp_bairenresult_log` (
  `Id` int(32) NOT NULL,
  `tableId` int(11) DEFAULT '0' COMMENT '桌子号',
  `level` int(11) DEFAULT NULL COMMENT '百人场次级别1:初级2:中级 3:高级',
  `playerNum` int(11) DEFAULT '0' COMMENT '玩家总人数',
  `chipInNum` int(11) DEFAULT '0' COMMENT '投注人数',
  `bankerId` int(11) DEFAULT '0' COMMENT '庄家id',
  `isRobot` int(11) DEFAULT '0' COMMENT '是否是机器人 0 不是机器人，1 为机器人',
  `playerRuningGold` int(32) DEFAULT '0' COMMENT '流水',
  `chipInCal` int(32) DEFAULT '0' COMMENT '累计计入每把投注玩家金币结算',
  `playerBankerCal` int(32) DEFAULT '0' COMMENT '玩家坐庄 累计计入每把玩家庄主金币结算',
  `winChipTime` int(11) DEFAULT '0' COMMENT '赢的下注次数',
  `totalChipTime` int(11) DEFAULT '0' COMMENT '总下注次数',
  `bankerChangeGold` int(32) DEFAULT '0' COMMENT '庄家变动金币',
  `currentTableNum` int(11) DEFAULT NULL COMMENT '当前桌子数',
  `serverId` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `serverType` varchar(255) CHARACTER SET utf8 DEFAULT NULL COMMENT '服务器类型',
  `putCards` varchar(20000) CHARACTER SET utf8 DEFAULT NULL COMMENT '出牌',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_bindtemp`;
CREATE TABLE `qp_bindtemp` (
  `id` int(11) NOT NULL,
  `type` int(11) DEFAULT '0',
  `updateTime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_blacklist`;
CREATE TABLE `qp_blacklist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT NULL,
  `type` int(11) DEFAULT NULL COMMENT '排行类型1.金币排行',
  `serverType` varchar(40) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_dailydata`;
CREATE TABLE `qp_dailydata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `newUsers` int(11) DEFAULT NULL,
  `activeUsers` int(11) DEFAULT NULL,
  `totalUsers` int(11) DEFAULT NULL,
  `buyCards` int(11) DEFAULT NULL,
  `usedCards` int(11) DEFAULT NULL,
  `leftCards` int(11) DEFAULT NULL,
  `createdTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `incomeTotal` float DEFAULT '0',
  `apBonusIn` float DEFAULT '0',
  `apBonusOut` float DEFAULT '0',
  `openTables` int(11) DEFAULT NULL,
  `type` smallint(6) NOT NULL DEFAULT '-1' COMMENT '-1 合计  0 钻石 1金币',
  PRIMARY KEY (`id`),
  KEY `createTime` (`createdTime`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_dailydata_ext`;
CREATE TABLE `qp_dailydata_ext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serverType` varchar(32) DEFAULT '' COMMENT 'game',
  `activeUsers` int(11) DEFAULT '0',
  `usedCards` int(11) DEFAULT '0',
  `openTables` int(11) DEFAULT '0',
  `createdTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `createTime` (`createdTime`),
  KEY `serverType` (`serverType`),
  KEY `serverType_createTime` (`serverType`,`createdTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_download_player`;
CREATE TABLE `qp_download_player` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unionid` varchar(32) NOT NULL,
  `agentCode` varchar(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `unionid` (`unionid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_dzp_daily_data`;
CREATE TABLE `qp_dzp_daily_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `totalGold` int(11) NOT NULL DEFAULT '0' COMMENT '金币产出',
  `totalGem` int(11) NOT NULL DEFAULT '0' COMMENT '钻石产出',
  `totalCardack` int(11) NOT NULL DEFAULT '0' COMMENT '牌背产出',
  `totalHead` int(11) NOT NULL DEFAULT '0' COMMENT '头像框产出',
  `consumeGoldNum` int(11) NOT NULL DEFAULT '0' COMMENT '投入总金币',
  `playerNum` int(11) NOT NULL DEFAULT '0' COMMENT '参与人数',
  `freeNum` int(11) NOT NULL DEFAULT '0' COMMENT '免费次数',
  `time` datetime DEFAULT NULL COMMENT '统计时间',
  `createTime` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_dzprecord`;
CREATE TABLE `qp_dzprecord` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(50) NOT NULL,
  `type` int(11) DEFAULT '0',
  `goldNum` int(11) DEFAULT '0',
  `itemId` int(11) DEFAULT '0',
  `rewardNum` int(11) DEFAULT '0',
  `nickName` varchar(40) DEFAULT NULL,
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_dzpuserinfo`;
CREATE TABLE `qp_dzpuserinfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(50) NOT NULL,
  `useFreeNum` int(11) DEFAULT '0',
  `gachaNum` int(11) DEFAULT '0',
  `updateTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_extractgold`;
CREATE TABLE `qp_extractgold` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL,
  `tableId` int(11) NOT NULL,
  `roundNum` int(11) NOT NULL,
  `uids` text CHARACTER SET utf8 NOT NULL COMMENT '玩家',
  `winUids` varchar(200) COLLATE utf8_bin NOT NULL DEFAULT '[]' COMMENT '赢家',
  `baseNum` int(11) NOT NULL DEFAULT '0' COMMENT '底分',
  `num` int(11) NOT NULL DEFAULT '0' COMMENT '手续费',
  `serverType` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `status` int(11) DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logInfo` text COLLATE utf8_bin,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_fangkabonusin`;
CREATE TABLE `qp_fangkabonusin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fkrId` int(11) NOT NULL COMMENT 'fangkaRecordId',
  `l1Agent` int(11) NOT NULL DEFAULT '0',
  `l1Bonus` float NOT NULL DEFAULT '0',
  `l2Agent` int(11) NOT NULL DEFAULT '0',
  `l2Bonus` float NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `playerAgent` int(11) NOT NULL DEFAULT '0',
  `playerBonus` float NOT NULL DEFAULT '0',
  `extl3Agent` int(11) DEFAULT '0',
  `extl3Bonus` float DEFAULT '0',
  `extl4Agent` int(11) DEFAULT '0',
  `extl4Bonus` float DEFAULT '0',
  `extl5Agent` int(11) DEFAULT '0',
  `extl5Bonus` float DEFAULT '0',
  `extl6Agent` int(11) DEFAULT '0',
  `extl6Bonus` float DEFAULT '0',
  `extl7Agent` int(11) DEFAULT NULL,
  `extl7Bonus` float DEFAULT '0',
  `extl8Agent` int(11) DEFAULT NULL,
  `extl8Bonus` float DEFAULT '0',
  `extl9Agent` int(11) DEFAULT '0',
  `extl9Bonus` float DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `l1Agent` (`l1Agent`,`createTime`) USING BTREE,
  KEY `l2Agent` (`l2Agent`,`createTime`) USING BTREE,
  KEY `playerAgent` (`playerAgent`,`createTime`) USING BTREE,
  KEY `extl3Agent` (`extl3Agent`),
  KEY `extl4Agent` (`extl4Agent`),
  KEY `extl5Agent` (`extl5Agent`),
  KEY `extl6Agent` (`extl6Agent`),
  KEY `extl7Agent` (`extl7Agent`),
  KEY `extl8Agent` (`extl8Agent`),
  KEY `extl9Agent` (`extl9Agent`),
  KEY `createTime` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_fangkabonusout`;
CREATE TABLE `qp_fangkabonusout` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `batchNo` varchar(32) DEFAULT NULL,
  `serialNo` varchar(32) DEFAULT NULL,
  `bankAccount` varchar(32) DEFAULT NULL,
  `bankUserName` varchar(32) DEFAULT NULL,
  `bankName` varchar(32) DEFAULT NULL,
  `cny` float DEFAULT '0',
  `status` tinyint(2) DEFAULT '0',
  `wxCfmUrl` varchar(260) DEFAULT NULL,
  `completeTime` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`,`createTime`) USING BTREE,
  KEY `batchNo` (`batchNo`) USING BTREE,
  KEY `createTime` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_fangkainout`;
CREATE TABLE `qp_fangkainout` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL DEFAULT '0',
  `type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '1:in  2:out ',
  `num` int(11) NOT NULL DEFAULT '0',
  `createtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `type` (`type`),
  KEY `createtime` (`createtime`),
  KEY `type_createtime` (`type`,`createtime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='通过qp_player表gemNum触发器';

DROP TABLE IF EXISTS  `qp_fangkarecord`;
CREATE TABLE `qp_fangkarecord` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) unsigned NOT NULL DEFAULT '0',
  `userName` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `type` int(11) unsigned NOT NULL DEFAULT '0',
  `giveUid` int(11) unsigned NOT NULL DEFAULT '0',
  `giveUserName` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `gemNum` int(11) unsigned NOT NULL DEFAULT '0',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rewardNum` int(11) DEFAULT '0',
  `serverType` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_fangkarecordext`;
CREATE TABLE `qp_fangkarecordext` (
  `id` int(10) unsigned NOT NULL COMMENT '引用qp_fangkaRecord表的id',
  `user_origin` int(11) DEFAULT NULL,
  `user_now` int(11) DEFAULT NULL,
  `userGive_origin` int(11) DEFAULT NULL,
  `userGive_now` int(11) DEFAULT NULL,
  `payId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payId` (`payId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_feedback`;
CREATE TABLE `qp_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT NULL,
  `feedback` varchar(2048) DEFAULT NULL COMMENT '反馈内容',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` tinyint(2) DEFAULT NULL COMMENT '处理状态 0：未处理  1：已处理',
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='玩家反馈表';

DROP TABLE IF EXISTS  `qp_game_switch`;
CREATE TABLE `qp_game_switch` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activeId` varchar(50) NOT NULL DEFAULT '' COMMENT '活动',
  `serverType` varchar(100) NOT NULL,
  `startTime` varchar(20) NOT NULL,
  `endTime` varchar(20) NOT NULL,
  `extData` varchar(500) NOT NULL DEFAULT '{}',
  `updateUid` int(11) NOT NULL,
  `updateTime` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_gold_take_record`;
CREATE TABLE `qp_gold_take_record` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT NULL,
  `packId` int(11) DEFAULT NULL COMMENT '俱乐部id',
  `packOwner` int(11) DEFAULT NULL COMMENT '俱乐部所有人',
  `type` int(11) DEFAULT NULL COMMENT '1本人 2下级 3下下级....10 最上层',
  `goldNum` int(11) DEFAULT NULL COMMENT '金币数',
  `createDate` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `extractId` int(11) DEFAULT NULL COMMENT '抽底表id',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_gold_wallet_extract_record`;
CREATE TABLE `qp_gold_wallet_extract_record` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT NULL,
  `extractNum` float DEFAULT '0' COMMENT '提取金币数量',
  `startNum` float DEFAULT '0' COMMENT '提取前金币金额(bonus)',
  `createDate` datetime DEFAULT NULL COMMENT '创建时间',
  `walletStarNum` float DEFAULT '0' COMMENT '提取前钱包剩余金币',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_goldconversion`;
CREATE TABLE `qp_goldconversion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT NULL COMMENT '兑换人',
  `gem_origin` int(11) DEFAULT NULL COMMENT '兑换前钻石数量',
  `gem_now` int(11) DEFAULT NULL COMMENT '兑换后钻石数量',
  `gold_origin` int(11) DEFAULT NULL COMMENT '兑换前金币数量',
  `gold_now` int(11) DEFAULT NULL COMMENT '兑换后金币数量',
  `gemNum` int(11) DEFAULT NULL COMMENT '消耗的钻石数量',
  `goldNum` int(11) DEFAULT NULL COMMENT '兑换的金币数量',
  `time` int(11) DEFAULT NULL COMMENT '兑换时间 (20180101)',
  `createTime` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `time` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_goldrecord`;
CREATE TABLE `qp_goldrecord` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` tinyint(4) DEFAULT NULL COMMENT '保留字段',
  `goldNum` int(11) DEFAULT NULL COMMENT '赠送数量(手续费前)',
  `chargeNum` int(11) DEFAULT NULL COMMENT '手续费',
  `uid` int(11) DEFAULT NULL COMMENT '发送人',
  `userName` varchar(255) DEFAULT NULL COMMENT '发送人昵称',
  `user_origin` int(11) DEFAULT NULL COMMENT '发送人 发送前数量',
  `user_now` int(11) DEFAULT NULL COMMENT '发送人 发送后数量',
  `giveUid` int(11) DEFAULT NULL COMMENT '获得人',
  `giveUserName` varchar(255) DEFAULT NULL COMMENT '获得人昵称',
  `userGive_origin` int(11) DEFAULT NULL COMMENT '获得人  获得前数量',
  `userGive_now` int(11) DEFAULT NULL COMMENT '获得人  获得后数量',
  `createTime` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `giveUid` (`giveUid`),
  KEY `createTime` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_good`;
CREATE TABLE `qp_good` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scoreNum` int(11) DEFAULT NULL COMMENT '商品价格(积分)',
  `goodName` varchar(100) DEFAULT NULL COMMENT '商品名',
  `goodText` varchar(255) DEFAULT NULL COMMENT '商品描述',
  `picUrl` varchar(255) DEFAULT '' COMMENT '图片url',
  `store` int(11) DEFAULT NULL COMMENT '库存',
  `createTime` datetime DEFAULT NULL COMMENT '创建时间',
  `activeStartTime` datetime DEFAULT NULL COMMENT '打折开始时间',
  `discount` int(11) DEFAULT NULL COMMENT '折扣',
  `activeEndTime` datetime DEFAULT NULL COMMENT '打折截止时间',
  `updateTime` datetime DEFAULT NULL COMMENT '修改时间',
  `createUid` int(11) DEFAULT NULL COMMENT '创建人UID',
  `del` int(11) DEFAULT '0',
  `editUid` int(11) DEFAULT NULL COMMENT '修改人uid',
  `type` int(11) DEFAULT '1' COMMENT '类型 1.积分 2.金币',
  `goodType` varchar(20) DEFAULT NULL,
  `source` int(11) DEFAULT '0' COMMENT '排序大的拍最前面',
  `goodId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_huifanginfo`;
CREATE TABLE `qp_huifanginfo` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `huiFangNum` int(32) unsigned NOT NULL DEFAULT '0',
  `record` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `huifangNum_recordTime` (`huiFangNum`,`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_huifanginfo20181123`;
CREATE TABLE `qp_huifanginfo20181123` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `huiFangNum` int(32) unsigned NOT NULL DEFAULT '0',
  `record` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `huifangNum_recordTime` (`huiFangNum`,`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_huifanginfo20181128`;
CREATE TABLE `qp_huifanginfo20181128` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `huiFangNum` int(32) unsigned NOT NULL DEFAULT '0',
  `record` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `huifangNum_recordTime` (`huiFangNum`,`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_huifanginfo20181129`;
CREATE TABLE `qp_huifanginfo20181129` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `huiFangNum` int(32) unsigned NOT NULL DEFAULT '0',
  `record` mediumtext CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `huifangNum_recordTime` (`huiFangNum`,`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_items_log`;
CREATE TABLE `qp_items_log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `opType` int(11) NOT NULL DEFAULT '0' COMMENT '操作类型1获得2消耗',
  `uid` int(11) NOT NULL DEFAULT '0',
  `type` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT '' COMMENT '物品类型',
  `count` int(11) NOT NULL DEFAULT '0' COMMENT '物品数量',
  `opRes` varchar(500) COLLATE utf8_bin NOT NULL DEFAULT '{}' COMMENT '结果',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_newer_tactic`;
CREATE TABLE `qp_newer_tactic` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `min` int(11) NOT NULL DEFAULT '0',
  `max` int(11) NOT NULL DEFAULT '0',
  `score` int(11) NOT NULL DEFAULT '0',
  `times` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_notice`;
CREATE TABLE `qp_notice` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` tinyint(2) NOT NULL COMMENT '0: game notice 1: agent notice  10:紧急公告 11: 跑马灯 12:循环公告 ',
  `contents` varchar(1024) NOT NULL,
  `createdtime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `uid` int(11) NOT NULL,
  `title` varchar(120) DEFAULT NULL,
  `startTime` varchar(20) DEFAULT NULL COMMENT '开始时间',
  `endTime` varchar(20) DEFAULT NULL COMMENT '结束时间',
  `intervalTime` int(11) DEFAULT '100' COMMENT '间隔时间(秒)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_operationlog`;
CREATE TABLE `qp_operationlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(45) DEFAULT NULL,
  `uid` int(10) unsigned DEFAULT NULL,
  `createdtime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `operation` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_order`;
CREATE TABLE `qp_order` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orderId` varchar(20) NOT NULL,
  `uid` int(11) DEFAULT NULL,
  `nickName` varchar(100) DEFAULT NULL,
  `goodId` int(11) DEFAULT NULL,
  `goodNum` int(11) DEFAULT NULL,
  `goodCode` varchar(100) DEFAULT NULL,
  `createTime` datetime DEFAULT NULL,
  `updateTime` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `type` int(11) DEFAULT '1' COMMENT '1:生成订单 2:客服确认订单 3:等待运营确认修改 4:确认收货 5:申请退货 6:退货申请驳回  7:退货确认',
  `scoreNum` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`,`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_orderext`;
CREATE TABLE `qp_orderext` (
  `orderId` varchar(20) NOT NULL,
  `name` varchar(80) DEFAULT NULL COMMENT '姓名',
  `address` varchar(255) DEFAULT NULL COMMENT '地址',
  `postcode` int(11) DEFAULT '0' COMMENT '邮编',
  `phone` varchar(20) DEFAULT '0' COMMENT '手机号',
  `expressNumber` varchar(30) DEFAULT NULL COMMENT '快递单号',
  `serviceId` int(11) NOT NULL COMMENT '客服id',
  `salseReturn` varchar(255) DEFAULT NULL COMMENT '退货原因',
  PRIMARY KEY (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_pack`;
CREATE TABLE `qp_pack` (
  `pid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `packNum` int(11) NOT NULL,
  `name` varchar(20) CHARACTER SET utf8 NOT NULL,
  `picUrl` varchar(500) CHARACTER SET utf8 DEFAULT NULL COMMENT '二维码',
  `num` int(11) NOT NULL DEFAULT '0',
  `maxNum` int(11) NOT NULL DEFAULT '150',
  `gemNum` int(11) DEFAULT '0',
  `consume` int(11) DEFAULT '0' COMMENT '消费钻石数',
  `notice` varchar(500) COLLATE utf8_bin DEFAULT '',
  `ownerUid` int(11) NOT NULL,
  `ownerName` varchar(50) CHARACTER SET utf8 NOT NULL,
  `operateUid` int(11) NOT NULL DEFAULT '0',
  `operateName` varchar(50) CHARACTER SET utf8 NOT NULL,
  `bHideRoom` int(11) NOT NULL DEFAULT '0',
  `createName` varchar(50) CHARACTER SET utf8 NOT NULL,
  `createUid` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packautotable`;
CREATE TABLE `qp_packautotable` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `roomName` varchar(50) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `roomConfig` varchar(500) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `bDisable` int(10) unsigned NOT NULL,
  `serverType` varchar(50) CHARACTER SET utf8 NOT NULL,
  `createUid` int(11) NOT NULL,
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packgamerecord`;
CREATE TABLE `qp_packgamerecord` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `uid1` int(11) NOT NULL DEFAULT '0',
  `uid2` int(11) NOT NULL DEFAULT '0',
  `uid3` int(11) NOT NULL DEFAULT '0',
  `uid4` int(11) NOT NULL DEFAULT '0',
  `uid5` int(11) NOT NULL DEFAULT '0',
  `uid6` int(11) NOT NULL DEFAULT '0',
  `uid7` int(11) NOT NULL DEFAULT '0',
  `uid8` int(11) NOT NULL DEFAULT '0',
  `fangHao` int(11) NOT NULL DEFAULT '0',
  `rounds` int(11) NOT NULL DEFAULT '0',
  `tableType` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `ungame` int(11) NOT NULL DEFAULT '0',
  `record` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packgamerecord20181123`;
CREATE TABLE `qp_packgamerecord20181123` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `uid1` int(11) NOT NULL DEFAULT '0',
  `uid2` int(11) NOT NULL DEFAULT '0',
  `uid3` int(11) NOT NULL DEFAULT '0',
  `uid4` int(11) NOT NULL DEFAULT '0',
  `uid5` int(11) NOT NULL DEFAULT '0',
  `uid6` int(11) NOT NULL DEFAULT '0',
  `uid7` int(11) NOT NULL DEFAULT '0',
  `uid8` int(11) NOT NULL DEFAULT '0',
  `fangHao` int(11) NOT NULL DEFAULT '0',
  `rounds` int(11) NOT NULL DEFAULT '0',
  `tableType` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `ungame` int(11) NOT NULL DEFAULT '0',
  `record` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packgamerecord20181128`;
CREATE TABLE `qp_packgamerecord20181128` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `uid1` int(11) NOT NULL DEFAULT '0',
  `uid2` int(11) NOT NULL DEFAULT '0',
  `uid3` int(11) NOT NULL DEFAULT '0',
  `uid4` int(11) NOT NULL DEFAULT '0',
  `uid5` int(11) NOT NULL DEFAULT '0',
  `uid6` int(11) NOT NULL DEFAULT '0',
  `uid7` int(11) NOT NULL DEFAULT '0',
  `uid8` int(11) NOT NULL DEFAULT '0',
  `fangHao` int(11) NOT NULL DEFAULT '0',
  `rounds` int(11) NOT NULL DEFAULT '0',
  `tableType` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `ungame` int(11) NOT NULL DEFAULT '0',
  `record` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packgamerecord20181129`;
CREATE TABLE `qp_packgamerecord20181129` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `uid1` int(11) NOT NULL DEFAULT '0',
  `uid2` int(11) NOT NULL DEFAULT '0',
  `uid3` int(11) NOT NULL DEFAULT '0',
  `uid4` int(11) NOT NULL DEFAULT '0',
  `uid5` int(11) NOT NULL DEFAULT '0',
  `uid6` int(11) NOT NULL DEFAULT '0',
  `uid7` int(11) NOT NULL DEFAULT '0',
  `uid8` int(11) NOT NULL DEFAULT '0',
  `fangHao` int(11) NOT NULL DEFAULT '0',
  `rounds` int(11) NOT NULL DEFAULT '0',
  `tableType` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `ungame` int(11) NOT NULL DEFAULT '0',
  `record` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packlosscount`;
CREATE TABLE `qp_packlosscount` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `type` int(11) NOT NULL DEFAULT '0' COMMENT '1day,2week,3month',
  `cTime` varchar(10) COLLATE utf8_bin NOT NULL DEFAULT '' COMMENT '日期',
  `num` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packlosslog`;
CREATE TABLE `qp_packlosslog` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `tableId` int(11) NOT NULL DEFAULT '0',
  `num` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packpaylog`;
CREATE TABLE `qp_packpaylog` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `optUid` int(11) NOT NULL DEFAULT '0' COMMENT '操作者',
  `type` int(11) NOT NULL DEFAULT '0' COMMENT '1充值2提取',
  `num` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packplaycount`;
CREATE TABLE `qp_packplaycount` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `uid` int(11) NOT NULL DEFAULT '0',
  `num` int(11) NOT NULL DEFAULT '0',
  `playTime` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_packplayer`;
CREATE TABLE `qp_packplayer` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL DEFAULT '0',
  `uid` int(11) NOT NULL DEFAULT '0',
  `playerName` varchar(50) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `phone` varchar(50) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `notice` varchar(500) COLLATE utf8_bin NOT NULL DEFAULT '',
  `lastJoin` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT '',
  `audit` int(11) NOT NULL DEFAULT '0' COMMENT '0申请|1审核通过|-1审核拒绝|-2取消申请|-3踢出',
  `auditUid` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_payrecord`;
CREATE TABLE `qp_payrecord` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playerId` int(11) NOT NULL,
  `traceNo` varchar(32) NOT NULL,
  `orderNo` varchar(32) NOT NULL,
  `orderAmount` float(11,0) NOT NULL,
  `orderTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payChannel` varchar(5) NOT NULL,
  `productName` varchar(32) NOT NULL,
  `productNum` int(11) NOT NULL,
  `status` tinyint(2) NOT NULL,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completeTime` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orderTime` (`orderTime`) USING BTREE,
  KEY `payChannel` (`payChannel`) USING BTREE,
  KEY `productName` (`productName`) USING BTREE,
  KEY `playerId` (`playerId`) USING BTREE,
  KEY `playerId_productName` (`playerId`,`productName`) USING BTREE,
  KEY `status` (`status`,`orderTime`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_payrecord_gold`;
CREATE TABLE `qp_payrecord_gold` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playerId` int(11) NOT NULL,
  `traceNo` varchar(32) NOT NULL,
  `orderNo` varchar(32) NOT NULL,
  `orderAmount` float(11,0) NOT NULL,
  `orderTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payChannel` varchar(5) NOT NULL,
  `productName` varchar(32) NOT NULL,
  `productNum` int(11) NOT NULL,
  `status` tinyint(2) NOT NULL,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completeTime` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orderTime` (`orderTime`) USING BTREE,
  KEY `payChannel` (`payChannel`),
  KEY `productName` (`productName`),
  KEY `playerId` (`playerId`),
  KEY `playerId_productName` (`playerId`,`productName`),
  KEY `status` (`status`,`orderTime`),
  KEY `orderNo` (`orderNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_playdata`;
CREATE TABLE `qp_playdata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid1` int(11) DEFAULT '0',
  `uid2` int(11) DEFAULT '0',
  `uid3` int(11) DEFAULT '0',
  `uid4` int(11) DEFAULT '0',
  `uid5` int(11) DEFAULT '0',
  `uid6` int(11) DEFAULT '0',
  `uid7` int(11) DEFAULT '0',
  `uid8` int(11) DEFAULT '0',
  `score1` int(11) DEFAULT '0',
  `score2` int(11) DEFAULT '0',
  `score3` int(11) DEFAULT '0',
  `score4` int(11) DEFAULT '0',
  `score5` int(11) DEFAULT '0',
  `score6` int(11) DEFAULT '0',
  `score7` int(11) DEFAULT '0',
  `score8` int(11) DEFAULT '0',
  `ratio1` float DEFAULT '0',
  `ratio2` float DEFAULT '0',
  `ratio3` float DEFAULT '0',
  `ratio4` float DEFAULT '0',
  `ratio5` float DEFAULT '0',
  `ratio6` float DEFAULT '0',
  `ratio7` float DEFAULT '0',
  `ratio8` float DEFAULT '0',
  `ownerId` int(11) DEFAULT '0',
  `tableId` int(11) DEFAULT '0',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uid1` (`uid1`),
  KEY `uid2` (`uid2`),
  KEY `uid3` (`uid3`),
  KEY `uid4` (`uid4`),
  KEY `uid5` (`uid5`),
  KEY `uid6` (`uid6`),
  KEY `uid7` (`uid7`),
  KEY `uid8` (`uid8`),
  KEY `createTime` (`createTime`),
  KEY `serverType` (`serverType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='玩家输赢得分统计';

DROP TABLE IF EXISTS  `qp_player`;
CREATE TABLE `qp_player` (
  `uid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `deviceID` varchar(50) NOT NULL,
  `regType` varchar(50) NOT NULL,
  `userName` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `nickName` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
  `userSex` varchar(32) NOT NULL DEFAULT '2',
  `headUrl` varchar(500) NOT NULL DEFAULT '',
  `vipLevel` int(2) unsigned NOT NULL DEFAULT '0',
  `coinNum` int(10) unsigned NOT NULL DEFAULT '1000',
  `gemNum` int(10) unsigned NOT NULL DEFAULT '2',
  `scoreNum` int(10) unsigned NOT NULL DEFAULT '0',
  `goldNum` int(10) NOT NULL DEFAULT '0',
  `charm` int(10) unsigned NOT NULL DEFAULT '0',
  `firstPaid` varchar(10) NOT NULL DEFAULT '',
  `phoneNumber` varchar(50) NOT NULL DEFAULT '0',
  `loginCount` int(10) unsigned NOT NULL DEFAULT '0',
  `registerTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `playedTime` int(10) unsigned NOT NULL DEFAULT '0',
  `clientType` int(10) unsigned NOT NULL DEFAULT '0',
  `GM` int(2) NOT NULL DEFAULT '0',
  `agentCode` varchar(6) NOT NULL,
  `rootAgent` int(11) DEFAULT '0',
  `rewardGemNum` int(11) DEFAULT '0',
  `locked` tinyint(4) DEFAULT '0',
  `province` varchar(40) DEFAULT NULL,
  `city` varchar(40) DEFAULT NULL,
  `lastLoginTime` datetime DEFAULT NULL,
  `offLineTime` datetime DEFAULT NULL,
  `curVersion` varchar(40) DEFAULT NULL,
  `wxAccount` varchar(64) CHARACTER SET utf8mb4 DEFAULT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `userName` (`userName`),
  KEY `agentCode` (`agentCode`) USING BTREE,
  KEY `registerTime` (`registerTime`) USING BTREE,
  KEY `rootAgent` (`rootAgent`,`registerTime`) USING BTREE,
  KEY `deviceID` (`deviceID`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=138190 DEFAULT CHARSET=utf8;

insert into `qp_player`(`uid`,`deviceID`,`regType`,`userName`,`password`,`nickName`,`userSex`,`headUrl`,`vipLevel`,`coinNum`,`gemNum`,`scoreNum`,`goldNum`,`charm`,`firstPaid`,`phoneNumber`,`loginCount`,`registerTime`,`playedTime`,`clientType`,`GM`,`agentCode`,`rootAgent`,`rewardGemNum`,`locked`,`province`,`city`,`lastLoginTime`,`offLineTime`,`curVersion`,`wxAccount`) values
(100000,'安之玉','1','huazai','huazai','安之玉','2','',100,1000,0,200,20465775,0,'','0',1,'2016-07-31 18:12:47',345,0,0,'',0,0,0,null,null,'2018-09-24 00:30:25',null,null,null),
(100001,'柏越泽','1','huazai1','huazai1','柏越泽','2','',30,1000,59910,200,645605,0,'','0',1,'2016-07-31 18:12:47',385,0,0,'',0,0,0,null,null,'2018-09-10 19:09:50',null,null,null),
(100002,'鲍锦程','1','huazai2','huazai2','鲍锦程','2','',30,1000,9530,200,0,0,'','0',1,'2016-07-31 18:12:47',110,0,0,'',0,0,0,null,null,'2018-09-10 18:09:53',null,null,null),
(100003,'毕修杰','1','huazai3','huazai3','毕修杰','2','',30,1000,9926,116,4940,0,'','0',1,'2016-07-31 18:12:47',56,0,0,'',0,0,0,null,null,'2018-09-10 18:09:26',null,null,null),
(100004,'曹烨伟','1','chen1','chen1','6YGH6KeB','2','http://wx.qlogo.cn/mmopen/vi_32/bVQKKcVicQRaic9AQLBrJO3Wh4QmhbgH2TiaUNpYxsbibahmtic2xp3u9YjibEvu1XhS2u7Vtz52gIZAWh0UNjsdsniaQ/0',30,1000,6120,200,6721,0,'','0',1,'2016-07-31 18:12:47',1224,0,0,'',0,0,0,null,null,'2018-11-18 09:42:19',null,null,null),
(100005,'岑尔曼','1','chen2','chen2','岑尔曼','2','http://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTIKwwAgFucetibIPKhEwgO2aHd2z5T41t1UFkRYicRBic3lj5h7iaua00WZD03khj7POdgTuRxKOJIOGQ/0',30,1000,8893,200,6015,0,'','0',1,'2016-07-31 18:12:47',845,0,0,'',0,0,0,null,null,'2018-11-18 09:51:11',null,null,null),
(100006,'昌立辉','1','chen3','chen3','6YGH6KeB','2','http://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTLQnGXrSPplaIzbpYNiaF5rrOMJuJgsx6vZT66ug9l3157RVBoX8DJdfI9Z2kYWxO1TIiavEVBibgqIg/0',30,1000,7666,200,14237,0,'','0',1,'2016-07-31 18:12:47',285,0,0,'',0,0,0,null,null,'2018-11-18 09:46:04',null,null,' gt5gt'),
(100007,'常致远','1','zhang1','zhang1','6YGH6KeB','2','http://wx.qlogo.cn/mmopen/vi_32/y2gXm61b7ywy2br0QNNDuVz7Lq87Red2SEibsicXeqQPPbrVOcSKWJ3as1xcnYtk72FBlncRzjfBhn9ic0n6BkwXQ/0',30,1000,4281,200,5455,0,'','0',1,'2016-07-31 18:12:47',1054,0,0,'',0,0,0,null,null,'2018-11-29 11:44:56',null,null,' '),
(100008,'丁天思','1','zhang2','zhang2','oWwiY1ZMKf85x60UzM-7aC97bKN5aeQ5','2','http://wx.qlogo.cn/mmopen/vi_32/wGYGZ4JW698Q966GUoiaMibx89zDgicexjRibRKIxDcBzcugACuMz33GIFUyQbOlAwzDJOfmaicD6SmQb3icOKicFn3ng/0',30,1000,8544,200,98,0,'','0',1,'2016-07-31 18:12:48',923,0,0,'',0,0,0,null,null,'2018-11-20 12:41:04',null,null,' 1111'),
(100009,'酆友绿','1','zhang3','zhang3','zhang3','2','zhang3',30,1000,9953,200,0,0,'','0',1,'2016-07-31 18:12:48',381,0,0,'',0,0,0,null,null,'2018-08-28 11:23:09',null,null,null),
(100010,'傅聪健','1','qwe','qwe','傅聪健','2','http://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJnRUibp7LV1l5QVDJwPeoUA2ibjnRXlNLQQKgwmbA3UVgMV0JyBPU2qUPn2icNkCQ1ZcS7rDbZRMQOQ/0',30,1000,10189,36,20107,0,'','0',1,'2016-07-31 18:12:48',36,0,0,'',0,0,0,null,null,'2018-07-06 17:46:47',null,null,null),
(110001,'cxp','1','cxp','1','从这里开始','1','http://wx.qlogo.cn/mmopen/Q3auHgzwzM6vKADsXzibX6W23XXTrcaT3bZIGLibcmEKiaRpkbggBXVZiaQYjlKicp6TOyPbE7nmIujq6G2IndLK6bg/0',30,1000,874,41,0,0,'','0',1,'2017-04-07 23:07:24',8,0,0,'',0,0,0,null,null,'2018-05-10 13:46:58',null,null,null),
(110002,'cxp1','1','cxp1','1','天涯','1','http://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTLgXj6Axr2aRFmuylIibQGcoox8NEj3niapZHQvoOINUwwkVWica8EVRWj8fI1E26mxOsBH9eN3ukEng/132',30,1000,888,3,0,0,'','0',1,'2017-04-07 23:25:27',3,0,100,'',0,0,0,null,null,'2018-05-08 14:28:33',null,null,null),
(110003,'cxp2','1','cxp2','1','可友','1','http://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTK4OWKofR7iboqN5DKbXlDPBpUXEnN25SicQzb8dHibxGq9NOfGlNh5RCzceN6k0P3icBibuJ7WibuvxF3g/0',30,1000,888,0,0,0,'','0',1,'2017-04-07 23:31:13',0,0,100,'',0,0,0,null,null,'2018-03-29 18:19:03',null,null,null),
(110004,'cxp3','1','cxp3','1','人生如梦','2','http://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTIBjVRMIAibS4ThDJQLjJjEydUvXEQc9t3ia72sWqWYhaVWRicic5prlnicJvyhZyKCaEZwhGaYGnZ2t7A/0',30,1000,888,0,0,0,'','0',1,'2017-04-07 23:33:01',0,0,100,'',0,0,0,null,null,'2018-04-19 11:23:02',null,null,null),
(110005,'oFL0xxJT6a0ImMfpUMKKHJt9_7yA','1','oFL0xxJT6a0ImMfpUMKKHJt9_7yA','oFL0xxJT6a0ImMfpUMKKHJt9_7yA','贝可琍','1','http://wx.qlogo.cn/mmopen/7icP9jap515xkmCyXhkNgib4QFDfGnJcicBVrTJCojPgo2UnnMr638adMOddk4yXqbmF5R3KeEIy9RwNwibUcGG300XjibGOH93fl/0',30,1000,0,0,0,0,'','0',1,'2017-04-07 23:56:44',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110006,'oFL0xxPBGDgHDVB3oleJmE6AIxRA','1','oFL0xxPBGDgHDVB3oleJmE6AIxRA','oFL0xxPBGDgHDVB3oleJmE6AIxRA','菜苗','2','http://wx.qlogo.cn/mmopen/vi_32/UOD0yNjJwPSSrbsZM9Kia0v51BMf5dsqRjhNVoZrBEgca797Ne25ic1JA6yHYauCo5ck5nckY0iaPX33mPv6SGFlw/0',30,1000,2,0,0,0,'','0',1,'2017-04-08 00:07:57',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110007,'oFL0xxO-4dB81eP2MmRwxwMIPUxQ','1','oFL0xxO-4dB81eP2MmRwxwMIPUxQ','oFL0xxO-4dB81eP2MmRwxwMIPUxQ','右手的等待','1','http://wx.qlogo.cn/mmopen/vi_32/DYAIOgq83eqPMyNiaianSp6vRfL6e4GfjJUoXg41d7ibf7DSf6hSxiaIibJbd9cRYSibxoLicgoJITqDvgiaj6zlic09UYQ/0',30,1000,8,0,0,0,'','0',1,'2017-04-08 00:14:09',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110008,'oG4MuxH3aQU3nbI4XFCtGNHXjsHA','1','oFL0xxMD7pWmYgI2BL654asTCKf0','oFL0xxMD7pWmYgI2BL654asTCKf0','华达电子店','2','http://wx.qlogo.cn/mmopen/vi_32/GUYEdkZwS68ILsveFm6kr4yZmkFl4ibFr6k0oBAVVBbNVuEQbtDC4bgtYOaL5k7ibc3Y2W0Sk1PvSV5EQozIwYuw/0',30,1000,1,2,0,0,'','0',1,'2017-04-08 00:24:56',0,0,100,'',0,0,0,null,null,'2017-12-25 23:51:42',null,null,null),
(110009,'oFL0xxK0sv6DNlaLzGy3COgyDBgY','1','oFL0xxK0sv6DNlaLzGy3COgyDBgY','oFL0xxK0sv6DNlaLzGy3COgyDBgY','有烟味的男人','1','http://wx.qlogo.cn/mmopen/7icP9jap515w4AYfFhhNPVDiaG4TCibdSdP8FY6wnu16ohdZbib7a4MOUq5Aj99ly0ic8nbu7XibTDmLtj7tQMbhZYQqnHY2r5Epib4/0',30,1000,8,0,0,0,'','0',1,'2017-04-08 00:27:25',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110010,'oFL0xxDczhuzOe3uBNo5vxclZSRU','1','oFL0xxDczhuzOe3uBNo5vxclZSRU','oFL0xxDczhuzOe3uBNo5vxclZSRU','郭锦润','2','http://wx.qlogo.cn/mmopen/Iic9WLWEQMg0KK9ficHXkzwdLhL04Sf9hTEWq5KiaRRiaqL9FlNqsICwtkKcsrtXgT15eSeCShFsejE28ib6xP6QSibWariaTzqhX5E/0',30,1000,8,0,0,0,'','0',1,'2017-04-08 00:59:02',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110011,'oFL0xxHxSuVHvvGwMLPeCOOOxVQk','1','oFL0xxHxSuVHvvGwMLPeCOOOxVQk','oFL0xxHxSuVHvvGwMLPeCOOOxVQk','连惠凤','2','http://wx.qlogo.cn/mmopen/PiajxSqBRaEKAib3UStGGEDqJ6xeFvnSRgCibIu2oLpSKeBlicJDDZKUdqg2omSyOqrQDicXd1ialhN8q7RQqic0rQsfQ/0',30,1000,9,0,0,0,'','0',1,'2017-04-08 01:25:07',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110012,'oFL0xxJYLySmxzbefKZ6uUcoYDUk','1','oFL0xxJYLySmxzbefKZ6uUcoYDUk','oFL0xxJYLySmxzbefKZ6uUcoYDUk','汪汪','1','http://wx.qlogo.cn/mmopen/PiajxSqBRaEKwhHB1OqG87MlmhuouRI53mqrMxUM6gyR7ZicEJjBbTHo2PiclWPG4DfawG7OibC1xicRibpCz1tniblNQ/0',30,1000,10,0,0,0,'','0',1,'2017-04-08 01:48:27',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110013,'oFL0xxMcO8YKIbKnHkGsfXLrqCa4','1','oFL0xxMcO8YKIbKnHkGsfXLrqCa4','oFL0xxMcO8YKIbKnHkGsfXLrqCa4','《酒后我》','1','http://wx.qlogo.cn/mmopen/vi_32/BRpCrN2aufSU3qbMJ5rvNwVyq7w20biapcRoJwJF1TZbuZgJfGzGib7fewqtibJBKDibVgWwY9uAbB8c42lqiaWiaeLw/0',30,1000,0,0,0,0,'','0',1,'2017-04-08 01:52:37',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110014,'oFL0xxFTkYfR1bs5wRfqJgQqnaiA','1','oFL0xxFTkYfR1bs5wRfqJgQqnaiA','oFL0xxFTkYfR1bs5wRfqJgQqnaiA','为疼爱之优','2','http://wx.qlogo.cn/mmopen/pNLHKpyNAM6IrlWRew5XDUWEVUvjwpDrnt518icugfic9e3dMYlFQC930F7Miaic0hUHXxJaAopkOzOuCUEkUcHznqTZEhiaib5LVh/0',30,1000,10,0,0,0,'','0',1,'2017-04-08 02:14:21',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110015,'oFL0xxIBn-WLNDbd3a7Bj8vsXB8g','1','oFL0xxIBn-WLNDbd3a7Bj8vsXB8g','oFL0xxIBn-WLNDbd3a7Bj8vsXB8g','遇见','0','http://wx.qlogo.cn/mmopen/Q3auHgzwzM4icLrYD8YmDZR5AM531vQQTuhFAlwDPibcvVZU49brPc19VDA3b35jxHFFsicTFM03BBhpZMIPYc9LXOf7PSydNRRbR5PMuYLUY0/0',30,1000,12,0,0,0,'','0',1,'2017-04-08 02:28:09',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110016,'oG4MuxOMpkYj70GZKoXUSVmuyq44','1','oFL0xxElkBGwgmqcTu6YAZZdeGpA','oFL0xxElkBGwgmqcTu6YAZZdeGpA','爱梦','0','http://wx.qlogo.cn/mmopen/vi_32/rBWxKCd5zkM5RDRkR8yeLjHbLF5xap1MTicldlpPH2ev0dMMUnw3RlAMwGmyuCa6ShkvCbSkIHMnEmicZoic13JicA/0',30,1000,2,0,0,0,'','0',1,'2017-04-08 03:01:53',0,0,100,'',0,0,0,null,null,'2017-12-20 23:52:00',null,null,null),
(110017,'oG4MuxJQ7FrCONX4haN9vnCJCB8c','1','oFL0xxJLbSZY2MLa77UFB9BMmunU','oFL0xxJLbSZY2MLa77UFB9BMmunU','爱丽','0','http://thirdwx.qlogo.cn/mmopen/vi_32/DYAIOgq83epq3TKeLUibK5TOsibpW5DBYfdW3EmKCRq2faYTANc4yyqkD8icVicnn9b66dAUk0ZcO3WKoaef16OEiaw/132',30,1000,8,0,0,0,'','0',1,'2017-04-08 03:32:43',0,0,100,'',0,0,0,null,null,'2018-02-17 15:47:59',null,null,null),
(110018,'oFL0xxCNcmRUKEBZ6nQhkD_5prFo','1','oFL0xxCNcmRUKEBZ6nQhkD_5prFo','oFL0xxCNcmRUKEBZ6nQhkD_5prFo','枫','0','http://wx.qlogo.cn/mmopen/7icP9jap515yicCws6A7eqGaHGaAVL7ENLOiaW551kN1Byx2yb4LgkTChj9uU96Coa4cFtLbPthTkQeshYnNk4tKOKpOEGuaNN2/0',30,1000,8,0,0,0,'','0',1,'2017-04-08 04:23:22',0,0,100,'',0,0,0,null,null,null,null,null,null),
(110019,'oFL0xxHyw2yc5zuWSrVTTAd3tY1w','1','oFL0xxHyw2yc5zuWSrVTTAd3tY1w','oFL0xxHyw2yc5zuWSrVTTAd3tY1w','阳','1','http://wx.qlogo.cn/mmopen/gibdj2vcRyEJ2uqL2vCV4P4AcGwGvV5T1WlLOS2ZZZwXjTDkic7gELzSkjNtOTXQLAWKVLHfQfFhGS6EltHUanv2tZ14dQe1ND/0',30,1000,0,0,0,0,'','0',1,'2017-04-08 07:25:01',0,0,0,'',0,0,0,null,null,null,null,null,null),
(110020,'oFL0xxKThTEAgXUuGT9dJg-pLpJU','1','oFL0xxKThTEAgXUuGT9dJg-pLpJU','oFL0xxKThTEAgXUuGT9dJg-pLpJU','珍珍','0','http://wx.qlogo.cn/mmopen/7icP9jap515xkmCyXhkNgib84qiaMa7YpLK2WcAhhAEibNbOstHxY0dZenTak9v73Xl0ib4t9jj4JtGZHZhhUCBPhQmibXX6YXKTrP/0',30,1000,8,0,0,0,'','0',1,'2017-04-08 07:45:30',0,0,0,'',0,0,0,null,null,null,null,null,null),
(138181,'5ABC8B3A839B4D9A','1','5ABC8B3A839B4D9A','5ABC8B3A839B4D9A','138181','1','5ABC8B3A839B4D9A',0,1000,5,0,0,0,'','0',1,'2018-11-28 13:39:16',0,0,0,'',0,0,0,'','','2018-11-28 13:39:17',null,'1.0.0',null),
(138182,'C5554D03C4B2C1F6','1','C5554D03C4B2C1F6','C5554D03C4B2C1F6','C5554D03C4B2C1F6','1','C5554D03C4B2C1F6',0,1000,5,0,0,0,'','0',1,'2018-11-28 14:21:56',0,0,0,'',0,0,0,'','','2018-11-28 14:22:11',null,'1.0.0',null),
(138183,'oRayK0m-wOh_tGNugZX3caF79dEo','1','oi_Zp1bDETvPCin70V0p0DcpIoQ8','oi_Zp1bDETvPCin70V0p0DcpIoQ8','crash','0','oi_Zp1bDETvPCin70V0p0DcpIoQ8',0,1000,5,0,0,0,'','0',1,'2018-11-28 17:27:57',0,0,0,'',0,0,0,'','','2018-11-29 11:28:39',null,'1.0.0',null),
(138184,'0CCBFA24C6F42D6F','1','0CCBFA24C6F42D6F','0CCBFA24C6F42D6F','138184','1','0CCBFA24C6F42D6F',0,1000,5,0,0,0,'','0',1,'2018-11-29 10:45:16',0,0,0,'',0,0,0,'','',null,null,'1.0.0',null),
(138185,'F0FCB016AC94213A','1','F0FCB016AC94213A','F0FCB016AC94213A','138185','1','F0FCB016AC94213A',0,1000,5,0,0,0,'','0',1,'2018-11-29 11:16:15',0,0,0,'',0,0,0,'','',null,null,'1.0.0',null),
(138186,'AE6310656E9E8D6D','1','AE6310656E9E8D6D','AE6310656E9E8D6D','138186','1','AE6310656E9E8D6D',0,1000,5,0,0,0,'','0',1,'2018-11-29 11:20:21',0,0,0,'',0,0,0,'','',null,null,'1.0.0',null),
(138187,'oRayK0j5Ls8_rv-gqyg7i7TkNafc','1','oi_Zp1YkBlUvU-zALZNcYYdIp8JE','oi_Zp1YkBlUvU-zALZNcYYdIp8JE','故事的小黄花','1','http://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTIHCeNvUeZJ6pME5SMz6qq0bju14PJ1tIXfmy1y7nUddCbMYEYdiaCDDISDhZETft9JGyqFD17ZgEw/132',0,1000,17,0,0,0,'','0',1,'2018-11-29 11:25:55',0,0,0,'',0,12,0,'','','2018-11-29 12:09:22',null,'1.0.0',null),
(138188,'C8296A95D6B47513','1','C8296A95D6B47513','C8296A95D6B47513','138188','1','C8296A95D6B47513',0,1000,5,0,0,0,'','0',1,'2018-11-29 11:27:11',0,0,0,'',0,0,0,'','','2018-11-29 11:54:15',null,'1.0.0',null),
(138189,'2EBCA78EE876A657','1','2EBCA78EE876A657','2EBCA78EE876A657','2EBCA78EE876A657','1','2EBCA78EE876A657',0,1000,17,0,0,0,'','0',1,'2018-11-29 12:00:48',0,0,0,'',0,12,0,'','','2018-11-29 14:37:57',null,'1.0.0',null);
DROP TABLE IF EXISTS  `qp_player_game_detail`;
CREATE TABLE `qp_player_game_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT NULL COMMENT '用户uid',
  `score` int(11) DEFAULT NULL COMMENT '总得分',
  `serverType` varchar(30) DEFAULT NULL COMMENT '游戏类型',
  `win` int(11) DEFAULT NULL COMMENT '胜',
  `fail` int(11) DEFAULT NULL COMMENT '负',
  `playerNum` int(11) DEFAULT NULL COMMENT '人数',
  `round` int(11) DEFAULT NULL COMMENT '局数',
  `createTime` int(11) DEFAULT NULL COMMENT '天数',
  `gameNum` int(11) DEFAULT NULL COMMENT '游戏数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_player_parts`;
CREATE TABLE `qp_player_parts` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL DEFAULT '0',
  `type` int(11) NOT NULL DEFAULT '0' COMMENT '配件类型1头像框',
  `itemNo` int(11) NOT NULL DEFAULT '0',
  `startTime` varchar(20) COLLATE utf8_bin NOT NULL DEFAULT '' COMMENT '激活时间',
  `expTime` int(11) NOT NULL DEFAULT '0' COMMENT '有效期秒',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '状态1激活|-1过期|2使用',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_playergamerecord`;
CREATE TABLE `qp_playergamerecord` (
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `userName` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `dayCoin` int(32) unsigned NOT NULL DEFAULT '0',
  `weekCoin` int(32) unsigned NOT NULL DEFAULT '0',
  `dayGem` int(32) unsigned NOT NULL DEFAULT '0',
  `weekGem` int(32) unsigned NOT NULL DEFAULT '0',
  `dayChipIn` int(32) unsigned NOT NULL DEFAULT '0',
  `weekChipIn` int(32) unsigned NOT NULL DEFAULT '0',
  `totalChipIn` int(32) unsigned NOT NULL DEFAULT '0',
  `loginTimes` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

insert into `qp_playergamerecord`(`uid`,`userName`,`dayCoin`,`weekCoin`,`dayGem`,`weekGem`,`dayChipIn`,`weekChipIn`,`totalChipIn`,`loginTimes`) values
(138181,'',0,0,0,0,0,0,0,0),
(138182,'',0,0,0,0,0,0,0,0),
(138183,'',0,0,0,0,0,0,0,0),
(138184,'',0,0,0,0,0,0,0,0),
(138185,'',0,0,0,0,0,0,0,0),
(138186,'',0,0,0,0,0,0,0,0),
(138187,'',0,0,0,0,0,0,0,0),
(138188,'',0,0,0,0,0,0,0,0),
(138189,'',0,0,0,0,0,0,0,0);
DROP TABLE IF EXISTS  `qp_playerhuifang`;
CREATE TABLE `qp_playerhuifang` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `record` varchar(20000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `type` int(10) unsigned NOT NULL DEFAULT '0',
  `fangHao` int(32) unsigned NOT NULL DEFAULT '0',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `fangZhu` int(32) unsigned NOT NULL DEFAULT '0',
  `daiKai` int(32) unsigned NOT NULL DEFAULT '0',
  `pid` int(32) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `recordTime` (`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_playerhuifang20181123`;
CREATE TABLE `qp_playerhuifang20181123` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `record` varchar(20000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `type` int(10) unsigned NOT NULL DEFAULT '0',
  `fangHao` int(32) unsigned NOT NULL DEFAULT '0',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `fangZhu` int(32) unsigned NOT NULL DEFAULT '0',
  `daiKai` int(32) unsigned NOT NULL DEFAULT '0',
  `pid` int(32) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `recordTime` (`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_playerhuifang20181128`;
CREATE TABLE `qp_playerhuifang20181128` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `record` varchar(20000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `type` int(10) unsigned NOT NULL DEFAULT '0',
  `fangHao` int(32) unsigned NOT NULL DEFAULT '0',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `fangZhu` int(32) unsigned NOT NULL DEFAULT '0',
  `daiKai` int(32) unsigned NOT NULL DEFAULT '0',
  `pid` int(32) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `recordTime` (`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_playerhuifang20181129`;
CREATE TABLE `qp_playerhuifang20181129` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid1` int(32) unsigned NOT NULL DEFAULT '0',
  `uid2` int(32) unsigned NOT NULL DEFAULT '0',
  `uid3` int(32) unsigned NOT NULL DEFAULT '0',
  `uid4` int(32) unsigned NOT NULL DEFAULT '0',
  `uid5` int(32) unsigned NOT NULL DEFAULT '0',
  `uid6` int(32) unsigned NOT NULL DEFAULT '0',
  `uid7` int(32) unsigned NOT NULL DEFAULT '0',
  `uid8` int(32) unsigned NOT NULL DEFAULT '0',
  `record` varchar(20000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `type` int(10) unsigned NOT NULL DEFAULT '0',
  `fangHao` int(32) unsigned NOT NULL DEFAULT '0',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `serverType` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `fangZhu` int(32) unsigned NOT NULL DEFAULT '0',
  `daiKai` int(32) unsigned NOT NULL DEFAULT '0',
  `pid` int(32) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `recordTime` (`recordTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_playerrecord`;
CREATE TABLE `qp_playerrecord` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `record` varchar(5000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `type` int(10) unsigned NOT NULL DEFAULT '0',
  `userName` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_podium`;
CREATE TABLE `qp_podium` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `userName` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `type` int(32) unsigned NOT NULL DEFAULT '0',
  `giveUid` int(32) unsigned NOT NULL DEFAULT '0',
  `giveUserName` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `record` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `podiumKey` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `coin` int(32) unsigned NOT NULL DEFAULT '0',
  `gem` int(32) unsigned NOT NULL DEFAULT '0',
  `isGet` int(32) unsigned NOT NULL DEFAULT '0',
  `recordTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_randnumber`;
CREATE TABLE `qp_randnumber` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `randNumber` int(32) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_rank_arena_history`;
CREATE TABLE `qp_rank_arena_history` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `arenaId` int(11) NOT NULL DEFAULT '0',
  `uid` int(11) NOT NULL DEFAULT '0',
  `star` int(11) NOT NULL DEFAULT '0',
  `score` int(11) NOT NULL DEFAULT '0',
  `rank` int(11) NOT NULL DEFAULT '0',
  `buyTimes` int(11) NOT NULL DEFAULT '0',
  `freeTimes` int(11) NOT NULL DEFAULT '0',
  `gm` int(11) NOT NULL DEFAULT '0',
  `rewards` varchar(500) COLLATE utf8_bin NOT NULL DEFAULT '[]',
  `state` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_rank_arena_player`;
CREATE TABLE `qp_rank_arena_player` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `arenaId` int(11) NOT NULL DEFAULT '0',
  `uid` int(11) NOT NULL DEFAULT '0',
  `star` int(11) NOT NULL DEFAULT '0',
  `score` int(11) NOT NULL DEFAULT '0',
  `rank` int(11) NOT NULL DEFAULT '0',
  `buyTimes` int(11) NOT NULL DEFAULT '0',
  `freeTimes` int(11) NOT NULL DEFAULT '0',
  `gm` int(11) NOT NULL DEFAULT '0',
  `rewards` varchar(500) COLLATE utf8_bin NOT NULL DEFAULT '[]',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_rewardgeminfo`;
CREATE TABLE `qp_rewardgeminfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `rewardGem` int(11) NOT NULL DEFAULT '0',
  `beforeGem` int(11) NOT NULL DEFAULT '0',
  `afterGem` int(11) NOT NULL DEFAULT '0',
  `type` int(11) NOT NULL DEFAULT '0',
  `createTime` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

insert into `qp_rewardgeminfo`(`id`,`uid`,`rewardGem`,`beforeGem`,`afterGem`,`type`,`createTime`) values
(1,'138189',12,5,17,1,'2018-11-29 12:08:34'),
(2,'138187',12,5,17,1,'2018-11-29 12:10:32');
DROP TABLE IF EXISTS  `qp_rewardinfo`;
CREATE TABLE `qp_rewardinfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(50) NOT NULL,
  `type` varchar(40) DEFAULT NULL COMMENT 'money:0,cost:1',
  `itemId` int(11) DEFAULT '0' COMMENT '1:钻石 2:金币 3:积分 other:物品ID',
  `amount` decimal(8,1) DEFAULT '0.0' COMMENT '金额',
  `nickName` varchar(40) DEFAULT NULL,
  `exchange` int(11) DEFAULT '0' COMMENT '获取 0，兑换：1',
  `exchangeCode` varchar(40) DEFAULT NULL COMMENT '兑换码',
  `exchangeState` int(11) DEFAULT NULL COMMENT '兑换状态：0，1',
  `source` int(11) DEFAULT '0' COMMENT '来源',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_safebox`;
CREATE TABLE `qp_safebox` (
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `password` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '123456',
  `giveCount` int(10) unsigned NOT NULL DEFAULT '0',
  `give` varchar(5000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '{}',
  `coinNum` int(32) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_settings`;
CREATE TABLE `qp_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(45) DEFAULT NULL,
  `value` varchar(4096) CHARACTER SET utf8 DEFAULT NULL,
  `remark` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

insert into `qp_settings`(`id`,`key`,`value`,`remark`) values
(1,'paySP','0',null),
(2,'cardPrice','5:10|40:50|200:200|400:360|900:600|2000:900',null),
(3,'l1BonusPercent','0',null),
(4,'l2BonusPercent','0|0',null),
(5,'playerBonusPercent','0|0|0',null),
(6,'customBonusPercent','0',null),
(7,'opcpSharing','6:4',null),
(8,'manualWithdraw','0',null),
(9,'bindAgentReward','10|0',null),
(10,'cancelAgentCondition','7|10',null),
(11,'customAgentCode','1',null),
(12,'agentUsePhoneNum','1',null),
(13,'agentCodeUseUID','0',null),
(20,'forbiddenLogin','0',null),
(21,'healthNotice','健康游戏公告\\n本游戏仅为娱乐休闲使用,自觉远离赌博等非法行为',null),
(22,'kfWeChat','schl008',null),
(23,'dlWeChat','schl008',null),
(24,'fkWeChat','schl008',null),
(25,'tsWeChat','schl008',null),
(26,'use10AgentLevel','0',null),
(29,'cardPriceBinded','5:10|40:50|200:200|400:360|900:600|2000:900',null),
(30,'agentBindSelfCode','0',null),
(31,'bonusReward1Level','0',null),
(32,'clubCreatSetting','0|188',null),
(33,'PACK_MAX_MIX_NUM','5',null),
(34,'PACK_MAX_MEMBER_NUM','200',null),
(35,'exchangeSetting','1|100',null),
(36,'bottomNoteSetting','100',null),
(37,'poundage','2|10|0|10|0|200',null),
(38,'goldPrice','10000:1|60000:6|318000:30|728000:68|1480000:128|3680000:328',null),
(39,'dayRechargeGift','40000',null),
(40,'yylRewardTotalNum','1285890',''),
(41,'yylRateSet','{"rates":[{"rate":5,"reward":100,"type":13},{"rate":30,"reward":50,"type":11},{"rate":50,"reward":40,"type":10},{"rate":100,"reward":30,"type":9},{"rate":300,"reward":18,"type":8},{"rate":800,"reward":10,"type":5},{"rate":1900,"reward":5,"type":4},{"rate":24000,"reward":2,"type":3},{"rate":17500,"reward":1,"type":2},{"rate":37815,"reward":0,"type":1}]}',''),
(42,'lotterySwitch','1',null),
(43,'dzpRateSet','{"0":[{"rate":50,"reward":888,"type":0,"itemId":1},{"rate":5000,"reward":1,"type":1,"itemId":1040102},{"rate":19000,"reward":10000,"type":2,"itemId":2},{"rate":5000,"reward":1,"type":3,"itemId":1091502},{"rate":600,"reward":68000,"type":4,"itemId":2},{"rate":300,"reward":88,"type":5,"itemId":1},{"rate":50,"reward":1,"type":6,"itemId":1040103},{"rate":50,"reward":188000,"type":7,"itemId":2},{"rate":20000,"reward":8,"type":8,"itemId":1},{"rate":5000,"reward":1,"type":9,"itemId":1050102},{"rate":300,"reward":80000,"type":10,"itemId":2},{"rate":44650,"reward":1000,"type":11,"itemId":2}],"50000":[{"rate":100,"reward":888,"type":0,"itemId":1},{"rate":5000,"reward":1,"type":1,"itemId":1040102},{"rate":15000,"reward":10000,"type":2,"itemId":2},{"rate":5000,"reward":1,"type":3,"itemId":1091502},{"rate":15000,"reward":68000,"type":4,"itemId":2},{"rate":5000,"reward":88,"type":5,"itemId":1},{"rate":1000,"reward":1,"type":6,"itemId":1040103},{"rate":1000,"reward":188000,"type":7,"itemId":2},{"rate":20000,"reward":8,"type":8,"itemId":1},{"rate":5000,"reward":1,"type":9,"itemId":1050102},{"rate":10000,"reward":80000,"type":10,"itemId":2},{"rate":17900,"reward":1000,"type":11,"itemId":2}]}',null),
(44,'dzpCfg','{"freeNum":1,"cost":{"1":10000,"3":20000,"1000":50000},"maxNum":19}',null);
DROP TABLE IF EXISTS  `qp_systemconfig`;
CREATE TABLE `qp_systemconfig` (
  `id` int(10) unsigned NOT NULL DEFAULT '0',
  `dayRecord` int(10) unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS  `qp_task`;
CREATE TABLE `qp_task` (
  `id` int(32) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL DEFAULT '0',
  `taskId` int(11) NOT NULL DEFAULT '0',
  `taskType` int(11) NOT NULL DEFAULT '0',
  `taskVal` varchar(1000) COLLATE utf8_bin NOT NULL DEFAULT '',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '0:未完成|1已完成|2已领奖',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

DROP TABLE IF EXISTS  `qp_tmpsubagent`;
CREATE TABLE `qp_tmpsubagent` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `subUid` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_yyl_daily_data`;
CREATE TABLE `qp_yyl_daily_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `totalExpend` int(11) DEFAULT '0' COMMENT '当日玩家累计消耗',
  `gameNum` int(10) unsigned DEFAULT '0' COMMENT '当日玩家累计参与次数',
  `totalReward` int(10) unsigned DEFAULT '0' COMMENT '当日累计奖励金额',
  `playerNum` int(10) unsigned DEFAULT '0' COMMENT '当日参与的玩家人数',
  `time` datetime DEFAULT NULL COMMENT '统计时间',
  `createTime` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS  `qp_yylstateinfo`;
CREATE TABLE `qp_yylstateinfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `betNum` int(11) NOT NULL,
  `rewardNum` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `createTime` timestamp NULL DEFAULT NULL,
  `nickName` varchar(40) CHARACTER SET utf8 DEFAULT NULL,
  `cards` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `createTime` (`createTime`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;

