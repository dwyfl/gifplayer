(function(global){

  var GIFUtils = {};

  GIFUtils.isArray = function(arr) {
    return arr instanceof Array
        || Array.isArray(arr)
        || (arr && arr !== Object.prototype && GIFUtils.isArray(arr.__proto__));
  }
  GIFUtils.elementAddClass = function(element, className) {
    element.classList.add(className);
  };
  GIFUtils.elementRemoveClass = function(element, className) {
    element.classList.remove(className);
  };
  GIFUtils.elementCreate = function(elementType, attributes, styles, children, innerText) {
    var element = document.createElement(elementType);
    GIFUtils.extendObject(element, attributes, true);
    GIFUtils.extendObject(element.style, styles, true);
    for (var i = 0; children && i < children.length; ++i)
      element.appendChild(children[i]);
    if (innerText !== undefined)
      element.innerText = innerText;
    return element;
  };
  GIFUtils.extendObject = function(object, extend, force) {
    if (!object)
      object = {};
    for (var i in extend) {
      if (force || !object.hasOwnProperty(i))
        object[i] = extend[i];
    }
    return object;
  };
  GIFUtils.humanReadableBytes = function(bytes){
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        bytes = bytes / 1024;
        i++;
    } while (bytes > 1024);
    return Math.max(bytes, 0.1).toFixed(1) + byteUnits[i];
  };
  GIFUtils.LN2 = Math.log(2);
  GIFUtils.log2 = function(n){
    return Math.log(n)/GIFUtils.LN2;
  };
  GIFUtils.timer = (function(){
    return typeof(performance) == 'object' && typeof(performance.now) == 'function' ?
      function(){ return performance.now(); } :
      function(){ return (new Date()).getTime(); };
  })();

  global.GIFUtils = global.GIFUtils || GIFUtils;

})(this);

/*
Copyright Joyent, Inc. and other Node contributors. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

(function(global){

  var EventEmitter = function(){};

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.
  var defaultMaxListeners = 10;
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!this._events) this._events = {};
    this._events.maxListeners = n;
  };

  EventEmitter.prototype.emit = function() {
    var type = arguments[0];
    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      if (!this._events || !this._events.error ||
          (GIFUtils.isArray(this._events.error) && !this._events.error.length))
      {
        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    if (!this._events) return false;
    var handler = this._events[type];
    if (!handler) return false;

    if (typeof handler == 'function') {
      switch (arguments.length) {
        // fast cases
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        // slower
        default:
          var l = arguments.length;
          var args = new Array(l - 1);
          for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
      return true;

    } else if (GIFUtils.isArray(handler)) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
      return true;

    } else {
      return false;
    }
  };

  // EventEmitter is defined in src/node_events.cc
  // EventEmitter.prototype.emit() is also defined there.
  EventEmitter.prototype.addListener = function(type, listener) {
    if ('function' !== typeof listener) {
      throw new Error('addListener only takes instances of Function');
    }

    if (!this._events) this._events = {};

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    } else if (GIFUtils.isArray(this._events[type])) {

      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {
        var m;
        if (this._events.maxListeners !== undefined) {
          m = this._events.maxListeners;
        } else {
          m = defaultMaxListeners;
        }

        if (m && m > 0 && this._events[type].length > m) {
          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    } else {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }

    return this;
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.once = function(type, listener) {
    if ('function' !== typeof listener) {
      throw new Error('.once only takes instances of Function');
    }

    var self = this;
    function g() {
      self.removeListener(type, g);
      listener.apply(this, arguments);
    };

    g.listener = listener;
    self.on(type, g);

    return this;
  };

  EventEmitter.prototype.removeListener = function(type, listener) {
    if ('function' !== typeof listener) {
      throw new Error('removeListener only takes instances of Function');
    }

    // does not use listeners(), so no side effect of creating _events[type]
    if (!this._events || !this._events[type]) return this;

    var list = this._events[type];

    if (GIFUtils.isArray(list)) {
      var position = -1;
      for (var i = 0, length = list.length; i < length; i++) {
        if (list[i] === listener ||
            (list[i].listener && list[i].listener === listener))
        {
          position = i;
          break;
        }
      }

      if (position < 0) return this;
      list.splice(position, 1);
      if (list.length == 0)
        delete this._events[type];
    } else if (list === listener ||
               (list.listener && list.listener === listener))
    {
      delete this._events[type];
    }

    return this;
  };

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      this._events = {};
      return this;
    }

    // does not use listeners(), so no side effect of creating _events[type]
    if (type && this._events && this._events[type]) this._events[type] = null;
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if (!this._events) this._events = {};
    if (!this._events[type]) this._events[type] = [];
    if (!GIFUtils.isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  global.EventEmitter = global.EventEmitter || EventEmitter;

})(this);