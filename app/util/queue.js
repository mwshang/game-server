function Node(value) {
    this.Value = value;
    this.Next = null;
}

function Queue(maxLen) {
    this._head = null;
    this._tail = null;
    this._count = 0;
    this._maxLen = !!maxLen ? maxLen : -1;
}

var prop = Queue.prototype;
prop.__defineGetter__("Empty", function() { return this._count == 0 });

prop.EnQueue = function(value) {
    var node = new Node(value);
    if (!this._tail) {
        this._head = node;
    } else {
        this._tail.Next = node;
    }
    this._tail = node;
    ++this._count;
    // TODO 移除maxlen 1/3
    if (this._maxLen != -1 && this._count > this._maxLen) {
        for (var i = 0, len = parseInt(this._maxLen / 3); i < len; ++i) {
            var temp = this._head;
            this._head = this._head.Next;
            delete temp;
            --this._count;
        }
    }
}

prop.DeQueue = function() {
    if (this.Empty) {
        return null;
    }
    --this._count;
    var node = this._head;
    this._head = node.Next;
    if (!this._head) {
        this._tail = null;
    }
    var value = node.Value;
    delete node;
    return value;
}

prop.Peek = function() {
    if (this.Empty) {
        return null;
    }
    return this._head.Value;
}

prop.Clear = function() {
    while (!this.Empty) {
        this.Pop();
    }
}

prop.Foreach = function(cb) {
    var temp = this._head;
    while(temp) {
        if (!cb(temp.Value)) {
            break;
        }
        temp = temp.Next;
    }
}

module.exports = Queue;
