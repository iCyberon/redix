/*
 * redix
 * Copyright(c) 2018 Vahagn Mkrtchyan <vahagn.mkrtchyan@gmail.com>
 * MIT Licensed
 */

// Module Dependencies
const http = require('http');
const Router = require('./lib/router');
const Options = require('./lib/options');

const { Async, Asyncify, AsyncFunction } = require('./lib/async');

// Default error handler
const error = (err, _, res) => {
  const code = err.code || err.status || 500;
  const message = err.message || (typeof err == 'string') && err || http.STATUS_CODES[code];
  res.statusCode = code;
  res.end(message);
}

class Redix {
  constructor(opts = new Options()) {
    this.opts = opts;
    this.server = null;

    this.mwares = [];
    this.ewares = [];
    this.routes = {};

    for (const method of http.METHODS) {
      this[method.toLowerCase()] = this.add.bind(this, method);
      this.routes[method] = new Router();
    }
  }

  add(method, path, ...fn) {
    this.routes[method].set(path, fn.map(f => Async(f) ? f : Asyncify(f)));
    return this;
  }

  use(...fn) {
    this.mwares = [...this.mwares, ...fn.map(f => Async(f) ? f : Asyncify(f))];
    return this;
  }
  
  error(...fn) {
    this.ewares = [...this.ewares, ...fn.map(f => Async(f) ? f : Asyncify(f))];
    return this;
  }

  listen() {
    this.server = http.createServer(this.handler.bind(this));

    return new Promise((resolve, reject) => {
      this.server.listen(this.opts.port, (err) => {
        return (err) ? reject(err) : resolve(this);
      });
    });
  }

  // Private Methods
  async handler(req, res) {
    // @TODO: url parser needed!
    let { matched, fn, path, params } = this.routes[req.method].get(req.url);
    let err = null;

    if (matched) {
      req.params = params;

      const handlers = [...this.mwares, ...fn];
      for (let i = 0; i < handlers.length && !err && !res.finished; i++) {
        err = await handlers[i](req, res);
      }
    } else {
      err = { code: 404 };
    }

    if (err) {
      const handlers = [...this.ewares, error];
      for (let i = 0; i < handlers.length && !res.finished; i++) {
        await handlers[i](err, req, res);
      }
    }
  }
}

module.exports = {
  Redix,
  Options
}