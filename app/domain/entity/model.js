var logger = require('pomelo-logger').getLogger('model-log', __filename);

var model = {
    inited: false,
    db: null
};

model.init = function (app, db) {
    if ( this.inited )
        return;

    this.inited = true;
    this.db = db;

    this.task = db.define('qp_task', {
        id: {type: 'serial', key: true},
        uid: {type: 'integer'},
        taskId: {type: 'integer'},
        taskType: {type: 'integer'},
        taskVal: {type: 'text'},
        status: {type: 'integer'},
        createTime: {type: 'date', time: true}
    });

    this.player = db.define('qp_player', {
        uid: {type: 'serial', key: true}, // the auto-incrementing primary key
        deviceID: {type: 'text'},
        regType: {type: 'integer'},
        userName: {type: 'text'},
        password: {type: 'text'},
        nickName: {type: 'text'},
        userSex: {type: 'text'},
        headUrl: {type: 'text'},
        vipLevel: {type: 'integer'},
        coinNum: {type: 'integer'},
        gemNum: {type: 'integer'},
        scoreNum: {type: 'integer'},
        charm: {type: 'integer'},
        firstPaid: {type: 'integer'},
        phoneNumber: {type: 'text'},
        loginCount: {type: 'integer'},
        registerTime: {type: 'date'},
        playedTime: {type: 'date'},
        clientType: {type: 'integer'},
        GM: {type: 'integer'},
        agentCode: {type: 'text'},
        rootAgent: {type: 'integer'},
        locked: {type: 'integer'}
    });

    this.settings = db.define('qp_settings', {
        id: {type: 'serial', key: true},
        key: {type: 'text'},
        value: {type: 'text'},
    });

    this.dailySign = db.define('qp_dailysgin', {
        id: {type: 'serial', key: true},
        uid: {type: 'integer'},
        todayLogin: {type: 'integer'},
        loginDay: {type: 'integer'},
        lastSignTime: {type: 'date', time: true},
        createTime: {type: 'date', time: true}
    });

    app.set('ormModel', this);
    logger.error('model init complete!!');
}

module.exports = model;