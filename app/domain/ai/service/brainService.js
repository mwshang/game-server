var logger = require('pomelo-logger').getLogger('yiqigame-log', __filename);

var Service = function() {
	this.brains = {};
};

module.exports = Service;

var pro = Service.prototype;

pro.getBrain = function(type, player) {
	if(!type || !player)
    {
        logger.error("getBrain error: type or player null");
        return null;
	}
	var brain = this.brains[type];
	if(brain) {
		return brain.clone({player: player});
	}
	return null;
};

pro.registerBrain = function(type, brain) {
	this.brains[type] = brain;
};

