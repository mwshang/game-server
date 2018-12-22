var logger = require('pomelo-logger').getLogger('database-log', __filename);

module.exports = {
  updateBag: function (dbclient, val, cb) {
    var sql = 'update qp_bag set items = ? where uid = ?';
    var items = val.items;
    if (typeof items !== 'string') {
      items = JSON.stringify(items);
    }
    var args = [items, val.uid];

    dbclient.query(sql, args, function (err, res) {
      if (err) {
        logger.error('write mysql failed!　' + sql + ' ' + JSON.stringify(val));
      }
      if(!!cb && typeof cb == 'function') {
        cb(!!err);
      }
    });
  }
};
