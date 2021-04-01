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
const { throws } = require('assert');

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
    this.apps = new Map();

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
    if (!fn.length) return this

    const path = (typeof fn[0] === 'string') ? fn.shift() : '/';
    const app = fn.find(f => f instanceof Redix)
    if (!!app) {
      app.use(...(fn.filter(f => !(f instanceof Redix))))
      this.apps.has(path) && (() => { throw new Error('Already mounted')})
      this.apps.set(path, app)
      return this;
    }

    this.mwares = [...this.mwares, ...fn.map(f => Async(f) ? f : Asyncify(f))];
    return this;
  }
  
  error(...fn) {
    this.ewares = [...this.ewares, ...fn.map(f => Async(f) ? f : Asyncify(f))];
    return this;
  }

  flatten() {
    for (const [path, app] of this.apps) {
      let routes = app.flatten();
      for (const [method, route] of Object.entries(routes)) {
        const pathSegments = path.split('/');
        pathSegments.shift()
        
        // Static Routes
        const staticRoutes = Object.entries(route.staticRoutes).reduce((acc, [_, route]) => {
          let key = path + route.path
          if (key.length > 1 && key[key.length - 1] === '/')
            key = key.slice(0, -1);

          route.path = key
          route.fn = [...app.mwares,...route.fn]
          route.segments = [...pathSegments, ...route.segments]
          route.statics = [...pathSegments.map((_, i) => i), ...route.statics.map(segment => segment + pathSegments.length)]
          route.params = route.params.map(param => param + pathSegments.length)
          acc[key] = route
          return acc;
        },{})
        this.routes[method].staticRoutes = {...this.routes[method].staticRoutes, ...staticRoutes}

        // Dynamic Routes
        const dynamicRoutes = Object.entries(route.routes).reduce((acc, [key, routeGroup]) => {
          routeGroup.map(route => {
            let pathKey = path + route.path
            if (pathKey.length > 1 && pathKey[pathKey.length - 1] === '/')
              pathKey = pathKey.slice(0, -1);

            route.path = key
            route.fn = [...app.mwares,...route.fn]
            route.segments = [...pathSegments, ...route.segments]
            route.statics = [...pathSegments.map((_, i) => i), ...route.statics.map(segment => segment + pathSegments.length)]
            route.params = route.params.map(param => param + pathSegments.length)
          })
          acc[pathSegments.length + parseInt(key)] = routeGroup
          return acc;
        },{})
        this.routes[method].routes = {...this.routes[method].routes, ...dynamicRoutes}
      }
    }
    return this.routes
  }

  listen() {
    this.flatten()
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
        try {
          err = await handlers[i](req, res);
        } catch(e) {
          err = e;
        }
      }
    } else {
      err = { code: 404 };
    }

    if (err) {
      const handlers = [...this.ewares, error];
      for (let i = 0; i < handlers.length && !res.finished; i++) {
        try {
          await handlers[i](err, req, res);
        } catch(e) {
          error(e, req, res)
        }
      }
    }
  }
}

module.exports = {
  Redix,
  Options
}