/*
 * redix
 * Copyright(c) 2018 Vahagn Mkrtchyan <vahagn.mkrtchyan@gmail.com>
 * MIT Licensed
 */

class RouterOptions {
  constructor() {
  }
}

class RedixOptions extends RouterOptions {
  constructor() {
    super();
    this.port = 3000;
  }
}

module.exports = RedixOptions;