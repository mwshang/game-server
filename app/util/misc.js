function Misc() {
}

var prop = Misc.prototype;

prop.GetTwoInt = function(value) {
    if ('number' === typeof value) {
        return value < 10 ? ("0" + value) : (value);
    }
    return "00";
}

prop.GetFourInt = function(value) {
    if ('number' === typeof value) {
        if (value < 10) {
            return "000" + value;
        } else if (value < 100) {
            return "00" + value;
        } else if (value < 1000) {
            return "0" + value;
        }
        return value;
    }
    return "0000";
}

var misc = new Misc;
module.exports = misc;
