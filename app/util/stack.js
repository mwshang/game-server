function Stack() {
    this._data = [];
    this._index = 0;
}

var prop = Stack.prototype;
prop.__defineGetter__("Empty", function() { return this._index == 0 });

prop.Push = function(value) {
    this._data[this._index++] = value;
}

prop.Pop = function() {
    if (this.Empty) {
        return null;
    }
    return this._data[--this._index];
}

prop.Peek = function() {
    if (this.Empty) {
        return null;
    }
    return this._data[this._index - 1];
}

prop.Clear = function() {
    this._index = 0;
}

module.exports = Stack;
