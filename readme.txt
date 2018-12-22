创建一列
//alter table wuhan.qp_playerhuifang add column baseScore int default 1;
//alter table wuhan.qp_huifanginfo add column baseScore int default 1;

alter table wuhan.qp_huifanginfo add column baseScore int(32) unsigned NOT NULL DEFAULT 1;
SELECT * FROM wuhan.qp_huifanginfo; 

alter table wuhan.qp_playerhuifang add column baseScore int(32) unsigned NOT NULL DEFAULT 1;
SELECT * FROM wuhan.qp_playerhuifang;