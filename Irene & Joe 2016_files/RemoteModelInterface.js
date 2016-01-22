(function webpackUniversalModuleDefinition(root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if(typeof define === 'function' && define.amd)
    define([], factory);
  else if(typeof exports === 'object')
    exports["RemoteModelInterface"] = factory();
  else
    root["RemoteModelInterface"] = factory();
})(this, function() {

  var DATA = 'data',
      NAME = 'compName',
      STATE = 'state',
      COMPID = 'compId',
      TYPE = 'type',
      PROPS = 'props',
      EVENTS = 'events',
      LAYOUT = 'layout',
      CHILDREN = 'children';

  function RemoteModelInterface(modelJson, onUpdateCallback) {
    this._model = modelJson || {type: 'Container', children: []};
    this._onUpdateCallback = onUpdateCallback;
    this._eventHandlers = {};
  }

  //Getters

  RemoteModelInterface.prototype.getComp = function (compName) {
    return get(this._model, compName);
  };

  RemoteModelInterface.prototype.getState = function(compName) {
    return get(this._model, compName, STATE);
  };

  RemoteModelInterface.prototype.getData = function(compName) {
    return get(this._model, compName, DATA);
  };

  RemoteModelInterface.prototype.getType = function(compName) {
    return get(this._model, compName, TYPE);
  };

  RemoteModelInterface.prototype.getProps = function(compName) {
    return get(this._model, compName, PROPS);
  };

  RemoteModelInterface.prototype.getEvents = function(compName) {
    return get(this._model, compName, EVENTS);
  };

  RemoteModelInterface.prototype.getLayout = function(compName) {
    return get(this._model, compName, LAYOUT);
  };

  RemoteModelInterface.prototype.getCallbackById = function(callbackId) {
    return this._eventHandlers[callbackId];
  };

  RemoteModelInterface.prototype.getCompId = function(compName) {
    return get(this._model, compName, COMPID);
  };

  //Setters

  RemoteModelInterface.prototype.addComponent = function(compId, compDescriptor) {
    var comp = {};
    comp[COMPID] = compId;
    comp[NAME] = compDescriptor[NAME] || compId;
    comp[STATE] = compDescriptor[STATE] || {};
    comp[TYPE] = compDescriptor[TYPE];
    comp[DATA] = compDescriptor[DATA] || {};
    comp[PROPS] = compDescriptor[PROPS] || {};
    comp[LAYOUT] = compDescriptor[LAYOUT] || {};
    comp[EVENTS] = compDescriptor[EVENTS] || [];
    this._model.children.push(comp);
  };

  RemoteModelInterface.prototype.setState = function(compName, partialState) {
    set(this._model, compName, STATE, partialState, this._onUpdateCallback);
  };

  RemoteModelInterface.prototype.setData = function(compName, partialData) {
    set(this._model, compName, DATA, partialData, this._onUpdateCallback);
  };

  RemoteModelInterface.prototype.setProps = function(compName, partialProps) {
    set(this._model, compName, PROPS, partialProps, this._onUpdateCallback);
  };

  RemoteModelInterface.prototype.setLayout = function(compName, partialLayout) {
    set(this._model, compName, LAYOUT, partialLayout, this._onUpdateCallback);
  };

  RemoteModelInterface.prototype.setUpdateCallback = function(onUpdateCallback) {
    this._onUpdateCallback = onUpdateCallback;
  };

  RemoteModelInterface.prototype.registerEvent = function(widgetInstanceId, compName, eventType, callback) {
    var compId = this.getCompId.call(this, compName);
    var callbackId;

    if (_.isFunction(callback)) {
      callbackId = guid();
      var partialEvents = {};
      this._eventHandlers[callbackId] = callback;
      partialEvents[eventType] = callbackId;
    } else {
      callbackId = callback;
    }

    var actionBehavior = {
      action: {
        type: 'comp',
        name: eventType,
        sourceId: compId
      },
      behavior: {
        type: 'widget',
        compName: compName,
        targetId: widgetInstanceId,
        params: {
          callbackId: callbackId,
          compName: compName
        },
        name: 'runCode'

      }
    };
    set(this._model, compName, EVENTS, actionBehavior, this._onUpdateCallback);
  };

  RemoteModelInterface.prototype.toJson = function() {
    return this._model;
  };

  RemoteModelInterface.prototype.getCompsFromType = function (type) {
    var compNames = getCompNames(this._model);
    var comps = [];
    compNames.forEach(function(compName) {
      var compType = this.getType(compName);
      if (compType === type) {
        comps.push(this.getComp(compName));
      }
    }, this);
    return comps;
  };

  //Utility

  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }

  function get(model, compName, pathTo) {
    var compPath = getCompPath(model, compName, pathTo);
    return getFromPath(model, compPath);
  }

  function getFromPath(model, compPath) {
    var comp;
    if (Array.isArray(compPath)) {
      if (compPath.length > 0) {
        comp = _.get(model, compPath, {});
      } else {
        comp = model;
      }
    }
    return comp;
  }

  function set(model, compName, pathTo, partial, onUpdateCallback) {
    var compPath = getCompPath(model, compName, pathTo);
    if (compPath && compPath.length > 0) {
      compPath.pop();
      var comp = getFromPath(model, compPath);

      if (Array.isArray(comp[pathTo])) {
        comp[pathTo].push(partial);
      } else {
        comp[pathTo] = _.assign(comp[pathTo], partial);
      }

      if (onUpdateCallback) {
        onUpdateCallback(compName, pathTo, partial);
      }
    }
    return false;
  }

  function getCompPath(model, compName, pathTo) {
    var path;
    if (compName === model[NAME]) {
      path = pathTo ? [pathTo] : [];
    } else if (_.has(model, CHILDREN)) {
      var children = _.get(model, CHILDREN);
      path = getChildCompPath(children, compName, pathTo);
    }
    return path;
  }

  function getChildCompPath(children, compName, pathTo) {
    var path;
    var index = _.findIndex(children, NAME, compName);
    if (index > 0) {
      path = [CHILDREN, index, pathTo];
    } else {
      path = searchChildrenForCompPath(children, compName, pathTo);
    }
    return path;
  }

  function searchChildrenForCompPath(children, compName, pathTo) {
    var path;
    children.some(function(childComp, searchIndex) {
      var pathInChild = getCompPath(childComp, compName, pathTo);
      if (pathInChild) {
        path = [CHILDREN, searchIndex].concat(pathInChild);
        return false;
      }
    }, this);
    return path;
  }

  function getCompNames(model) {
    var compNames = function(model) {
      if (model.children && model.children.length > 0) {
        return model.children.map(compNames);
      }
      return [model.compName];
    };
    return flatten(compNames(model));
  }

  function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
  }


