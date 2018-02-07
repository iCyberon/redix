/*
 * redix
 * Copyright(c) 2018 Vahagn Mkrtchyan <vahagn.mkrtchyan@gmail.com>
 * MIT Licensed
 */

class Router {
  constructor() {
    this.meta = null;
    this.path = null;
    this.children = {};
  }

  clear() {
    this.meta = null;
    this.path = null;
    this.children = {};
  }

  delete(path) {
    // @TODO: Implementation missing
  }

  get(path) {
    const segments = path.split('/');

    let node = this;

    for (const segment of segments) {
      const found = node.children[segment];
      if (found) {
        node = found;
      } else {
        node = null;
        break;
      }
    }

    return node ? {
      path: node.path,
      meta: node.meta
    } : null
  }

  has(path) {
    return !!this.get(path);
  }

  set(path, meta) {
    const segments = path.split('/');

    let root = this;
    for (const segment of segments) {
      let child = root.children[segment];

      if (child) {
        // child exists, set as root
        root = child;
      } else {
        // create child
        child = new Router();
        root.children[segment] = child;

        // set child as root
        root = child;
      }
    }

    // Set metadata and path
    root.meta = meta;
    root.path = path;

    return root;
  }
}

module.exports = Router;
