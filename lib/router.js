/*
 * redix
 * Copyright(c) 2018 Vahagn Mkrtchyan <vahagn.mkrtchyan@gmail.com>
 * MIT Licensed
 */

class Router {
  constructor() {
    this.staticRoutes = {};
    this.routes = {}
  }

  clear() {
    this.routes = {};
  }

  delete(path) {
    // @TODO: Implementation missing
  }

  get(path) {
    if (path[0] !== '/')
      path = '/' + path;
    if (path.length > 1 && path[path.length - 1] === '/')
      path = path.slice(0, -1);

    const pathSegments = path.split('/');
    pathSegments.shift();

    // Check static routes first
    if (this.staticRoutes[path]) {
      const route = this.staticRoutes[path];
      return { matched: route.path, fn: route.fn, path, params: {} };
    }

    if (!this.routes[pathSegments.length])
      return { matched: null, fn: null, path: null, params: null };
    
    for (const route of this.routes[pathSegments.length]) {
      const { segments, statics, params } = route;
      
      let match = true;
      
      for (const index of statics) {
        if (pathSegments[index] !== segments[index]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        let found = { matched: route.path, fn: route.fn, path, params: {} };

        for (const index of params) {
          found.params[segments[index]] = pathSegments[index];
        }

        return found;
      }
    }
    return { matched: null, fn: null, path: null, params: null };
  }

  has(path) {
    return !!this.get(path);
  }

  set(path, fn) {
    const segments = path.split('/').filter(s => s.length);
    path = '/' + segments.join("/");

    const route = { path, fn, segments: [], statics: [], params: [] };
    let isStatic = true;

    for (let i = 0; i < segments.length; i++) {
      let segment = segments[i];
      if (segment[0] === ':' && (segment = segment.substr(1))) {
        route.segments.push(segment);
        route.params.push(i);
        isStatic = false;
      } else {
        route.segments.push(segment);
        route.statics.push(i);
      }
    }

    if (isStatic) {
      this.staticRoutes[path] = route;
      return;
    }

    if (!this.routes[segments.length]) {
      this.routes[segments.length] = [];
    }

    this.routes[segments.length].push(route);
  }
}

module.exports = Router;