//////////////////////////////////// copied from lodash /////////////////////////////
//  Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
//  Based on Underscore.js, copyright 2009-2015 Jeremy Ashkenas,
//    DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>
//
//  Permission is hereby granted, free of charge, to any person obtaining
//  a copy of this software and associated documentation files (the
//  "Software"), to deal in the Software without restriction, including
//  without limitation the rights to use, copy, modify, merge, publish,
//    distribute, sublicense, and/or sell copies of the Software, and to
//  permit persons to whom the Software is furnished to do so, subject to
//  the following conditions:
//
//    The above copyright notice and this permission notice shall be
//  included in all copies or substantial portions of the Software.
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
//  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
//  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  var _ = (function() {
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]/g,
      reEscapeChar = /\\(\\)?/g,
      reIsUint = /^(?:0|[1-9]\d*)$/,
      reIsBadHex = /^[-+]0x[0-9a-f]+$/i,
      reIsBinary = /^0b[01]+$/i,
      reIsOctal = /^0o[0-7]+$/i;

    var argsTag = '[object Arguments]',
      stringTag = '[object String]',
      funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]';

    var INFINITY = 1 / 0,
      MAX_SAFE_INTEGER = 9007199254740991,
      MAX_INTEGER = 1.7976931348623157e+308,
      NAN = 0 / 0;

    var FUNC_ERROR_TEXT = 'Expected a function';

    function _findIndex(array, property, value) {
      var predicate = function(item, i, arr) {
        return item[property] === value;
      };
      return _findIndexPredicate(array, predicate);
    }

    function _get(object, path, defaultValue) {
      var result = object == null ? undefined : baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    function _has(object, path) {
      return hasPath(object, path, baseHas);
    }

    function baseHas(object, key) {
      // Avoid a bug in IE 10-11 where objects with a [[Prototype]] of `null`,
      // that are composed entirely of index properties, return `false` for
      // `hasOwnProperty` checks of them.
      return Object.prototype.hasOwnProperty.call(object, key) ||
        (typeof object == 'object' && key in object && Object.getPrototypeOf(object) === null);
    }

    function hasPath(object, path, hasFunc) {
      if (object == null) {
        return false;
      }
      var result = hasFunc(object, path);
      if (!result && !isKey(path)) {
        path = baseToPath(path);
        object = parent(object, path);
        if (object != null) {
          path = last(path);
          result = hasFunc(object, path);
        }
      }
      return result || (isLength(object && object.length) && isIndex(path, object.length) &&
        (Array.isArray(object) || isString(object) || isArguments(object)));
    }

    function _findIndexPredicate(array, predicate, fromRight) {
      var length = array.length,
        index = fromRight ? length : -1;

      while ((fromRight ? index-- : ++index < length)) {
        if (predicate(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    function isKey(value, object) {
      if (typeof value == 'number') {
        return true;
      }
      return !Array.isArray(value) &&
        (reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
        (object != null && value in Object(object)));
    }

    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }

    function isObject(value) {
      // Avoid a V8 JIT bug in Chrome 19-20.
      // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }

    function _isFunction(value) {
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 8 which returns 'object' for typed array constructors, and
      // PhantomJS 1.9 which returns 'function' for `NodeList` instances.
      var tag = isObject(value) ? Object.prototype.toString.call(value) : '';
      return tag == funcTag || tag == genTag;
    }

    function isLength(value) {
      return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isString(value) {
      return typeof value == 'string' ||
        (!Array.isArray(value) && isObjectLike(value) && Object.prototype.toString.call(value) == stringTag);
    }

    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }

    function isArrayLike(value) {
      return value != null &&
        !(typeof value == 'function' && isFunction(value)) && isLength(getLength(value));
    }

    function isIndex(value, length) {
      value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
      length = length == null ? MAX_SAFE_INTEGER : length;
      return value > -1 && value % 1 == 0 && value < length;
    }

    function isArguments(value) {
      // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
      return isArrayLikeObject(value) && Object.prototype.hasOwnProperty.call(value, 'callee') &&
        (!Object.prototype.propertyIsEnumerable.call(value, 'callee') || Object.prototype.toString.call(value) == argsTag);
    }

    function isPrototype(value) {
      var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || Object.prototype;

      return value === proto;
    }

    function isSpace(charCode) {
      return ((charCode <= 160 && (charCode >= 9 && charCode <= 13) || charCode == 32 || charCode == 160) || charCode == 5760 || charCode == 6158 ||
      (charCode >= 8192 && (charCode <= 8202 || charCode == 8232 || charCode == 8233 || charCode == 8239 || charCode == 8287 || charCode == 12288 || charCode == 65279)));
    }

    function baseGet(object, path) {
      path = isKey(path, object) ? [path + ''] : baseToPath(path);

      var index = 0,
        length = path.length;

      while (object != null && index < length) {
        object = object[path[index++]];
      }
      return (index && index == length) ? object : undefined;
    }

    function baseToPath(value) {
      return Array.isArray(value) ? value : stringToPath(value);
    }

    function stringToPath(string) {
      var result = [];
      string.toString().replace(rePropName, function(match, number, quote, string) {
        result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    }

    function parent(object, path) {
      return path.length == 1 ? object : get(object, baseSlice(path, 0, -1));
    }

    function trimmedStartIndex(string) {
      var index = -1,
        length = string.length;

      while (++index < length && isSpace(string.charCodeAt(index))) {}
      return index;
    }

    function trimmedEndIndex(string) {
      var index = string.length;

      while (index-- && isSpace(string.charCodeAt(index))) {}
      return index;
    }

    function baseTrim(string) {
      return string
        ? string.slice(trimmedStartIndex(string), trimmedEndIndex(string) + 1)
        : string;
    }

    function toInteger(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = (value < 0 ? -1 : 1);
        return sign * MAX_INTEGER;
      }
      var remainder = value % 1;
      return value === value ? (remainder ? value - remainder : value) : 0;
    }

    function toNumber(value) {
      if (!value) {
        return value === 0 ? value : +value;
      }
      if (isObject(value)) {
        var other = isFunction(value.valueOf) ? value.valueOf() : value;
        value = isObject(other) ? (other + '') : other;
      }
      if (typeof value == 'number' || !isString(value)) {
        return +value;
      }
      value = baseTrim(value);
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? parseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    function baseSlice(array, start, end) {
      var index = -1,
        length = array.length;

      start = start == null ? 0 : toInteger(start);
      if (start < 0) {
        start = -start > length ? 0 : (length + start);
      }
      end = (end === undefined || end > length) ? length : toInteger(end);
      if (end < 0) {
        end += length;
      }
      length = start > end ? 0 : ((end - start) >>> 0);
      start >>>= 0;

      var result = Array(length);
      while (++index < length) {
        result[index] = array[index + start];
      }
      return result;
    }

    function baseKeys(object) {
      return Object.keys(Object(object));
    }

    function indexKeys(object) {
      var length = object ? object.length : undefined;
      return (isLength(length) && (Array.isArray(object) || isString(object) || isArguments(object)))
        ? baseTimes(length, String)
        : null;
    }

    function baseTimes(n, iteratee) {
      var index = -1,
        result = Array(n);

      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }

    function keys(object) {
      var isProto = isPrototype(object);
      if (!(isProto || isArrayLike(object))) {
        return baseKeys(object);
      }
      var indexes = indexKeys(object),
        skipIndexes = !!indexes,
        result = indexes || [],
        length = result.length;

      for (var key in object) {
        if (baseHas(object, key) &&
          !(skipIndexes && (key == 'length' || isIndex(key, length))) &&
          !(isProto && key == 'constructor')) {
          result.push(key);
        }
      }
      return result;
    }


    function copyObject(source, props, object) {
      return copyObjectWith(source, props, object);
    }

    function copyObjectWith(source, props, object, customizer) {
      object || (object = {});

      var index = -1,
        length = props.length;

      while (++index < length) {
        var key = props[index],
          newValue = customizer ? customizer(object[key], source[key], key, object, source) : source[key];

        assignValue(object, key, newValue);
      }
      return object;
    }

    function assignValue(object, key, value) {
      var oldValue = object[key];
      if ((value === value ? (value !== oldValue) : (oldValue === oldValue)) ||
        (value === undefined && !(key in object))) {
        object[key] = value;
      }
    }

    var _assign = createAssigner(function(object, source) {
      copyObject(source, keys(source), object);
    });

    function apply(func, thisArg, args) {
      var length = args ? args.length : 0;
      switch (length) {
        case 0: return func.call(thisArg);
        case 1: return func.call(thisArg, args[0]);
        case 2: return func.call(thisArg, args[0], args[1]);
        case 3: return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }

    function rest(func, start) {
      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      start = Math.max(start === undefined ? (func.length - 1) : toInteger(start), 0);
      return function() {
        var args = arguments,
          index = -1,
          length = Math.max(args.length - start, 0),
          array = Array(length);

        while (++index < length) {
          array[index] = args[start + index];
        }
        switch (start) {
          case 0: return func.call(this, array);
          case 1: return func.call(this, args[0], array);
          case 2: return func.call(this, args[0], args[1], array);
        }
        var otherArgs = Array(start + 1);
        index = -1;
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = array;
        return apply(func, this, otherArgs);
      };
    }

    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == 'number'
          ? (isArrayLike(object) && isIndex(index, object.length))
          : (type == 'string' && index in object)) {
        var other = object[index];
        return value === value ? (value === other) : (other !== other);
      }
      return false;
    }

    function createAssigner(assigner) {
      return rest(function(object, sources) {
        var index = -1,
          length = object == null ? 0 : sources.length,
          customizer = length > 1 ? sources[length - 1] : undefined,
          guard = length > 2 ? sources[2] : undefined;

        customizer = typeof customizer == 'function' ? (length--, customizer) : undefined;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          customizer = length < 3 ? undefined : customizer;
          length = 1;
        }
        object = Object(object);
        while (++index < length) {
          var source = sources[index];
          if (source) {
            assigner(object, source, customizer);
          }
        }
        return object;
      });
    }

    function baseProperty(key) {
      return function(object) {
        return object == null ? undefined : object[key];
      };
    }

    var getLength = baseProperty('length');

    return  {
      findIndex: _findIndex,
      get: _get,
      has: _has,
      assign: _assign,
      isFunction: _isFunction
    };

  })();

  //////////////////////////// end of copied from lodash //////////////////////////////

  return RemoteModelInterface;
});
