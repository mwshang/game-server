var logger = require('pomelo-logger').getLogger('database-log', __filename);

module.exports =
{
    updateActive:function(client, msg, cb)
    {
        logger.debug("写入数据内容1:%j", msg);
        var sql = 'update qp_active set loginTimes = ?, dayLogin = ?, vipCount = ?, ' +
            'dayShareFriend = ?,dayReqFriend = ?,dayBigWheel = ?,dayGold = ? where uid = ?';

        var args = [msg.loginTimes,msg.dayLogin,msg.vipCount,
            msg.dayShareFriend,msg.dayReqFriend,msg.dayBigWheel,msg.dayGold,
            msg.uid];

        client.query(sql,args,function(err, res)
        {
            if(err !== null)
            {
                logger.error('写入玩家数据库失败!　' +  ' stack:' + err.stack);
            }
            logger.debug("写入数据库成功");
            if(!!cb && typeof cb == 'function')
            {
                cb(!!err);
            }
        });
    }
};
